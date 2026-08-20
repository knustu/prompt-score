import type { SajuChart, SajuCompatibilitySummary, SajuConfidence, SajuEnergyWeatherItem, SajuEverydaySituation, SajuInput, SajuPersona, SajuQuestionPrompt, SajuReadingItem, SajuReadingKey, SajuRelation, SajuResult, SajuSituationContext, SajuStructuredReadings } from '../types';
import { ELEMENT_LANGUAGE, SAJU_DISCLAIMER, SAJU_KNOWLEDGE_BASE_VERSION, SAJU_RULES } from './SajuKnowledgeBase';
import { BRANCH_RELATIONS, HEAVENLY_STEMS, STEM_ELEMENTS } from './SajuRuleDefinitions';

const TOPICS: SajuReadingKey[] = ['overall', 'personality', 'career', 'money', 'relationships', 'familyPatterns', 'healthLifestyle', 'futureTrends', 'daewoon', 'compatibility', 'question'];

const compact = (value: string, length = 120): string => value.replace(/\s+/gu, ' ').trim().slice(0, length);

const confidenceFor = (input: SajuInput, base: SajuConfidence): SajuConfidence => {
  if (base === '높음' && (input.timeUnknown || input.calendar === 'lunar')) return '중간';
  if (base === '중간' && (input.timeUnknown || input.calendar === 'lunar')) return '낮음';
  return base;
};

const visibleTenGods = (chart: SajuChart): string[] => chart.pillars.filter((pillar) => pillar.known && pillar.name !== '일주').map((pillar) => pillar.visibleTenGod ?? '').filter(Boolean);

const hasAny = (values: string[], targets: string[]): boolean => targets.some((target) => values.includes(target));

const dominantAndGap = (chart: SajuChart): { dominant: keyof typeof ELEMENT_LANGUAGE; gap: keyof typeof ELEMENT_LANGUAGE } => {
  const ranked = Object.entries(chart.weightedElements).sort(([, first], [, second]) => second - first).map(([element]) => element as keyof typeof ELEMENT_LANGUAGE);
  return { dominant: ranked[0], gap: ranked.at(-1) ?? ranked[0] };
};

const item = (input: SajuInput, id: string, title: string, facts: string[], appliedRuleIds: string[], interpretation: string, timing: string, confidence: SajuConfidence, limitations: string[], advice: string): SajuReadingItem => ({
  id, title, facts, appliedRuleIds, interpretation, timing, confidence: confidenceFor(input, confidence), limitations, advice,
});

const dayPillarStage = (chart: SajuChart): { branch: string; stage: string } => {
  const pillar = chart.pillars.find((item) => item.name === '일주');
  return { branch: pillar?.branch ?? '미상', stage: pillar?.growthStage ?? '미상' };
};

const PERSONA_TITLES: Record<keyof typeof ELEMENT_LANGUAGE, string> = {
  목: '가능성을 키우는 연결자',
  화: '생각을 밝히는 점화자',
  토: '흐름을 받치는 조율자',
  금: '기준을 세우는 편집자',
  수: '길을 탐색하는 관찰자',
};

const PERSONA_EXAMPLES: Record<keyof typeof ELEMENT_LANGUAGE, string> = {
  목: '새로운 일을 맡으면 먼저 사람과 아이디어를 연결하고, 나중에 마감 기준을 세우는 모습으로 나타날 수 있습니다.',
  화: '회의에서 분위기를 살리고 방향을 빠르게 제안하지만, 혼자 회복할 시간을 뒤늦게 챙기는 모습으로 나타날 수 있습니다.',
  토: '팀에서 일정과 사람을 안정시키는 역할을 자연스럽게 맡지만, 익숙한 방식이 편해 변화 신호를 천천히 확인할 수 있습니다.',
  금: '일을 시작하기 전에 기준과 예외를 정리해두면 편안하지만, 상대의 사정까지 확인한 뒤 결론을 내리면 대화가 더 부드러워질 수 있습니다.',
  수: '정보를 충분히 모은 뒤 움직이려는 편이라 선택의 질은 높아질 수 있지만, 시작 시점을 미리 정해두면 탐색이 길어지는 것을 막을 수 있습니다.',
};

