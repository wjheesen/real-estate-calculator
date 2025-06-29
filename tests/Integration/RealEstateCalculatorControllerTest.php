<?php

namespace App\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class RealEstateCalculatorControllerTest extends WebTestCase
{
    public function testIndexPageLoads(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorTextContains('h1', 'Real Estate Investment Calculator');
        
        // Check that the form is present
        $this->assertSelectorExists('form[name="real_estate_calculation_form"]');
        
        // Check for key form fields
        $this->assertSelectorExists('input[name="real_estate_calculation_form[purchasePrice]"]');
        $this->assertSelectorExists('input[name="real_estate_calculation_form[downPayment]"]');
        $this->assertSelectorExists('input[name="real_estate_calculation_form[interestRate]"]');
        $this->assertSelectorExists('input[name="real_estate_calculation_form[expectedRentalIncome]"]');
        
        // Check for percentage checkboxes
        $this->assertSelectorExists('input[name="real_estate_calculation_form[usePercentageForDownPayment]"]');
        $this->assertSelectorExists('input[name="real_estate_calculation_form[usePercentageForOpex]"]');
        $this->assertSelectorExists('input[name="real_estate_calculation_form[usePercentageForCapex]"]');
    }

    public function testHistoryPageLoads(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/history');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorTextContains('h1', 'Calculation History');
    }

    public function testFormSubmissionWithValidData(): void
    {
        $client = static::createClient();
        
        // First, get the form
        $crawler = $client->request('GET', '/');
        $form = $crawler->selectButton('Calculate')->form();

        // Fill out the form with valid data
        $form['real_estate_calculation_form[purchasePrice]'] = '300000';
        $form['real_estate_calculation_form[downPayment]'] = '20';
        $form['real_estate_calculation_form[usePercentageForDownPayment]'] = '1';
        $form['real_estate_calculation_form[rehabCosts]'] = '0';
        $form['real_estate_calculation_form[closingCosts]'] = '10000';
        $form['real_estate_calculation_form[interestRate]'] = '6.5';
        $form['real_estate_calculation_form[termYears]'] = '30';
        $form['real_estate_calculation_form[paymentsPerYear]'] = '12';
        $form['real_estate_calculation_form[insuranceCost]'] = '1200';
        $form['real_estate_calculation_form[propertyTaxes]'] = '3600';
        $form['real_estate_calculation_form[expectedRentalIncome]'] = '2500';
        $form['real_estate_calculation_form[operatingExpenses]'] = '10';
        $form['real_estate_calculation_form[usePercentageForOpex]'] = '1';
        $form['real_estate_calculation_form[capitalExpenditures]'] = '5';
        $form['real_estate_calculation_form[usePercentageForCapex]'] = '1';
        $form['real_estate_calculation_form[appreciationRate]'] = '3';

        // Submit the form
        $client->submit($form);
        
        // Should redirect to the calculation view page
        $this->assertResponseRedirects();
        
        // Follow the redirect
        $crawler = $client->followRedirect();
        $this->assertResponseIsSuccessful();
        
        // Check that we're on a calculation view page
        $this->assertRouteSame('view_calculation');
        
        // Verify calculation results are displayed
        $this->assertSelectorTextContains('h1', 'Calculation Results');
        $this->assertSelectorExists('.metric-card');
    }

    public function testFormSubmissionWithInvalidData(): void
    {
        $client = static::createClient();
        
        $crawler = $client->request('GET', '/');
        $form = $crawler->selectButton('Calculate')->form();

        // Submit form with missing required fields
        $form['real_estate_calculation_form[purchasePrice]'] = '';
        $form['real_estate_calculation_form[downPayment]'] = '';
        $form['real_estate_calculation_form[expectedRentalIncome]'] = '';

        $crawler = $client->submit($form);
        
        // Should stay on the same page and show validation errors
        $this->assertResponseIsSuccessful();
        $this->assertSelectorExists('.invalid-feedback, .alert-danger, .error');
    }

    public function testCalculationViewPage(): void
    {
        $client = static::createClient();
        
        // First create a calculation by submitting the form
        $crawler = $client->request('GET', '/');
        $form = $crawler->selectButton('Calculate')->form();

        $form['real_estate_calculation_form[purchasePrice]'] = '250000';
        $form['real_estate_calculation_form[downPayment]'] = '50000';
        // Explicitly uncheck usePercentageForDownPayment to treat as dollar amount
        $form['real_estate_calculation_form[usePercentageForDownPayment]'] = false;
        $form['real_estate_calculation_form[expectedRentalIncome]'] = '2200';
        $form['real_estate_calculation_form[interestRate]'] = '6.0';

        $client->submit($form);
        $crawler = $client->followRedirect();
        
        // Check that calculation details are displayed using more specific selectors
        // Check purchase price
        $purchasePriceText = $crawler->filter('label:contains("Purchase Price")')->siblings('.form-control-plaintext')->text();
        $this->assertStringContainsString('$250,000.00', $purchasePriceText);
        
        // Check down payment
        $downPaymentText = $crawler->filter('label:contains("Down Payment")')->siblings('.form-control-plaintext')->text();
        $this->assertStringContainsString('$50,000.00', $downPaymentText);
        
        // Check rental income
        $rentalIncomeText = $crawler->filter('label:contains("Monthly Rental Income")')->siblings('.form-control-plaintext')->text();
        $this->assertStringContainsString('$2,200.00', $rentalIncomeText);
        
        // Check that results are calculated and displayed
        $this->assertSelectorExists('.metric-card h6:contains("Monthly Cash Flow")');
        $this->assertSelectorExists('.metric-card h6:contains("Monthly Mortgage Payment")');
        $this->assertSelectorExists('.metric-card h6:contains("Cash-on-Cash Return")');
    }

