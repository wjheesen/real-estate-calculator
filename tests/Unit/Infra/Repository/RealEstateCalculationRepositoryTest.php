<?php

namespace App\Tests\Unit\Infra\Repository;

use App\Domain\Entity\RealEstateCalculation;
use PHPUnit\Framework\TestCase;

/**
 * Simple unit tests for repository methods that don't require database access
 */
class RealEstateCalculationRepositoryTest extends TestCase
{
    public function testEntityClassExists(): void
    {
        $this->assertTrue(class_exists(RealEstateCalculation::class));
    }

    public function testRepositoryClassExists(): void
    {
        $this->assertTrue(class_exists(\App\Infra\Repository\RealEstateCalculationRepository::class));
    }

    // Note: Full repository functionality is tested in integration tests
    // since ServiceEntityRepository requires a real database connection
}
