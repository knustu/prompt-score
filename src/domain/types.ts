export const PROMPT_CATEGORY_IDS = [
  'goal',
  'context',
  'audience',
  'constraints',
  'role',
  'output',
  'examples',
  'decomposition',
  'verification',
  'specificity',
] as const;

export type PromptCategoryId = (typeof PROMPT_CATEGORY_IDS)[number];

export type ScoreLevel = '약함' | '부분적' | '강함';
export type PromptScoreLevel = '초급' | '성장 중' | '숙련' | '고급';

export interface PromptCategoryDefinition {
  id: PromptCategoryId;
  label: string;
  weight: number;
}

export interface EvidenceItem {
  ruleId: string;
  categoryId: PromptCategoryId;
  text: string;
  signal: string;
}

export interface PromptFeedbackItem {
  categoryId: PromptCategoryId;
  categoryName: string;
  score: number;
  why: string;
  evidence: EvidenceItem[];
  tip: string;
}

export interface PromptCategoryResult extends PromptFeedbackItem {
  weight: number;
  weightedScore: number;
  level: ScoreLevel;
  matchedRuleIds: string[];
  missingElements: string[];
}

export interface PromptEvaluationResult {
  version: 'prompt-v1';
  challengeId?: string;
  overallScore: number;
  level: PromptScoreLevel;
  styleLabel: string;
  categories: Record<PromptCategoryId, PromptCategoryResult>;
  matchedRuleIds: string[];
  evidence: EvidenceItem[];
  missingElements: string[];
  strengths: PromptFeedbackItem[];
  weaknesses: PromptFeedbackItem[];
  recommendations: string[];
  evaluatedAt: string;
}

export interface PromptShareCategory {
  id: PromptCategoryId;
  score: number;
}

export interface PromptShareSummary {
  v: 1;
  k: 'prompt';
  score: number;
  level: PromptScoreLevel;
  style: string;
  categories: PromptShareCategory[];
}

export interface TarotSharePayload {
  v: 1;
  k: 'tarot';
  seed: number;
  spread: 1 | 3;
  category: TarotCategory;
  cardIds?: string[];
}

export interface SajuSharePayload {
  v: 1;
  k: 'saju';
  elements: Record<FiveElement, number>;
  yinYang: { yin: number; yang: number };
  theme: string;
}

export interface ComparisonSharePayload {
  v: 1;
  k: 'compare';
  a: PromptShareSummary;
  b: PromptShareSummary;
}

export type SharePayload = PromptShareSummary | TarotSharePayload | SajuSharePayload | ComparisonSharePayload;

export interface ChallengeSignal {
  id: string;
  label: string;
  terms: string[];
  weight: number;
}

export interface ChallengeDefinition {
  id: string;
  title: string;
  emoji: string;
  description: string;
  criteria: string[];
  requiredSignals: ChallengeSignal[];
  optionalSignals: ChallengeSignal[];
  strongPrompt: string;
  weakPrompt: string;
}

export type TarotCategory = 'general' | 'love' | 'study' | 'career' | 'money' | 'decision';

export interface TarotCard {
  id: string;
  name: string;
  arcana: 'Major' | 'Wands' | 'Cups' | 'Swords' | 'Pentacles';
  aiArchetype?: string;
  uprightKeywords: string[];
  reversedKeywords: string[];
  generalMeaning: string;
  loveMeaning: string;
  studyMeaning: string;
  careerMeaning: string;
  moneyMeaning: string;
  advice: string;
  warning: string;
}

export interface TarotDrawnCard {
  card: TarotCard;
  reversed: boolean;
  position: string;
  interpretation: string;
  advice: string;
  warning: string;
}

export interface TarotReading {
  version: 'tarot-v1';
  seed: number;
  spread: 1 | 3;
  category: TarotCategory;
  categoryLabel: string;
  cards: TarotDrawnCard[];
  summary: string;
  disclaimer: string;
}

export type CalendarType = 'solar' | 'lunar';
export type FiveElement = '목' | '화' | '토' | '금' | '수';
export type DaylightSavingMode = 'auto' | 'standard' | 'daylight';
export type SajuReadingTopic = 'overall' | 'personality' | 'career' | 'money' | 'relationships' | 'familyPatterns' | 'healthLifestyle' | 'futureTrends' | 'daewoon' | 'compatibility' | 'question';
export type SajuConfidence = '높음' | '중간' | '낮음';
export type SajuDayMasterStrength = '강함' | '균형' | '약함';

export interface SajuBackgroundInput {
  family: string;
  personal: string;
}

export interface SajuCompatibilityInput {
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  calendar: CalendarType;
  leapMonth: boolean;
  gender: 'female' | 'male' | 'unspecified';
  birthPlace: string;
  timezone: string;
  daylightSaving: DaylightSavingMode;
}

export interface SajuInput {
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  calendar: CalendarType;
  leapMonth: boolean;
  gender: 'female' | 'male' | 'unspecified';
  birthPlace: string;
  timezone: string;
  daylightSaving: DaylightSavingMode;
  topic: SajuReadingTopic;
  question: string;
  background: SajuBackgroundInput;
  consent: boolean;
  compatibility?: SajuCompatibilityInput;
}

export interface SajuValidation {
  valid: boolean;
  message?: string;
}

export interface SajuPillar {
  name: '년주' | '월주' | '일주' | '시주';
  stem: string;
  branch: string;
  stemElement: FiveElement;
  branchElement: FiveElement;
  yinYang: '음' | '양';
  known: boolean;
  stemIndex?: number;
  branchIndex?: number;
  visibleTenGod?: string;
  hiddenStems?: SajuHiddenStem[];
  growthStage?: string;
}

