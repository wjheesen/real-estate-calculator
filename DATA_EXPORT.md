# Data Export/Import Feature

This application includes data export/import capabilities for backing up and syncing portfolio data and application settings.

## Features

- **Export to ZIP**: Download all portfolio data and settings as a single ZIP file containing CSV files
- **Import from ZIP**: Restore portfolio data and settings from ZIP file
- **Cross-Browser Support**: Works in all modern browsers
- **README Included**: ZIP files include a README with import instructions

## How to Use

1. **Export**: Click the download button (↓) in the top navigation bar to export all your application data and settings as a ZIP file
2. **Import**: Click the upload button (↑) in the top navigation bar to import application data and settings from a ZIP file
3. **Confirmation**: Import operations will show a confirmation dialog since they replace all current data and settings

## Technical Details

- Exports a single ZIP file containing:
  - `portfolios.csv`: Portfolio information
  - `calculations.csv`: Property calculation data  
  - `settings.csv`: Application settings and defaults
  - `README.txt`: Import instructions and export metadata
- Uses JSZip library for ZIP file creation and extraction
- Full backup/restore approach (no incremental syncing)
- Handles all portfolio, calculation, and settings data fields

## Browser Support

- **All modern browsers**: Full support for ZIP export/import
- **File handling**: Uses standard HTML5 file APIs and JSZip library

## ZIP File Contents

### File Structure
```
real-estate-portfolio-2025-01-01.zip
├── portfolios.csv
├── calculations.csv
├── settings.csv
└── README.txt
```

### Portfolios CSV Format
```csv
id,name,description,color,createdAt,updatedAt
1,"My Portfolio","Default portfolio",#2196F3,2025-01-01T00:00:00.000Z,2025-01-01T00:00:00.000Z
```

### Calculations CSV Format
```csv
id,name,description,purchasePrice,rehabCosts,closingCosts,downPayment,usePercentageForDownPayment,interestRate,termYears,paymentsPerYear,insuranceCost,mortgageInsurance,usePercentageForMortgageInsurance,propertyTaxes,expectedRentalIncome,operatingExpenses,usePercentageForOpex,capitalExpenditures,usePercentageForCapex,appreciationRate,scheduleEDeductibleAmount,rentalUsePercentage,portfolioId,scenarioId,createdAt,updatedAt
1,"Property 1","Sample property",250000,0,5000,50000,false,4.5,30,12,1200,0,false,3000,2500,500,false,250,false,3,0,100,1,,2025-01-01T00:00:00.000Z,2025-01-01T00:00:00.000Z
```

### Settings CSV Format
```csv
interestRate,downPaymentPercentage,termInYears,paymentsPerYear,operatingExpensesPercentage,capitalExpendituresPercentage,mortgageInsuranceRatePercentage,appreciationPercentage
6.5,20,30,12,10,5,0.5,3
```

## Benefits

- **Single File**: No need to manage multiple CSV files
- **Self-Documenting**: Includes README with export date and instructions
- **Easier Sharing**: Share complete portfolio data and settings in one file
- **Version Control Friendly**: Single file is easier to track in version control
- **Complete Backup**: Includes all data and user preferences

## Security Notes

- Data is processed entirely client-side
- No external transmission of data
- Files are downloaded/uploaded locally
- Standard file system security applies
