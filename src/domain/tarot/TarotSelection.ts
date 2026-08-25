export const toggleTarotSelection = (selectedCardIds: string[], cardId: string, requiredSelectionCount: number): string[] => {
  if (selectedCardIds.includes(cardId)) return selectedCardIds.filter((id) => id !== cardId);
  if (!Number.isInteger(requiredSelectionCount) || requiredSelectionCount < 1 || selectedCardIds.length >= requiredSelectionCount) return selectedCardIds;
  return [...selectedCardIds, cardId];
};

export const canConfirmTarotSelection = (selectedCardIds: string[], requiredSelectionCount: number): boolean => (
  Number.isInteger(requiredSelectionCount)
  && requiredSelectionCount > 0
  && selectedCardIds.length === requiredSelectionCount
  && new Set(selectedCardIds).size === selectedCardIds.length
);
