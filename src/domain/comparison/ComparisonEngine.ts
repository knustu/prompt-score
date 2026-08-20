import type { PromptCategoryId, PromptShareSummary } from '../types';
import { PROMPT_CATEGORIES } from '../prompt/PromptRuleDefinitions';

export interface CategoryComparison {
  id: PromptCategoryId;
  label: string;
  aScore: number;
  bScore: number;
  difference: number;
  message: string;
  similar: boolean;
}

export interface PromptComparison {
  a: PromptShareSummary;
  b: PromptShareSummary;
  totalMessage: string;
  categories: CategoryComparison[];
  largestDifferences: CategoryComparison[];
  similarCategories: CategoryComparison[];
}

export const comparePromptSummaries = (a: PromptShareSummary, b: PromptShareSummary): PromptComparison => {
  const categories = PROMPT_CATEGORIES.map((definition) => {
    const aScore = a.categories.find((category) => category.id === definition.id)?.score ?? 0;
    const bScore = b.categories.find((category) => category.id === definition.id)?.score ?? 0;
    const difference = Math.abs(aScore - bScore);
    const similar = difference <= 8;
    const message = similar
      ? `두 사용자 모두 ${definition.label} 점수가 비슷합니다.`
      : aScore > bScore
        ? `사용자 A가 ${definition.label}에서 ${difference}점 높습니다.`
        : `사용자 B가 ${definition.label}에서 ${difference}점 높습니다.`;
    return { id: definition.id, label: definition.label, aScore, bScore, difference, message, similar };
  });
  return {
    a,
    b,
    totalMessage: Math.abs(a.score - b.score) <= 3 ? '두 사용자의 총점이 비슷합니다.' : a.score > b.score ? `사용자 A의 총점이 ${a.score - b.score}점 높습니다.` : `사용자 B의 총점이 ${b.score - a.score}점 높습니다.`,
    categories,
    largestDifferences: [...categories].sort((left, right) => right.difference - left.difference).slice(0, 3),
    similarCategories: categories.filter((category) => category.similar),
  };
};