const buildPersona = (chart: SajuChart, input: SajuInput): SajuPersona => {
  const { dominant, gap } = dominantAndGap(chart);
  const stage = dayPillarStage(chart);
  const gods = visibleTenGods(chart);
  return {
    title: PERSONA_TITLES[dominant],
    characteristics: [
      `${dominant}(${chart.dayMaster.element}) 중심의 ${ELEMENT_LANGUAGE[dominant].strength.replace(/\.$/u, '')}`,
      `일간 강약은 ${chart.dayMasterStrength}으로 분류되어 ${chart.dayMasterStrength === '강함' ? '주도권과 실행 공간' : chart.dayMasterStrength === '약함' ? '지지체계와 작은 시작' : '자극과 회복의 균형'}을 의식할 수 있습니다.`,
      `일주 십이운성은 ${stage.stage}이며, 월령은 ${chart.seasonalInfluence.season}·${chart.seasonalInfluence.element}입니다.`,
    ],
    strengths: [
      `${ELEMENT_LANGUAGE[dominant].strength} 실제 생활에서는 관심과 에너지가 모이는 곳을 빠르게 알아차리는 강점으로 나타날 수 있습니다.`,
      `${gods.length ? `겉으로 드러난 십신 ${gods.slice(0, 2).join('·')}의 신호를` : '차트의 표면 신호를'} 결과물이나 관계의 기준으로 옮길 때 힘을 발휘할 수 있습니다.`,
    ],
    blindSpots: [
      `${ELEMENT_LANGUAGE[gap].gap} 보완 대상으로 본 ${gap}의 리듬을 의식하면 선택의 폭이 넓어질 수 있습니다.`,
      '내가 익숙한 속도와 상대가 준비된 속도가 다를 수 있어 중간 확인이 도움이 될 수 있습니다.',
    ],
    everydayExample: PERSONA_EXAMPLES[dominant],
    evidence: [
      `일간 ${chart.dayMaster.stem}(${chart.dayMaster.element}) · 강약 ${chart.dayMasterStrength}`,
      `가중 오행 기준 중심 ${dominant} · 보완을 생각할 기운 ${gap}`,
      `월령 ${chart.pillars[1].branch} · ${chart.seasonalInfluence.season} · 일주 십이운성 ${stage.stage}`,
      `겉으로 드러난 십신 ${gods.length ? gods.join('·') : '뚜렷한 신호 없음'}`,
    ],
    appliedRuleIds: ['balance.day-master', 'seasonal.influence', 'structure.visible-ten-gods'],
    confidence: confidenceFor(input, '중간'),
  };
};

const SITUATION_LABELS: Record<SajuSituationContext, string> = {
  work: '일과 커리어',
  relationships: '관계와 소통',
  family: '가족과 경계',
  money: '돈과 선택',
  growth: '개인 성장',
};

const buildEverydaySituations = (chart: SajuChart, input: SajuInput): Record<SajuSituationContext, SajuEverydaySituation> => {
  const { dominant, gap } = dominantAndGap(chart);
  const stage = dayPillarStage(chart);
  const gods = visibleTenGods(chart);
  const commonEvidence = [`일간 ${chart.dayMaster.stem}(${chart.dayMaster.element}) · 강약 ${chart.dayMasterStrength}`, `가중 오행 중심 ${dominant} · 보완을 생각할 기운 ${gap}`, `월령 ${chart.seasonalInfluence.season} · 십이운성 ${stage.stage}`];
  const templates: Record<SajuSituationContext, Omit<SajuEverydaySituation, 'context' | 'label' | 'evidence' | 'confidence'>> = {
    work: { title: '일할 때의 속도와 구조', interpretation: `${ELEMENT_LANGUAGE[dominant].strength} 업무에서는 ${chart.dayMasterStrength === '강함' ? '내가 방향을 잡고 실행 공간을 확보할 때' : '작은 단위의 목표와 지지받는 구조가 있을 때'} 몰입하기 쉬울 수 있습니다.`, everydayExample: '예: 일을 시작하기 전 “오늘 끝낼 한 가지”를 정하면 넓은 관심을 실제 결과물로 모으는 데 도움이 됩니다.', reflection: '나는 지금 속도보다 구조가 필요한가, 아니면 더 넓은 시야가 필요한가?', action: '오늘 업무에서 결과물 하나의 완료 기준을 한 문장으로 적어보세요.', appliedRuleIds: ['career.output-officer', 'balance.day-master'] },
    relationships: { title: '관계에서 주고받는 리듬', interpretation: `관계에서는 ${chart.relations.length ? '차트에 표시된 지지 관계를 조율의 질문으로 삼고' : '특정 지지 관계를 단정하지 않고'} ${ELEMENT_LANGUAGE[dominant].advice.toLowerCase()}`, everydayExample: `예: 대화가 꼬일 때 내 의도를 설명하기 전에 상대가 들은 핵심을 한 번 확인해보세요. ${gods.length ? `현재 차트에는 ${gods.slice(0, 2).join('·')} 신호도 보입니다.` : ''}`, reflection: '나는 상대에게 원하는 것을 설명했나, 아니면 알아서 알아주길 기대했나?', action: '중요한 대화에서 사실·바람·경계를 각각 한 문장씩 나눠 말해보세요.', appliedRuleIds: ['relationship.combine-clash', 'balance.day-master'] },
    family: { title: '가족 안에서 맡기 쉬운 역할', interpretation: '가족 구성원이나 반복 패턴을 차트로 추론하지 않습니다. 다만 내 차트의 속도와 경계 감각을 가족 대화에서 어떻게 경험하는지 관찰할 수 있습니다.', everydayExample: '예: 부탁을 바로 맡거나 반대로 설명 없이 거리를 두기 전에, 내가 할 수 있는 범위와 어려운 범위를 먼저 말해보세요.', reflection: '가족 안에서 내가 자동으로 맡는 역할과 내려놓고 싶은 역할은 무엇인가?', action: '이번 주 가족 대화에서 지킬 수 있는 경계 하나를 짧게 알려보세요.', appliedRuleIds: ['family.explicit-only', 'balance.day-master'] },
    money: { title: '돈을 다룰 때의 기준', interpretation: `${ELEMENT_LANGUAGE[dominant].strength} 돈과 자원에서는 ${chart.dayMasterStrength === '강함' ? '내가 통제할 수 있는 기준을 세우는 것' : '외부 자료와 함께 작은 결정을 검증하는 것'}이 도움이 될 수 있습니다. 오행은 재정 성과를 예측하지 않습니다.`, everydayExample: '예: 사고 싶은 것과 실제로 필요한 것을 분리해 적으면 감정과 기준을 함께 볼 수 있습니다.', reflection: '이 선택은 지금의 필요인가, 불안을 줄이기 위한 즉흥적 반응인가?', action: '이번 달 고정비·변동비·보류할 지출을 세 줄로 나눠보세요.', appliedRuleIds: ['money.wealth', 'balance.day-master'] },
    growth: { title: '성장할 때 필요한 리듬', interpretation: `${ELEMENT_LANGUAGE[gap].gap} 현재의 성장 과제는 부족한 면을 몰아붙이는 것이 아니라 ${gap}의 방식을 작은 실험으로 초대하는 데 있을 수 있습니다.`, everydayExample: `예: ${ELEMENT_LANGUAGE[gap].advice}`, reflection: '내 강점을 유지하면서 새로 연습할 수 있는 가장 작은 행동은 무엇인가?', action: '이번 주에 20분만 투자할 실험 하나를 정하고 끝난 뒤 느낌을 기록해보세요.', appliedRuleIds: ['balance.day-master', 'lifestyle.element'] },
  };
  return Object.fromEntries((Object.keys(templates) as SajuSituationContext[]).map((context) => [context, { context, label: SITUATION_LABELS[context], evidence: commonEvidence, confidence: confidenceFor(input, '낮음'), ...templates[context] }])) as Record<SajuSituationContext, SajuEverydaySituation>;
};

