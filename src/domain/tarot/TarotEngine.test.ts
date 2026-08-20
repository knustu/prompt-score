import { describe, expect, it } from 'vitest';
import { TAROT_CARDS } from './TarotCardData';
import { drawTarot } from './TarotEngine';

describe('TarotEngine', () => {
  it('contains a standard 78-card deck with structured meanings', () => {
    expect(TAROT_CARDS).toHaveLength(78);
    expect(new Set(TAROT_CARDS.map((card) => card.id)).size).toBe(78);
    expect(TAROT_CARDS.every((card) => card.uprightKeywords.length > 0 && card.reversedKeywords.length > 0 && card.loveMeaning && card.studyMeaning && card.careerMeaning && card.moneyMeaning)).toBe(true);
  });

  it('reproduces the same card order and orientation for the same seed', () => {
    const first = drawTarot(123456, 3, 'career');
    const second = drawTarot(123456, 3, 'career');
    expect(second).toEqual(first);
    expect(first.seed).toBe(123456);
    expect(new Set(first.cards.map((item) => item.card.id)).size).toBe(3);
  });

  it('renders reversed-card keywords and reversed advice deterministically', () => {
    const candidate = Array.from({ length: 50 }, (_, index) => drawTarot(index + 1, 1, 'general')).find((reading) => reading.cards[0].reversed);
    expect(candidate).toBeDefined();
    if (!candidate) return;
    const item = candidate.cards[0];
    expect(item.interpretation).toContain(item.card.reversedKeywords[0]);
    expect(item.advice).toContain(item.card.warning);
  });
});
