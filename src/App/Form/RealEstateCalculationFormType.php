<?php

namespace App\App\Form;

use App\Domain\Entity\RealEstateCalculation;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\MoneyType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\PercentType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class RealEstateCalculationFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('purchasePrice', MoneyType::class, [
                'label' => 'Purchase Price',
                'currency' => 'USD',
                'divisor' => 1,
                'required' => true,
                'attr' => ['placeholder' => 'Enter purchase price']
            ])
            ->add('rehabCosts', MoneyType::class, [
                'label' => 'Rehab Costs',
                'currency' => 'USD',
                'divisor' => 1,
                'required' => false,
                'attr' => ['placeholder' => 'Enter rehab costs (optional)']
            ])
            ->add('closingCosts', MoneyType::class, [
                'label' => 'Closing Costs',
                'currency' => 'USD',
                'divisor' => 1,
                'required' => false,
                'attr' => ['placeholder' => 'Enter closing costs (optional)']
            ])
            ->add('downPayment', MoneyType::class, [
                'label' => 'Down Payment',
                'currency' => 'USD',
                'divisor' => 1,
                'required' => true,
                'attr' => ['placeholder' => 'Enter down payment amount']
            ])
            ->add('usePercentageForDownPayment', CheckboxType::class, [
                'label' => 'Down Payment as % of Purchase Price',
                'data' => true, // Default to percentage mode
                'required' => false,
                'attr' => ['class' => 'form-check-input']
            ])
            ->add('interestRate', PercentType::class, [
                'label' => 'Interest Rate',
                'type' => 'fractional',
                'scale' => 3,
                'data' => 0.065, // Default to 6.5%
                'required' => true,
                'attr' => ['placeholder' => 'Enter interest rate (e.g., 6.5%)']
            ])
            ->add('termYears', IntegerType::class, [
                'label' => 'Term (Years)',
                'data' => 30,
                'required' => true,
                'attr' => ['placeholder' => 'Enter loan term in years']
            ])
            ->add('paymentsPerYear', IntegerType::class, [
                'label' => 'Payments Per Year',
                'data' => 12,
                'required' => true,
                'attr' => ['placeholder' => 'Enter number of payments per year']
            ])
            ->add('insuranceCost', MoneyType::class, [
                'label' => 'Annual Insurance Cost',
                'currency' => 'USD',
                'divisor' => 1,
                'required' => false,
                'attr' => ['placeholder' => 'Enter annual insurance cost']
            ])
            ->add('propertyTaxes', MoneyType::class, [
                'label' => 'Annual Property Taxes',
                'currency' => 'USD',
                'divisor' => 1,
                'required' => false,
                'attr' => ['placeholder' => 'Enter annual property taxes']
            ])
            ->add('expectedRentalIncome', MoneyType::class, [
                'label' => 'Monthly Rental Income',
                'currency' => 'USD',
                'divisor' => 1,
                'required' => true,
                'attr' => ['placeholder' => 'Enter expected monthly rental income']
            ])
            ->add('usePercentageForOpex', CheckboxType::class, [
                'label' => 'Operating Expenses as % of Monthly Rental Income',
                'data' => true, // Default to percentage mode
                'required' => false,
                'attr' => ['class' => 'form-check-input']
            ])
            ->add('operatingExpenses', NumberType::class, [
                'label' => 'Operating Expenses (Monthly $ or % of Rental Income)',
                'scale' => 2,
                'required' => false,
                'attr' => ['placeholder' => 'Enter operating expenses']
            ])
            ->add('usePercentageForCapex', CheckboxType::class, [
                'label' => 'Capital Expenditures as % of Monthly Rental Income',
                'data' => true, // Default to percentage mode
                'required' => false,
                'attr' => ['class' => 'form-check-input']
            ])
            ->add('capitalExpenditures', NumberType::class, [
                'label' => 'Capital Expenditures (Monthly $ or % of Rental Income)',
                'scale' => 2,
                'required' => false,
                'attr' => ['placeholder' => 'Enter capital expenditures']
            ])
            ->add('appreciationRate', PercentType::class, [
                'label' => 'Estimated Annual Appreciation Rate',
                'type' => 'fractional',
                'scale' => 3,
                'required' => false,
                'attr' => ['placeholder' => 'Enter appreciation rate (e.g., 3%)']
            ])
            ->add('calculate', SubmitType::class, [
                'label' => 'Calculate',
                'attr' => ['class' => 'btn btn-primary btn-lg']
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => RealEstateCalculation::class,
        ]);
    }
}
