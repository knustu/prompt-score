import type { FiveElement } from '../types';

const ELEMENT_GUIDANCE: Record<FiveElement, { general: string; study: string; career: string; money: string; relationship: string }> = {
  목: {
    general: '성장과 확장을 상징하는 목 기운이 눈에 띕니다. 계획을 작게 나눠 꾸준히 키우는 방식이 잘 맞습니다.',
    study: '새로운 개념을 연결하고 장기 목표를 세우는 학습법을 시도해보세요.',
    career: '아이디어를 실제 프로젝트로 자라게 하는 역할에서 강점을 발견할 수 있습니다.',
    money: '장기 목표와 단계별 예산을 함께 세우면 지출의 방향을 잡기 좋습니다.',
    relationship: '상대의 성장 속도를 존중하고 함께할 다음 단계를 대화로 정해보세요.',
  },
  화: {
    general: '표현과 추진을 상징하는 화 기운이 눈에 띕니다. 시작의 에너지를 일정한 리듬으로 관리하면 좋습니다.',
    study: '짧은 몰입 세션과 즉각적인 피드백을 조합하면 집중을 유지하기 쉽습니다.',
    career: '사람 앞에서 설명하고 분위기를 움직이는 역할에서 동력을 얻을 수 있습니다.',
    money: '결정 전 하루의 숙고 시간을 두어 속도와 계획의 균형을 맞춰보세요.',
    relationship: '감정을 빠르게 표현하되 상대가 답할 시간을 함께 남겨두면 좋습니다.',
  },
  토: {
    general: '안정과 조율을 상징하는 토 기운이 눈에 띕니다. 기반을 다지는 힘을 변화와 함께 사용해보세요.',
    study: '복습 주기와 체크리스트를 활용하면 쌓아가는 학습의 장점이 살아납니다.',
    career: '프로세스를 정리하고 여러 사람의 이해관계를 맞추는 일에서 강점을 보일 수 있습니다.',
    money: '고정비와 변동비를 나누어 기록하면 안정적인 판단에 도움이 됩니다.',
    relationship: '신뢰를 쌓는 반복적인 약속이 관계의 안정감을 높여줍니다.',
  },
  금: {
    general: '기준과 결단을 상징하는 금 기운이 눈에 띕니다. 명확한 기준을 갖되 예외의 여지도 남겨보세요.',
    study: '오답 분류와 기준표처럼 정확도를 높이는 학습 도구가 잘 맞습니다.',
    career: '품질 기준을 세우고 문제를 날카롭게 다듬는 업무에서 강점을 발견할 수 있습니다.',
    money: '목표 수익보다 손실 한도를 먼저 정하면 판단이 더 선명해집니다.',
    relationship: '사실과 감정을 구분해 말하면 단호함이 차가움으로 오해되는 일을 줄일 수 있습니다.',
  },
  수: {
    general: '탐색과 유연함을 상징하는 수 기운이 눈에 띕니다. 정보를 모으는 시간과 실행할 시점을 구분해보세요.',
    study: '질문을 많이 만들고 스스로 설명하는 방식으로 이해를 깊게 해보세요.',
    career: '정보를 연결하고 변화에 맞춰 전략을 바꾸는 역할에서 유연성을 발휘할 수 있습니다.',
    money: '선택지를 많이 열어두기보다 비교 기준을 먼저 정하면 결정 피로를 줄일 수 있습니다.',
    relationship: '상대의 말 속 맥락을 잘 듣는 장점을 경계와 함께 사용해보세요.',
  },
};

export const buildSajuInterpretations = (dominant: FiveElement, deficient: FiveElement, unknownTime: boolean): Record<'general' | 'study' | 'career' | 'money' | 'relationship' | 'compatibility' | 'reflection' | 'future', string> => {
  const guidance = ELEMENT_GUIDANCE[dominant];
  const timeNote = unknownTime ? ' 출생 시간이 확인되지 않아 시주를 제외한 간소화 해석입니다.' : '';
  return {
    general: `${guidance.general}${timeNote} ${deficient} 기운을 보완하는 생활 습관을 작게 실험해보세요.`,
    study: guidance.study,
    career: guidance.career,
    money: guidance.money,
    relationship: guidance.relationship,
    compatibility: `나와 다른 속도와 관점을 가진 사람과 협업할 때 ${deficient}의 빈자리를 보완하는 방법을 배울 수 있습니다. 역할과 기대치를 먼저 맞춰보세요.`,
    reflection: `이번 달 자기 점검 질문: “${dominant}의 장점을 살리면서 ${deficient}를 보완하기 위해 오늘 할 수 있는 가장 작은 행동은 무엇일까?”`,
    future: `앞으로의 흐름은 단정할 수 없습니다. ${dominant}의 강점을 한 가지 프로젝트에 집중하고 ${deficient} 관련 습관을 기록하며 변화를 관찰해보세요.`,
  };
};
