import type { SajuChart, SajuCompatibilitySummary, SajuConfidence, SajuInput, SajuReadingItem, SajuReadingKey, SajuRelation, SajuResult, SajuStructuredReadings } from '../types';
import { ELEMENT_LANGUAGE, SAJU_DISCLAIMER, SAJU_KNOWLEDGE_BASE_VERSION, SAJU_RULES } from './SajuKnowledgeBase';
import { BRANCH_RELATIONS } from './SajuRuleDefinitions';

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

export const interpretSaju = (chart: SajuChart, input: SajuInput, otherChart?: SajuChart): { structuredReadings: SajuStructuredReadings; appliedRules: string[]; knowledgeBaseVersion: string; interpretations: SajuResult['interpretations']; compatibility?: SajuCompatibilitySummary } => {
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
});
