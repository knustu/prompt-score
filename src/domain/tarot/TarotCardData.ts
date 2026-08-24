import type { TarotCard } from '../types';

type CardSeed = Omit<TarotCard, 'loveMeaning' | 'studyMeaning' | 'careerMeaning' | 'moneyMeaning'> & Partial<Pick<TarotCard, 'loveMeaning' | 'studyMeaning' | 'careerMeaning' | 'moneyMeaning'>>;

const makeCard = (seed: CardSeed): TarotCard => ({
  ...seed,
  loveMeaning: seed.loveMeaning ?? `${seed.generalMeaning} 관계에서는 서로의 속도와 기대를 확인해보세요.`,
  studyMeaning: seed.studyMeaning ?? `${seed.generalMeaning} 학습에서는 작은 실행과 점검으로 옮겨보세요.`,
  careerMeaning: seed.careerMeaning ?? `${seed.generalMeaning} 일에서는 우선순위를 정하고 다음 행동을 구체화해보세요.`,
  moneyMeaning: seed.moneyMeaning ?? `${seed.generalMeaning} 돈과 관련해서는 조건을 확인하고 충동적인 결정을 늦춰보세요.`,
});

const MAJOR_CARDS: CardSeed[] = [
  { id: 'major-00', name: '바보 The Fool', arcana: 'Major', uprightKeywords: ['새 출발', '호기심'], reversedKeywords: ['충동', '준비 부족'], generalMeaning: '익숙한 길 밖으로 나서는 시작과 가능성을 말합니다.', advice: '작게 시험하며 첫발을 내디뎌보세요.', warning: '낙관만으로 중요한 조건을 생략하지 마세요.', loveMeaning: '관계에 신선한 시작이 들어옵니다. 다만 기대를 확인하세요.', studyMeaning: '새 분야를 즐겁게 시작하기 좋지만 기초 계획이 필요합니다.', careerMeaning: '새로운 역할이나 프로젝트를 탐색할 수 있습니다.', moneyMeaning: '새 기회가 있어도 예산의 안전선을 먼저 정하세요.' },
  { id: 'major-01', name: '마법사 The Magician', arcana: 'Major', uprightKeywords: ['집중', '자원 활용'], reversedKeywords: ['산만함', '과장'], generalMeaning: '이미 가진 도구를 연결해 결과를 만드는 실행력을 뜻합니다.', advice: '목표에 필요한 자원을 한곳에 모아보세요.', warning: '할 수 있는 일과 말하고 싶은 일을 구분하세요.', loveMeaning: '대화와 표현이 관계의 흐름을 바꿀 수 있습니다.', studyMeaning: '도구와 자료를 조합하면 이해 속도가 빨라집니다.', careerMeaning: '기술과 커뮤니케이션을 활용해 주도권을 잡을 때입니다.', moneyMeaning: '수입원을 늘리기보다 현재 자원의 사용처를 먼저 정리하세요.' },
  { id: 'major-02', name: '여사제 The High Priestess', arcana: 'Major', uprightKeywords: ['직관', '관찰'], reversedKeywords: ['정보 부족', '침묵'], generalMeaning: '서두르기보다 숨은 정보와 내면의 신호를 살피는 시간입니다.', advice: '결정 전 확인해야 할 질문을 적어보세요.', warning: '추측을 사실처럼 다루지 마세요.', loveMeaning: '말하지 않은 감정이 있다면 안전한 방식으로 확인하세요.', studyMeaning: '조용한 복습과 핵심 개념 정리가 효과적입니다.', careerMeaning: '정보를 모으고 타이밍을 기다리는 전략이 유리합니다.', moneyMeaning: '계약과 조건의 작은 글씨를 확인하세요.' },
  { id: 'major-03', name: '여제 The Empress', arcana: 'Major', uprightKeywords: ['풍요', '돌봄'], reversedKeywords: ['과잉', '소진'], generalMeaning: '아이디어와 관계를 돌보며 풍요롭게 키우는 흐름입니다.', advice: '성장에 필요한 시간과 자원을 꾸준히 공급하세요.', warning: '돌봄이 자기 소진으로 바뀌지 않게 경계를 두세요.', loveMeaning: '따뜻함과 돌봄이 관계를 풍성하게 합니다.', studyMeaning: '편안한 환경과 감각적인 자료가 학습을 돕습니다.', careerMeaning: '사람과 콘텐츠를 키우는 역할에서 성과가 납니다.', moneyMeaning: '생활의 질을 높이는 지출과 과소비를 구분하세요.' },
  { id: 'major-04', name: '황제 The Emperor', arcana: 'Major', uprightKeywords: ['구조', '책임'], reversedKeywords: ['경직', '통제'], generalMeaning: '규칙과 책임을 세워 안정적으로 운영하는 힘을 뜻합니다.', advice: '결정권과 책임 범위를 명확히 하세요.', warning: '통제할 수 없는 것까지 억지로 관리하지 마세요.', loveMeaning: '안정적인 약속이 중요하지만 일방적인 통제는 피하세요.', studyMeaning: '시간표와 규칙적인 루틴이 성과를 만듭니다.', careerMeaning: '구조를 세우고 책임을 맡는 역할에 힘이 실립니다.', moneyMeaning: '예산·저축·고정비를 체계로 관리하세요.' },
  { id: 'major-05', name: '교황 The Hierophant', arcana: 'Major', uprightKeywords: ['전통', '가르침'], reversedKeywords: ['고정관념', '독자 노선'], generalMeaning: '검증된 지식과 공동체의 규칙에서 배움을 얻는 흐름입니다.', advice: '신뢰할 만한 기준과 멘토를 찾아보세요.', warning: '규칙이 현재 목적에 맞는지 점검하세요.', loveMeaning: '관계의 약속과 가치관을 맞추는 대화가 필요합니다.', studyMeaning: '기초 과정과 선생님의 피드백을 활용하세요.', careerMeaning: '조직의 규칙 안에서 전문성을 쌓을 수 있습니다.', moneyMeaning: '검증된 원칙과 계획을 따르는 것이 안전합니다.' },
  { id: 'major-06', name: '연인 The Lovers', arcana: 'Major', uprightKeywords: ['선택', '조화'], reversedKeywords: ['불일치', '망설임'], generalMeaning: '가치관을 확인하고 중요한 선택을 책임지는 장면입니다.', advice: '남의 기대보다 자신의 기준을 문장으로 적어보세요.', warning: '선택하지 않는 것도 선택임을 기억하세요.', loveMeaning: '서로의 가치와 선택을 확인하는 중요한 대화입니다.', studyMeaning: '관심 분야와 학습 목표를 연결하면 동기가 생깁니다.', careerMeaning: '협업과 가치 정렬이 방향을 결정합니다.', moneyMeaning: '감정과 실용성 사이의 기준을 함께 비교하세요.' },
  { id: 'major-07', name: '전차 The Chariot', arcana: 'Major', uprightKeywords: ['추진', '승리'], reversedKeywords: ['방향 상실', '과속'], generalMeaning: '서로 다른 힘을 한 방향으로 모아 전진하는 의지를 말합니다.', advice: '이번 주에 움직일 한 가지 방향을 고르세요.', warning: '속도 때문에 안전과 회복을 놓치지 마세요.', loveMeaning: '관계의 방향을 함께 정하면 빠르게 진전될 수 있습니다.', studyMeaning: '명확한 목표와 시간 제한이 집중력을 높입니다.', careerMeaning: '경쟁 속에서도 목표를 지키면 성과를 낼 수 있습니다.', moneyMeaning: '목표 자금과 실행 기한을 정해 추진하세요.' },
  { id: 'major-08', name: '힘 Strength', arcana: 'Major', uprightKeywords: ['인내', '용기'], reversedKeywords: ['자기 의심', '억눌림'], generalMeaning: '강압보다 꾸준한 인내와 부드러운 용기로 상황을 다루는 힘입니다.', advice: '반응하기 전 호흡과 기준을 먼저 챙기세요.', warning: '참는 것과 해결하는 것을 혼동하지 마세요.', loveMeaning: '부드럽지만 솔직한 태도가 관계를 단단하게 합니다.', studyMeaning: '짧더라도 매일 반복하는 힘이 중요합니다.', careerMeaning: '어려운 상황을 차분히 조율하는 능력이 빛납니다.', moneyMeaning: '즉각적인 욕구를 늦추는 규칙이 재정을 지켜줍니다.' },
  { id: 'major-09', name: '은둔자 The Hermit', arcana: 'Major', uprightKeywords: ['성찰', '탐구'], reversedKeywords: ['고립', '회피'], generalMeaning: '외부 소음에서 물러나 스스로 답을 탐구하는 시간입니다.', advice: '혼자 정리할 시간을 확보하되 결과를 기록하세요.', warning: '도움이 필요한 순간까지 혼자 버티지 마세요.', loveMeaning: '관계의 거리를 점검하고 필요한 대화를 준비하세요.', studyMeaning: '깊이 있는 독학과 집중 시간이 도움이 됩니다.', careerMeaning: '전문성을 다듬는 기간으로 활용할 수 있습니다.', moneyMeaning: '조용히 지출과 목표를 재검토하기 좋은 때입니다.' },
  { id: 'major-10', name: '운명의 수레바퀴 Wheel of Fortune', arcana: 'Major', uprightKeywords: ['전환', '주기'], reversedKeywords: ['정체', '반복'], generalMeaning: '환경의 변화를 읽고 기회를 준비하는 주기의 흐름입니다.', advice: '바뀌는 것과 지킬 것을 나눠보세요.', warning: '운만 기다리며 실행을 미루지 마세요.', loveMeaning: '관계의 국면이 바뀔 수 있으니 유연하게 대화하세요.', studyMeaning: '학습 방식이나 환경을 바꾸면 흐름이 살아납니다.', careerMeaning: '예상 밖의 이동과 기회에 대비하세요.', moneyMeaning: '변동성을 고려해 비상 여유를 남겨두세요.' },
  { id: 'major-11', name: '정의 Justice', arcana: 'Major', uprightKeywords: ['균형', '판단'], reversedKeywords: ['편견', '불공정'], generalMeaning: '사실과 기준을 바탕으로 결과를 책임지는 판단을 뜻합니다.', advice: '결정 근거와 영향을 함께 적어보세요.', warning: '감정적인 단정과 불완전한 정보를 경계하세요.', loveMeaning: '서로의 책임과 기대를 공정하게 조정해야 합니다.', studyMeaning: '평가 기준을 확인하면 준비 방향이 선명해집니다.', careerMeaning: '계약과 성과 기준을 꼼꼼히 확인하세요.', moneyMeaning: '수입·지출·의무를 숫자로 투명하게 보세요.' },
  { id: 'major-12', name: '매달린 사람 The Hanged Man', arcana: 'Major', uprightKeywords: ['관점 전환', '멈춤'], reversedKeywords: ['지연', '집착'], generalMeaning: '잠시 멈추고 다른 관점에서 의미를 다시 보는 장면입니다.', advice: '당장 결론보다 바꿔 볼 전제를 찾아보세요.', warning: '멈춤이 회피로 길어지지 않게 기한을 정하세요.', loveMeaning: '상대의 관점에서 상황을 다시 보는 시간이 필요합니다.', studyMeaning: '막힌 문제를 다른 설명 방식으로 접근해보세요.', careerMeaning: '지연을 재설계의 시간으로 활용할 수 있습니다.', moneyMeaning: '큰 결정을 미루고 조건을 다시 비교하세요.' },
  { id: 'major-13', name: '죽음 Death', arcana: 'Major', uprightKeywords: ['종료', '변환'], reversedKeywords: ['미련', '정체'], generalMeaning: '한 국면을 정리하고 다음 형태로 넘어가는 변화를 상징합니다.', advice: '끝내야 할 습관과 남길 가치를 구분하세요.', warning: '변화를 재난으로 단정하지 마세요.', loveMeaning: '관계의 오래된 패턴을 끝내고 새 약속을 만들 때입니다.', studyMeaning: '효과 없는 공부법을 정리하고 방식을 바꿔보세요.', careerMeaning: '역할이나 우선순위를 재편할 신호입니다.', moneyMeaning: '불필요한 구독과 지출 구조를 정리하세요.' },
  { id: 'major-14', name: '절제 Temperance', arcana: 'Major', uprightKeywords: ['조율', '균형'], reversedKeywords: ['과함', '불균형'], generalMeaning: '서로 다른 요소를 천천히 섞어 균형점을 찾는 흐름입니다.', advice: '한 번에 크게 바꾸기보다 비율을 조정하세요.', warning: '타협이 핵심 문제의 회피가 되지 않게 하세요.', loveMeaning: '서로의 속도를 조율하면 편안한 관계가 됩니다.', studyMeaning: '집중과 휴식의 비율을 조정해보세요.', careerMeaning: '부서와 관점을 연결하는 조정 역할이 중요합니다.', moneyMeaning: '수입·생활·저축의 비율을 다시 맞춰보세요.' },
  { id: 'major-15', name: '악마 The Devil', arcana: 'Major', uprightKeywords: ['집착', '욕구'], reversedKeywords: ['해방', '자각'], generalMeaning: '습관과 욕구가 선택을 묶고 있는지 살펴보라는 신호입니다.', advice: '내가 통제할 수 있는 작은 선택 하나를 회복하세요.', warning: '단기 보상 때문에 장기 목표를 희생하지 마세요.', loveMeaning: '강한 끌림과 의존을 구분하고 경계를 확인하세요.', studyMeaning: '미루게 만드는 환경과 보상 구조를 바꿔보세요.', careerMeaning: '성과 압박과 과도한 집착이 균형을 잃게 하지 않는지 보세요.', moneyMeaning: '충동 구매와 부채 조건을 냉정하게 확인하세요.' },
  { id: 'major-16', name: '탑 The Tower', arcana: 'Major', uprightKeywords: ['붕괴', '각성'], reversedKeywords: ['회피', '늦은 변화'], generalMeaning: '기존 구조의 약한 부분이 드러나 재정비를 요구하는 장면입니다.', advice: '무너진 뒤에도 남아야 할 핵심을 먼저 지키세요.', warning: '불편한 사실을 숨기면 충격이 커질 수 있습니다.', loveMeaning: '관계의 숨은 문제를 솔직하게 다룰 필요가 있습니다.', studyMeaning: '기초 개념의 빈틈을 확인하고 다시 쌓으세요.', careerMeaning: '계획의 위험 요소를 드러내고 대안을 준비하세요.', moneyMeaning: '비상 자금과 최악의 경우를 점검하세요.' },
  { id: 'major-17', name: '별 The Star', arcana: 'Major', uprightKeywords: ['희망', '회복'], reversedKeywords: ['낙담', '기대 저하'], generalMeaning: '회복과 방향 감각을 되찾으며 미래를 다시 그리는 흐름입니다.', advice: '작지만 계속할 수 있는 희망의 행동을 고르세요.', warning: '희망을 계획 없이 기다림으로 바꾸지 마세요.', loveMeaning: '진솔함과 회복의 가능성이 관계에 열립니다.', studyMeaning: '장기 목표를 시각화하고 작은 진전을 기록하세요.', careerMeaning: '비전과 진정성이 사람을 모으는 시기입니다.', moneyMeaning: '회복 계획을 낙관과 숫자로 함께 세워보세요.' },
  { id: 'major-18', name: '달 The Moon', arcana: 'Major', uprightKeywords: ['불확실성', '상상'], reversedKeywords: ['안개 걷힘', '불안 노출'], generalMeaning: '사실과 감정이 섞여 불확실성이 커질 수 있는 구간입니다.', advice: '확인된 사실·추정·감정을 분리해 적어보세요.', warning: '불안이 만든 이야기를 확정 사실로 믿지 마세요.', loveMeaning: '오해가 생기기 쉬우니 직접 확인하는 대화가 필요합니다.', studyMeaning: '이해가 흐린 부분을 질문 목록으로 바꿔보세요.', careerMeaning: '정보가 부족한 결정은 시간을 두고 확인하세요.', moneyMeaning: '불분명한 조건과 과장된 약속을 피하세요.' },
  { id: 'major-19', name: '태양 The Sun', arcana: 'Major', uprightKeywords: ['명료함', '활력'], reversedKeywords: ['과신', '지연된 기쁨'], generalMeaning: '상황이 밝아지고 성취를 드러낼 수 있는 활력의 흐름입니다.', advice: '잘된 점을 공유하고 다음 목표를 공개적으로 정하세요.', warning: '자신감이 준비 부족으로 변하지 않게 하세요.', loveMeaning: '솔직한 기쁨과 따뜻한 표현이 관계를 밝힙니다.', studyMeaning: '성과를 확인하며 자신감을 다음 과제로 연결하세요.', careerMeaning: '성과를 보여주고 인정받기 좋은 시기입니다.', moneyMeaning: '수익의 기쁨과 미래 지출을 함께 관리하세요.' },
  { id: 'major-20', name: '심판 Judgement', arcana: 'Major', uprightKeywords: ['각성', '재평가'], reversedKeywords: ['자책', '미결'], generalMeaning: '지난 선택을 돌아보고 새로운 기준으로 다시 결정하는 순간입니다.', advice: '배운 점을 정리해 다음 선택의 기준으로 만드세요.', warning: '과거의 실수를 현재의 정체성으로 고정하지 마세요.', loveMeaning: '관계의 과거를 정리하고 앞으로의 약속을 선택하세요.', studyMeaning: '오답과 성과를 분석하면 다음 단계가 보입니다.', careerMeaning: '전환이나 재도전의 의미를 점검할 수 있습니다.', moneyMeaning: '지난 재정 결정을 평가하고 새 원칙을 세우세요.' },
  { id: 'major-21', name: '세계 The World', arcana: 'Major', uprightKeywords: ['완성', '통합'], reversedKeywords: ['미완성', '마무리 지연'], generalMeaning: '한 사이클을 완성하고 경험을 통합하는 결실의 흐름입니다.', advice: '완료를 선언하고 다음 사이클에 가져갈 것을 고르세요.', warning: '마지막 점검을 생략해 완성도를 깎지 마세요.', loveMeaning: '관계의 한 단계가 안정되고 함께한 성장을 돌아봅니다.', studyMeaning: '배운 내용을 하나의 프로젝트로 통합해보세요.', careerMeaning: '프로젝트를 마무리하고 성과를 확장할 때입니다.', moneyMeaning: '목표 달성 후에도 유지 가능한 구조를 설계하세요.' },
];

