import type {
  FiveElement,
  SajuCalculationMethod,
  SajuChart,
  SajuCompatibilityInput,
  SajuDaewoonCycle,
  SajuInput,
  SajuIndicator,
  SajuLuckPeriod,
  SajuPillar,
  SajuRelation,
  SajuValidation,
} from '../types';
import {
  BRANCH_ELEMENTS,
  BRANCH_RELATIONS,
  EARTHLY_BRANCHES,
  ELEMENT_ORDER,
  GROWTH_STAGES,
  GROWTH_STAGE_STARTS,
  HEAVENLY_STEMS,
  HIDDEN_STEMS,
  SELF_PUNISHING_BRANCHES,
  SEASON_BY_BRANCH,
  SHINSAL_DEFINITIONS,
  SOLAR_TERM_BOUNDARIES,
  STEM_ELEMENTS,
} from './SajuRuleDefinitions';

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const LUNAR_ANCHORS: Record<number, string> = {
  2020: '2020-01-25', 2021: '2021-02-12', 2022: '2022-02-01', 2023: '2023-01-22',
  2024: '2024-02-10', 2025: '2025-01-29', 2026: '2026-02-17', 2027: '2027-02-06',
  2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03', 2031: '2031-01-23',
  2032: '2032-02-11', 2033: '2033-01-31', 2034: '2034-02-19', 2035: '2035-02-08',
};

const DISCLAIMER_NOTE = '출생지의 경도에 따른 진태양시 보정, 절기 시각의 분 단위 보정, 학파별 대운·신살 차이는 적용하지 않은 투명한 MVP 계산입니다.';

const parseDateParts = (value: string): [number, number, number] | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
};

const dateOnly = (year: number, month: number, day: number): Date => new Date(Date.UTC(year, month - 1, day));

