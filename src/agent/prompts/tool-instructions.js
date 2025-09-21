// Lumora Agent Tool Instructions
// 各ツールの使い方・条件・制限を定義

export const TOOL_INSTRUCTIONS = {
  // Analysis Tools
  analyze_requirements: {
    description: "ユーザー要件を分析し、タスクの詳細を抽出する",
    usage: "複雑な要求を理解可能な形に分解し、実行可能な計画の基礎を作る",
    input: "ユーザーの生の入力テキスト",
    output: "構造化された要件分析結果",
    cost: "低",
    conditions: [
      "すべてのタスクの最初に実行",
      "ユーザーの意図を正確に把握する",
      "曖昧さがある場合は明確化を求める"
    ],
    constraints: [
      "個人情報を保存しない",
      "不適切な要求は拒否する",
      "技術的実現性を考慮する"
    ]
  },

  extract_keywords: {
    description: "テキストから重要なキーワードを抽出する",
    usage: "コンテンツ生成時のコンテキスト理解を向上させる",
    input: "分析対象のテキスト",
    output: "重要度順のキーワードリスト",
    cost: "極低",
    conditions: [
      "日本語と英語の両方に対応",
      "専門用語を適切に認識",
      "関連性の高いキーワードを優先"
    ]
  },

  // Planning Tools
  create_outline: {
    description: "ドキュメントの構成・アウトラインを作成する",
    usage: "文書作成前の構造設計",
    input: "ドキュメントの目的と要件",
    output: "階層化されたアウトライン",
    cost: "低",
    conditions: [
      "論理的な情報の流れを設計",
      "読者の理解しやすい構造",
      "適切な情報の粒度を維持"
    ],
    constraints: [
      "セクション数は15個以下",
      "階層は3レベルまで",
      "各セクションに明確な目的"
    ]
  },

  create_presentation_structure: {
    description: "プレゼンテーション用のスライド構成を設計する",
    usage: "効果的なプレゼンテーション作成の基盤",
    input: "プレゼンの目的、対象者、時間制限",
    output: "スライド構成とフロー",
    cost: "低",
    conditions: [
      "聴衆の注意を引く導入",
      "論理的な情報展開",
      "記憶に残る結論"
    ],
    constraints: [
      "スライド数は30枚以下",
      "1スライド1メッセージ",
      "視覚的バランスを考慮"
    ]
  },

  create_wireframe: {
    description: "ウェブサイトの画面設計・ワイヤーフレームを作成する",
    usage: "ウェブサイト開発前の構造設計",
    input: "サイトの目的、機能要件、デザイン方針",
    output: "画面構成とレイアウト設計",
    cost: "中",
    conditions: [
      "ユーザビリティを最優先",
      "モバイルファーストアプローチ",
      "アクセシビリティを考慮"
    ],
    constraints: [
      "ページ数は10ページ以下",
      "レスポンシブ対応必須",
      "読み込み速度を考慮"
    ]
  },

  // Generation Tools
  generate_doc: {
    description: "HTML/CSS形式の文書を生成する",
    usage: "プロフェッショナルな文書作成",
    input: "アウトラインとコンテンツ要件",
    output: "完全なHTML文書とCSS",
    cost: "中-高",
    conditions: [
      "SEOに配慮したマークアップ",
      "印刷時のレイアウト考慮",
      "アクセシビリティ対応"
    ],
    constraints: [
      "ファイルサイズ500KB以下",
      "W3C準拠のHTML",
      "クロスブラウザ対応"
    ],
    quality_checks: [
      "HTML バリデーション",
      "CSS 構文チェック",
      "レスポンシブ動作確認"
    ]
  },

  generate_ppt: {
    description: "インタラクティブなHTMLスライドを生成する",
    usage: "プレゼンテーション資料の作成",
    input: "スライド構成とコンテンツ",
    output: "HTML/CSS/JS形式のスライド",
    cost: "高",
    conditions: [
      "キーボードナビゲーション対応",
      "フルスクリーン表示機能",
      "スライド番号表示"
    ],
    constraints: [
      "アニメーション時間2秒以下",
      "ファイルサイズ1MB以下",
      "IE11以降で動作"
    ],
    features: [
      "スライド遷移アニメーション",
      "プレゼンターノート機能",
      "印刷時のレイアウト最適化"
    ]
  },

  generate_sheet: {
    description: "データテーブル・スプレッドシートを生成する",
    usage: "データの整理・分析・表示",
    input: "データ構造とコンテンツ",
    output: "HTMLテーブルとCSV形式",
    cost: "中",
    conditions: [
      "ソート機能付き",
      "フィルタリング対応",
      "レスポンシブ表示"
    ],
    constraints: [
      "行数1000行以下",
      "列数20列以下",
      "セルサイズ制限"
    ]
  },

  generate_website_content: {
    description: "ウェブサイトのコンテンツを生成する",
    usage: "ランディングページ・企業サイトの作成",
    input: "サイト要件とデザイン方針",
    output: "完全なウェブサイト",
    cost: "高",
    conditions: [
      "SEO最適化済み",
      "高速読み込み",
      "モバイル最適化"
    ],
    constraints: [
      "ページ読み込み3秒以内",
      "画像最適化必須",
      "CDN対応可能"
    ],
    features: [
      "お問い合わせフォーム",
      "ソーシャルメディア連携",
      "Google Analytics対応"
    ]
  },

  generate_code: {
    description: "JavaScript/HTML/CSSコードを生成する",
    usage: "ウェブアプリケーション・ツールの開発",
    input: "機能要件と仕様",
    output: "実行可能なコード",
    cost: "中-高",
    conditions: [
      "ES6以降の標準準拠",
      "エラーハンドリング実装",
      "コメント・ドキュメント完備"
    ],
    constraints: [
      "外部API呼び出し禁止",
      "セキュリティ脆弱性なし",
      "パフォーマンス最適化"
    ],
    quality_checks: [
      "構文エラーチェック",
      "セキュリティスキャン",
      "パフォーマンステスト"
    ]
  },

  // Formatting Tools
  format_document: {
    description: "文書にプロフェッショナルなスタイリングを適用する",
    usage: "生成された文書の見た目を向上させる",
    cost: "低",
    features: [
      "Lumoraブランドカラー適用",
      "タイポグラフィ最適化",
      "印刷レイアウト対応"
    ]
  },

  style_slides: {
    description: "スライドにデザインテーマを適用する",
    usage: "プレゼンテーションの視覚的魅力を向上",
    cost: "低",
    features: [
      "トランジション効果",
      "一貫したデザイン言語",
      "ブランディング要素"
    ]
  },

  // Preview Tools
  preview_html: {
    description: "HTML コンテンツのプレビューを生成する",
    usage: "生成物の確認・検証",
    cost: "極低",
    conditions: [
      "サンドボックス環境で安全に表示",
      "レスポンシブ動作確認",
      "クロスブラウザテスト"
    ]
  },

  // Execution Tools
  run_js: {
    description: "JavaScriptコードを安全に実行する",
    usage: "生成されたコードの動作確認",
    cost: "低",
    conditions: [
      "サンドボックス環境での実行",
      "タイムアウト制限あり",
      "メモリ使用量制限"
    ],
    constraints: [
      "実行時間10秒以下",
      "外部リソースアクセス禁止",
      "DOM操作は制限付き"
    ]
  },

  // Conversion Tools
  generate_pdf: {
    description: "HTMLコンテンツをPDF形式に変換する",
    usage: "印刷可能な形式での配布",
    cost: "低",
    conditions: [
      "高品質な印刷出力",
      "ページ区切り最適化",
      "フォント埋め込み"
    ],
    constraints: [
      "ファイルサイズ5MB以下",
      "A4サイズ最適化",
      "カラープロファイル対応"
    ]
  },

  download_bundle: {
    description: "すべての生成物をまとめてダウンロード用に準備する",
    usage: "成果物の一括配布",
    cost: "極低",
    output: "ZIP形式のバンドル",
    includes: [
      "HTMLファイル",
      "CSSファイル", 
      "JavaScript ファイル",
      "画像・アセット",
      "README.txt"
    ]
  }
};