const timingEvidence = (chart: SajuChart): { daewoon: string; annual: string } => ({
  daewoon: chart.daewoon[0] ? `${chart.daewoon[0].startAge}~${chart.daewoon[0].endAge}세 대운 ${chart.daewoon[0].pillar}` : '성별 미지정으로 대운 방향 미계산',
  annual: chart.annualLuck[0] ? `${chart.annualLuck[0].year}년 ${chart.annualLuck[0].pillar} 세운` : '세운 자료 없음',
});

const buildQuestionPrompts = (chart: SajuChart, input: SajuInput): SajuQuestionPrompt[] => {
  const { dominant, gap } = dominantAndGap(chart);
  const stage = dayPillarStage(chart);
  const timing = timingEvidence(chart);
  const relation = chart.relations.length ? chart.relations.map((item) => item.label).join(' · ') : '표시된 지지 관계 없음';
  const common = [`일간 ${chart.dayMaster.stem}(${chart.dayMaster.element}) · 강약 ${chart.dayMasterStrength}`, `가중 오행 중심 ${dominant} · 보완 ${gap}`, `${timing.daewoon} · ${timing.annual}`];
  return [
    { id: 'stuck', question: '왜 요즘 자꾸 막힌 느낌이 들까요?', answer: `${gap} 기운을 보완할 여지가 보이고, ${timing.annual}은 결과를 단정하기보다 우선순위를 다시 보는 시기로 사용할 수 있습니다. 지금의 막힘을 능력 부족으로 해석하기보다, ${ELEMENT_LANGUAGE[gap].advice.toLowerCase()}`, evidence: common, reflectionQuestion: '지금 막힌 일에서 줄여도 되는 선택 하나는 무엇인가요?', action: '오늘 해야 할 일을 하나만 남기고 25분 동안 작게 시작해보세요.', appliedRuleIds: ['balance.day-master', 'timing.annual-monthly'], confidence: confidenceFor(input, '낮음') },
    { id: 'decision', question: '왜 결정을 내리기가 어려울까요?', answer: `일간 강약 ${chart.dayMasterStrength}과 ${dominant} 중심의 흐름을 보면, 결정을 내리는 방식도 에너지 상태의 영향을 받을 수 있습니다. ${timing.daewoon}을 참고하되 운이 결정을 대신한다고 보지는 않습니다.`, evidence: [...common, `일주 십이운성 ${stage.stage}`], reflectionQuestion: '결정을 미루는 이유는 정보 부족인가요, 손실을 감당할 기준 부족인가요?', action: '결정 기준을 세 개로 제한하고 각 선택지를 한 줄씩만 비교해보세요.', appliedRuleIds: ['balance.day-master', 'timing.daewoon'], confidence: confidenceFor(input, '낮음') },
    { id: 'environment', question: '어떤 환경에서 실력을 잘 발휘할까요?', answer: `${chart.seasonalInfluence.season}의 월령과 ${dominant} 중심의 오행은 ${chart.dayMasterStrength === '강함' ? '자율성과 결과 기준이 분명한 환경' : '피드백과 지지 구조가 있는 환경'}을 먼저 시험해볼 단서를 줍니다.`, evidence: [`월지 ${chart.pillars[1].branch} · ${chart.seasonalInfluence.season} · ${chart.seasonalInfluence.element}`, ...common.slice(0, 2)], reflectionQuestion: '지금 환경에서 자율성·피드백·회복 중 무엇이 가장 부족한가요?', action: '다음 일주일 동안 몰입이 올라간 조건과 떨어진 조건을 각각 기록해보세요.', appliedRuleIds: ['seasonal.influence', 'balance.day-master'], confidence: confidenceFor(input, '중간') },
    { id: 'communication', question: '가까운 사람과 어떻게 더 잘 소통할까요?', answer: `${relation}의 지지 관계는 관계의 결과가 아니라 조율해야 할 속도와 기대치의 질문으로 읽습니다. ${ELEMENT_LANGUAGE[dominant].advice}`, evidence: [`관계 관련 지지 관계: ${relation}`, `겉으로 드러난 십신: ${visibleTenGods(chart).join('·') || '뚜렷한 신호 없음'}`, ...common.slice(0, 1)], reflectionQuestion: '내가 전달하고 싶은 사실과 상대에게 바라는 행동을 구분했나요?', action: '다음 대화에서 “내가 관찰한 사실은…, 바라는 것은…” 형식을 한 번 사용해보세요.', appliedRuleIds: ['relationship.combine-clash', 'structure.visible-ten-gods'], confidence: confidenceFor(input, '낮음') },
    { id: 'focus', question: '이 기간에는 무엇에 집중하면 좋을까요?', answer: `${timing.daewoon}과 ${timing.annual}을 상징적인 시간표로 참고하면, 지금은 ${dominant}의 장점을 넓히되 ${gap}을 보완하는 작은 실험을 배치하기 좋습니다.`, evidence: [...common, `월운 ${chart.monthlyLuck.length}개 절기월 계산`], reflectionQuestion: '이번 기간에 시작할 일·보류할 일·확인할 사람은 각각 누구인가요?', action: '일정에 집중할 한 가지와 보류할 한 가지를 표시해보세요.', appliedRuleIds: ['timing.daewoon', 'timing.annual-monthly'], confidence: confidenceFor(input, '낮음') },
    { id: 'pattern', question: '내가 조심해서 볼 패턴은 무엇일까요?', answer: `일주 십이운성 ${stage.stage}와 ${dominant} 중심 흐름은 내가 편안하게 반복하는 리듬을 관찰하는 소재가 될 수 있습니다. ${ELEMENT_LANGUAGE[gap].gap}`, evidence: [`일주 십이운성 ${stage.stage}`, `가중 오행 ${dominant} 중심 · ${gap} 보완`, `지지 관계 ${relation}`], reflectionQuestion: '이 패턴은 언제 나를 돕고, 언제 선택지를 좁히나요?', action: '반복되는 장면 하나를 사실·내 해석·다음 선택으로 나눠 적어보세요.', appliedRuleIds: ['balance.day-master', 'lifestyle.element'], confidence: confidenceFor(input, '낮음') },
  ];
};