const MINOR_RANKS = [
  ['ace', '에이스', '시작'], ['02', '2', '선택'], ['03', '3', '확장'], ['04', '4', '안정'], ['05', '5', '갈등'], ['06', '6', '회복'], ['07', '7', '점검'], ['08', '8', '속도'], ['09', '9', '인내'], ['10', '10', '완결'], ['page', '페이지', '탐색'], ['knight', '나이트', '추진'], ['queen', '퀸', '성숙'], ['king', '킹', '통솔'],
] as const;

const SUIT_INFO: Record<'Wands' | 'Cups' | 'Swords' | 'Pentacles', { ko: string; domain: string; love: string; study: string; career: string; money: string }> = {
  Wands: { ko: '완드', domain: '열정과 행동', love: '표현과 주도성', study: '실험과 실행', career: '추진과 리더십', money: '성장 기회와 위험 관리' },
  Cups: { ko: '컵', domain: '감정과 관계', love: '감정의 교류', study: '흥미와 몰입', career: '협력과 만족', money: '가치와 소비 감정' },
  Swords: { ko: '소드', domain: '생각과 판단', love: '대화와 경계', study: '분석과 명료화', career: '전략과 문제 해결', money: '계약과 판단' },
  Pentacles: { ko: '펜타클', domain: '현실과 자원', love: '신뢰와 생활', study: '반복과 기반', career: '기술과 성과', money: '예산과 축적' },
};