export interface SajuHiddenStem {
  stem: string;
  element: FiveElement;
  yinYang: '음' | '양';
  weight: number;
  tenGod: string;
}

export interface SajuRelation {
  type: '합' | '충' | '해' | '파' | '형';
  label: string;
  branches: string[];
  ruleId: string;
  note: string;
}

export interface SajuIndicator {
  id: string;
  label: string;
  present: boolean;
  matchedBranches: string[];
  method: string;
  note: string;
  confidence: SajuConfidence;
}

export interface SajuDaewoonCycle {
  sequence: number;
  startAge: number;
  endAge: number;
  pillar: string;
  stem: string;
  branch: string;
  direction: '순행' | '역행';
  note: string;
}

export interface SajuLuckPeriod {
  label: string;
  year?: number;
  month?: number;
  pillar: string;
  stem: string;
  branch: string;
  element: FiveElement;
  note: string;
}

export interface SajuCalculationMethod {
  id: 'saju-standard-v2';
  version: string;
  calendar: CalendarType;
  solarTermBoundary: 'bundled-civil-date';
  dayBoundary: 'midnight';
  timeBasis: 'civil-time';
  timezone: string;
  daylightSaving: DaylightSavingMode;
  lunarConversion: 'bundled-anchor-mean-month';
  daewoonDirection: 'gender-and-year-stem';
  referenceDate: string;
  supportedRange: string;
  sourceReferences: string[];
  assumptions: string[];
}

export interface SajuChart {
  pillars: SajuPillar[];
  dayMaster: { stem: string; element: FiveElement; yinYang: '음' | '양'; tenGod: string };
  elements: Record<FiveElement, number>;
  weightedElements: Record<FiveElement, number>;
  yinYang: { yin: number; yang: number };
  seasonalInfluence: { season: string; element: FiveElement; note: string };
  dayMasterStrength: SajuDayMasterStrength;
  relations: SajuRelation[];
  indicators: SajuIndicator[];
  daewoon: SajuDaewoonCycle[];
  annualLuck: SajuLuckPeriod[];
  monthlyLuck: SajuLuckPeriod[];
  utcOffsetMinutes: number;
  backgroundSignals: string[];
}

export type SajuReadingKey = 'overall' | 'personality' | 'career' | 'money' | 'relationships' | 'familyPatterns' | 'healthLifestyle' | 'futureTrends' | 'daewoon' | 'compatibility' | 'question';

export interface SajuReadingItem {
  id: string;
  title: string;
  facts: string[];
  appliedRuleIds: string[];
  interpretation: string;
  timing: string;
  confidence: SajuConfidence;
  limitations: string[];
  advice: string;
  sourceReferences?: string[];
}

export type SajuTone = 'professional' | 'warm' | 'light' | 'practical';
export type SajuSituationContext = 'work' | 'relationships' | 'family' | 'money' | 'growth';
export type SajuWeatherTone = 'supportive' | 'mixed' | 'attention';

export interface SajuPersona {
  title: string;
  characteristics: string[];
  strengths: string[];
  blindSpots: string[];
  everydayExample: string;
  evidence: string[];
  appliedRuleIds: string[];
  confidence: SajuConfidence;
}

export interface SajuEverydaySituation {
  context: SajuSituationContext;
  label: string;
  title: string;
  interpretation: string;
  everydayExample: string;
  reflection: string;
  action: string;
  evidence: string[];
  appliedRuleIds: string[];
  confidence: SajuConfidence;
}

export interface SajuQuestionPrompt {
  id: string;
  question: string;
  answer: string;
  evidence: string[];
  reflectionQuestion: string;
  action: string;
  appliedRuleIds: string[];
  confidence: SajuConfidence;
}

export interface SajuEnergyWeatherItem {
  type: '대운' | '세운' | '월운';
  period: string;
  pillar: string;
  element: FiveElement;
  category: string;
  tone: SajuWeatherTone;
  summary: string;
  suggestion: string;
  evidence: string;
  confidence: SajuConfidence;
}

export interface SajuStructuredReadings {
  summary: string[];
  readings: Record<SajuReadingKey, SajuReadingItem[]>;
  timing: string[];
  uncertainties: string[];
}

export interface SajuResult {
  version: 'saju-v1' | 'saju-v2';
  inputSummary: string;
  simplified: boolean;
  calendarNote: string;
  pillars: SajuPillar[];
  elements: Record<FiveElement, number>;
  yinYang: { yin: number; yang: number };
  interpretations: Record<'general' | 'study' | 'career' | 'money' | 'relationship' | 'compatibility' | 'reflection' | 'future', string>;
  disclaimer: string;
  chart?: SajuChart;
  calculationMethod?: SajuCalculationMethod;
  knowledgeBaseVersion?: string;
  appliedRules?: string[];
  structuredReadings?: SajuStructuredReadings;
  backgroundProvided?: boolean;
  selectedTopic?: SajuReadingTopic;
  compatibility?: SajuCompatibilitySummary;
  persona?: SajuPersona;
  everydaySituations?: Record<SajuSituationContext, SajuEverydaySituation>;
  questionPrompts?: SajuQuestionPrompt[];
  energyWeather?: SajuEnergyWeatherItem[];
}

export interface SajuCompatibilitySummary {
  primaryDayMaster: { stem: string; element: FiveElement; yinYang: '음' | '양' };
  otherDayMaster: { stem: string; element: FiveElement; yinYang: '음' | '양' };
  primaryGrowthStage: { branch: string; stage: string };
  otherGrowthStage: { branch: string; stage: string };
  sharedElements: FiveElement[];
  complementaryElements: FiveElement[];
  relations: SajuRelation[];
  growthNote: string;
  note: string;
}
