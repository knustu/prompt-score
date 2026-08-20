import { describe, expect, it } from 'vitest';
import { calculateSaju, defaultSajuInput, validateSajuInput } from './SajuEngine';

describe('SajuEngine', () => {
  const consented = { ...defaultSajuInput(), consent: true };

  it('validates date, time, timezone, and supported lunar range', () => {
    expect(validateSajuInput({ ...consented, birthDate: '2000-02-31' }).valid).toBe(false);
    expect(validateSajuInput({ ...consented, birthTime: '25:00' }).valid).toBe(false);
    expect(validateSajuInput({ ...consented, timezone: '' }).valid).toBe(false);
    expect(validateSajuInput({ ...consented, calendar: 'lunar', birthDate: '1990-01-01' }).valid).toBe(false);
    expect(validateSajuInput({ ...consented, calendar: 'lunar', birthDate: '2026-01-01' }).valid).toBe(true);
  });

  it('calculates stable pillars and marks unknown birth time explicitly', () => {
    const input = { ...consented, birthDate: '2000-01-01', timeUnknown: true };
    const first = calculateSaju(input);
    const second = calculateSaju(input);
    expect(first).toEqual(second);
    expect(first.pillars).toHaveLength(4);
    expect(first.pillars[3].known).toBe(false);
    expect(first.elements).toEqual(expect.objectContaining({ 목: expect.any(Number), 화: expect.any(Number), 토: expect.any(Number), 금: expect.any(Number), 수: expect.any(Number) }));
    expect(first.disclaimer).toContain('오락');
    expect(first.chart?.dayMaster.stem).toBeTruthy();
    expect(first.structuredReadings?.readings.familyPatterns[0].limitations.join(' ')).toContain('가족');
  });

  it('uses the simplified solar-term boundary around the year pillar transition', () => {
    const before = calculateSaju({ ...consented, birthDate: '2024-02-03' });
    const after = calculateSaju({ ...consented, birthDate: '2024-02-04' });
    expect(before.pillars[0].stem + before.pillars[0].branch).not.toBe(after.pillars[0].stem + after.pillars[0].branch);
    expect(after.calculationMethod?.id).toBe('saju-standard-v2');
    expect(after.knowledgeBaseVersion).toBe('saju-kb-2026.1');
  });

  it('calculates optional daewoon and explicit background signals without storing raw notes', () => {
    const result = calculateSaju({ ...consented, gender: 'female', background: { family: '가족과 대화 갈등이 반복됨', personal: '변화 앞에서 고민함' } });
    expect(result.chart?.daewoon.length).toBe(8);
    expect(result.chart?.backgroundSignals).toContain('소통·갈등 맥락');
    expect(result.backgroundProvided).toBe(true);
    expect(JSON.stringify(result)).not.toContain('가족과 대화 갈등이 반복됨');
  });

  it('compares two charts only when the compatibility topic has a second input', () => {
    const result = calculateSaju({ ...consented, topic: 'compatibility', compatibility: { birthDate: '2000-01-01', birthTime: '12:00', timeUnknown: false, calendar: 'solar', leapMonth: false, gender: 'unspecified', birthPlace: '서울, 대한민국', timezone: 'Asia/Seoul', daylightSaving: 'auto' } });
    expect(result.compatibility?.otherDayMaster.stem).toBeTruthy();
    expect(result.structuredReadings?.readings.compatibility[0].appliedRuleIds).toContain('compatibility.two-charts');
  });
});