const isValidDate = (year: number, month: number, day: number): boolean => {
  const date = dateOnly(year, month, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const isValidTimezone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
};

export const validateSajuInput = (input: SajuInput): SajuValidation => {
  const parts = parseDateParts(input.birthDate);
  if (!parts || !isValidDate(...parts)) return { valid: false, message: '생년월일을 올바른 날짜로 입력해주세요.' };
  const [year] = parts;
  if (year < MIN_YEAR || year > MAX_YEAR) return { valid: false, message: `양력 기준 ${MIN_YEAR}~${MAX_YEAR}년만 지원합니다.` };
  if (input.calendar === 'lunar' && !LUNAR_ANCHORS[year]) return { valid: false, message: '음력 간소화 데이터는 2020~2035년만 지원합니다.' };
  if (!input.timeUnknown && !/^([01]\d|2[0-3]):[0-5]\d$/u.test(input.birthTime)) return { valid: false, message: '출생 시간을 HH:MM 형식으로 입력해주세요.' };
  if (!input.birthPlace.trim()) return { valid: false, message: '출생지를 입력해주세요.' };
  if (!input.timezone.trim() || !isValidTimezone(input.timezone.trim())) return { valid: false, message: 'IANA 시간대 예시(Asia/Seoul)를 입력해주세요.' };
  if (input.daylightSaving !== 'auto' && input.daylightSaving !== 'standard' && input.daylightSaving !== 'daylight') return { valid: false, message: '서머타임 설정을 확인해주세요.' };
  if (!input.consent) return { valid: false, message: '계산과 저장에 동의해야 결과를 만들 수 있습니다.' };
  if (input.topic === 'compatibility') {
    if (!input.compatibility) return { valid: false, message: '궁합을 보려면 두 번째 출생 정보를 입력해주세요.' };
    const other = validateCompatibilityInput(input.compatibility);
    if (!other.valid) return { valid: false, message: `두 번째 출생 정보: ${other.message ?? '입력을 확인해주세요.'}` };
  }
  return { valid: true };
};

const validateCompatibilityInput = (input: SajuCompatibilityInput): SajuValidation => {
  const parts = parseDateParts(input.birthDate);
  if (!parts || !isValidDate(...parts)) return { valid: false, message: '올바른 날짜가 아닙니다.' };
  const [year] = parts;
  if (year < MIN_YEAR || year > MAX_YEAR) return { valid: false, message: `양력 기준 ${MIN_YEAR}~${MAX_YEAR}년만 지원합니다.` };
  if (input.calendar === 'lunar' && !LUNAR_ANCHORS[year]) return { valid: false, message: '음력은 2020~2035년만 지원합니다.' };
  if (!input.timeUnknown && !/^([01]\d|2[0-3]):[0-5]\d$/u.test(input.birthTime)) return { valid: false, message: '시간은 HH:MM 형식이어야 합니다.' };
  if (!input.birthPlace.trim() || !input.timezone.trim() || !isValidTimezone(input.timezone.trim())) return { valid: false, message: '출생지와 IANA 시간대를 확인해주세요.' };
  return { valid: true };
};

const approximateLunarToSolar = (input: SajuInput): { year: number; month: number; day: number; note: string } => {
  const [lunarYear, lunarMonth, lunarDay] = parseDateParts(input.birthDate) as [number, number, number];
  const anchor = LUNAR_ANCHORS[lunarYear];
  const [solarYear, solarMonth, solarDay] = parseDateParts(anchor) as [number, number, number];
  // ponytail: bundled anchor + mean synodic month keeps the MVP offline; replace with a verified lunar table for almanac precision.
  const offset = Math.round((lunarMonth - 1) * 29.53059 + lunarDay - 1 + (input.leapMonth ? 29 : 0));
  const converted = new Date(Date.UTC(solarYear, solarMonth - 1, solarDay + offset));
  return { year: converted.getUTCFullYear(), month: converted.getUTCMonth() + 1, day: converted.getUTCDate(), note: '음력 입력은 연도별 설날 앵커와 평균 삭망월을 사용하는 간소화 변환입니다. 윤달은 한 달을 더한 대체 해석으로 표시합니다.' };
};

const effectiveSolarDate = (input: SajuInput): { year: number; month: number; day: number; note: string } => {
  if (input.calendar === 'lunar') return approximateLunarToSolar(input);
  const [year, month, day] = parseDateParts(input.birthDate) as [number, number, number];
  return { year, month, day, note: '양력 입력과 번들된 절기 날짜 경계를 사용합니다.' };
};

const compareMonthDay = (month: number, day: number, boundaryMonth: number, boundaryDay: number): number => month === boundaryMonth ? day - boundaryDay : month - boundaryMonth;

const solarMonthNumber = (month: number, day: number): number => {
  if (month === 1 && day < 6) return 11;
  const current = SOLAR_TERM_BOUNDARIES.filter((boundary) => boundary.month !== 1 && compareMonthDay(month, day, boundary.month, boundary.day) >= 0).at(-1);
  if (current) return current.monthNo;
  return 12;
};

const solarYear = (year: number, month: number, day: number): number => month < 2 || (month === 2 && day < 4) ? year - 1 : year;

const julianDay = (year: number, month: number, day: number): number => {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
};

const sexagenary = (stemIndex: number, branchIndex: number): { stem: string; branch: string; stemIndex: number; branchIndex: number } => ({
  stem: HEAVENLY_STEMS[(stemIndex + 10) % 10],
  branch: EARTHLY_BRANCHES[(branchIndex + 12) % 12],
  stemIndex: (stemIndex + 10) % 10,
  branchIndex: (branchIndex + 12) % 12,
});

const polarity = (index: number): '음' | '양' => index % 2 === 0 ? '양' : '음';

const elementRelation = (dayMaster: FiveElement, target: FiveElement): 'same' | 'output' | 'wealth' | 'officer' | 'resource' => {
  if (dayMaster === target) return 'same';
  const generating: Record<FiveElement, FiveElement> = { 목: '수', 화: '목', 토: '화', 금: '토', 수: '금' };
  const controlling: Record<FiveElement, FiveElement> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' };
  if (generating[dayMaster] === target) return 'resource';
  if (generating[target] === dayMaster) return 'output';
  if (controlling[dayMaster] === target) return 'wealth';
  return 'officer';
};

const tenGod = (dayStemIndex: number, targetStemIndex: number): string => {
  if (dayStemIndex === targetStemIndex) return '일원';
  const relation = elementRelation(STEM_ELEMENTS[dayStemIndex], STEM_ELEMENTS[targetStemIndex]);
  const samePolarity = polarity(dayStemIndex) === polarity(targetStemIndex);
  const labels: Record<typeof relation, [string, string]> = {
    same: ['비견', '겁재'], output: ['식신', '상관'], wealth: ['편재', '정재'], officer: ['편관', '정관'], resource: ['편인', '정인'],
  };
  return labels[relation][samePolarity ? 0 : 1];
};

const growthStage = (stemIndex: number, branchIndex: number): string => {
  const start = GROWTH_STAGE_STARTS[stemIndex];
  const direction = stemIndex % 2 === 0 ? 1 : -1;
  const offset = ((branchIndex - start) * direction + 12) % 12;
  return GROWTH_STAGES[offset];
};

const makePillar = (name: SajuPillar['name'], pair: ReturnType<typeof sexagenary>, dayStemIndex: number, known = true): SajuPillar => ({
  name,
  stem: pair.stem,
  branch: pair.branch,
  stemElement: STEM_ELEMENTS[pair.stemIndex],
  branchElement: BRANCH_ELEMENTS[pair.branchIndex],
  yinYang: polarity(pair.stemIndex),
  known,
  stemIndex: pair.stemIndex,
  branchIndex: pair.branchIndex,
  visibleTenGod: known ? tenGod(dayStemIndex, pair.stemIndex) : undefined,
  hiddenStems: known ? HIDDEN_STEMS[pair.branch].map(({ stemIndex, weight }) => ({ stem: HEAVENLY_STEMS[stemIndex], element: STEM_ELEMENTS[stemIndex], yinYang: polarity(stemIndex), weight, tenGod: tenGod(dayStemIndex, stemIndex) })) : undefined,
  growthStage: known ? growthStage(dayStemIndex, pair.branchIndex) : undefined,
});

const hourBranchIndex = (hour: number): number => Math.floor(((hour + 1) % 24) / 2);

const formatDateParts = (value: Date, timezone: string): Record<string, number> => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(value);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
};

