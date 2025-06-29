<?php

namespace App\Tests\Unit\Domain\Service;

use App\Domain\Entity\RealEstateCalculation;
use App\Domain\Service\RealEstateCalculatorService;
use PHPUnit\Framework\TestCase;

class RealEstateCalculatorServiceTest extends TestCase
{
    private RealEstateCalculatorService $service;

    protected function setUp(): void
    {
        $this->service = new RealEstateCalculatorService();
    }

    public function testCalculateBasicMortgagePayment(): void
    {
        // Test case: $300,000 purchase, 20% down, 6.5% rate, 30 years
        $calculation = new RealEstateCalculation();
        $calculation->setPurchasePrice('300000')
            ->setDownPayment('20')
            ->setUsePercentageForDownPayment(true)
            ->setRehabCosts('0')
            ->setClosingCosts('10000')
            ->setInterestRate('0.065') // 6.5% as decimal
            ->setTermYears(30)
            ->setPaymentsPerYear(12)
            ->setInsuranceCost('1200')
            ->setPropertyTaxes('3600')
            ->setExpectedRentalIncome('2500')
            ->setOperatingExpenses('10')
            ->setUsePercentageForOpex(true)
            ->setCapitalExpenditures('5')
            ->setUsePercentageForCapex(true)
            ->setAppreciationRate('0.03');

        $results = $this->service->calculateResults($calculation);

        // Verify key calculations
        $this->assertEquals(310000.00, $results['totalAcquisitionCost']); // $300k + $10k closing
        $this->assertEquals(60000.00, $results['downPaymentAmount']); // 20% of $300k
        $this->assertEquals(250000.00, $results['loanAmount']); // $310k - $60k
        
        // Mortgage payment should be around $1,580 for $250k at 6.5% for 30 years
        $this->assertEqualsWithDelta(1580.17, $results['monthlyMortgagePayment'], 1.0);
        
        // Operating expenses: 10% of $2,500 = $250
        $this->assertEquals(250.00, $results['monthlyOperatingExpenses']);
        
        // Capital expenditures: 5% of $2,500 = $125
        $this->assertEquals(125.00, $results['monthlyCapitalExpenditures']);
    }

    public function testCalculateWithDollarAmountDownPayment(): void
    {
        $calculation = new RealEstateCalculation();
        $calculation->setPurchasePrice('400000')
            ->setDownPayment('80000') // Dollar amount, not percentage
            ->setUsePercentageForDownPayment(false)
            ->setRehabCosts('0')
            ->setClosingCosts('10000')
            ->setInterestRate('0.07') // 7%
            ->setTermYears(30)
            ->setPaymentsPerYear(12)
            ->setInsuranceCost('1800')
            ->setPropertyTaxes('4800')
            ->setExpectedRentalIncome('3200')
            ->setOperatingExpenses('320') // Dollar amount
            ->setUsePercentageForOpex(false)
            ->setCapitalExpenditures('160') // Dollar amount
            ->setUsePercentageForCapex(false)
            ->setAppreciationRate('0.04');

        $results = $this->service->calculateResults($calculation);

        $this->assertEquals(410000.00, $results['totalAcquisitionCost']);
        $this->assertEquals(80000.00, $results['downPaymentAmount']);
        $this->assertEquals(330000.00, $results['loanAmount']);
        $this->assertEquals(320.00, $results['monthlyOperatingExpenses']);
        $this->assertEquals(160.00, $results['monthlyCapitalExpenditures']);
    }

    public function testCalculatePercentageBasedExpenses(): void
    {
        $calculation = new RealEstateCalculation();
        $calculation->setPurchasePrice('500000')
            ->setDownPayment('100000')
            ->setUsePercentageForDownPayment(false)
            ->setRehabCosts('15000')
            ->setClosingCosts('12000')
            ->setInterestRate('0.06')
            ->setTermYears(30)
            ->setPaymentsPerYear(12)
            ->setInsuranceCost('2400')
            ->setPropertyTaxes('6000')
            ->setExpectedRentalIncome('4000')
            ->setOperatingExpenses('12') // 12% of rental income
            ->setUsePercentageForOpex(true)
            ->setCapitalExpenditures('8') // 8% of rental income
            ->setUsePercentageForCapex(true)
            ->setAppreciationRate('0.035');

        $results = $this->service->calculateResults($calculation);

        // 12% of $4,000 = $480
        $this->assertEquals(480.00, $results['monthlyOperatingExpenses']);
        
        // 8% of $4,000 = $320
        $this->assertEquals(320.00, $results['monthlyCapitalExpenditures']);
        
        $this->assertEquals(527000.00, $results['totalAcquisitionCost']); // $500k + $15k + $12k
        $this->assertEquals(427000.00, $results['loanAmount']); // $527k - $100k
    }