const buildEnergyWeather = (chart: SajuChart, input: SajuInput): SajuEnergyWeatherItem[] => {
  const { dominant, gap } = dominantAndGap(chart);
  const records: Array<{ type: SajuEnergyWeatherItem['type']; period: string; pillar: string; element: keyof typeof ELEMENT_LANGUAGE }> = [
    ...chart.daewoon.slice(0, 1).map((luck) => ({ type: '대운' as const, period: `${luck.startAge}~${luck.endAge}세`, pillar: luck.pillar, element: STEM_ELEMENTS[HEAVENLY_STEMS.indexOf(luck.stem as typeof HEAVENLY_STEMS[number])] })),
    ...chart.annualLuck.slice(0, 3).map((luck) => ({ type: '세운' as const, period: `${luck.year ?? ''}년`, pillar: luck.pillar, element: luck.element })),
    ...chart.monthlyLuck.slice(0, 6).map((luck) => ({ type: '월운' as const, period: luck.label, pillar: luck.pillar, element: luck.element })),
  ];
  return records.map(({ type, period, pillar, element }) => {
    const isDominant = element === dominant;
    const isGap = element === gap;
    const category = isDominant ? '확장·집중' : isGap ? '회복·균형' : type === '대운' ? '전환·준비' : type === '세운' ? '역할 점검' : '생활 리듬 점검';
    const tone = isDominant || isGap ? 'supportive' : 'mixed';
    const summary = isDominant ? `${element} 기운이 차트의 중심과 겹쳐, 이미 가진 강점을 좁은 우선순위에 모아보기 좋은 상징적 구간입니다.` : isGap ? `${element} 기운을 생활에 초대하며 평소와 다른 방식의 회복·정리를 연습해볼 수 있는 구간입니다.` : `${element} 기운이 중심과 보완 사이를 조율하는 구간입니다. 속도를 정하기 전에 실제 반응을 확인해보세요.`;
    return { type, period, pillar, element, category, tone, summary, suggestion: ELEMENT_LANGUAGE[element].advice, evidence: `${type} ${period} · ${pillar} · 오행 ${element} · 차트 중심 ${dominant} / 보완 ${gap}`, confidence: confidenceFor(input, '낮음') };
  });
};