const offsetMinutesAt = (utcMillis: number, timezone: string): number => {
  const parts = formatDateParts(new Date(utcMillis), timezone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - utcMillis) / 60000);
};

const localToUtc = (year: number, month: number, day: number, hour: number, minute: number, input: SajuInput): { utcMillis: number; offsetMinutes: number; note: string } => {
  const localMillis = Date.UTC(year, month - 1, day, hour, minute);
  const automaticOffset = offsetMinutesAt(localMillis, input.timezone);
  const standardOffset = offsetMinutesAt(Date.UTC(year, 0, 1, 12), input.timezone);
  const offset = input.daylightSaving === 'auto' ? automaticOffset : input.daylightSaving === 'daylight' ? standardOffset + 60 : standardOffset;
  return { utcMillis: localMillis - offset * 60000, offsetMinutes: offset, note: input.daylightSaving === 'auto' ? 'IANA 시간대의 자동 오프셋을 사용했습니다.' : '서머타임 수동 선택은 표준 오프셋 대비 1시간이라는 MVP 가정을 사용했습니다.' };
};

const emptyElements = (): Record<FiveElement, number> => ({ 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 });

const branchPairs = (a: string, b: string, pair: readonly string[]): boolean => pair.length === 2 ? pair.includes(a) && pair.includes(b) && a !== b : false;

