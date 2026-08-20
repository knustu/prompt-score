import type { PromptCategoryDefinition, PromptCategoryId } from '../types';

export const PROMPT_CATEGORIES: PromptCategoryDefinition[] = [
  { id: 'goal', label: '목표·의도 명확성', weight: 15 },
  { id: 'context', label: '맥락·배경', weight: 10 },
  { id: 'audience', label: '대상·톤', weight: 5 },
  { id: 'constraints', label: '제약·요구사항', weight: 10 },
  { id: 'role', label: '역할 지정', weight: 10 },
  { id: 'output', label: '원하는 결과 형식', weight: 15 },
  { id: 'examples', label: '예시·참고자료', weight: 10 },
  { id: 'decomposition', label: '단계적 분해', weight: 10 },
  { id: 'verification', label: '검증·품질 관리', weight: 10 },
  { id: 'specificity', label: '구체성·모호성 제어', weight: 5 },
];

export const PROMPT_RULES = {
  goal: {
    id: 'goal.signals',
    terms: ['목표', '목적', '원한다', '만들어줘', '분석해줘', '해결해줘', '정리해줘', '비교해줘', 'goal', 'objective', 'purpose', 'create', 'analyze', 'solve', 'compare', 'summarize'],
    missing: 'AI가 최종적으로 해야 할 작업과 성공 기준을 한 문장으로 더 분명히 적어보세요.',
  },
  context: {
    id: 'context.signals',
    terms: ['현재 상황', '배경', '대상', '사용 환경', '보유 자료', '전제', '상황은', 'context', 'background', 'audience', 'current situation', 'assumptions'],
    missing: '현재 상황, 이미 가진 자료, 전제 조건을 추가하면 추측을 줄일 수 있습니다.',
  },
  audience: {
    id: 'audience.signals',
    terms: ['초보자', '전문가', '대학생', '어린이', '고객', '친근하게', '전문적으로', '간단하게', 'beginner', 'expert', 'customer', 'friendly', 'professional', 'concise'],
    missing: '누가 읽을지와 원하는 말투·난이도를 지정해보세요.',
  },
  constraints: {
    id: 'constraints.signals',
    terms: ['반드시', '제외', '금지', '이내', '이상', '이하', '예산', '기간', '조건', '제한', 'must', 'do not', 'avoid', 'within', 'budget', 'deadline', 'constraints'],
    missing: '분량, 예산, 기간, 포함·제외 조건처럼 지켜야 할 선을 적어보세요.',
  },
  role: {
    id: 'role.signals',
    terms: ['너는', '역할', '전문가', '컨설턴트', '개발자', '교사', 'act as', 'you are', 'expert', 'consultant', 'developer', 'teacher'],
    missing: 'AI에게 맡길 역할이나 관점을 한 줄로 지정해보세요.',
  },
  output: {
    id: 'output.signals',
    terms: ['표', '목록', '단계', 'json', '마크다운', '제목', '요약', '코드', 'table', 'list', 'steps', 'markdown', 'headings', 'summary', 'code'],
    missing: '결과를 표, 목록, 단계, 코드 등 어떤 형식으로 받을지 지정해보세요.',
  },
  examples: {
    id: 'examples.signals',
    terms: ['예시', '예를 들어', '샘플', '참고', '다음과 같이', 'example', 'for instance', 'sample', 'reference', 'like this'],
    missing: '원하는 결과에 가까운 예시나 참고자료를 한 가지 넣어보세요.',
  },
  decomposition: {
    id: 'decomposition.signals',
    terms: ['먼저', '다음', '마지막', '단계', '순서', 'first', 'next', 'finally', 'step', 'process'],
    missing: '복잡한 작업은 먼저 할 일, 다음 할 일처럼 단계로 나눠보세요.',
  },
  verification: {
    id: 'verification.signals',
    terms: ['검토', '검증', '오류', '빠진 내용', '체크리스트', '근거', '가정', '다시 확인', 'verify', 'check', 'review', 'error', 'missing', 'checklist', 'assumptions', 'validate'],
    missing: '답변 전 검토할 항목이나 오류·가정 확인 절차를 추가해보세요.',
  },
  specificity: {
    id: 'specificity.signals',
    terms: ['구체적으로', '정확히', '측정', '날짜', '예산', '대상 사용자', 'deliverable', 'measurable', 'date', 'target user', 'named technology'],
    missing: '날짜, 숫자, 대상 사용자, 기술 이름처럼 확인 가능한 정보를 넣어보세요.',
  },
} satisfies Record<PromptCategoryId, { id: string; terms: string[]; missing: string }>;

export const IMPERATIVE_PATTERN = /(?:해줘|해주세요|만들어|분석해|정리해|비교해|작성해|계획해|추천해|해라|하라|하시오|create\b|analyze\b|solve\b|write\b|plan\b|recommend\b|please\b|provide\b|generate\b)/iu;
export const NUMBER_PATTERN = /(?:\d+(?:\.\d+)?\s*(?:개|명|일|주|개월|년|분|시간|만원|원|%|자|단어|km|달러|usd|krw)?|\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d+\s*(?:days?|weeks?|hours?|minutes?|items?|words?|percent|달러|원)\b)/iu;
export const NUMBERED_SECTION_PATTERN = /(?:^|\n)\s*(?:\d+[.)]|[-*•])\s+/u;
export const HEADING_PATTERN = /(?:^|\n)\s*(?:#{1,6}\s+|\[[^\]]+\]|[가-힣A-Za-z][^\n:]{1,30}:)\S?/u;
export const VAGUE_PATTERN = /(?:적당히|알아서|잘|좋게|대충|멋지게|최대한|적절히|anything|something|as good as possible|make it nice|vague|etc\.?)/iu;