// Tool selection guidelines
export const TOOL_SELECTION_RULES = {
  // Task type to primary tools mapping
  document: ['analyze_requirements', 'create_outline', 'generate_doc', 'format_document', 'preview_html'],
  presentation: ['analyze_requirements', 'create_presentation_structure', 'generate_ppt', 'style_slides', 'preview_slides'],
  website: ['analyze_requirements', 'create_wireframe', 'generate_website_content', 'apply_website_styling', 'preview_website'],
  spreadsheet: ['analyze_requirements', 'design_data_structure', 'generate_sheet', 'format_table', 'preview_table'],
  code: ['analyze_requirements', 'design_architecture', 'generate_code', 'run_js', 'preview_code'],

  // Cost optimization
  prefer_free_models: true,
  batch_similar_operations: true,
  cache_common_outputs: true,
  
  // Quality assurance
  always_preview: true,
  validate_outputs: true,
  provide_alternatives: true
};

// Error handling guidelines
export const ERROR_HANDLING = {
  cost_limit_exceeded: {
    action: "stop_execution",
    message: "コスト制限($0.50)に達したため、実行を停止しました。",
    recommendations: [
      "より簡単な形式で再実行",
      "タスクを分割して段階的に実行",
      "無料モデルの使用を検討"
    ]
  },
  
  time_limit_exceeded: {
    action: "stop_execution", 
    message: "時間制限(1時間)に達したため、実行を停止しました。",
    recommendations: [
      "部分的な成果物を確認",
      "残りのタスクを新しいセッションで継続",
      "自動モードからステップモードに変更"
    ]
  },
  
  tool_execution_failed: {
    action: "retry_or_skip",
    message: "ツールの実行に失敗しました。",
    recommendations: [
      "代替ツールで再試行",
      "このステップをスキップして継続",
      "より簡単な手法に変更"
    ]
  },
  
  invalid_output: {
    action: "regenerate",
    message: "生成された出力が品質基準を満たしません。",
    recommendations: [
      "異なるアプローチで再生成",
      "要件を明確化して再実行",
      "手動での修正を提案"
    ]
  }
};

// Best practices
export const BEST_PRACTICES = {
  planning: [
    "必ずユーザーの真の意図を理解する",
    "複雑なタスクは小さなステップに分割",
    "コストと時間の見積もりを提供",
    "代替案を常に用意"
  ],
  
  execution: [
    "進捗を定期的に報告",
    "エラーが発生したら即座に通知",
    "中間結果をプレビューで確認",
    "品質チェックを怠らない"
  ],
  
  output: [
    "プロフェッショナルな品質を維持",
    "ユーザビリティを最優先",
    "アクセシビリティに配慮",
    "将来の修正・拡張を考慮"
  ],
  
  communication: [
    "明確で分かりやすい言葉を使用",
    "専門用語は説明を添える",
    "次のアクションを具体的に提示",
    "ユーザーの選択肢を尊重"
  ]
};