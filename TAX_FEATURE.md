# Real Estate Investment Calculator - Tax Feature (Schedule E)

## Overview
The calculator now includes comprehensive Schedule E tax calculations to help investors understand their tax liability from rental property investments.

## New Tax-Related Features

### Form Fields Added
1. **Schedule E Deductible Amount**: The building value (excluding land) that is eligible for depreciation
2. **Rental Use Percentage**: The percentage of the property used for rental income (typically 100% for investment properties)

### Calculations Performed

#### Depreciation Calculation
- **Formula**: `(Schedule E Deductible Amount ÷ 27.5 years) × (Rental Use Percentage ÷ 100)`
- **Purpose**: Real estate depreciation follows IRS rules - residential rental property is depreciated over 27.5 years
- **Example**: $200,000 building value at 100% rental use = $7,273 annual depreciation

#### Tax Income Calculations
1. **Pre-tax Income**: Annual rental income minus all operating expenses (excluding mortgage payments)
   - Includes: Operating expenses, capital expenditures, insurance, mortgage insurance, property taxes
   - Excludes: Mortgage principal and interest payments (handled separately)

2. **Taxable Income**: Pre-tax income minus annual depreciation
   - This is the amount subject to income tax
   - Can be negative (tax loss) which may offset other income

### Results Display
The new "Tax Information (Schedule E)" card shows:
- **Pre-tax Income**: Income before depreciation deduction
- **Annual Depreciation**: Calculated depreciation amount
- **Taxable Income**: Final amount subject to income tax

### Important Notes
- **Professional Consultation**: Tax calculations are complex and this tool provides estimates only
- **IRS Compliance**: Always consult a tax professional for accurate tax planning
- **Depreciation Recapture**: Not calculated here - relevant when property is sold
- **State Taxes**: Not included - varies by location

## Integration with Existing Features

### Settings Integration
Tax fields are not included in default settings as they are property-specific rather than user preference defaults.

### Saved Calculations
Tax information is saved with each calculation and can be loaded later.

### Form Validation
- Schedule E Deductible Amount: Required, minimum $0
- Rental Use Percentage: Required, 0-100%

## Usage Example
For a $300,000 property with $50,000 land value:
- Schedule E Deductible Amount: $250,000 (building only)
- Rental Use Percentage: 100%
- Annual Depreciation: $9,091
- If rental income minus expenses = $15,000
- Taxable Income: $15,000 - $9,091 = $5,909

## UI Improvements Made
- Removed confusing default values from purchase information fields
- Added helpful hints for tax fields
- Professional tax note with disclaimer
- Consistent styling with existing calculator design

This feature provides investors with crucial tax planning information while maintaining the calculator's ease of use and professional appearance.
