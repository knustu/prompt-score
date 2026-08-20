import type { TarotCategory, TarotDrawnCard, TarotReading } from '../types';
import { TAROT_CARDS } from './TarotCardData';

export const TAROT_CATEGORY_LABELS: Record<TarotCategory, string> = {
  general: '종합',
  love: '연애',
  study: '공부',
  career: '커리어',
  money: '금전',
  decision: '의사결정',
};
export const TAROT_DISCLAIMER = '타로 결과는 오락과 자기 성찰을 위한 참고용이며, 확정적인 예언이나 전문적인 조언으로 받아들이지 마세요.';

const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
};

export const createTarotSeed = (): number => {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] || 1;
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
};

const positionLabels = (spread: 1 | 3): string[] => spread === 1 ? ['지금의 흐름'] : ['현재', '장애물 또는 배경', '다음 행동'];

const categoryMeaning = (card: TarotDrawnCard['card'], category: TarotCategory): string => {
  if (category === 'love') return card.loveMeaning;
  if (category === 'study') return card.studyMeaning;
  if (category === 'career') return card.careerMeaning;
  if (category === 'money') return card.moneyMeaning;
  if (category === 'decision') return `${card.generalMeaning} ${card.advice}`;
  return card.generalMeaning;
};

export const drawTarot = (seed: number, spread: 1 | 3, category: TarotCategory): TarotReading => {
  const random = seededRandom(seed);
  const deck = [...TAROT_CARDS];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  const positions = positionLabels(spread);
  const cards = deck.slice(0, spread).map((card, index) => {
    const reversed = random() < 0.32;
    return {
      card,
      reversed,
      position: positions[index],
      interpretation: `${reversed ? '역방향' : '정방향'} · ${TAROT_CATEGORY_LABELS[category]}: ${categoryMeaning(card, category)} 키워드: ${(reversed ? card.reversedKeywords : card.uprightKeywords).join(', ')}.`,
      advice: reversed ? `속도를 늦추고 ${card.warning}` : card.advice,
      warning: reversed ? `역방향에서는 ${card.warning}` : card.warning,
    } satisfies TarotDrawnCard;
  });
  const summary = cards.length === 1
    ? `${cards[0].card.name} 카드가 ${cards[0].reversed ? '역방향' : '정방향'}으로 나왔습니다. ${cards[0].card.advice}`
    : `${cards.map((item) => item.card.name).join(' · ')}의 흐름입니다. 현재를 관찰하고 장애물을 구분한 뒤 다음 행동을 작게 정해보세요.`;
  return { version: 'tarot-v1', seed: seed >>> 0, spread, category, categoryLabel: TAROT_CATEGORY_LABELS[category], cards, summary, disclaimer: TAROT_DISCLAIMER };
};

export const drawTarotCompatibility = (seed: number): TarotReading => {
  // ponytail: one seeded 3-card relationship spread; add richer spreads only if this proves insufficient.
  const reading = drawTarot(seed, 3, 'love');
  const positions = ['나의 에너지', '상대의 에너지', '관계의 흐름'];
  const cards = reading.cards.map((card, index) => ({ ...card, position: positions[index] }));
  return {
    ...reading,
    categoryLabel: '두 사람 궁합',
    cards,
    summary: `${cards[0].card.name}은 나의 에너지, ${cards[1].card.name}은 상대의 에너지, ${cards[2].card.name}은 관계의 흐름을 보여주는 참고 카드입니다.`,
  };
};