const minorCards = (arcana: keyof typeof SUIT_INFO): CardSeed[] => MINOR_RANKS.map(([rank, rankName, theme]) => {
  const suit = SUIT_INFO[arcana];
  return {
    id: `${arcana.toLowerCase()}-${rank}`,
    name: `${suit.ko} ${rankName} of ${arcana}`,
    arcana,
    uprightKeywords: [theme, suit.domain],
    reversedKeywords: [`${theme}의 지연`, '과잉·부족'],
    generalMeaning: `${suit.domain} 안에서 ${theme}의 흐름이 나타납니다. 현실의 한 장면을 관찰하고 다음 행동을 선택하세요.`,
    loveMeaning: `${suit.love}에서 ${theme}의 신호입니다. 기대와 경계를 대화로 확인하세요.`,
    studyMeaning: `${suit.study}에서 ${theme}의 신호입니다. 작은 연습과 점검으로 옮겨보세요.`,
    careerMeaning: `${suit.career}에서 ${theme}의 신호입니다. 역할과 우선순위를 분명히 하세요.`,
    moneyMeaning: `${suit.money}에서 ${theme}의 신호입니다. 조건과 수치를 확인하세요.`,
    advice: `${theme}의 장점을 오늘 할 수 있는 작은 행동으로 바꿔보세요.`,
    warning: `${theme}에만 몰입해 다른 조건을 놓치지 마세요.`,
  };
});

