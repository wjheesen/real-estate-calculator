<?php

namespace App\Tests\Integration;

use App\Domain\Entity\RealEstateCalculation;
use App\Infra\Repository\RealEstateCalculationRepository;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Doctrine\ORM\EntityManagerInterface;

class RealEstateCalculationRepositoryIntegrationTest extends KernelTestCase
{
    private EntityManagerInterface $entityManager;
    private RealEstateCalculationRepository $repository;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        
        $this->entityManager = $kernel->getContainer()
            ->get('doctrine')
            ->getManager();
            
        $this->repository = $this->entityManager->getRepository(RealEstateCalculation::class);

        // Start with a clean database for each test
        $this->entityManager->createQuery('DELETE FROM App\Domain\Entity\RealEstateCalculation')->execute();
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        
        // Clean up
        $this->entityManager->close();
    }

    public function testSaveAndFindById(): void
    {
        $calculation = new RealEstateCalculation();
        $calculation->setPurchasePrice('300000')
            ->setDownPayment('60000')
            ->setExpectedRentalIncome('2500')
            ->setInterestRate('0.065');

        // Save the calculation
        $this->repository->save($calculation);
        
        $this->assertNotNull($calculation->getId());
        $savedId = $calculation->getId();

        // Find by ID
        $found = $this->repository->findById($savedId);
        
        $this->assertInstanceOf(RealEstateCalculation::class, $found);
        $this->assertEquals($savedId, $found->getId());
        $this->assertEquals('300000', $found->getPurchasePrice());
        $this->assertEquals('60000', $found->getDownPayment());
        $this->assertEquals('2500', $found->getExpectedRentalIncome());
        $this->assertEquals('0.065', $found->getInterestRate());
    }

    public function testFindByIdReturnsNullForNonExistentId(): void
    {
        $result = $this->repository->findById(99999);
        
        $this->assertNull($result);
    }

    public function testFindAllOrderedByDate(): void
    {
        // Create multiple calculations with different dates
        $calculation1 = new RealEstateCalculation();
        $calculation1->setPurchasePrice('200000')
            ->setExpectedRentalIncome('1800')
            ->setCreatedAt(new \DateTime('2025-01-01'));

        $calculation2 = new RealEstateCalculation();
        $calculation2->setPurchasePrice('300000')
            ->setExpectedRentalIncome('2500')
            ->setCreatedAt(new \DateTime('2025-01-02'));

        $calculation3 = new RealEstateCalculation();
        $calculation3->setPurchasePrice('400000')
            ->setExpectedRentalIncome('3200')
            ->setCreatedAt(new \DateTime('2025-01-03'));

        // Save all calculations
        $this->repository->save($calculation1);
        $this->repository->save($calculation2);
        $this->repository->save($calculation3);

        // Find all ordered by date
        $results = $this->repository->findAllOrderedByDate();
        
        $this->assertCount(3, $results);
        
        // Should be ordered by created_at DESC (newest first)
        $this->assertEquals('400000', $results[0]->getPurchasePrice());
        $this->assertEquals('300000', $results[1]->getPurchasePrice());
        $this->assertEquals('200000', $results[2]->getPurchasePrice());
    }

    public function testFindAllOrderedByDateReturnsEmptyArray(): void
    {
        $results = $this->repository->findAllOrderedByDate();
        
        $this->assertIsArray($results);
        $this->assertEmpty($results);
    }

    public function testDelete(): void
    {
        $calculation = new RealEstateCalculation();
        $calculation->setPurchasePrice('250000')
            ->setExpectedRentalIncome('2000');

        $this->repository->save($calculation);
        $savedId = $calculation->getId();
        
        // Verify it exists
        $found = $this->repository->findById($savedId);
        $this->assertNotNull($found);

        // Delete it
        $this->repository->delete($calculation);

        // Verify it's gone
        $found = $this->repository->findById($savedId);
        $this->assertNull($found);
    }

    public function testSaveWithAllFields(): void
    {
        $calculation = new RealEstateCalculation();
        $calculation->setPurchasePrice('500000')
            ->setRehabCosts('25000')
            ->setClosingCosts('15000')
            ->setDownPayment('25')
            ->setUsePercentageForDownPayment(true)
            ->setInterestRate('0.07')
            ->setTermYears(25)
            ->setPaymentsPerYear(12)
            ->setInsuranceCost('2400')
            ->setPropertyTaxes('6000')
            ->setExpectedRentalIncome('4000')
            ->setOperatingExpenses('12')
            ->setUsePercentageForOpex(true)
            ->setCapitalExpenditures('8')
            ->setUsePercentageForCapex(true)
            ->setAppreciationRate('0.04');

        $this->repository->save($calculation);
        $savedId = $calculation->getId();

        // Clear entity manager to ensure fresh fetch
        $this->entityManager->clear();

        $found = $this->repository->findById($savedId);
        
        $this->assertNotNull($found);
        $this->assertEquals('500000', $found->getPurchasePrice());
        $this->assertEquals('25000', $found->getRehabCosts());
        $this->assertEquals('15000', $found->getClosingCosts());
        $this->assertEquals('25', $found->getDownPayment());
        $this->assertTrue($found->isUsePercentageForDownPayment());
        $this->assertEquals('0.07', $found->getInterestRate());
        $this->assertEquals(25, $found->getTermYears());
        $this->assertEquals(12, $found->getPaymentsPerYear());
        $this->assertEquals('2400', $found->getInsuranceCost());
        $this->assertEquals('6000', $found->getPropertyTaxes());
        $this->assertEquals('4000', $found->getExpectedRentalIncome());
        $this->assertEquals('12', $found->getOperatingExpenses());
        $this->assertTrue($found->isUsePercentageForOpex());
        $this->assertEquals('8', $found->getCapitalExpenditures());
        $this->assertTrue($found->isUsePercentageForCapex());
        $this->assertEquals('0.04', $found->getAppreciationRate());
    }
}