    public function testCalculationDeletion(): void
    {
        $client = static::createClient();
        
        // Create a calculation
        $crawler = $client->request('GET', '/');
        $form = $crawler->selectButton('Calculate')->form();
        $form['real_estate_calculation_form[purchasePrice]'] = '200000';
        $form['real_estate_calculation_form[downPayment]'] = '40000';
        $form['real_estate_calculation_form[expectedRentalIncome]'] = '1800';

        $client->submit($form);
        $crawler = $client->followRedirect();
        
        // Extract the calculation ID from the URL
        $currentUrl = $client->getRequest()->getUri();
        preg_match('/\/calculation\/(\d+)/', $currentUrl, $matches);
        $calculationId = $matches[1];
        
        // Submit the delete form
        $deleteForm = $crawler->selectButton('Delete Calculation')->form();
        $client->submit($deleteForm);
        
        // Should redirect to history page
        $this->assertResponseRedirects('/history');
        
        // Follow redirect and verify success message
        $crawler = $client->followRedirect();
        $this->assertSelectorTextContains('.alert-success', 'deleted successfully');
        
        // Verify the calculation is gone by trying to access it directly
        $client->request('GET', "/calculation/{$calculationId}");
        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testNonExistentCalculationReturns404(): void
    {
        $client = static::createClient();
        $client->request('GET', '/calculation/99999');
        
        $this->assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testFormDefaultValues(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/');

        // Check that default values are set correctly
        $form = $crawler->selectButton('Calculate')->form();
        
        // Down payment should default to 20%
        $this->assertEquals('20.00', $form['real_estate_calculation_form[downPayment]']->getValue());
        
        // Down payment percentage checkbox should be checked
        $this->assertEquals('1', $form['real_estate_calculation_form[usePercentageForDownPayment]']->getValue());
        
        // Interest rate should default to 6.5%
        $this->assertEquals('6.500', $form['real_estate_calculation_form[interestRate]']->getValue());
        
        // Operating expenses should default to 10%
        $this->assertEquals('10.00', $form['real_estate_calculation_form[operatingExpenses]']->getValue());
        
        // Capital expenditures should default to 5%
        $this->assertEquals('5.00', $form['real_estate_calculation_form[capitalExpenditures]']->getValue());
        
        // Closing costs should default to $10,000
        $this->assertEquals('10000.00', $form['real_estate_calculation_form[closingCosts]']->getValue());
        
        // Percentage checkboxes should be checked by default
        $this->assertEquals('1', $form['real_estate_calculation_form[usePercentageForOpex]']->getValue());
        $this->assertEquals('1', $form['real_estate_calculation_form[usePercentageForCapex]']->getValue());
    }

    public function testPercentageBasedCalculations(): void
    {
        $client = static::createClient();
        
        $crawler = $client->request('GET', '/');
        $form = $crawler->selectButton('Calculate')->form();

        // Test with percentage-based down payment
        $form['real_estate_calculation_form[purchasePrice]'] = '400000';
        $form['real_estate_calculation_form[downPayment]'] = '25'; // 25%
        $form['real_estate_calculation_form[usePercentageForDownPayment]'] = '1';
        $form['real_estate_calculation_form[expectedRentalIncome]'] = '3000';
        $form['real_estate_calculation_form[operatingExpenses]'] = '12'; // 12% of rental income
        $form['real_estate_calculation_form[usePercentageForOpex]'] = '1';
        $form['real_estate_calculation_form[capitalExpenditures]'] = '6'; // 6% of rental income
        $form['real_estate_calculation_form[usePercentageForCapex]'] = '1';

        $client->submit($form);
        $crawler = $client->followRedirect();
        
        // Verify percentage calculations using more specific selectors
        // Down payment should show $100,000 (25% of $400,000)
        $downPaymentText = $crawler->filter('label:contains("Down Payment")')->siblings('.form-control-plaintext')->text();
        $this->assertStringContainsString('$100,000.00', $downPaymentText);
        $this->assertStringContainsString('(25% of purchase price)', $downPaymentText);
        
        // Operating expenses should be 12% of $3,000 = $360
        $operatingExpensesElements = $crawler->filter('.col-6:contains("Operating Expenses:")')->nextAll('.col-6.text-end')->first();
        $operatingExpensesText = $operatingExpensesElements->text();
        $this->assertStringContainsString('$360.00', $operatingExpensesText);
        
        // Capital expenditures should be 6% of $3,000 = $180  
        $capitalExpendituresElements = $crawler->filter('.col-6:contains("Capital Expenditures:")')->nextAll('.col-6.text-end')->first();
        $capitalExpendituresText = $capitalExpendituresElements->text();
        $this->assertStringContainsString('$180.00', $capitalExpendituresText);
    }
}