const AI_MAJOR_ARCHETYPES = [
  'BOOT SEQUENCE · 미지의 입력', 'TOOLCHAIN · 실행 가능한 도구', 'LATENT SIGNAL · 숨은 정보', 'GENESIS ENGINE · 생성과 돌봄',
  'SYSTEM ARCHITECT · 구조와 책임', 'KNOWLEDGE PROTOCOL · 검증된 학습', 'DUAL-AGENT LINK · 가치의 선택', 'VECTOR DRIVE · 목표 정렬',
  'EMPATHY CORE · 부드러운 제어', 'DEEP SCAN · 내부 탐구', 'CYCLE SHIFT · 주기 전환', 'FAIRNESS MODEL · 균형 판단',
  'VIEWPOINT SWAP · 관점 재설정', 'MIGRATION EVENT · 낡은 패턴 종료', 'BALANCE LOOP · 조율과 혼합', 'DESIRE LOCK · 집착 감지',
  'SYSTEM RESET · 구조 재부팅', 'RECOVERY BEACON · 희망 신호', 'UNCERTAINTY FIELD · 안개 속 추론', 'FULL SPECTRUM · 명료한 출력',
  'RETRAIN SIGNAL · 재평가와 각성', 'MISSION COMPLETE · 통합된 결과',
] as const;

