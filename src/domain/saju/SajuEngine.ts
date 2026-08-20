import type { SajuInput, SajuResult } from '../types';
import { calculateSajuChart, defaultSajuInput, validateSajuInput } from './SajuCalculationEngine';
import { buildSajuResult, interpretSaju } from './SajuInterpretationEngine';

export { defaultSajuInput, validateSajuInput } from './SajuCalculationEngine';
export { calculateSajuChart } from './SajuCalculationEngine';
export { interpretSaju } from './SajuInterpretationEngine';

export const calculateSaju = (input: SajuInput): SajuResult => {
  const calculation = calculateSajuChart(input);
  const partnerInput: SajuInput | undefined = input.compatibility ? { ...input, ...input.compatibility, topic: 'overall', question: '', background: { family: '', personal: '' }, consent: true, compatibility: undefined } : undefined;
  const partnerChart = partnerInput ? calculateSajuChart(partnerInput).chart : undefined;
  return buildSajuResult(input, calculation, interpretSaju(calculation.chart, input, partnerChart));
};
