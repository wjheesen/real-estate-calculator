# Real Estate Investment Calculator - Settings Feature

## Overview
The calculator now includes a comprehensive settings system where users can configure default values that will be automatically applied to new calculations.

## Settings Available

### Financial Settings
- **Interest Rate**: Default loan interest rate (%)
- **Down Payment**: Default down payment percentage (%)
- **Term in Years**: Default loan term length
- **Payments per Year**: Default payment frequency (typically 12 for monthly)

### Property Settings
- **Operating Expenses**: Default operating expenses as percentage of rental income (%)
- **Capital Expenditures**: Default capital expenditures as percentage of rental income (%)
- **Appreciation**: Default annual property appreciation rate (%)

### Mortgage Insurance
- **Mortgage Insurance Rate**: Default mortgage insurance rate as percentage of loan amount (%)
- **Important**: Mortgage insurance is automatically disabled when down payment is 20% or more
- The field is visually greyed out and ignored in calculations when not applicable

## How It Works

### Settings Persistence
- Settings are saved in the browser's localStorage
- Settings persist across browser sessions
- Settings can be reset to factory defaults at any time

### Integration with Calculator
- When the calculator loads, it automatically applies current settings as default values
- Settings are applied to new calculations, but don't override loaded saved calculations
- The mortgage insurance field dynamically enables/disables based on down payment percentage

### Navigation
- Access settings via the "Settings" button in the calculator header
- Settings are also available in the main navigation menu
- Easy navigation back to calculator with saved settings

## Usage Tips

1. **Set your preferred defaults**: Configure the settings once with your typical investment parameters
2. **Mortgage insurance logic**: The system automatically handles the 20% down payment rule for mortgage insurance
3. **Easy reset**: Use "Reset to Defaults" if you want to restore factory settings
4. **Immediate application**: Settings changes are immediately available when creating new calculations

## Technical Implementation

- Settings are managed through a dedicated Angular service (`SettingsService`)
- Form validation ensures all settings are within reasonable ranges
- Reactive forms provide real-time validation feedback
- Material Design components ensure consistent UI/UX
