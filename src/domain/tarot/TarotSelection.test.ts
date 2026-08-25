import { describe, expect, it } from 'vitest';
import { TAROT_CARDS } from './TarotCardData';
import { canConfirmTarotSelection, toggleTarotSelection } from './TarotSelection';

describe('tarot selection', () => {
  it('keeps the 78-card deck and confirms only the exact selection count', () => {
    expect(TAROT_CARDS).toHaveLength(78);

    let selected = toggleTarotSelection([], 'major-00', 3);
    selected = toggleTarotSelection(selected, 'major-01', 3);
    selected = toggleTarotSelection(selected, 'major-02', 3);

    expect(toggleTarotSelection(selected, 'major-03', 3)).toEqual(selected);
    expect(canConfirmTarotSelection(selected, 3)).toBe(true);
    expect(canConfirmTarotSelection(selected, 2)).toBe(false);
    expect(toggleTarotSelection(selected, 'major-01', 3)).toEqual(['major-00', 'major-02']);
  });
});