const AI_MINOR_RANKS: Record<string, string> = {
  ace: 'SEED', '02': 'DUAL CHANNEL', '03': 'EXPANSION', '04': 'STABLE CORE', '05': 'CONFLICT TEST',
  '06': 'RECOVERY PATCH', '07': 'QUALITY CHECK', '08': 'FAST LOOP', '09': 'DEEP BUFFER', '10': 'FULL CYCLE',
  page: 'EXPLORER AGENT', knight: 'RUNNER AGENT', queen: 'SOVEREIGN MODEL', king: 'CONTROL PLANE',
};

const AI_MINOR_SUITS: Record<keyof typeof SUIT_INFO, string> = {
  Wands: 'ACTION NODE',
  Cups: 'EMOTION FIELD',
  Swords: 'LOGIC MATRIX',
  Pentacles: 'RESOURCE GRID',
};

const addAiArchetypes = (cards: TarotCard[]): TarotCard[] => cards.map((card) => {
  if (card.arcana === 'Major') {
    const index = Number(card.id.slice(-2));
    return { ...card, aiArchetype: AI_MAJOR_ARCHETYPES[index] ?? 'UNKNOWN MAJOR NODE' };
  }
  const rank = card.id.slice(card.id.lastIndexOf('-') + 1);
  return { ...card, aiArchetype: `${AI_MINOR_SUITS[card.arcana]} · ${AI_MINOR_RANKS[rank] ?? 'UNCLASSIFIED NODE'}` };
});

export const TAROT_CARDS: TarotCard[] = addAiArchetypes([
  ...MAJOR_CARDS,
  ...minorCards('Wands'),
  ...minorCards('Cups'),
  ...minorCards('Swords'),
  ...minorCards('Pentacles'),
].map(makeCard));

export const TAROT_CARD_COUNT = 78;
