import { isNonNegativeAmount, type BudgetListName } from '../../../features/budget/budget-calculator';
import { isValidSetting } from '../../../models/planner-settings';
import type { LineItem } from '../../../shared/utils/list-helpers';
import type { ArchiveState } from '../archive-state';
import { ArchiveValidationError, type CsvRow, readCsv, writeCsv } from '../csv-utils';

const file = 'budget.csv';
const lineFields = ['position', 'id', 'name', 'description', 'amount'] as const;
const basicFields = [
  'grossIncome', 'useTwoWeekPayStub', 'anticipatedMortgageRate', 'anticipatedMortgageTermYears', 'createdAt', 'updatedAt',
] as const;
const columns = ['section', ...lineFields, ...basicFields];
const lists = {
  PAY_DEDUCTIONS: 'payDeductions',
  MONTHLY_EXPENSES: 'monthlyExpenses',
  ANNUAL_EXPENSES: 'annualExpenses',
  MONTHLY_HOUSING_EXPENSES: 'monthlyHousingExpenses',
  ANNUAL_HOUSING_EXPENSES: 'annualHousingExpenses',
} as const;
type Section = keyof typeof lists;

export function encodeBudget(budget: ArchiveState['budget']): string {
  if (!budget) return writeCsv(columns, []);
  return writeCsv(columns, [
    ['BASIC', '', '', '', '', '', ...basicFields.map((field) => budget[field])],
    ...Object.entries(lists).flatMap(([section, key]) => budget[key].map((item, position) => [
      section, position, item.id, item.name, item.description, item.amount, '', '', '', '', '', '',
    ])),
  ]);
}

function decodeBasic(row: CsvRow) {
  row.empty(lineFields);
  const grossIncome = row.number('grossIncome');
  const rate = row.number('anticipatedMortgageRate');
  const years = row.number('anticipatedMortgageTermYears');
  if (!isNonNegativeAmount(grossIncome)) row.fail('grossIncome', 'Income must be nonnegative.');
  if (!isValidSetting('interestRate', rate)) row.fail('anticipatedMortgageRate', 'Enter a rate from 0 to 100.');
  if (!isValidSetting('termInYears', years)) row.fail('anticipatedMortgageTermYears', 'Enter 1 to 50 whole years.');
  return {
    grossIncome,
    useTwoWeekPayStub: row.boolean('useTwoWeekPayStub'),
    anticipatedMortgageRate: rate,
    anticipatedMortgageTermYears: years,
    createdAt: row.timestamp('createdAt'),
    updatedAt: row.timestamp('updatedAt'),
  };
}

export function decodeBudget(csv: string): ArchiveState['budget'] {
  const { rows } = readCsv(csv, file, columns);
  if (!rows.length) return null;
  let basic: ReturnType<typeof decodeBasic> | undefined;
  const ordered: Record<BudgetListName, { position: number; item: LineItem; row: CsvRow }[]> = {
    payDeductions: [], monthlyExpenses: [], annualExpenses: [], monthlyHousingExpenses: [], annualHousingExpenses: [],
  };
  for (const row of rows) {
    const section = row.text('section');
    if (section === 'BASIC') {
      if (basic) row.fail('section', 'Duplicate BASIC record.');
      basic = decodeBasic(row);
      continue;
    }
    if (!Object.hasOwn(lists, section)) row.fail('section', 'Unknown budget section.');
    row.empty(basicFields);
    const position = row.integer('position', true);
    const id = row.integer('id');
    const amount = row.number('amount');
    if (!isNonNegativeAmount(amount)) row.fail('amount', 'The amount must be nonnegative.');
    ordered[lists[section as Section]].push({ position, row, item: { id, amount, name: row.name(), ...row.description() } });
  }
  if (!basic) throw new ArchiveValidationError(file, 'Line items require a BASIC record.', rows[0].record, 'section');

  function items(key: BudgetListName): LineItem[] {
    const ids = new Set<number>();
    return ordered[key].sort((a, b) => a.position - b.position).map(({ position, row, item }, index) => {
      if (position !== index) row.fail('position', 'Positions must start at zero and contain no duplicates or gaps.');
      if (ids.has(item.id)) row.fail('id', 'Duplicate line-item ID.');
      ids.add(item.id);
      return item;
    });
  }

  return {
    ...basic,
    payDeductions: items('payDeductions'),
    monthlyExpenses: items('monthlyExpenses'),
    annualExpenses: items('annualExpenses'),
    monthlyHousingExpenses: items('monthlyHousingExpenses'),
    annualHousingExpenses: items('annualHousingExpenses'),
  };
}
