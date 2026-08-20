import type { FiveElement } from '../types';

export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export const STEM_ELEMENTS: FiveElement[] = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
export const BRANCH_ELEMENTS: FiveElement[] = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];

export const ELEMENT_COLORS: Record<FiveElement, string> = {
  목: '#38b27d',
  화: '#f06c5f',
  토: '#e4ad52',
  금: '#a9b4c4',
  수: '#5a81df',
};

/**
 * Bundled approximate solar-term boundaries for the simplified reading.
 * Each month starts near the corresponding Korean solar term. Exact local
 * solar-term instants vary by year and longitude, so this MVP does not claim
 * professional almanac precision.
 */
export const SOLAR_TERM_BOUNDARIES = [
  { month: 2, day: 4, monthNo: 1, name: '입춘' },
  { month: 3, day: 6, monthNo: 2, name: '경칩' },
  { month: 4, day: 5, monthNo: 3, name: '청명' },
  { month: 5, day: 6, monthNo: 4, name: '입하' },
  { month: 6, day: 6, monthNo: 5, name: '망종' },
  { month: 7, day: 7, monthNo: 6, name: '소서' },
  { month: 8, day: 8, monthNo: 7, name: '입추' },
  { month: 9, day: 8, monthNo: 8, name: '백로' },
  { month: 10, day: 8, monthNo: 9, name: '한로' },
  { month: 11, day: 7, monthNo: 10, name: '입동' },
  { month: 12, day: 7, monthNo: 11, name: '대설' },
  { month: 1, day: 6, monthNo: 12, name: '소한' },
] as const;

export const ELEMENT_LABELS: Record<FiveElement, string> = {
  목: '목(木)',
  화: '화(火)',
  토: '토(土)',
  금: '금(金)',
  수: '수(水)',
};

export const ELEMENT_ORDER: FiveElement[] = ['목', '화', '토', '금', '수'];

export const HIDDEN_STEMS: Record<string, Array<{ stemIndex: number; weight: number }>> = {
  子: [{ stemIndex: 9, weight: 1 }],
  丑: [{ stemIndex: 5, weight: .6 }, { stemIndex: 9, weight: .3 }, { stemIndex: 7, weight: .1 }],
  寅: [{ stemIndex: 0, weight: .6 }, { stemIndex: 2, weight: .3 }, { stemIndex: 4, weight: .1 }],
  卯: [{ stemIndex: 1, weight: 1 }],
  辰: [{ stemIndex: 4, weight: .6 }, { stemIndex: 1, weight: .3 }, { stemIndex: 9, weight: .1 }],
  巳: [{ stemIndex: 2, weight: .6 }, { stemIndex: 4, weight: .3 }, { stemIndex: 6, weight: .1 }],
  午: [{ stemIndex: 3, weight: .7 }, { stemIndex: 5, weight: .3 }],
  未: [{ stemIndex: 5, weight: .6 }, { stemIndex: 3, weight: .3 }, { stemIndex: 1, weight: .1 }],
  申: [{ stemIndex: 6, weight: .6 }, { stemIndex: 8, weight: .3 }, { stemIndex: 4, weight: .1 }],
  酉: [{ stemIndex: 7, weight: 1 }],
  戌: [{ stemIndex: 4, weight: .6 }, { stemIndex: 7, weight: .3 }, { stemIndex: 3, weight: .1 }],
  亥: [{ stemIndex: 8, weight: .7 }, { stemIndex: 0, weight: .3 }],
};

export const SEASON_BY_BRANCH: Record<string, { season: string; element: FiveElement }> = {
  寅: { season: '봄', element: '목' }, 卯: { season: '봄', element: '목' }, 辰: { season: '봄·환절', element: '토' },
  巳: { season: '여름', element: '화' }, 午: { season: '여름', element: '화' }, 未: { season: '여름·환절', element: '토' },
  申: { season: '가을', element: '금' }, 酉: { season: '가을', element: '금' }, 戌: { season: '가을·환절', element: '토' },
  亥: { season: '겨울', element: '수' }, 子: { season: '겨울', element: '수' }, 丑: { season: '겨울·환절', element: '토' },
};

export const GROWTH_STAGE_STARTS: Record<number, number> = {
  0: 11, 1: 6, 2: 2, 3: 9, 4: 2, 5: 9, 6: 5, 7: 0, 8: 8, 9: 3,
};

export const GROWTH_STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'] as const;

export const BRANCH_RELATIONS = {
  합: [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']],
  충: [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']],
  해: [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']],
  파: [['子', '酉'], ['丑', '辰'], ['寅', '亥'], ['卯', '午'], ['巳', '申'], ['未', '戌']],
  형: [['子', '卯'], ['寅', '巳', '申'], ['丑', '戌', '未']],
} as const;

export const SELF_PUNISHING_BRANCHES = ['辰', '午', '酉', '亥'] as const;

export const SHINSAL_DEFINITIONS = {
  dohwa: {
    label: '도화살',
    method: '년지 또는 일지를 기준으로 삼합국의 다음 도화 지지를 대조합니다.',
    groups: { 申子辰: '酉', 寅午戌: '卯', 亥卯未: '子', 巳酉丑: '午' },
  },
  yeokma: {
    label: '역마살',
    method: '년지 또는 일지를 기준으로 삼합국의 역마 지지를 대조합니다.',
    groups: { 申子辰: '寅', 寅午戌: '申', 亥卯未: '巳', 巳酉丑: '亥' },
  },
  hwagae: {
    label: '화개살',
    method: '년지 또는 일지를 기준으로 삼합국의 화개 지지를 대조합니다.',
    groups: { 申子辰: '辰', 寅午戌: '戌', 亥卯未: '未', 巳酉丑: '丑' },
  },
  cheoneul: {
    label: '천을귀인',
    method: '일간 기준의 전통적인 천을귀인 지지표를 적용합니다.',
    stems: { 甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'], 乙: ['子', '申'], 己: ['子', '申'], 丙: ['亥', '酉'], 丁: ['亥', '酉'], 壬: ['卯', '巳'], 癸: ['卯', '巳'], 辛: ['寅', '午'] },
  },
  baekho: {
    label: '백호살',
    method: '일주 기준의 널리 쓰이는 10개 조합표를 적용하며 학파 차이를 표시합니다.',
    pillars: ['甲辰', '乙卯', '丙戌', '丁酉', '戊午', '己巳', '庚辰', '辛卯', '壬戌', '癸酉'],
  },
  goegang: {
    label: '괴강살',
    method: '일주가 庚辰·庚戌·壬辰·戊戌인지 대조합니다.',
    pillars: ['庚辰', '庚戌', '壬辰', '戊戌'],
  },
  gwimun: {
    label: '귀문관살',
    method: '지지에 子酉·丑午·寅未·卯申·辰亥·巳戌 쌍이 함께 있는지 대조합니다.',
    pairs: [['子', '酉'], ['丑', '午'], ['寅', '未'], ['卯', '申'], ['辰', '亥'], ['巳', '戌']],
  },
} as const;
