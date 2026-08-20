import type { FiveElement, SajuConfidence, SajuReadingKey } from '../types';

export const SAJU_KNOWLEDGE_BASE_VERSION = 'saju-kb-2026.1';

export interface SajuKnowledgeRule {
  id: string;
  topic: SajuReadingKey | 'all';
  title: string;
  rule: string;
  sourceReference: string;
  confidence: SajuConfidence;
}

export const SAJU_RULES: SajuKnowledgeRule[] = [
  { id: 'balance.day-master', topic: 'overall', title: '일간과 오행 균형', rule: '일간의 오행 비중·계절 영향·생조 관계를 함께 보아 강약을 분류합니다.', sourceReference: '전통 명리의 억부·조후를 단순화한 MVP 규칙', confidence: '중간' },
  { id: 'structure.visible-ten-gods', topic: 'personality', title: '천간 십신 구조', rule: '일간을 기준으로 겉으로 드러난 천간의 십신 분포를 확인합니다.', sourceReference: '십신의 일간 기준 생극제화 분류', confidence: '중간' },
  { id: 'seasonal.influence', topic: 'overall', title: '월지 계절 영향', rule: '월지의 계절 오행을 차트의 기본 환경으로 사용합니다.', sourceReference: '월령·계절 기운을 우선하는 전통 해석 원칙', confidence: '중간' },
  { id: 'career.output-officer', topic: 'career', title: '관성·식상과 역할', rule: '관성·식상·재성의 존재를 직업 역할과 결과물의 언어로만 해석합니다.', sourceReference: '십신 직업 해석을 비결정적으로 제한한 규칙', confidence: '낮음' },
  { id: 'money.wealth', topic: 'money', title: '재성 신호', rule: '재성은 돈의 보유나 성공을 단정하지 않고 자원·거래·가치 교환의 주제로 읽습니다.', sourceReference: '재성의 전통적 상징을 생활 언어로 제한', confidence: '낮음' },
  { id: 'relationship.combine-clash', topic: 'relationships', title: '합·충 관계', rule: '지지의 합·충·해·파·형을 관계의 상호작용과 조율 과제로 번역합니다.', sourceReference: '지지 관계표와 합충형해파', confidence: '낮음' },
  { id: 'compatibility.two-charts', topic: 'compatibility', title: '두 차트 비교', rule: '두 사람의 일간·오행·지지 관계만 비교하고 우열이나 관계의 결과를 단정하지 않습니다.', sourceReference: '두 차트의 오행 교차·지지 관계 비교 규칙', confidence: '낮음' },
  { id: 'shinsal.school-variants', topic: 'overall', title: '신살 학파 변형', rule: '신살은 선택한 표의 존재 여부만 표시하고 삶의 사건을 단정하지 않습니다.', sourceReference: 'SajuRuleDefinitions.ts의 명시된 신살 조합표', confidence: '낮음' },
  { id: 'family.explicit-only', topic: 'familyPatterns', title: '명시적 가족 맥락만 사용', rule: '사용자가 직접 제공한 가족 메모의 신호만 요약하고 차트에서 가족·유전·의료 사실을 추론하지 않습니다.', sourceReference: '제품 안전 제한 규칙', confidence: '높음' },
  { id: 'lifestyle.element', topic: 'healthLifestyle', title: '생활 리듬과 오행', rule: '오행을 의료 진단이 아닌 생활 리듬·휴식·환경 점검 질문으로만 사용합니다.', sourceReference: '오락·자기성찰용 안전 제한 규칙', confidence: '낮음' },
  { id: 'timing.daewoon', topic: 'daewoon', title: '대운 주기', rule: '성별과 년간 음양에 따른 순·역행, 절기까지의 일수/3 근사로 시작 나이를 계산합니다.', sourceReference: '대운 순역·기운법의 MVP 근사', confidence: '낮음' },
  { id: 'timing.annual-monthly', topic: 'futureTrends', title: '세운·월운', rule: '연도와 절기 월의 간지를 표시하되 미래 예언이 아니라 계획 점검용 시간표로 제공합니다.', sourceReference: '간지 주기 계산 + 비결정적 표현 제한', confidence: '낮음' },
  { id: 'question.rule-bounded', topic: 'question', title: '질문 범위 제한', rule: '질문을 차트 사실과 선택된 주제의 규칙으로만 연결하고 단정적 예언·진단은 제공하지 않습니다.', sourceReference: '제품 안전 제한 규칙', confidence: '중간' },
];

export const ELEMENT_LANGUAGE: Record<FiveElement, { strength: string; gap: string; advice: string }> = {
  목: { strength: '성장·연결·확장의 언어가 두드러질 수 있습니다.', gap: '시작한 일을 마무리하는 구조를 의식해보세요.', advice: '큰 목표를 주간 단위의 작은 실험으로 나눠 기록해보세요.' },
  화: { strength: '표현·추진·가시화의 언어가 두드러질 수 있습니다.', gap: '속도와 회복 사이에 멈춤 지점을 만들어보세요.', advice: '결정 전 짧은 숙고 시간을 두고 에너지 변화를 기록해보세요.' },
  토: { strength: '안정·조율·축적의 언어가 두드러질 수 있습니다.', gap: '변화에 대응할 작은 선택지를 미리 남겨보세요.', advice: '고정 루틴과 실험 루틴을 분리해 운영해보세요.' },
  금: { strength: '기준·분류·정리의 언어가 두드러질 수 있습니다.', gap: '정확성만큼 관계적 맥락도 함께 확인해보세요.', advice: '판단 기준과 예외 조건을 한 줄씩 적어보세요.' },
  수: { strength: '탐색·정보·유연성의 언어가 두드러질 수 있습니다.', gap: '정보 수집과 실행 시작점을 구분해보세요.', advice: '선택 기준을 먼저 정한 뒤 탐색 시간을 제한해보세요.' },
};

export const SAJU_DISCLAIMER = '사주 결과는 전통 문화를 바탕으로 한 오락·자기 성찰용 참고 자료입니다. 과학적으로 입증된 예측이나 전문적 진단이 아니며, 재정·교육·의료·진로·관계 결정을 위한 유일한 근거로 사용하지 마세요.';