    public function testCalculateCashFlow(): void
    {
        $calculation = new RealEstateCalculation();
        $calculation->setPurchasePrice('300000')
            ->setDownPayment('60000')
            ->setUsePercentageForDownPayment(false)
            ->setRehabCosts('0')
            ->setClosingCosts('8000')
            ->setInterestRate('0.065')
            ->setTermYears(30)
            ->setPaymentsPerYear(12)
            ->setInsuranceCost('1200') // $100/month
            ->setPropertyTaxes('2400') // $200/month
            ->setExpectedRentalIncome('2800')
            ->setOperatingExpenses('280') // $280/month
            ->setUsePercentageForOpex(false)
            ->setCapitalExpenditures('140') // $140/month
            ->setUsePercentageForCapex(false)
            ->setAppreciationRate('0.03');

        $results = $this->service->calculateResults($calculation);

        $expectedTotalExpenses = $results['monthlyMortgagePayment'] + 280 + 140 + 100 + 200;
        $expectedCashFlow = 2800 - $expectedTotalExpenses;

        $this->assertEqualsWithDelta($expectedCashFlow, $results['monthlyCashFlow'], 0.01);
        $this->assertEqualsWithDelta($expectedCashFlow * 12, $results['annualCashFlow'], 0.1);
    }

    public function testCalculateROI(): void
    {
        $calculation = new RealEstateCalculation();
        $calculation->setPurchasePrice('200000')
            ->setDownPayment('40000')
            ->setUsePercentageForDownPayment(false)
            ->setRehabCosts('10000')
            ->setClosingCosts('6000')
            ->setInterestRate('0.06')
            ->setTermYears(30)
            ->setPaymentsPerYear(12)
            ->setInsuranceCost('1000')
            ->setPropertyTaxes('2000')
            ->setExpectedRentalIncome('2200')
            ->setOperatingExpenses('10')
            ->setUsePercentageForOpex(true)
            ->setCapitalExpenditures('5')
            ->setUsePercentageForCapex(true)
            ->setAppreciationRate('0.03');

        $results = $this->service->calculateResults($calculation);

        $totalCashInvested = 40000 + 10000 + 6000; // Down payment + rehab + closing
        $this->assertEquals($totalCashInvested, $results['totalCashInvested']);

        // Cash-on-cash return should be annual cash flow / total cash invested
        $expectedCashOnCashReturn = ($results['annualCashFlow'] / $totalCashInvested) * 100;
        $this->assertEqualsWithDelta($expectedCashOnCashReturn, $results['cashOnCashReturn'], 0.01);
    }

    public function testZeroInterestRateHandling(): void
    {
        $calculation = new RealEstateCalculation();
        $calculation->setPurchasePrice('100000')
            ->setDownPayment('20000')
            ->setUsePercentageForDownPayment(false)
            ->setRehabCosts('0')
            ->setClosingCosts('0')
            ->setInterestRate('0') // Zero interest rate
            ->setTermYears(30)
            ->setPaymentsPerYear(12)
            ->setInsuranceCost('0')
            ->setPropertyTaxes('0')
            ->setExpectedRentalIncome('1000')
            ->setOperatingExpenses('0')
            ->setUsePercentageForOpex(false)
            ->setCapitalExpenditures('0')
            ->setUsePercentageForCapex(false)
            ->setAppreciationRate('0');

        $results = $this->service->calculateResults($calculation);

        // With zero interest, payment should be loan amount / total payments
        $expectedPayment = 80000 / (30 * 12); // $80k loan / 360 payments
        $this->assertEqualsWithDelta($expectedPayment, $results['monthlyMortgagePayment'], 0.01);
    }

    public function testAppreciationCalculation(): void
    {
        $calculation = new RealEstateCalculation();
        $calculation->setPurchasePrice('300000')
            ->setDownPayment('60000')
            ->setUsePercentageForDownPayment(false)
            ->setRehabCosts('0')
            ->setClosingCosts('0')
            ->setInterestRate('0.05')
            ->setTermYears(30)
            ->setPaymentsPerYear(12)
            ->setInsuranceCost('0')
            ->setPropertyTaxes('0')
            ->setExpectedRentalIncome('2000')
            ->setOperatingExpenses('0')
            ->setUsePercentageForOpex(false)
            ->setCapitalExpenditures('0')
            ->setUsePercentageForCapex(false)
            ->setAppreciationRate('0.04'); // 4% annual appreciation

        $results = $this->service->calculateResults($calculation);

        // Future value = present value * (1 + rate)^years
        $expectedFutureValue = 300000 * pow(1.04, 30);
        $this->assertEqualsWithDelta($expectedFutureValue, $results['futurePropertyValue'], 100);
    }
}
