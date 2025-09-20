const fs = require('fs');

// model-map.js を読み込み
const content = fs.readFileSync('server/providers/model-map.js', 'utf8');

// 重複ラベルの詳細分析
const modelsMatch = content.match(/{ label: '([^']+)', id: '([^']+)', provider: '([^']+)', plan: '([^']+)' }/g);

if (modelsMatch) {
  const models = [];
  modelsMatch.forEach(match => {
    const [, label, id, provider, plan] = match.match(/label: '([^']+)', id: '([^']+)', provider: '([^']+)', plan: '([^']+)'/);
    models.push({ label, id, provider, plan });
  });

  // 重複ラベルをグループ化
  const labelGroups = {};
  models.forEach(model => {
    if (!labelGroups[model.label]) {
      labelGroups[model.label] = [];
    }
    labelGroups[model.label].push(model);
  });

  console.log('🔍 重複ラベルの詳細分析:');
  Object.keys(labelGroups).forEach(label => {
    const group = labelGroups[label];
    if (group.length > 1) {
      console.log(`📋 ラベル: ${label}`);
      group.forEach(model => {
        console.log(`   - ID: ${model.id}, Plan: ${model.plan}`);
      });
    }
  });

  // 各プランのモデル数を確認
  const planCounts = {};
  models.forEach(model => {
    planCounts[model.plan] = (planCounts[model.plan] || 0) + 1;
  });
  console.log('\n📊 プラン別モデル数:');
  Object.keys(planCounts).sort().forEach(plan => {
    console.log(`   ${plan}: ${planCounts[plan]} モデル`);
  });

  // 新しいモデルの詳細確認
  console.log('\n🆕 新しいモデルの詳細:');
  const newModelLabels = ['Grok 4 Fast', 'Grok Code Fast-1', 'Hermes 4 405B', 'Hermes 4 70B'];
  newModelLabels.forEach(label => {
    const model = models.find(m => m.label === label);
    if (model) {
      console.log(`   ✅ ${label} (ID: ${model.id}, Plan: ${model.plan})`);
    } else {
      console.log(`   ❌ ${label} - 見つからない`);
    }
  });

  // getProviderAndId 関数のテスト
  console.log('\n🧪 getProviderAndId 関数のテスト:');

  // モジュールとして読み込むテスト
  try {
    // 一時的に require で読み込むテスト
    delete require.cache[require.resolve('./server/providers/model-map.js')];
    const modelMap = require('./server/providers/model-map.js');

    // 新しいモデルのテスト
    newModelLabels.forEach(label => {
      const result = modelMap.getProviderAndId(label);
      console.log(`   ${label}: ${JSON.stringify(result)}`);
    });

    // ID直接指定のテスト
    const testIds = ['x-ai/grok-code-fast-1', 'nousresearch/hermes-4-405b', 'nousresearch/hermes-4-70b'];
    testIds.forEach(id => {
      const result = modelMap.getProviderAndId(id);
      console.log(`   ID ${id}: ${JSON.stringify(result)}`);
    });

  } catch (e) {
    console.log(`❌ モジュール読み込みエラー: ${e.message}`);
  }

} else {
  console.log('❌ モデルパースエラー');
}