const baseLimitations = (input: SajuInput): string[] => [
  ...(input.timeUnknown ? ['출생 시간이 없어 시주·시주 기반 해석은 제외했습니다.'] : []),
  ...(input.calendar === 'lunar' ? ['음력 변환은 번들 앵커와 평균 삭망월을 사용한 간소화 방식입니다.'] : []),
  '학파와 절기 시각에 따라 다른 결과가 나올 수 있습니다.',
];

const compareCharts = (primary: SajuChart, other: SajuChart): SajuCompatibilitySummary => {
  const sharedElements = (Object.keys(primary.elements) as Array<keyof typeof primary.elements>).filter((element) => primary.elements[element] > 0 && other.elements[element] > 0);
  const complementaryElements = (Object.keys(primary.elements) as Array<keyof typeof primary.elements>).filter((element) => (primary.elements[element] === 0) !== (other.elements[element] === 0));
  const primaryDayPillar = primary.pillars.find((pillar) => pillar.name === '일주');
  const otherDayPillar = other.pillars.find((pillar) => pillar.name === '일주');
  const primaryGrowthStage = { branch: primaryDayPillar?.branch ?? '미상', stage: primaryDayPillar?.growthStage ?? '미상' };
  const otherGrowthStage = { branch: otherDayPillar?.branch ?? '미상', stage: otherDayPillar?.growthStage ?? '미상' };
  const firstBranches = primary.pillars.filter((pillar) => pillar.known).map((pillar) => pillar.branch);
  const secondBranches = other.pillars.filter((pillar) => pillar.known).map((pillar) => pillar.branch);
  const relations: SajuRelation[] = [];
  const entries = Object.entries(BRANCH_RELATIONS) as Array<[SajuRelation['type'], readonly (readonly string[])[]]>;
  firstBranches.forEach((first) => secondBranches.forEach((second) => entries.forEach(([type, pairs]) => pairs.forEach((pair) => {
    if (pair.length === 2 && pair.includes(first) && pair.includes(second) && first !== second) relations.push({ type, label: `두 차트 ${first}${second} ${type}`, branches: [first, second], ruleId: `compatibility.${type}`, note: '두 사람의 지지 사이 관계표를 대조했습니다.' });
  }))));
  // ponytail: compare day-pillar stages only; full synastry needs school-specific rules and verified birth data.
  const growthNote = primaryGrowthStage.stage === otherGrowthStage.stage
    ? `두 사람 모두 일주 십이운성이 ${primaryGrowthStage.stage}로, 관계에서 비슷한 속도와 회복 방식을 관찰해볼 수 있습니다.`
    : `나의 일주 십이운성은 ${primaryGrowthStage.stage}, 상대는 ${otherGrowthStage.stage}로 다릅니다. 관계의 속도·표현·회복 방식이 다를 수 있어 먼저 맞춰볼 질문이 생깁니다.`;
  return {
    primaryDayMaster: { stem: primary.dayMaster.stem, element: primary.dayMaster.element, yinYang: primary.dayMaster.yinYang },
    otherDayMaster: { stem: other.dayMaster.stem, element: other.dayMaster.element, yinYang: other.dayMaster.yinYang },
    primaryGrowthStage,
    otherGrowthStage,
    sharedElements,
    complementaryElements,
    relations,
    growthNote,
    note: '궁합은 두 차트의 상호작용을 비교하는 참고 자료이며 관계의 우열이나 결과를 결정하지 않습니다.',
  };
};

