import { formatUsd } from '../calculator/calculator-formatting';
import { roundToHundredth } from '../calculator/real-estate-calculator';

export function signedUsd(value: number): string {
  return `${roundToHundredth(value) > 0 ? '+' : ''}${formatUsd(value)}`;
}

export function budgetFitLabel(value: number): string {
  const displayed = roundToHundredth(value);
  return displayed > 0 ? 'Surplus' : displayed < 0 ? 'Deficit' : 'Break-even';
}