const calculateRelations = (pillars: SajuPillar[]): SajuRelation[] => {
  const known = pillars.filter((pillar) => pillar.known);
  const relations: SajuRelation[] = [];
  const entries = Object.entries(BRANCH_RELATIONS) as Array<[SajuRelation['type'], readonly (readonly string[])[]]>;
  for (let first = 0; first < known.length; first += 1) {
    for (let second = first + 1; second < known.length; second += 1) {
      const a = known[first].branch;
      const b = known[second].branch;
      entries.forEach(([type, pairs]) => pairs.forEach((pair) => {
        if (branchPairs(a, b, pair)) relations.push({ type, label: `${known[first].name}·${known[second].name} ${type}`, branches: [a, b], ruleId: `relation.${type}`, note: `${a}${b} 조합을 전통 관계표와 대조했습니다.` });
      }));
    }
  }
  const branchSet = new Set(known.map((pillar) => pillar.branch));
  (BRANCH_RELATIONS.형 as readonly (readonly string[])[]).forEach((group) => {
    if (group.every((branch) => branchSet.has(branch))) relations.push({ type: '형', label: `${group.join('')} 형`, branches: [...group], ruleId: 'relation.형', note: '삼형 조합이 모두 차트에 있을 때만 표시합니다.' });
  });
  SELF_PUNISHING_BRANCHES.forEach((branch) => {
    if (known.filter((pillar) => pillar.branch === branch).length > 1) relations.push({ type: '형', label: `${branch}${branch} 자형`, branches: [branch, branch], ruleId: 'relation.self-punishment', note: '같은 자형 지지가 두 번 이상 보일 때 표시합니다.' });
  });
  return relations;
};

const triadGroup = (branch: string): string | undefined => ['申子辰', '寅午戌', '亥卯未', '巳酉丑'].find((group) => group.includes(branch));

const makeIndicator = (id: string, label: string, method: string, matchedBranches: string[], present: boolean, note: string, confidence: '높음' | '중간' | '낮음'): SajuIndicator => ({ id, label, present, matchedBranches, method, note, confidence });

const calculateIndicators = (pillars: SajuPillar[]): SajuIndicator[] => {
  const known = pillars.filter((pillar) => pillar.known);
  const branches = known.map((pillar) => pillar.branch);
  const branchSet = new Set(branches);
  const dayPillar = known.find((pillar) => pillar.name === '일주');
  const yearPillar = known.find((pillar) => pillar.name === '년주');
  const reference = [yearPillar?.branch, dayPillar?.branch].filter(Boolean) as string[];
  const buildGroupIndicator = (id: string, definition: { label: string; method: string; groups: Record<string, string> }): SajuIndicator => {
    const targets = reference.map((branch) => definition.groups[triadGroup(branch) ?? '']).filter(Boolean);
    const matched = [...new Set(targets.filter((branch) => branchSet.has(branch)))];
    return makeIndicator(id, definition.label, definition.method, matched, matched.length > 0, `년지·일지 기준 목표 지지 ${[...new Set(targets)].join(', ') || '없음'}을 차트와 대조했습니다.`, '낮음');
  };
  const cheonTargets = (SHINSAL_DEFINITIONS.cheoneul.stems as Record<string, readonly string[]>)[dayPillar?.stem ?? ''] ?? [];
  const gwimunPairs = SHINSAL_DEFINITIONS.gwimun.pairs as readonly (readonly string[])[];
  const gwimunMatched = gwimunPairs.find((pair) => pair.every((branch) => branchSet.has(branch)));
  return [
    buildGroupIndicator('shinsal.dohwa', SHINSAL_DEFINITIONS.dohwa),
    buildGroupIndicator('shinsal.yeokma', SHINSAL_DEFINITIONS.yeokma),
    buildGroupIndicator('shinsal.hwagae', SHINSAL_DEFINITIONS.hwagae),
    makeIndicator('shinsal.cheoneul', SHINSAL_DEFINITIONS.cheoneul.label, SHINSAL_DEFINITIONS.cheoneul.method, [...new Set(cheonTargets.filter((branch) => branchSet.has(branch)))], cheonTargets.some((branch) => branchSet.has(branch)), `일간 ${dayPillar?.stem ?? '미상'} 기준 귀인 지지를 대조했습니다.`, '중간'),
    makeIndicator('shinsal.baekho', SHINSAL_DEFINITIONS.baekho.label, SHINSAL_DEFINITIONS.baekho.method, dayPillar && (SHINSAL_DEFINITIONS.baekho.pillars as readonly string[]).includes(dayPillar.stem + dayPillar.branch) ? [dayPillar.branch] : [], Boolean(dayPillar && (SHINSAL_DEFINITIONS.baekho.pillars as readonly string[]).includes(dayPillar.stem + dayPillar.branch)), `일주 ${dayPillar?.stem ?? ''}${dayPillar?.branch ?? ''}을 조합표와 대조했습니다.`, '낮음'),
    makeIndicator('shinsal.goegang', SHINSAL_DEFINITIONS.goegang.label, SHINSAL_DEFINITIONS.goegang.method, dayPillar && (SHINSAL_DEFINITIONS.goegang.pillars as readonly string[]).includes(dayPillar.stem + dayPillar.branch) ? [dayPillar.branch] : [], Boolean(dayPillar && (SHINSAL_DEFINITIONS.goegang.pillars as readonly string[]).includes(dayPillar.stem + dayPillar.branch)), `일주 ${dayPillar?.stem ?? ''}${dayPillar?.branch ?? ''}을 조합표와 대조했습니다.`, '낮음'),
    makeIndicator('shinsal.gwimun', SHINSAL_DEFINITIONS.gwimun.label, SHINSAL_DEFINITIONS.gwimun.method, gwimunMatched ? [...gwimunMatched] : [], Boolean(gwimunMatched), '지지 쌍이 모두 존재할 때만 표시했습니다.', '낮음'),
  ];
};