const buildReadings = (chart: SajuChart, input: SajuInput, otherChart?: SajuChart): SajuStructuredReadings => {
  const { dominant, gap } = dominantAndGap(chart);
  const dayMaster = chart.dayMaster;
  const language = ELEMENT_LANGUAGE[dominant];
  const gapLanguage = ELEMENT_LANGUAGE[gap];
  const gods = visibleTenGods(chart);
  const limitations = baseLimitations(input);
  const readings = TOPICS.reduce<Record<SajuReadingKey, SajuReadingItem[]>>((record, topic) => { record[topic] = []; return record; }, {} as Record<SajuReadingKey, SajuReadingItem[]>);
  const add = (topic: SajuReadingKey, value: SajuReadingItem): void => { readings[topic].push(value); };

  add('overall', item(input, 'overall.balance', '차트의 중심', [
    `일간 ${dayMaster.stem}(${dayMaster.element})`,
    `월지 ${chart.pillars[1].branch} · ${chart.seasonalInfluence.season} 계절`,
    `가중 오행 기준 강한 기운 ${dominant}, 보완을 생각할 기운 ${gap}`,
    `일간 강약 분류 ${chart.dayMasterStrength}`,
  ], ['balance.day-master', 'seasonal.influence', 'shinsal.school-variants'], `${language.strength} ${language.gap} 이는 성격이나 운명을 확정하는 진술이 아니라, 차트 안의 상대적 비중을 생활 언어로 옮긴 것입니다.`, '현재의 자기 관찰과 생활 리듬 점검', '중간', limitations, gapLanguage.advice));

  add('personality', item(input, 'personality.structure', '행동 패턴의 단서', [`일간 ${dayMaster.stem}의 오행 ${dayMaster.element}`, `일간 강약 ${chart.dayMasterStrength}`, `겉으로 드러난 십신 ${gods.length ? gods.join('·') : '없음'}`], ['balance.day-master', 'structure.visible-ten-gods'], `${language.strength} 일할 때는 ${chart.dayMasterStrength === '강함' ? '주도권과 실행 공간' : chart.dayMasterStrength === '약함' ? '지지체계와 작은 시작' : '자극과 회복의 균형'}을 의식하면 자기 관찰에 도움이 될 수 있습니다.`, '반복되는 선택과 대화 장면을 기록하는 기간', '중간', limitations, language.advice));

  const careerRule = hasAny(gods, ['식신', '상관']) ? '표현·제작·개선이 결과물로 이어지는 역할' : hasAny(gods, ['정관', '편관']) ? '기준·책임·운영을 다루는 역할' : '관심 분야의 문제를 구조화하고 협업하는 역할';
  add('career', item(input, 'career.role', '일과 환경', [`십신 단서 ${gods.length ? gods.join('·') : '겉으로 드러난 단서 적음'}`, `월령 환경 ${chart.seasonalInfluence.season}·${chart.seasonalInfluence.element}`], ['career.output-officer', 'seasonal.influence'], `${careerRule}을 탐색 후보로 볼 수 있습니다. 적합성을 단정하지 않고 실제 업무의 피드백·자율성·회복 가능성을 함께 확인하세요.`, '향후 역할을 고를 때의 비교 기준', '낮음', limitations, '업무에서 에너지가 오르는 순간과 소진되는 조건을 2주간 기록해보세요.'));

  const wealthCount = gods.filter((god) => god === '정재' || god === '편재').length;
  add('money', item(input, 'money.resources', '돈과 자원', [`재성 표면 신호 ${wealthCount}개`, `오행 균형의 중심 ${dominant}`], ['money.wealth', 'balance.day-master'], `재성 신호는 돈의 보유나 사업 성공을 보장하지 않습니다. 자원·거래·가치 교환을 어떤 기준으로 관리하는지 점검하는 소재로만 사용합니다.`, '예산·계약·현금흐름을 점검할 때', '낮음', [...limitations, '재정 판단은 실제 자료와 전문가 검토를 우선해야 합니다.'], '고정비·변동비·손실 한도를 분리해 기록해보세요.'));

  const relationLabels = chart.relations.length ? chart.relations.map((relation) => relation.label).join(', ') : '눈에 띄는 지지 관계 없음';
  const relationshipSignals = chart.indicators.filter((indicator) => indicator.present && ['shinsal.dohwa', 'shinsal.cheoneul'].includes(indicator.id)).map((indicator) => indicator.label);
  add('relationships', item(input, 'relationships.interaction', '관계의 상호작용', [`지지 관계 ${relationLabels}`, `관계 관련 신살 ${relationshipSignals.length ? relationshipSignals.join('·') : '확인되지 않음'}`], ['relationship.combine-clash', 'shinsal.school-variants'], `합은 조율과 연결의 질문으로, 충·해·파·형은 속도와 기대치가 달라질 때의 조율 과제로 읽습니다. 관계의 결과를 예언하지 않으며, 실제 대화와 경계를 우선합니다.`, '중요한 대화나 관계의 전환을 앞둔 시기', '낮음', limitations, '상대의 의도보다 관찰 가능한 행동과 합의한 경계를 먼저 적어보세요.'));

  if (input.background.family.trim()) {
    add('familyPatterns', item(input, 'family.explicit', '제공한 가족 맥락', [`직접 입력된 가족 메모에서 감지한 신호: ${chart.backgroundSignals.length ? chart.backgroundSignals.join('·') : '특정 신호 없음'}`], ['family.explicit-only'], '가족에 관한 해석은 사용자가 직접 제공한 맥락의 표현만 요약합니다. 차트로 가족 구성원, 유전, 의료 상태, 피할 수 없는 반복을 추론하지 않습니다.', '사용자가 기록한 가족 장면을 다시 관찰할 때', '높음', ['입력된 메모 밖의 가족 사실은 판단하지 않습니다.'], '메모 속 사실·해석·바라는 변화를 세 칸으로 나눠 적어보세요.'));
  } else {
    add('familyPatterns', item(input, 'family.missing-context', '가족 맥락 없음', ['가족 배경을 입력하지 않음'], ['family.explicit-only'], '가족 패턴을 차트만으로 추론하지 않습니다. 원한다면 직접 경험한 대화·역할·거리감만 입력해 자기 성찰 질문으로 사용할 수 있습니다.', '추가 정보가 제공될 때', '높음', ['가족·유전·의료 사실을 추론하지 않습니다.'], '사실로 확인할 수 있는 장면 한 가지와 내가 원하는 경계 한 가지를 적어보세요.'));
  }

  add('healthLifestyle', item(input, 'lifestyle.balance', '생활 리듬', [`상대적으로 보완할 오행 ${gap}`, `계절 환경 ${chart.seasonalInfluence.season}`], ['lifestyle.element', 'balance.day-master'], `${gapLanguage.advice} 오행은 의료 지표가 아니며 건강 상태·질병·수명을 판단하는 데 사용하지 않습니다.`, '수면·식사·활동의 리듬을 관찰하는 기간', '낮음', [...limitations, '의료·심리 진단이나 치료 조언이 아닙니다.'], '몸의 증상 해석 대신 수면·휴식·움직임의 패턴만 기록하고 필요하면 전문가를 찾으세요.'));

  const annual = chart.annualLuck.slice(0, 3).map((luck) => `${luck.year}년 ${luck.pillar}`).join(' · ');
  add('futureTrends', item(input, 'timing.annual', '앞으로의 점검표', [`세운 예시 ${annual}`, `월운은 ${chart.monthlyLuck.length}개 절기월로 계산`], ['timing.annual-monthly'], '앞으로의 간지는 특정 사건을 보장하지 않습니다. 각 기간에 목표·자원·관계의 점검 질문을 배치하는 달력으로 활용하세요.', '연간·절기월 단위 계획 점검', '낮음', [...limitations, '미래 사건을 확정하거나 예언하지 않습니다.'], '각 기간에 시작할 일·보류할 일·확인할 사람을 한 가지씩 정해보세요.'));

  if (chart.daewoon.length) {
    const first = chart.daewoon[0];
    add('daewoon', item(input, 'timing.daewoon', '대운 흐름', [`대운 방향 ${first.direction}`, `첫 대운 ${first.pillar} · ${first.startAge}~${first.endAge}세`], ['timing.daewoon'], '대운은 큰 주기의 이름과 시작 구간을 표시하는 전통 계산 프레임입니다. 실제 전환 사건을 확정하지 않고 장기 계획을 돌아보는 기준으로만 사용하세요.', `${first.startAge}세 전후부터 10년 단위 참고`, '낮음', [...limitations, '성별 미지정이면 대운 방향을 계산하지 않습니다.'], '주기 이름보다 현재의 목표와 실제 환경 변화를 함께 확인하세요.'));
  } else {
    add('daewoon', item(input, 'timing.daewoon-unknown', '대운 방향 미계산', ['성별이 선택되지 않아 순·역행 방향을 정하지 않음'], ['timing.daewoon'], '선택한 전통 계산 방식은 성별과 년간 음양으로 대운 방향을 정하므로, 성별을 선택하지 않으면 대운을 표시하지 않습니다.', '성별과 방법을 선택한 뒤 재계산', '높음', ['성별을 입력하지 않은 상태의 제한입니다.'], '대운 없이도 연간·월간 계획 점검을 먼저 사용할 수 있습니다.'));
  }

  const question = compact(input.question);
  add('question', item(input, 'question.boundary', '선택 질문', [question ? `사용자 질문: ${question}` : '질문을 입력하지 않음'], ['question.rule-bounded'], question ? `질문을 차트의 일간·계절·관계 규칙과 연결해 검토할 수 있지만, 정답이나 미래 사건을 확정하지 않습니다.` : '궁금한 질문을 입력하면 계산된 차트 사실과 적용 규칙을 연결해 자기 점검 문장으로 구성합니다.', '질문과 관련한 다음 행동을 점검할 때', '중간', [...limitations, '질문만으로 지원되지 않는 사실을 추론하지 않습니다.'], '질문을 “내가 확인할 수 있는 행동”으로 바꿔 한 가지 실험을 정해보세요.'));

  if (otherChart) {
    const compatibility = compareCharts(chart, otherChart);
    add('compatibility', item(input, 'compatibility.two-charts', '십이운성으로 보는 두 사람', [`나의 일간 ${chart.dayMaster.stem}(${chart.dayMaster.element}) · 일주 운성 ${compatibility.primaryGrowthStage.stage}`, `상대 일간 ${compatibility.otherDayMaster.stem}(${compatibility.otherDayMaster.element}) · 일주 운성 ${compatibility.otherGrowthStage.stage}`, `공통 오행 ${compatibility.sharedElements.join('·') || '없음'}`, `보완 지점 ${compatibility.complementaryElements.join('·') || '뚜렷하지 않음'}`, `교차 지지 관계 ${compatibility.relations.length}건`], ['compatibility.two-charts', 'compatibility.twelve-growth'], `${compatibility.growthNote} ${compatibility.note} 공통점은 대화의 기반으로, 차이는 기대치와 경계를 맞추는 질문으로 사용해보세요.`, '함께 계획을 세우거나 중요한 대화를 준비할 때', '낮음', [...limitations, '상대 차트의 음력·시간 정보가 간소화되었을 수 있습니다.'], '누가 더 맞는지보다 각자 원하는 속도·역할·경계를 한 문장씩 합의해보세요.'));
  } else {
    add('compatibility', item(input, 'compatibility.missing', '두 번째 차트 없음', ['궁합용 상대 출생 정보가 입력되지 않음'], ['compatibility.two-charts'], '궁합은 두 사람의 차트를 함께 계산해야 하므로 한 사람의 차트만으로 판단하지 않습니다.', '두 번째 출생 정보를 입력한 뒤 재계산', '높음', ['상대방의 정보와 동의 없이는 해석하지 않습니다.'], '상대의 동의와 정확한 입력을 먼저 확인하세요.'));
  }

  const summary = [
    `일간 ${dayMaster.stem}(${dayMaster.element}) · ${chart.dayMasterStrength} · 월지 ${chart.pillars[1].branch}`,
    `가중 오행에서 ${dominant} 비중이 가장 높고 ${gap} 보완을 점검합니다.`,
    chart.relations.length ? `지지 관계 ${chart.relations.length}건과 신살 표를 별도로 확인했습니다.` : '표시할 지지 관계가 없어 기본 구조 중심으로 읽었습니다.',
  ];
  const timing = [
    ...chart.daewoon.slice(0, 3).map((cycle) => `${cycle.startAge}~${cycle.endAge}세 대운 ${cycle.pillar} (${cycle.direction})`),
    ...chart.annualLuck.slice(0, 3).map((luck) => `${luck.year}년 ${luck.pillar} 세운`),
  ];
  const uncertainties = [
    ...(input.timeUnknown ? ['출생 시간 미상으로 시주와 시간 기반 해석이 제한됩니다.'] : []),
    ...(input.calendar === 'lunar' ? ['음력 변환은 간소화 방식이며 정확한 달력 데이터와 다를 수 있습니다.'] : []),
    ...(input.gender === 'unspecified' ? ['성별 미지정으로 성별을 사용하는 대운 순·역행은 표시하지 않습니다.'] : []),
    '신살과 대운은 학파별 공식이 다르므로 적용 방법을 결과에 함께 표시합니다.',
    '건강·가족·미래에 관한 문장은 진단이나 확정적 예언이 아닙니다.',
  ];
  return { summary, readings, timing, uncertainties };
};

