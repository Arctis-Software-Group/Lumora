export default async function moderationsRoute(req, res) {
  // 最小実装: 単純許可（後で各プロバイダのAPIに接続可能）
  res.json({ allowed: true, categories: {} });
}