const calculateDaewoon = (input: SajuInput, monthPair: ReturnType<typeof sexagenary>, yearStemIndex: number, effectiveDate: Date): SajuDaewoonCycle[] => {
  const yearStemYang = yearStemIndex % 2 === 0;
  const direction = input.gender === 'unspecified' ? undefined : input.gender === 'male' ? yearStemYang ? '순행' : '역행' : yearStemYang ? '역행' : '순행';
  if (!direction) return [];
  const boundaryDates = [-1, 0, 1].flatMap((yearOffset) => SOLAR_TERM_BOUNDARIES.map((boundary) => dateOnly(effectiveDate.getUTCFullYear() + yearOffset, boundary.month, boundary.day))).sort((a, b) => a.getTime() - b.getTime());
  const previous = boundaryDates.filter((date) => date.getTime() < effectiveDate.getTime()).at(-1) ?? dateOnly(effectiveDate.getUTCFullYear() - 1, 12, 7);
  const next = boundaryDates.find((date) => date.getTime() > effectiveDate.getTime()) ?? dateOnly(effectiveDate.getUTCFullYear() + 1, 2, 4);
  const days = Math.max(1, Math.round(Math.abs((direction === '순행' ? next : previous).getTime() - effectiveDate.getTime()) / 86400000));
  const startAge = Math.max(1, Math.round(days / 3));
  const sign = direction === '순행' ? 1 : -1;
  return Array.from({ length: 8 }, (_, index) => {
    const pair = sexagenary(monthPair.stemIndex + sign * (index + 1), monthPair.branchIndex + sign * (index + 1));
    return { sequence: index + 1, startAge: startAge + index * 10, endAge: startAge + index * 10 + 9, pillar: pair.stem + pair.branch, stem: pair.stem, branch: pair.branch, direction, note: '대운 시작 나이는 절기까지의 일수/3 근사입니다.' };
  });
};

const calculateYearPillar = (year: number): ReturnType<typeof sexagenary> => {
  const pillarYear = solarYear(year, 7, 1);
  return sexagenary((pillarYear - 4) % 10, (pillarYear - 4) % 12);
};

const calculateAnnualLuck = (referenceYear: number): SajuLuckPeriod[] => Array.from({ length: 5 }, (_, index) => {
  const year = referenceYear + index;
  const pair = calculateYearPillar(year);
  return { label: `${year}년 세운`, year, pillar: pair.stem + pair.branch, stem: pair.stem, branch: pair.branch, element: STEM_ELEMENTS[pair.stemIndex], note: '미래를 확정하지 않고 해당 연도의 계획 점검용으로만 사용합니다.' };
});