export const interpretSaju = (chart: SajuChart, input: SajuInput, otherChart?: SajuChart): { structuredReadings: SajuStructuredReadings; appliedRules: string[]; knowledgeBaseVersion: string; interpretations: SajuResult['interpretations']; compatibility?: SajuCompatibilitySummary; persona: SajuPersona; everydaySituations: Record<SajuSituationContext, SajuEverydaySituation>; questionPrompts: SajuQuestionPrompt[]; energyWeather: SajuEnergyWeatherItem[] } => {
  const built = buildReadings(chart, input, otherChart);
  const structuredReadings: SajuStructuredReadings = { ...built, readings: Object.fromEntries(TOPICS.map((topic) => [topic, built.readings[topic].map((reading) => ({ ...reading, sourceReferences: reading.appliedRuleIds.map((id) => SAJU_RULES.find((rule) => rule.id === id)?.sourceReference).filter((source): source is string => Boolean(source)) }))])) as SajuStructuredReadings['readings'] };
  const appliedRules = [...new Set([...TOPICS.flatMap((topic) => structuredReadings.readings[topic].flatMap((reading) => reading.appliedRuleIds)), ...chart.relations.map((relation) => relation.ruleId), ...chart.indicators.filter((indicator) => indicator.present).map((indicator) => indicator.id)])];
  const getText = (key: SajuReadingKey): string => structuredReadings.readings[key][0]?.interpretation ?? structuredReadings.summary[0];
  return {
    structuredReadings,
    appliedRules,
    knowledgeBaseVersion: SAJU_KNOWLEDGE_BASE_VERSION,
    interpretations: {
      general: getText('overall'),
      study: getText('healthLifestyle'),
      career: getText('career'),
      money: getText('money'),
      relationship: getText('relationships'),
      compatibility: getText('compatibility'),
      reflection: getText('personality'),
      future: getText('futureTrends'),
    },
    compatibility: otherChart ? compareCharts(chart, otherChart) : undefined,
    persona: buildPersona(chart, input),
    everydaySituations: buildEverydaySituations(chart, input),
    questionPrompts: buildQuestionPrompts(chart, input),
    energyWeather: buildEnergyWeather(chart, input),
  };
};

