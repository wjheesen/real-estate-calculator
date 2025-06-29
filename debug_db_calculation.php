<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Infra\Repository\RealEstateCalculationRepository;
use App\Domain\Service\RealEstateCalculatorService;
use Doctrine\ORM\EntityManagerInterface;

// Setup Symfony kernel to get the entity manager
$kernel = new \App\Kernel('dev', true);
$kernel->boot();
$container = $kernel->getContainer();

$entityManager = $container->get('doctrine.orm.entity_manager');
$repository = new RealEstateCalculationRepository($entityManager);
$service = new RealEstateCalculatorService();

// Get calculation #4 from database
$calculation = $repository->findById(4);

if ($calculation) {
    echo "Database Calculation #4:\n";
    echo "Purchase Price: " . $calculation->getPurchasePrice() . "\n";
    echo "Down Payment: " . $calculation->getDownPayment() . "\n";
    echo "Closing Costs: " . $calculation->getClosingCosts() . "\n";
    echo "Interest Rate: " . $calculation->getInterestRate() . "\n";
    echo "Use Percentage for Down Payment: " . ($calculation->isUsePercentageForDownPayment() ? 'true' : 'false') . "\n";
    
    $results = $service->calculateResults($calculation);
    
    echo "\nCalculated Results:\n";
    echo "Total Acquisition Cost: $" . number_format($results['totalAcquisitionCost'], 2) . "\n";
    echo "Down Payment Amount: $" . number_format($results['downPaymentAmount'], 2) . "\n";
    echo "Loan Amount: $" . number_format($results['loanAmount'], 2) . "\n";
    echo "Monthly Mortgage Payment: $" . number_format($results['monthlyMortgagePayment'], 2) . "\n";
} else {
    echo "Calculation #4 not found\n";
}