const calculateMonthlyLuck = (year: number): SajuLuckPeriod[] => {
  const yearStemIndex = calculateYearPillar(year).stemIndex;
  const monthStemStart = [2, 4, 6, 8, 0][yearStemIndex % 5];
  return Array.from({ length: 12 }, (_, index) => {
    const monthNo = index + 1;
    const pair = sexagenary(monthStemStart + monthNo - 1, 2 + monthNo - 1);
    return { label: `${monthNo}번째 절기월`, month: monthNo, pillar: pair.stem + pair.branch, stem: pair.stem, branch: pair.branch, element: STEM_ELEMENTS[pair.stemIndex], note: '양력 달력이 아닌 절기월 기준의 참고용 흐름입니다.' };
  });
};

const detectBackgroundSignals = (input: SajuInput): string[] => {
  const text = `${input.background.family} ${input.background.personal}`.toLowerCase();
  const signals: Array<[string, RegExp]> = [
    ['소통·갈등 맥락', /갈등|충돌|대화|소통|communication|conflict/u],
    ['돌봄·책임 맥락', /돌봄|부양|책임|care|responsibility/u],
    ['거리·독립 맥락', /거리|단절|독립|이사|distance|independent|move/u],
    ['안정·변화 맥락', /안정|변화|전환|stability|change|transition/u],
  ];
  return signals.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
};

export interface SajuCalculationOutput {
  chart: SajuChart;
  method: SajuCalculationMethod;
  effectiveDate: { year: number; month: number; day: number };
  calendarNote: string;
  utcNote: string;
  simplified: boolean;
}

