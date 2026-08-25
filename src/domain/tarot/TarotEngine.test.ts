import { describe, expect, it } from 'vitest';
import { TAROT_CARDS } from './TarotCardData';
import { drawTarot, drawTarotCompatibility, drawTarotCompatibilityFromCards, drawTarotFromCards, shuffleTarotCards } from './TarotEngine';

describe('TarotEngine', () => {
  it('contains a standard 78-card deck with structured meanings', () => {
    expect(TAROT_CARDS).toHaveLength(78);
    expect(new Set(TAROT_CARDS.map((card) => card.id)).size).toBe(78);
    expect(TAROT_CARDS.every((card) => card.aiArchetype && card.uprightKeywords.length > 0 && card.reversedKeywords.length > 0 && card.loveMeaning && card.studyMeaning && card.careerMeaning && card.moneyMeaning)).toBe(true);
  });

  it('reproduces the same card order and orientation for the same seed', () => {
    const first = drawTarot(123456, 3, 'career');
    const second = drawTarot(123456, 3, 'career');
    expect(second).toEqual(first);
    expect(first.seed).toBe(123456);
    expect(new Set(first.cards.map((item) => item.card.id)).size).toBe(3);
  });

  it('shuffles every card into a new display order without duplicates', () => {
    const first = shuffleTarotCards(123456).map((card) => card.id);
    const second = shuffleTarotCards(654321).map((card) => card.id);
    expect(first).toHaveLength(78);
    expect(new Set(first).size).toBe(78);
    expect(new Set(second).size).toBe(78);
    expect(second).not.toEqual(first);
    expect(first).not.toEqual(TAROT_CARDS.map((card) => card.id));
  });

  it('renders reversed-card keywords and reversed advice deterministically', () => {
    const candidate = Array.from({ length: 50 }, (_, index) => drawTarot(index + 1, 1, 'general')).find((reading) => reading.cards[0].reversed);
    expect(candidate).toBeDefined();
    if (!candidate) return;
    const item = candidate.cards[0];
    expect(item.interpretation).toContain(item.card.reversedKeywords[0]);
    expect(item.advice).toContain(item.card.warning);
  });

  it('builds a deterministic three-card relationship spread', () => {
    const reading = drawTarotCompatibility(123456);
    expect(reading.cards.map((item) => item.position)).toEqual(['나의 에너지', '상대의 에너지', '관계의 흐름']);
    expect(reading.categoryLabel).toBe('두 사람 궁합');
    expect(new Set(reading.cards.map((item) => item.card.id)).size).toBe(3);
  });

  it('keeps the user-selected cards in the generated reading', () => {
    const selected = ['major-00', 'wands-06', 'cups-03'];
    const reading = drawTarotFromCards(123456, selected, 3, 'career');
    const compatibility = drawTarotCompatibilityFromCards(123456, selected);
    expect(reading.cards.map((item) => item.card.id)).toEqual(selected);
    expect(compatibility.cards.map((item) => item.card.id)).toEqual(selected);
    expect(compatibility.cards.map((item) => item.position)).toEqual(['나의 에너지', '상대의 에너지', '관계의 흐름']);
  });
});
