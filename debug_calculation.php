<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Domain\Entity\RealEstateCalculation;
use App\Domain\Service\RealEstateCalculatorService;

// Create a calculation instance matching the failing test
$calculation = new RealEstateCalculation();
$calculation->setPurchasePrice('250000');
$calculation->setDownPayment('50000');
$calculation->setUsePercentageForDownPayment(false);  // Dollar amount, not percentage
$calculation->setExpectedRentalIncome('2200');
$calculation->setInterestRate('0.06');

// Create calculator service
$calculatorService = new RealEstateCalculatorService();

// Calculate results
$results = $calculatorService->calculateResults($calculation);

echo "=== Debug Calculation (Matching Test) ===\n";
echo "Purchase Price: " . $calculation->getPurchasePrice() . "\n";
echo "Down Payment Input: " . $calculation->getDownPayment() . "\n";
echo "Use Percentage: " . ($calculation->isUsePercentageForDownPayment() ? 'true' : 'false') . "\n";
echo "Expected Rental Income: " . $calculation->getExpectedRentalIncome() . "\n";
echo "\n=== Calculated Results ===\n";
echo "Down Payment Amount: $" . number_format($results['downPaymentAmount'], 2) . "\n";
echo "Monthly Cash Flow: $" . number_format($results['monthlyCashFlow'], 2) . "\n";
echo "Monthly Mortgage Payment: $" . number_format($results['monthlyMortgagePayment'], 2) . "\n";
$results = $service->calculateResults($calculation);

// Debug output
echo "Purchase Price: " . $calculation->getPurchasePrice() . "\n";
echo "Rehab Costs: " . $calculation->getRehabCosts() . "\n";
echo "Closing Costs: " . $calculation->getClosingCosts() . "\n";
echo "Down Payment: " . $calculation->getDownPayment() . "\n";
echo "Interest Rate: " . $calculation->getInterestRate() . "\n";

echo "\nCalculated Values:\n";
echo "Total Acquisition Cost: $" . number_format($results['totalAcquisitionCost'], 2) . "\n";
echo "Down Payment Amount: $" . number_format($results['downPaymentAmount'], 2) . "\n";
echo "Loan Amount: $" . number_format($results['loanAmount'], 2) . "\n";
echo "Monthly Mortgage Payment: $" . number_format($results['monthlyMortgagePayment'], 2) . "\n";