export const calculateSajuChart = (input: SajuInput): SajuCalculationOutput => {
  const validation = validateSajuInput(input);
  if (!validation.valid) throw new Error(validation.message ?? '사주 입력을 확인해주세요.');
  const effective = effectiveSolarDate(input);
  const hour = input.timeUnknown ? 12 : Number(input.birthTime.slice(0, 2));
  const minute = input.timeUnknown ? 0 : Number(input.birthTime.slice(3, 5));
  const utc = localToUtc(effective.year, effective.month, effective.day, hour, minute, input);
  const yearForPillar = solarYear(effective.year, effective.month, effective.day);
  const yearStemIndex = (yearForPillar - 4) % 10;
  const yearBranchIndex = (yearForPillar - 4) % 12;
  const monthNo = solarMonthNumber(effective.month, effective.day);
  const monthStemStart = [2, 4, 6, 8, 0][yearStemIndex % 5];
  const monthPair = sexagenary(monthStemStart + monthNo - 1, 2 + monthNo - 1);
  const dayIndex = (julianDay(effective.year, effective.month, effective.day) + 49) % 60;
  const dayPair = sexagenary(dayIndex % 10, dayIndex % 12);
  const pillars: SajuPillar[] = [
    makePillar('년주', sexagenary(yearStemIndex, yearBranchIndex), dayPair.stemIndex),
    makePillar('월주', monthPair, dayPair.stemIndex),
    makePillar('일주', dayPair, dayPair.stemIndex),
  ];
  if (input.timeUnknown) pillars.push(makePillar('시주', sexagenary(0, 0), dayPair.stemIndex, false));
  else {
    const branchIndex = hourBranchIndex(hour);
    const hourStemStart = (dayPair.stemIndex % 5) * 2;
    pillars.push(makePillar('시주', sexagenary(hourStemStart + branchIndex, branchIndex), dayPair.stemIndex));
  }

  const elements = emptyElements();
  const weightedElements = emptyElements();
  let yin = 0;
  let yang = 0;
  pillars.filter((pillar) => pillar.known).forEach((pillar) => {
    elements[pillar.stemElement] += 1;
    elements[pillar.branchElement] += 1;
    weightedElements[pillar.stemElement] += 1;
    weightedElements[pillar.branchElement] += 1.2;
    if (pillar.yinYang === '음') yin += 1; else yang += 1;
    if ((pillar.branchIndex ?? 0) % 2 === 0) yang += 1; else yin += 1;
    pillar.hiddenStems?.forEach((hidden) => { weightedElements[hidden.element] += hidden.weight; });
  });
  const monthBranch = pillars[1].branch;
  const season = SEASON_BY_BRANCH[monthBranch] ?? { season: '알 수 없음', element: '토' as FiveElement };
  weightedElements[season.element] += 1;
  const ranked = [...ELEMENT_ORDER].sort((a, b) => weightedElements[b] - weightedElements[a]);
  const total = Object.values(weightedElements).reduce((sum, value) => sum + value, 0);
  const dayMasterElement = STEM_ELEMENTS[dayPair.stemIndex];
  const dayMasterShare = weightedElements[dayMasterElement] / Math.max(total, 1);
  const dayMasterStrength = dayMasterShare >= .27 ? '강함' : dayMasterShare <= .17 ? '약함' : '균형';
  const referenceYear = new Date().getFullYear();
  const chart: SajuChart = {
    pillars,
    dayMaster: { stem: dayPair.stem, element: dayMasterElement, yinYang: polarity(dayPair.stemIndex), tenGod: '일원' },
    elements,
    weightedElements,
    yinYang: { yin, yang },
    seasonalInfluence: { season: season.season, element: season.element, note: '월지의 계절 오행을 기본 환경으로 더했습니다.' },
    dayMasterStrength,
    relations: calculateRelations(pillars),
    indicators: calculateIndicators(pillars),
    daewoon: calculateDaewoon(input, monthPair, yearStemIndex, dateOnly(effective.year, effective.month, effective.day)),
    annualLuck: calculateAnnualLuck(referenceYear),
    monthlyLuck: calculateMonthlyLuck(referenceYear),
    utcOffsetMinutes: utc.offsetMinutes,
    backgroundSignals: detectBackgroundSignals(input),
  };
  const method: SajuCalculationMethod = {
    id: 'saju-standard-v2',
    version: '2.0.0',
    calendar: input.calendar,
    solarTermBoundary: 'bundled-civil-date',
    dayBoundary: 'midnight',
    timeBasis: 'civil-time',
    timezone: input.timezone,
    daylightSaving: input.daylightSaving,
    lunarConversion: 'bundled-anchor-mean-month',
    daewoonDirection: 'gender-and-year-stem',
    referenceDate: new Date().toISOString().slice(0, 10),
    supportedRange: '양력 1900~2100년; 음력 2020~2035년',
    sourceReferences: ['SajuRuleDefinitions.ts의 번들 지지·천간·장간·관계·신살 표', '전통 육십갑자·십신·대운 순역 규칙을 명시적으로 구현', 'IANA timezone은 Intl.DateTimeFormat으로 오프셋 검증'],
    assumptions: [effective.note, DISCLAIMER_NOTE, utc.note, input.birthPlace.trim() ? '출생지는 입력 기록과 표시용이며 경도 기반 진태양시에는 사용하지 않습니다.' : '출생지 미상'],
  };
  return { chart, method, effectiveDate: effective, calendarNote: `${effective.note} ${DISCLAIMER_NOTE}`, utcNote: utc.note, simplified: true };
};

export const defaultSajuInput = (): SajuInput => ({
  birthDate: '2000-01-01', birthTime: '12:00', timeUnknown: false, calendar: 'solar', leapMonth: false, gender: 'unspecified',
  birthPlace: '서울, 대한민국', timezone: 'Asia/Seoul', daylightSaving: 'auto', topic: 'overall', question: '', background: { family: '', personal: '' }, consent: false,
  compatibility: { birthDate: '2000-01-01', birthTime: '12:00', timeUnknown: false, calendar: 'solar', leapMonth: false, gender: 'unspecified', birthPlace: '서울, 대한민국', timezone: 'Asia/Seoul', daylightSaving: 'auto' },
});
