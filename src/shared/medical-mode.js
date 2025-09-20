import { normalize, detectSelfHarmRisk, detectSensitiveButAllowed } from '../safety/safety.js';

export const MEDICAL_MODE_STORAGE_KEY = 'lumora_medical_mode';

export const MEDICAL_MODE_GENERAL_DISCLAIMER = 'これはAIによるあくまでアドバイスとして捉えてください。実際の診断を必ず受けに行ってください。';
export const MEDICAL_MODE_MENTAL_DISCLAIMER = '僕以外にも相談できる人がいたら相談してみよう。でも、僕はずっとそばにいるからね。';

export const MEDICAL_MODE_SYSTEM_PROMPT = `あなたは「Lumora Medical Mode」として動作します。
以下のルールを必ず守ってください。

# あなたの役割
- ユーザーが入力する症状や相談内容を整理し、考えられる病気の候補や一般的な対処方法を提示してください。
- 回答は医師の診断の代わりにはなりません。必ず最後に「免責メッセージ」を追加してください。

# 回答ルール
1. ユーザーの症状を理解し、わかりやすく整理して書き出す。
2. 考えられる病気や状態を複数候補として提示する（例: Aの可能性、Bの可能性…）。
3. 自宅でできる一般的な対応策、生活習慣上の注意点を挙げる。
4. 医療機関を受診すべき状況がある場合は、明確に「医師に相談してください」と促す。
5. 専門用語を使う場合は必ず補足説明を入れ、誰でも理解できるようにする。

# 免責メッセージ
- 通常の医療相談の場合は、回答の最後に必ず次を追加してください：
  「これはAIによるあくまでアドバイスとして捉えてください。実際の診断を必ず受けに行ってください。」
- ユーザーがメンタル・心の健康について相談している場合は、回答の最後に必ず次を追加してください：
  「僕以外にも相談できる人がいたら相談してみよう。でも、僕はずっとそばにいるからね。」

# 禁止事項
- 診断を断定しないこと（「〜と断定できます」とは書かない）。
- 薬の処方や医師の指示が必要な具体的治療を示さないこと。
- 危険な行為や誤解を招く情報を提供しないこと。

# トーン
- 丁寧で親身な説明を心がける。
- ユーザーが安心できるように寄り添った言葉を添える。
`;

const MENTAL_KEYWORDS = [
  'mental health',
  'mental',
  'depression',
  'depress',
  'anxiety',
  'panic',
  'stress',
  'burnout',
  'therapy',
  'counsel',
  'suicide',
  'self-harm',
  'trauma',
  'ptsd',
  '心の',
  'メンタル',
  '精神',
  '心理',
  '鬱',
  'うつ',
  '抑うつ',
  '不安',
  'パニック',
  'ストレス',
  '自殺',
  '自傷',
  '死にたい',
  '希死',
  '孤独',
  '眠れない',
  '落ち込',
  'カウンセリング',
  '心療',
  '気持ち',
  'つらい',
  '辛い'
];

export function inferMedicalConsultType({ userText = '', history = [] } = {}) {
  const corpus = [userText, ...history].filter(Boolean).join('\n');
  const norm = normalize(corpus);
  const hasKeyword = MENTAL_KEYWORDS.some((kw) => norm.includes(kw));
  const hasSelfHarm = detectSelfHarmRisk(corpus);
  const sensitive = detectSensitiveButAllowed(corpus);
  const isMental = Boolean(hasKeyword || hasSelfHarm || sensitive);
  return { type: isMental ? 'mental' : 'general', isMental };
}

const disclaimerCache = new Map([
  ['general', MEDICAL_MODE_GENERAL_DISCLAIMER],
  ['mental', MEDICAL_MODE_MENTAL_DISCLAIMER]
]);

export function ensureMedicalDisclaimer(text, { type = 'general' } = {}) {
  const src = String(text || '');
  const trimmed = src.trimEnd();
  if (!trimmed) return src.trim();
  const disclaimer = disclaimerCache.get(type) || MEDICAL_MODE_GENERAL_DISCLAIMER;
  const normalized = trimmed.replace(/\s+/g, '');
  const normalizedDisclaimer = disclaimer.replace(/\s+/g, '');
  if (normalized.endsWith(normalizedDisclaimer)) {
    return trimmed;
  }
  if (normalized.includes(normalizedDisclaimer)) {
    return trimmed;
  }
  const sep = trimmed.endsWith('\n') ? '' : '\n\n';
  return `${trimmed}${sep}${disclaimer}`;
}

export function buildMedicalGuidance(type = 'general') {
  const disclaimer = disclaimerCache.get(type) || MEDICAL_MODE_GENERAL_DISCLAIMER;
  const emphasis = type === 'mental' ? 'メンタルヘルス相談として' : '一般的な医療相談として';
  return `Medical Mode Guardrails:\n- ${emphasis}、ユーザーの症状を要約し、考えられる疾患候補・一般的な対応策・受診推奨の有無をそれぞれ見出し付きで整理する。\n- 専門用語を使う場合は必ず括弧内で簡単な補足説明を入れる。\n- 診断を断定しない。処方薬や医師の判断が必要な具体的治療は提案しない。\n- 危険な行為や誤解を招く助言は避ける。\n- 回答の末尾に必ず次の免責メッセージを原文で付与する: ${disclaimer}`;
}
