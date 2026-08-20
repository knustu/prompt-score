import { CATEGORY_FEEDBACK_TEMPLATES, CATEGORY_LABEL } from './PromptFeedbackTemplates';
import {
  HEADING_PATTERN,
  IMPERATIVE_PATTERN,
  NUMBERED_SECTION_PATTERN,
  NUMBER_PATTERN,
  PROMPT_CATEGORIES,
  PROMPT_RULES,
  VAGUE_PATTERN,
} from './PromptRuleDefinitions';
import { getChallenge } from './ChallengeDefinitions';
import type {
  ChallengeDefinition,
  ChallengeSignal,
  EvidenceItem,
  PromptCategoryId,
  PromptCategoryResult,
  PromptEvaluationResult,
  PromptFeedbackItem,
  PromptScoreLevel,
  PromptShareSummary,
  ScoreLevel,
} from '../types';

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, Math.round(value)));
const unique = <T>(items: T[]): T[] => [...new Set(items)];

const hasTerm = (prompt: string, term: string): boolean => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'iu').test(prompt);
};

const splitPrompt = (prompt: string): string[] => prompt.split(/\n+|(?<=[.!?。！？])\s+/u).map((part) => part.trim()).filter(Boolean);

const evidenceForTerms = (prompt: string, categoryId: PromptCategoryId, ruleId: string, terms: string[]): EvidenceItem[] => {
  const parts = splitPrompt(prompt);
  return terms.filter((term) => hasTerm(prompt, term)).slice(0, 4).map((term) => ({
    ruleId,
    categoryId,
    signal: term,
    text: parts.find((part) => hasTerm(part, term))?.slice(0, 140) ?? term,
  }));
};

