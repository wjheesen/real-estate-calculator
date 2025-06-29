<?php

namespace App\Domain\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: 'App\Infra\Repository\RealEstateCalculationRepository')]
#[ORM\Table(name: 'real_estate_calculations')]
class RealEstateCalculation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2)]
    #[Assert\NotBlank]
    #[Assert\Positive]
    private string $purchasePrice;

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2)]
    #[Assert\PositiveOrZero]
    private string $rehabCosts = '0';

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2)]
    #[Assert\PositiveOrZero]
    private string $closingCosts = '10000';

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2)]
    #[Assert\NotBlank]
    #[Assert\Positive]
    private string $downPayment = '20';

    #[ORM\Column(type: 'decimal', precision: 5, scale: 3)]
    #[Assert\NotBlank]
    #[Assert\Positive]
    private string $interestRate = '0.065';

    #[ORM\Column(type: 'integer')]
    #[Assert\NotBlank]
    #[Assert\Positive]
    private int $termYears = 30;

    #[ORM\Column(type: 'integer')]
    #[Assert\NotBlank]
    #[Assert\Positive]
    private int $paymentsPerYear = 12;

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2)]
    #[Assert\PositiveOrZero]
    private string $insuranceCost = '0';

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2)]
    #[Assert\PositiveOrZero]
    private string $propertyTaxes = '0';

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2)]
    #[Assert\NotBlank]
    #[Assert\Positive]
    private string $expectedRentalIncome;

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2)]
    #[Assert\PositiveOrZero]
    private string $operatingExpenses = '10';

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2)]
    #[Assert\PositiveOrZero]
    private string $capitalExpenditures = '5';

    #[ORM\Column(type: 'decimal', precision: 5, scale: 3)]
    #[Assert\PositiveOrZero]
    private string $appreciationRate = '0';

    #[ORM\Column(type: 'boolean')]
    private bool $usePercentageForOpex = true;

    #[ORM\Column(type: 'boolean')]
    private bool $usePercentageForCapex = true;

    #[ORM\Column(type: 'boolean')]
    private bool $usePercentageForDownPayment = true;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    // Getters and Setters
    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPurchasePrice(): string
    {
        return $this->purchasePrice;
    }

    public function setPurchasePrice(?string $purchasePrice): self
    {
        $this->purchasePrice = $purchasePrice ?? '';
        return $this;
    }

    public function getRehabCosts(): string
    {
        return $this->rehabCosts;
    }

    public function setRehabCosts(?string $rehabCosts): self
    {
        $this->rehabCosts = $rehabCosts ?? '0';
        return $this;
    }

    public function getClosingCosts(): string
    {
        return $this->closingCosts;
    }

    public function setClosingCosts(?string $closingCosts): self
    {
        $this->closingCosts = $closingCosts ?? '10000';
        return $this;
    }

    public function getDownPayment(): string
    {
        return $this->downPayment;
    }

    public function setDownPayment(?string $downPayment): self
    {
        $this->downPayment = $downPayment ?? '20';
        return $this;
    }

    public function getInterestRate(): string
    {
        return $this->interestRate;
    }

    public function setInterestRate(?string $interestRate): self
    {
        $this->interestRate = $interestRate ?? '0.065';
        return $this;
    }

    public function getTermYears(): int
    {
        return $this->termYears;
    }

    public function setTermYears(?int $termYears): self
    {
        $this->termYears = $termYears ?? 30;
        return $this;
    }

    public function getPaymentsPerYear(): int
    {
        return $this->paymentsPerYear;
    }

    public function setPaymentsPerYear(?int $paymentsPerYear): self
    {
        $this->paymentsPerYear = $paymentsPerYear ?? 12;
        return $this;
    }

    public function getInsuranceCost(): string
    {
        return $this->insuranceCost;
    }

    public function setInsuranceCost(?string $insuranceCost): self
    {
        $this->insuranceCost = $insuranceCost ?? '0';
        return $this;
    }

    public function getPropertyTaxes(): string
    {
        return $this->propertyTaxes;
    }

    public function setPropertyTaxes(?string $propertyTaxes): self
    {
        $this->propertyTaxes = $propertyTaxes ?? '0';
        return $this;
    }

    public function getExpectedRentalIncome(): string
    {
        return $this->expectedRentalIncome;
    }

    public function setExpectedRentalIncome(?string $expectedRentalIncome): self
    {
        $this->expectedRentalIncome = $expectedRentalIncome ?? '';
        return $this;
    }

    public function getOperatingExpenses(): string
    {
        return $this->operatingExpenses;
    }

    public function setOperatingExpenses(?string $operatingExpenses): self
    {
        $this->operatingExpenses = $operatingExpenses ?? '10';
        return $this;
    }

    public function getCapitalExpenditures(): string
    {
        return $this->capitalExpenditures;
    }

    public function setCapitalExpenditures(?string $capitalExpenditures): self
    {
        $this->capitalExpenditures = $capitalExpenditures ?? '5';
        return $this;
    }

    public function getAppreciationRate(): string
    {
        return $this->appreciationRate;
    }

    public function setAppreciationRate(?string $appreciationRate): self
    {
        $this->appreciationRate = $appreciationRate ?? '0';
        return $this;
    }

    public function isUsePercentageForOpex(): bool
    {
        return $this->usePercentageForOpex;
    }

    public function setUsePercentageForOpex(?bool $usePercentageForOpex): self
    {
        $this->usePercentageForOpex = $usePercentageForOpex ?? true;
        return $this;
    }

    public function isUsePercentageForCapex(): bool
    {
        return $this->usePercentageForCapex;
    }

    public function setUsePercentageForCapex(?bool $usePercentageForCapex): self
    {
        $this->usePercentageForCapex = $usePercentageForCapex ?? true;
        return $this;
    }

    public function isUsePercentageForDownPayment(): bool
    {
        return $this->usePercentageForDownPayment;
    }

    public function setUsePercentageForDownPayment(?bool $usePercentageForDownPayment): self
    {
        $this->usePercentageForDownPayment = $usePercentageForDownPayment ?? true;
        return $this;
    }

    public function getCreatedAt(): \DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(?\DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt ?? new \DateTime();
        return $this;
    }
}