export const buildSajuResult = (input: SajuInput, calculation: { chart: SajuChart; method: SajuResult['calculationMethod']; calendarNote: string; simplified: boolean }, interpretation: ReturnType<typeof interpretSaju>): SajuResult => ({
  version: 'saju-v2',
  inputSummary: `${input.birthDate} · ${input.calendar === 'solar' ? '양력' : '음력'} · ${input.timeUnknown ? '출생 시간 미상' : input.birthTime} · ${input.birthPlace} · ${input.timezone}`,
  simplified: calculation.simplified,
  calendarNote: calculation.calendarNote,
  pillars: calculation.chart.pillars,
  elements: calculation.chart.elements,
  yinYang: calculation.chart.yinYang,
  interpretations: interpretation.interpretations,
  disclaimer: SAJU_DISCLAIMER,
  chart: calculation.chart,
  calculationMethod: calculation.method,
  knowledgeBaseVersion: interpretation.knowledgeBaseVersion,
  appliedRules: interpretation.appliedRules,
  structuredReadings: interpretation.structuredReadings,
  backgroundProvided: Boolean(input.background.family.trim() || input.background.personal.trim()),
  selectedTopic: input.topic,
  compatibility: interpretation.compatibility,
  persona: interpretation.persona,
  everydaySituations: interpretation.everydaySituations,
  questionPrompts: interpretation.questionPrompts,
  energyWeather: interpretation.energyWeather,
});
