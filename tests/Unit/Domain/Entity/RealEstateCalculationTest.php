<?php

namespace App\Tests\Unit\Domain\Entity;

use App\Domain\Entity\RealEstateCalculation;
use PHPUnit\Framework\TestCase;

class RealEstateCalculationTest extends TestCase
{
    public function testEntityCreation(): void
    {
        $calculation = new RealEstateCalculation();
        
        $this->assertInstanceOf(RealEstateCalculation::class, $calculation);
        $this->assertNull($calculation->getId());
        $this->assertInstanceOf(\DateTimeInterface::class, $calculation->getCreatedAt());
    }

    public function testDefaultValues(): void
    {
        $calculation = new RealEstateCalculation();
        
        // Test default values
        $this->assertEquals('0', $calculation->getRehabCosts());
        $this->assertEquals('10000', $calculation->getClosingCosts());
        $this->assertEquals('20', $calculation->getDownPayment());
        $this->assertEquals('0.065', $calculation->getInterestRate());
        $this->assertEquals(30, $calculation->getTermYears());
        $this->assertEquals(12, $calculation->getPaymentsPerYear());
        $this->assertEquals('0', $calculation->getInsuranceCost());
        $this->assertEquals('0', $calculation->getPropertyTaxes());
        $this->assertEquals('10', $calculation->getOperatingExpenses());
        $this->assertEquals('5', $calculation->getCapitalExpenditures());
        $this->assertEquals('0', $calculation->getAppreciationRate());
        $this->assertTrue($calculation->isUsePercentageForOpex());
        $this->assertTrue($calculation->isUsePercentageForCapex());
        $this->assertTrue($calculation->isUsePercentageForDownPayment());
    }

    public function testSettersAndGetters(): void
    {
        $calculation = new RealEstateCalculation();
        
        $calculation->setPurchasePrice('350000')
            ->setRehabCosts('15000')
            ->setClosingCosts('8000')
            ->setDownPayment('70000')
            ->setInterestRate('0.055')
            ->setTermYears(15)
            ->setPaymentsPerYear(12)
            ->setInsuranceCost('1500')
            ->setPropertyTaxes('4200')
            ->setExpectedRentalIncome('2800')
            ->setOperatingExpenses('12')
            ->setCapitalExpenditures('6')
            ->setAppreciationRate('0.035')
            ->setUsePercentageForOpex(false)
            ->setUsePercentageForCapex(false)
            ->setUsePercentageForDownPayment(false);

        $this->assertEquals('350000', $calculation->getPurchasePrice());
        $this->assertEquals('15000', $calculation->getRehabCosts());
        $this->assertEquals('8000', $calculation->getClosingCosts());
        $this->assertEquals('70000', $calculation->getDownPayment());
        $this->assertEquals('0.055', $calculation->getInterestRate());
        $this->assertEquals(15, $calculation->getTermYears());
        $this->assertEquals(12, $calculation->getPaymentsPerYear());
        $this->assertEquals('1500', $calculation->getInsuranceCost());
        $this->assertEquals('4200', $calculation->getPropertyTaxes());
        $this->assertEquals('2800', $calculation->getExpectedRentalIncome());
        $this->assertEquals('12', $calculation->getOperatingExpenses());
        $this->assertEquals('6', $calculation->getCapitalExpenditures());
        $this->assertEquals('0.035', $calculation->getAppreciationRate());
        $this->assertFalse($calculation->isUsePercentageForOpex());
        $this->assertFalse($calculation->isUsePercentageForCapex());
        $this->assertFalse($calculation->isUsePercentageForDownPayment());
    }

    public function testFluentInterface(): void
    {
        $calculation = new RealEstateCalculation();
        
        $result = $calculation->setPurchasePrice('300000')
            ->setDownPayment('60000')
            ->setInterestRate('0.065');
            
        $this->assertSame($calculation, $result);
        $this->assertEquals('300000', $calculation->getPurchasePrice());
        $this->assertEquals('60000', $calculation->getDownPayment());
        $this->assertEquals('0.065', $calculation->getInterestRate());
    }

    public function testCreatedAtCanBeSet(): void
    {
        $calculation = new RealEstateCalculation();
        $testDate = new \DateTime('2025-01-01 12:00:00');
        
        $calculation->setCreatedAt($testDate);
        
        $this->assertEquals($testDate, $calculation->getCreatedAt());
    }

    public function testBooleanFlags(): void
    {
        $calculation = new RealEstateCalculation();
        
        // Test initial state (should be true based on defaults)
        $this->assertTrue($calculation->isUsePercentageForOpex());
        $this->assertTrue($calculation->isUsePercentageForCapex());
        $this->assertTrue($calculation->isUsePercentageForDownPayment());
        
        // Test changing flags
        $calculation->setUsePercentageForOpex(false)
            ->setUsePercentageForCapex(false)
            ->setUsePercentageForDownPayment(false);
            
        $this->assertFalse($calculation->isUsePercentageForOpex());
        $this->assertFalse($calculation->isUsePercentageForCapex());
        $this->assertFalse($calculation->isUsePercentageForDownPayment());
        
        // Test setting back to true
        $calculation->setUsePercentageForOpex(true)
            ->setUsePercentageForCapex(true)
            ->setUsePercentageForDownPayment(true);
            
        $this->assertTrue($calculation->isUsePercentageForOpex());
        $this->assertTrue($calculation->isUsePercentageForCapex());
        $this->assertTrue($calculation->isUsePercentageForDownPayment());
    }

    public function testNumericStringHandling(): void
    {
        $calculation = new RealEstateCalculation();
        
        // Test that numeric strings are handled properly
        $calculation->setPurchasePrice('300000.50')
            ->setInterestRate('6.75')
            ->setAppreciationRate('3.25');
            
        $this->assertEquals('300000.50', $calculation->getPurchasePrice());
        $this->assertEquals('6.75', $calculation->getInterestRate());
        $this->assertEquals('3.25', $calculation->getAppreciationRate());
    }

    public function testIntegerProperties(): void
    {
        $calculation = new RealEstateCalculation();
        
        $calculation->setTermYears(25)
            ->setPaymentsPerYear(26); // Bi-weekly payments
            
        $this->assertIsInt($calculation->getTermYears());
        $this->assertIsInt($calculation->getPaymentsPerYear());
        $this->assertEquals(25, $calculation->getTermYears());
        $this->assertEquals(26, $calculation->getPaymentsPerYear());
    }
}
