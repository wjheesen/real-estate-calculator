<?php

namespace App\Domain\Service;

use App\Domain\Entity\RealEstateCalculation;

class RealEstateCalculatorService
{
    public function calculateResults(RealEstateCalculation $calculation): array
    {
        $purchasePrice = (float) $calculation->getPurchasePrice();
        $rehabCosts = (float) $calculation->getRehabCosts();
        $closingCosts = (float) $calculation->getClosingCosts();
        $downPayment = (float) $calculation->getDownPayment();
        $interestRate = (float) $calculation->getInterestRate();
        $termYears = $calculation->getTermYears();
        $paymentsPerYear = $calculation->getPaymentsPerYear();
        $insuranceCost = (float) $calculation->getInsuranceCost();
        $propertyTaxes = (float) $calculation->getPropertyTaxes();
        $expectedRentalIncome = (float) $calculation->getExpectedRentalIncome();
        $operatingExpenses = (float) $calculation->getOperatingExpenses();
        $capitalExpenditures = (float) $calculation->getCapitalExpenditures();
        $appreciationRate = (float) $calculation->getAppreciationRate();

        // Calculate total acquisition cost
        $totalAcquisitionCost = $purchasePrice + $rehabCosts + $closingCosts;
        
        // Calculate down payment amount
        $downPaymentAmount = $downPayment;
        if ($calculation->isUsePercentageForDownPayment()) {
            $downPaymentAmount = ($downPayment / 100) * $purchasePrice;
        }
        
        // Calculate loan amount
        $loanAmount = $totalAcquisitionCost - $downPaymentAmount;
        
        // Calculate monthly mortgage payment using PMT formula
        $monthlyInterestRate = $interestRate / $paymentsPerYear;
        $totalPayments = $termYears * $paymentsPerYear;
        
        $monthlyMortgagePayment = 0;
        if ($loanAmount > 0 && $monthlyInterestRate > 0) {
            $monthlyMortgagePayment = $loanAmount * 
                ($monthlyInterestRate * pow(1 + $monthlyInterestRate, $totalPayments)) / 
                (pow(1 + $monthlyInterestRate, $totalPayments) - 1);
        } elseif ($loanAmount > 0) {
            // If interest rate is 0, just divide by number of payments
            $monthlyMortgagePayment = $loanAmount / $totalPayments;
        }
        
        // Calculate monthly operating expenses
        $monthlyOperatingExpenses = $operatingExpenses;
        if ($calculation->isUsePercentageForOpex()) {
            $monthlyOperatingExpenses = ($operatingExpenses / 100) * $expectedRentalIncome;
        }
        
        // Calculate monthly capital expenditures
        $monthlyCapitalExpenditures = $capitalExpenditures;
        if ($calculation->isUsePercentageForCapex()) {
            $monthlyCapitalExpenditures = ($capitalExpenditures / 100) * $expectedRentalIncome;
        }
        
        // Calculate monthly insurance and taxes
        $monthlyInsurance = $insuranceCost / 12;
        $monthlyPropertyTaxes = $propertyTaxes / 12;
        
        // Calculate total monthly expenses
        $totalMonthlyExpenses = $monthlyMortgagePayment + $monthlyOperatingExpenses + 
                               $monthlyCapitalExpenditures + $monthlyInsurance + $monthlyPropertyTaxes;
        
        // Calculate monthly income after expenses
        $monthlyIncomeAfterExpenses = $expectedRentalIncome - $monthlyOperatingExpenses - 
                                     $monthlyCapitalExpenditures - $monthlyInsurance - $monthlyPropertyTaxes;
        
        // Calculate cash flow
        $monthlyCashFlow = $expectedRentalIncome - $totalMonthlyExpenses;
        $annualCashFlow = $monthlyCashFlow * 12;
        
        // Calculate Return on Investment (ROI)
        $totalCashInvested = $downPaymentAmount + $rehabCosts + $closingCosts;
        $cashOnCashReturn = $totalCashInvested > 0 ? ($annualCashFlow / $totalCashInvested) * 100 : 0;
        
        // Calculate future value of property
        $futurePropertyValue = $purchasePrice * pow(1 + $appreciationRate, $termYears);
        
        // Calculate remaining loan balance after term
        $remainingLoanBalance = 0;
        // For this example, we'll assume the loan is paid off after the term
        // In a real scenario, this would need more complex amortization calculation
        
        // Calculate total profit after selling
        $totalMortgagePayments = $monthlyMortgagePayment * $totalPayments;
        $totalOperatingExpenses = ($monthlyOperatingExpenses + $monthlyCapitalExpenditures + 
                                  $monthlyInsurance + $monthlyPropertyTaxes) * $totalPayments;
        $totalRentalIncome = $expectedRentalIncome * $totalPayments;
        $netRentalProfit = $totalRentalIncome - $totalOperatingExpenses - $totalMortgagePayments;
        
        // Assuming 6% selling costs (agent fees, etc.)
        $sellingCosts = $futurePropertyValue * 0.06;
        $netProceedsFromSale = $futurePropertyValue - $remainingLoanBalance - $sellingCosts;
        
        $totalProfit = $netRentalProfit + $netProceedsFromSale - $totalCashInvested;
        $totalROI = $totalCashInvested > 0 ? ($totalProfit / $totalCashInvested) * 100 : 0;
        
        return [
            'totalAcquisitionCost' => round($totalAcquisitionCost, 2),
            'downPaymentAmount' => round($downPaymentAmount, 2),
            'loanAmount' => round($loanAmount, 2),
            'monthlyMortgagePayment' => round($monthlyMortgagePayment, 2),
            'monthlyOperatingExpenses' => round($monthlyOperatingExpenses, 2),
            'monthlyCapitalExpenditures' => round($monthlyCapitalExpenditures, 2),
            'monthlyInsurance' => round($monthlyInsurance, 2),
            'monthlyPropertyTaxes' => round($monthlyPropertyTaxes, 2),
            'totalMonthlyExpenses' => round($totalMonthlyExpenses, 2),
            'monthlyIncomeAfterExpenses' => round($monthlyIncomeAfterExpenses, 2),
            'monthlyCashFlow' => round($monthlyCashFlow, 2),
            'annualCashFlow' => round($annualCashFlow, 2),
            'cashOnCashReturn' => round($cashOnCashReturn, 2),
            'futurePropertyValue' => round($futurePropertyValue, 2),
            'totalCashInvested' => round($totalCashInvested, 2),
            'totalProfit' => round($totalProfit, 2),
            'totalROI' => round($totalROI, 2),
            'netProceedsFromSale' => round($netProceedsFromSale, 2),
            'sellingCosts' => round($sellingCosts, 2)
        ];
    }
}