const hasNumberedStructure = (prompt: string): boolean => NUMBERED_SECTION_PATTERN.test(prompt);
const hasHeadingStructure = (prompt: string): boolean => HEADING_PATTERN.test(prompt);
const hasNumericConstraint = (prompt: string): boolean => NUMBER_PATTERN.test(prompt);
const hasImperative = (prompt: string): boolean => IMPERATIVE_PATTERN.test(prompt);
const hasExampleBlock = (prompt: string): boolean => /(?:```|(?:예시|샘플|example|sample)\s*[:：]|"[^"]{4,}"|'[^']{4,}'|“[^”]{4,}”|‘[^’]{4,}’)/iu.test(prompt);
const countSentences = (prompt: string): number => splitPrompt(prompt).length;
const countRequirements = (prompt: string): number => (prompt.match(/(?:,|·|\n|;|그리고|and|또한|also)/giu) ?? []).length;

interface SignalResult {
  score: number;
  evidence: EvidenceItem[];
  matchedRuleIds: string[];
}

const signalResult = (prompt: string, categoryId: PromptCategoryId): SignalResult => {
  const definition = PROMPT_RULES[categoryId];
  const evidence = evidenceForTerms(prompt, categoryId, definition.id, definition.terms);
  return { score: evidence.length, evidence, matchedRuleIds: evidence.length ? [definition.id] : [] };
};

const scoreCategory = (prompt: string, categoryId: PromptCategoryId): SignalResult => {
  const signal = signalResult(prompt, categoryId);
  const hasPrompt = prompt.trim().length > 0;
  const sentenceCount = countSentences(prompt);
  const requirements = countRequirements(prompt);
  const numbered = hasNumberedStructure(prompt);
  const headings = hasHeadingStructure(prompt);
  const numeric = hasNumericConstraint(prompt);
  const imperative = hasImperative(prompt);
  const exampleBlock = hasExampleBlock(prompt);
  const vague = VAGUE_PATTERN.test(prompt);
  let score = 0;
  const extraRules: string[] = [];
  const extraEvidence: EvidenceItem[] = [];
  const addEvidence = (ruleId: string, text: string, signalName: string): void => {
    extraRules.push(ruleId);
    extraEvidence.push({ ruleId, categoryId, text, signal: signalName });
  };

  switch (categoryId) {
    case 'goal':
      score = (signal.score ? 42 : 0) + (imperative ? 25 : 0) + (hasPrompt && /(?:결과물|deliverable|산출물|output)/iu.test(prompt) ? 20 : 0) + (sentenceCount > 1 ? 13 : 0);
      if (imperative) addEvidence('goal.imperative', '명령형 표현이 감지되었습니다.', 'imperative');
      break;
    case 'context':
      score = (signal.score ? 52 : 0) + (sentenceCount >= 2 ? 20 : 0) + (requirements >= 2 ? 15 : 0) + (headings ? 13 : 0);
      if (sentenceCount >= 2) addEvidence('context.multi-sentence', '두 문장 이상으로 상황이 나뉘어 있습니다.', 'sentence structure');
      break;
    case 'audience':
      score = (signal.score ? 58 : 0) + (/(?:톤|말투|난이도|tone|style|level)/iu.test(prompt) ? 22 : 0) + (/(?:대상|독자|for|to)/iu.test(prompt) ? 20 : 0);
      break;
    case 'constraints':
      score = (signal.score ? 42 : 0) + (numeric ? 28 : 0) + (requirements >= 3 ? 20 : 0) + (/(?:포함|제외|must|do not|avoid|include)/iu.test(prompt) ? 10 : 0);
      if (numeric) addEvidence('constraints.numeric', '숫자·날짜·단위가 감지되었습니다.', 'numeric constraint');
      break;
    case 'role':
      score = (signal.score ? 58 : 0) + (/(?:너는|you are|act as|역할)/iu.test(prompt) ? 25 : 0) + (/^(?:너는|you are|act as)/iu.test(prompt.trim()) ? 17 : 0);
      break;
    case 'output':
      score = (signal.score ? 48 : 0) + (/(?:형식|format|필드|열|항목|sections?)/iu.test(prompt) ? 22 : 0) + ((numbered || headings) ? 15 : 0) + (hasPrompt && /(?:만들어|작성해|제시해|provide|create|write|generate)/iu.test(prompt) ? 15 : 0);
      if (numbered || headings) addEvidence('output.structure', '출력 구조를 암시하는 목록 또는 제목이 있습니다.', 'output structure');
      break;
    case 'examples':
      score = (signal.score ? 66 : 0) + (exampleBlock ? 24 : 0) + (/(?:참고|reference|링크|link|source)/iu.test(prompt) ? 10 : 0);
      if (exampleBlock) addEvidence('examples.block', '인용 또는 코드 블록 형태의 예시가 있습니다.', 'example block');
      break;
    case 'decomposition':
      score = (numbered ? 52 : 0) + (signal.score ? 28 : 0) + (headings ? 10 : 0) + (sentenceCount >= 3 ? 10 : 0);
      if (numbered) addEvidence('decomposition.numbered', '번호 목록 구조가 감지되었습니다.', 'numbered list');
      break;
    case 'verification':
      score = (signal.score ? 56 : 0) + (/(?:체크리스트|checklist|검증 기준|quality|품질)/iu.test(prompt) ? 25 : 0) + (/(?:근거|출처|source|citation)/iu.test(prompt) ? 19 : 0);
      break;
    case 'specificity':
      score = (numeric ? 30 : 0) + (/(?:[A-Z][A-Za-z]+\s?\d*|파이썬|자바스크립트|리액트|python|javascript|typescript|react|sql)/u.test(prompt) ? 20 : 0) + (/(?:결과물|산출물|deliverable|target|대상 사용자)/iu.test(prompt) ? 20 : 0) + (hasPrompt && signal.score ? 15 : 0) + (!vague && hasPrompt ? 15 : 0);
      if (vague) addEvidence('specificity.vague', '모호한 표현이 감지되었습니다.', 'vague expression');
      break;
  }

  return {
    score: clamp(score),
    evidence: [...signal.evidence, ...extraEvidence],
    matchedRuleIds: unique([...signal.matchedRuleIds, ...extraRules]),
  };
};

const levelForScore = (score: number): ScoreLevel => score >= 70 ? '강함' : score >= 40 ? '부분적' : '약함';

const overallLevel = (score: number): PromptScoreLevel => score >= 85 ? '고급' : score >= 70 ? '숙련' : score >= 45 ? '성장 중' : '초급';

const promptStyle = (scores: Record<PromptCategoryId, number>, overall: number): string => {
  if (overall < 45) return '탐색형 프롬프트 사용자';
  const strongest = [...Object.entries(scores)].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (strongest === 'decomposition' && scores.constraints >= 55) return '구조화형 프롬프트 사용자';
  if (strongest === 'goal') return '목표 집중형 프롬프트 사용자';
  if (strongest === 'output') return '형식 중심형 프롬프트 사용자';
  return '균형형 프롬프트 사용자';
};

const challengeMatches = (prompt: string, signals: ChallengeSignal[]): { matches: ChallengeSignal[]; evidence: EvidenceItem[] } => {
  const matches: ChallengeSignal[] = [];
  const evidence: EvidenceItem[] = [];
  signals.forEach((signal) => {
    const matchedTerm = signal.terms.find((term) => hasTerm(prompt, term));
    if (matchedTerm) {
      matches.push(signal);
      evidence.push({ ruleId: `challenge.${signal.id}`, categoryId: 'specificity', signal: matchedTerm, text: `챌린지 기준 “${signal.label}” 신호가 감지되었습니다.` });
    }
  });
  return { matches, evidence };
};

const challengeBonus = (prompt: string, challenge?: ChallengeDefinition): { points: number; evidence: EvidenceItem[]; missing: string[]; rules: string[] } => {
  if (!challenge) return { points: 0, evidence: [], missing: [], rules: [] };
  const required = challengeMatches(prompt, challenge.requiredSignals);
  const optional = challengeMatches(prompt, challenge.optionalSignals);
  const requiredTotal = challenge.requiredSignals.reduce((sum, item) => sum + item.weight, 0) || 1;
  const optionalTotal = challenge.optionalSignals.reduce((sum, item) => sum + item.weight, 0) || 1;
  const points = (required.matches.reduce((sum, item) => sum + item.weight, 0) / requiredTotal) * 8 + (optional.matches.reduce((sum, item) => sum + item.weight, 0) / optionalTotal) * 4;
  return {
    points: Math.min(12, points),
    evidence: [...required.evidence, ...optional.evidence],
    missing: challenge.requiredSignals.filter((item) => !required.matches.includes(item)).map((item) => item.label),
    rules: [...required.matches, ...optional.matches].map((item) => `challenge.${item.id}`),
  };
};

export function evaluatePrompt(prompt: string, challengeId?: string): PromptEvaluationResult {
  const cleanPrompt = prompt.trim();
  const challenge = getChallenge(challengeId);
  const bonus = challengeBonus(cleanPrompt, challenge);
  const rawScores = Object.fromEntries(PROMPT_CATEGORIES.map(({ id }) => [id, scoreCategory(cleanPrompt, id)])) as Record<PromptCategoryId, SignalResult>;
  const challengeAdjusted = (id: PromptCategoryId): number => {
    const relevant = ['context', 'constraints', 'specificity', 'output'].includes(id);
    return clamp(rawScores[id].score + (relevant ? bonus.points : 0));
  };
  const categories = Object.fromEntries(PROMPT_CATEGORIES.map((definition) => {
    const score = challengeAdjusted(definition.id);
    const level = levelForScore(score);
    const template = CATEGORY_FEEDBACK_TEMPLATES[definition.id][level];
    const evidence = [...rawScores[definition.id].evidence, ...bonus.evidence.filter((item) => item.categoryId === definition.id)].slice(0, 5);
    const missingElements = score < 70 ? [PROMPT_RULES[definition.id].missing] : [];
    return [definition.id, {
      categoryId: definition.id,
      categoryName: CATEGORY_LABEL(definition.id),
      score,
      weight: definition.weight,
      weightedScore: Math.round(score * definition.weight / 100 * 100) / 100,
      level,
      why: template.why,
      evidence,
      tip: template.tip,
      matchedRuleIds: unique([...rawScores[definition.id].matchedRuleIds, ...(definition.id === 'specificity' ? bonus.rules : [])]),
      missingElements,
    } satisfies PromptCategoryResult];
  })) as unknown as Record<PromptCategoryId, PromptCategoryResult>;

  const overallScore = clamp(PROMPT_CATEGORIES.reduce((sum, category) => sum + categories[category.id].weightedScore, 0));
  const ranked = PROMPT_CATEGORIES.map(({ id }) => categories[id]).sort((a, b) => b.score - a.score);
  const weakest = [...ranked].sort((a, b) => a.score - b.score);
  const toFeedback = (category: PromptCategoryResult): PromptFeedbackItem => ({
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    score: category.score,
    why: category.why,
    evidence: category.evidence,
    tip: category.tip,
  });
  const strengths = ranked.slice(0, 3).map(toFeedback);
  const weaknesses = weakest.slice(0, 3).map(toFeedback);
  const missingElements = unique([...weakest.flatMap((category) => category.missingElements), ...bonus.missing.map((item) => `${item} 정보를 추가해보세요.`)]).slice(0, 6);
  const evidence = [...Object.values(categories).flatMap((category) => category.evidence), ...bonus.evidence];

  return {
    version: 'prompt-v1',
    ...(challenge ? { challengeId: challenge.id } : {}),
    overallScore,
    level: overallLevel(overallScore),
    styleLabel: promptStyle(Object.fromEntries(PROMPT_CATEGORIES.map(({ id }) => [id, categories[id].score])) as Record<PromptCategoryId, number>, overallScore),
    categories,
    matchedRuleIds: unique(Object.values(categories).flatMap((category) => category.matchedRuleIds)),
    evidence: evidence.slice(0, 20),
    missingElements,
    strengths,
    weaknesses,
    recommendations: unique(weakest.slice(0, 3).map((category) => category.tip)),
    evaluatedAt: new Date().toISOString(),
  };
}

export const toPromptShareSummary = (result: PromptEvaluationResult): PromptShareSummary => ({
  v: 1,
  k: 'prompt',
  score: result.overallScore,
  level: result.level,
  style: result.styleLabel,
  categories: PROMPT_CATEGORIES.map(({ id }) => ({ id, score: result.categories[id].score })),
});

export const resultFromPromptShareSummary = (summary: PromptShareSummary): PromptEvaluationResult => {
  const categories = Object.fromEntries(PROMPT_CATEGORIES.map((definition) => {
    const score = clamp(summary.categories.find((category) => category.id === definition.id)?.score ?? 0);
    const level = levelForScore(score);
    const template = CATEGORY_FEEDBACK_TEMPLATES[definition.id][level];
    return [definition.id, {
      categoryId: definition.id,
      categoryName: CATEGORY_LABEL(definition.id),
      score,
      weight: definition.weight,
      weightedScore: Math.round(score * definition.weight / 100 * 100) / 100,
      level,
      why: template.why,
      evidence: [],
      tip: template.tip,
      matchedRuleIds: [],
      missingElements: score < 70 ? [PROMPT_RULES[definition.id].missing] : [],
    } satisfies PromptCategoryResult];
  })) as unknown as Record<PromptCategoryId, PromptCategoryResult>;
  const rank = [...Object.values(categories)].sort((a, b) => b.score - a.score);
  return {
    version: 'prompt-v1',
    overallScore: clamp(summary.score),
    level: summary.level,
    styleLabel: summary.style,
    categories,
    matchedRuleIds: [],
    evidence: [],
    missingElements: rank.filter((category) => category.score < 70).slice(0, 6).flatMap((category) => category.missingElements),
    strengths: rank.slice(0, 3).map((category) => ({ categoryId: category.categoryId, categoryName: category.categoryName, score: category.score, why: category.why, evidence: [], tip: category.tip })),
    weaknesses: [...rank].reverse().slice(0, 3).map((category) => ({ categoryId: category.categoryId, categoryName: category.categoryName, score: category.score, why: category.why, evidence: [], tip: category.tip })),
    recommendations: [...rank].reverse().slice(0, 3).map((category) => category.tip),
    evaluatedAt: new Date().toISOString(),
  };
};
