# Real Estate Investment Calculator

A comprehensive client-side real estate investment calculator built with Angular and TypeScript.

## Features

- **Investment Analysis**: Calculate ROI, cash flow, appreciation, and other key metrics
- **Portfolio Management**: Organize properties into different portfolios
- **Local Storage**: All data stored locally using IndexedDB
- **Data Export/Import**: Export and import portfolio data and settings as ZIP files containing CSV data
- **Responsive Design**: Works on desktop and mobile devices
- **Tax Calculations**: Include tax implications in your analysis

## Getting Started

1. **Prerequisites**:
   - Node.js (v16 or higher)
   - npm or yarn

2. **Installation**:
   ```bash
   npm install
   ```

3. **Development**:
   ```bash
   npm start
   ```

4. **Build**:
   ```bash
   npm run build
   ```

## Usage

### Calculator
- Enter property details (purchase price, rental income, expenses)
- View detailed analysis including cash flow, ROI, and appreciation
- Save calculations to your portfolio

### Portfolio Management
- Create multiple portfolios to organize investments
- Compare different portfolios side by side
- Drag and drop properties between portfolios

### Data Export/Import
- Export all application data and settings as a ZIP file from the top navigation
- Import application data and settings from ZIP files via the top navigation
- Includes README with export information
- Cross-browser compatible

## Technology Stack

- **Frontend**: Angular 18+ with TypeScript
- **UI**: Angular Material
- **Storage**: IndexedDB for local data
- **Export/Import**: ZIP file handling with JSZip library
- **Styling**: CSS with Material Design

## Browser Support

- **All modern browsers**: Full support including data export/import

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
