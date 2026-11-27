import { aggregatePortfolio } from './portfolio-aggregator';
import { comparisonRows } from './portfolio-comparison';

describe('comparisonRows', () => {
  const empty = aggregatePortfolio(1, [], 300);

  it('reports B minus A, classifies lower cash required and higher fit, and uses percentage points', () => {
    const rows = comparisonRows(
      { ...empty, netCashRequiredUSD: 50000, monthlyBudgetFitUSD: 300, annualCashOnCashPercentage: 4 },
      { ...empty, netCashRequiredUSD: 40000, monthlyBudgetFitUSD: 100, annualCashOnCashPercentage: 5 },
    );
    expect(rows.find(({ key }) => key === 'netCashRequiredUSD')).toEqual(jasmine.objectContaining({
      delta: '-$10,000.00', direction: 'favorable',
    }));
    expect(rows.find(({ key }) => key === 'monthlyBudgetFitUSD')).toEqual(jasmine.objectContaining({
      delta: '-$200.00', direction: 'unfavorable',
    }));
    expect(rows.find(({ key }) => key === 'annualCashOnCashPercentage')).toEqual(jasmine.objectContaining({
      delta: '+1.00 pp', direction: 'favorable',
    }));
  });

  it('leaves missing fit empty and treats equal or contextual metrics as neutral', () => {
    const absent = aggregatePortfolio(1, [], null);
    const rows = comparisonRows(absent, { ...absent, signedSaleProceedsUSD: 20000 });
    expect(rows.find(({ key }) => key === 'monthlyBudgetFitUSD')).toEqual(jasmine.objectContaining({
      current: '—', comparison: '—', delta: '—', direction: 'neutral',
    }));
    expect(rows.find(({ key }) => key === 'monthlyCashFlowUSD')).toEqual(jasmine.objectContaining({
      delta: '$0.00', direction: 'neutral',
    }));
    expect(rows.find(({ key }) => key === 'signedSaleProceedsUSD')).toEqual(jasmine.objectContaining({
      delta: '+$20,000.00', direction: 'neutral',
    }));
  });
});
