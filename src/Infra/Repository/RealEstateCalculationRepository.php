<?php

namespace App\Infra\Repository;

use App\Domain\Entity\RealEstateCalculation;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<RealEstateCalculation>
 */
class RealEstateCalculationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RealEstateCalculation::class);
    }

    public function save(RealEstateCalculation $calculation): void
    {
        $this->getEntityManager()->persist($calculation);
        $this->getEntityManager()->flush();
    }

    public function findAllOrderedByDate(): array
    {
        return $this->createQueryBuilder('c')
            ->orderBy('c.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function findById(int $id): ?RealEstateCalculation
    {
        return $this->find($id);
    }

    public function delete(RealEstateCalculation $calculation): void
    {
        $this->getEntityManager()->remove($calculation);
        $this->getEntityManager()->flush();
    }
}
