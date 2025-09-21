// Lumora Agent Executor
// ステップ実行制御を担当

import { routeToolCall } from './tool-router.js';
import { trackCost } from './cost.js';

export function createExecutor() {
  return {
    async executeStep(step, task) {
      console.log('⚙️ Executing step:', step.description);
      
      try {
        const startTime = Date.now();
        
        // Route to appropriate tool
        const toolResult = await routeToolCall(step.tool, {
          step,
          task,
          context: this.buildExecutionContext(step, task)
        });
        
        const executionTime = Date.now() - startTime;
        const cost = trackCost(step.tool, toolResult.usage || {});
        
        const result = {
          success: true,
          output: toolResult.output,
          cost: cost,
          executionTime: executionTime,
          metadata: toolResult.metadata || {},
          recommendations: toolResult.recommendations || []
        };

        console.log('✅ Step completed:', step.description, 'Cost:', cost);
        return result;
        
      } catch (error) {
        console.error('❌ Step failed:', step.description, error);
        
        return {
          success: false,
          error: error.message,
          cost: 0,
          executionTime: 0,
          output: null,
          recommendations: this.generateErrorRecoveryActions(error, step)
        };
      }
    },

    buildExecutionContext(step, task) {
      return {
        taskId: task.id,
        taskType: task.type || 'general',
        stepIndex: task.steps.findIndex(s => s.id === step.id),
        totalSteps: task.steps.length,
        previousOutputs: task.outputs || {},
        userInput: task.description,
        keywords: task.keywords || [],
        preferences: this.getUserPreferences()
      };
    },

    getUserPreferences() {
      // Get user preferences from localStorage or defaults
      return {
        language: 'ja',
        style: 'professional',
        complexity: 'medium',
        format: 'html',
        theme: 'lumora'
      };
    },

    generateErrorRecoveryActions(error, step) {
      const actions = [];
      
      if (error.message.includes('cost') || error.message.includes('limit')) {
        actions.push({
          icon: '💰',
          text: 'コスト制限を確認',
          action: 'check_cost_limits'
        });
      }
      
      if (error.message.includes('timeout') || error.message.includes('time')) {
        actions.push({
          icon: '⏱',
          text: 'タイムアウト設定を調整',
          action: 'adjust_timeout'
        });
      }
      
      if (step.tool.includes('generate')) {
        actions.push({
          icon: '🔄',
          text: 'より簡単な形式で再試行',
          action: 'retry_simplified'
        });
      }
      
      actions.push({
        icon: '⏭',
        text: 'このステップをスキップ',
        action: 'skip_step'
      });
      
      return actions;
    },

    // Specific execution handlers for different step types
    async executeAnalysisStep(step, context) {
      // Analyze user requirements and extract key information
      const analysis = {
        requirements: this.extractRequirements(context.userInput),
        targetAudience: this.identifyAudience(context.userInput),
        tone: this.determineTone(context.userInput),
        scope: this.determineScope(context.userInput)
      };
      
      return {
        output: analysis,
        metadata: { stepType: 'analysis' },
        recommendations: this.generateNextStepRecommendations(analysis)
      };
    },

    async executePlanningStep(step, context) {
      // Create detailed structure/outline based on analysis
      const structure = await this.createStructure(step.tool, context);
      
      return {
        output: structure,
        metadata: { stepType: 'planning' },
        recommendations: [
          { icon: '✏️', text: '構成を編集', action: 'edit_structure' },
          { icon: '➡️', text: 'コンテンツ生成に進む', action: 'continue_generation' }
        ]
      };
    },

    async executeGenerationStep(step, context) {
      // Generate actual content using appropriate tools
      const content = await this.generateContent(step.tool, context);
      
      return {
        output: content,
        metadata: { stepType: 'generation', contentType: this.getContentType(step.tool) },
        recommendations: [
          { icon: '🎨', text: 'デザインを調整', action: 'adjust_design' },
          { icon: '📝', text: '内容を編集', action: 'edit_content' },
          { icon: '👁', text: 'プレビューを確認', action: 'preview_content' }
        ]
      };
    },

    async executeFormattingStep(step, context) {
      // Apply styling and formatting
      const formatted = await this.formatContent(step.tool, context);
      
      return {
        output: formatted,
        metadata: { stepType: 'formatting' },
        recommendations: [
          { icon: '🎨', text: 'テーマを変更', action: 'change_theme' },
          { icon: '📱', text: 'レスポンシブを調整', action: 'adjust_responsive' }
        ]
      };
    },

    async executePreviewStep(step, context) {
      // Generate preview for display
      const preview = await this.generatePreview(step.tool, context);
      
      return {
        output: preview,
        metadata: { stepType: 'preview' },
        recommendations: [
          { icon: '💾', text: 'エクスポート', action: 'export_content' },
          { icon: '🔄', text: '修正を加える', action: 'make_changes' },
          { icon: '✅', text: '完了とする', action: 'mark_complete' }
        ]
      };
    },

    // Helper methods for content processing
    extractRequirements(input) {
      // Extract specific requirements from user input
      const requirements = [];
      
      if (input.includes('セクション') || input.includes('章')) {
        requirements.push('multi_section');
      }
      if (input.includes('画像') || input.includes('図')) {
        requirements.push('images');
      }
      if (input.includes('表') || input.includes('グラフ')) {
        requirements.push('tables_charts');
      }
      if (input.includes('リンク') || input.includes('URL')) {
        requirements.push('external_links');
      }
      
      return requirements;
    },

    identifyAudience(input) {
      if (input.includes('初心者') || input.includes('ビギナー')) return 'beginner';
      if (input.includes('専門家') || input.includes('エキスパート')) return 'expert';
      if (input.includes('一般') || input.includes('普通')) return 'general';
      if (input.includes('学生') || input.includes('教育')) return 'educational';
      if (input.includes('ビジネス') || input.includes('企業')) return 'business';
      return 'general';
    },

    determineTone(input) {
      if (input.includes('フォーマル') || input.includes('正式')) return 'formal';
      if (input.includes('カジュアル') || input.includes('親しみやすい')) return 'casual';
      if (input.includes('プロフェッショナル') || input.includes('専門的')) return 'professional';
      if (input.includes('フレンドリー') || input.includes('親近感')) return 'friendly';
      return 'professional';
    },

    determineScope(input) {
      const wordCount = input.split(' ').length;
      if (wordCount < 20 || input.includes('簡単') || input.includes('短い')) return 'small';
      if (wordCount > 100 || input.includes('詳細') || input.includes('包括的')) return 'large';
      return 'medium';
    },

    async createStructure(tool, context) {
      // Tool-specific structure creation
      switch (tool) {
        case 'create_outline':
          return this.createDocumentOutline(context);
        case 'create_presentation_structure':
          return this.createPresentationStructure(context);
        case 'create_wireframe':
          return this.createWebsiteWireframe(context);
        case 'design_data_structure':
          return this.createDataStructure(context);
        default:
          return this.createGenericStructure(context);
      }
    },

    createDocumentOutline(context) {
      const sections = [
        { title: '概要', content: 'Document overview and introduction' },
        { title: '詳細', content: 'Main content and detailed information' },
        { title: 'まとめ', content: 'Conclusion and summary' }
      ];
      
      // Customize based on requirements
      if (context.requirements?.includes('multi_section')) {
        sections.splice(1, 0, { title: '背景', content: 'Background information' });
        sections.splice(3, 0, { title: '実装方法', content: 'Implementation details' });
      }
      
      return {
        type: 'document_outline',
        sections: sections,
        metadata: { totalSections: sections.length }
      };
    },

    createPresentationStructure(context) {
      const slides = [
        { title: 'タイトルスライド', type: 'title', content: 'Presentation title and introduction' },
        { title: '概要', type: 'overview', content: 'Overview of main points' },
        { title: 'メインコンテンツ', type: 'content', content: 'Main presentation content' },
        { title: 'まとめ', type: 'conclusion', content: 'Summary and conclusions' }
      ];
      
      return {
        type: 'presentation_structure',
        slides: slides,
        metadata: { totalSlides: slides.length }
      };
    },

    createWebsiteWireframe(context) {
      const sections = [
        { name: 'header', type: 'navigation', content: 'Header with navigation' },
        { name: 'hero', type: 'hero', content: 'Hero section with main message' },
        { name: 'features', type: 'content', content: 'Features or main content' },
        { name: 'footer', type: 'footer', content: 'Footer with contact info' }
      ];
      
      return {
        type: 'website_wireframe',
        sections: sections,
        metadata: { layout: 'single_page' }
      };
    },

    createDataStructure(context) {
      const columns = [
        { name: 'ID', type: 'number', description: 'Unique identifier' },
        { name: '項目', type: 'text', description: 'Main item or category' },
        { name: '値', type: 'number', description: 'Associated value' },
        { name: '備考', type: 'text', description: 'Additional notes' }
      ];
      
      return {
        type: 'data_structure',
        columns: columns,
        metadata: { columnCount: columns.length }
      };
    },

    async generateContent(tool, context) {
      // This would interface with the AI models to generate actual content
      // For now, return structured placeholders
      
      const baseContent = {
        generated: true,
        timestamp: new Date().toISOString(),
        tool: tool,
        context: context.taskType
      };
      
      switch (tool) {
        case 'generate_doc':
          return { ...baseContent, type: 'document', content: await this.generateDocumentContent(context) };
        case 'generate_ppt':
          return { ...baseContent, type: 'presentation', content: await this.generatePresentationContent(context) };
        case 'generate_website_content':
          return { ...baseContent, type: 'website', content: await this.generateWebsiteContent(context) };
        case 'generate_sheet':
          return { ...baseContent, type: 'spreadsheet', content: await this.generateSpreadsheetContent(context) };
        case 'generate_code':
          return { ...baseContent, type: 'code', content: await this.generateCodeContent(context) };
        default:
          return { ...baseContent, type: 'general', content: 'Generated content placeholder' };
      }
    },

    async generateDocumentContent(context) {
      // This would call the AI to generate actual document content
      return {
        title: context.userInput.split(' ').slice(0, 6).join(' '),
        sections: [
          { heading: '概要', content: 'このドキュメントは...' },
          { heading: '詳細', content: '詳細な内容は...' },
          { heading: 'まとめ', content: '結論として...' }
        ]
      };
    },

    async generatePresentationContent(context) {
      return {
        title: context.userInput.split(' ').slice(0, 6).join(' '),
        slides: [
          { title: 'タイトル', content: 'プレゼンテーションタイトル' },
          { title: '概要', content: '今回お話しする内容は...' },
          { title: 'まとめ', content: 'ありがとうございました' }
        ]
      };
    },

    async generateWebsiteContent(context) {
      return {
        title: context.userInput.split(' ').slice(0, 4).join(' '),
        sections: {
          hero: { title: 'メインタイトル', subtitle: 'サブタイトル' },
          features: [
            { title: '特徴1', description: '説明文' },
            { title: '特徴2', description: '説明文' }
          ]
        }
      };
    },

    async generateSpreadsheetContent(context) {
      return {
        headers: ['項目', '値', '備考'],
        rows: [
          ['データ1', '100', '説明'],
          ['データ2', '200', '説明'],
          ['データ3', '300', '説明']
        ]
      };
    },

    async generateCodeContent(context) {
      return {
        language: 'javascript',
        files: [
          {
            name: 'main.js',
            content: '// Generated code\nconsole.log("Hello, World!");'
          }
        ]
      };
    },

    async formatContent(tool, context) {
      // Apply formatting and styling
      return {
        formatted: true,
        tool: tool,
        timestamp: new Date().toISOString()
      };
    },

    async generatePreview(tool, context) {
      // Generate preview HTML/display
      return {
        preview: true,
        tool: tool,
        timestamp: new Date().toISOString()
      };
    },

    getContentType(tool) {
      const mapping = {
        'generate_doc': 'document',
        'generate_ppt': 'presentation',
        'generate_website_content': 'website',
        'generate_sheet': 'spreadsheet',
        'generate_code': 'code'
      };
      return mapping[tool] || 'general';
    },

    generateNextStepRecommendations(analysis) {
      return [
        { icon: '📋', text: '構成を確認', action: 'review_structure' },
        { icon: '⚡', text: 'コンテンツ生成開始', action: 'start_generation' }
      ];
    }
  };
}