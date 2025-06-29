<?php

namespace App\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class DebugValidationTest extends WebTestCase
{
    public function testFormValidation(): void
    {
        $client = static::createClient();
        
        $crawler = $client->request('GET', '/');
        $form = $crawler->selectButton('Calculate')->form();

        // Submit form with missing required fields
        $form['real_estate_calculation_form[purchasePrice]'] = '';
        $form['real_estate_calculation_form[downPayment]'] = '';
        $form['real_estate_calculation_form[expectedRentalIncome]'] = '';

        $crawler = $client->submit($form);
        
        // Debug: Print the response content
        $response = $client->getResponse();
        echo "\n=== RESPONSE STATUS ===\n";
        echo $response->getStatusCode() . "\n";
        
        echo "\n=== RESPONSE CONTENT ===\n";
        $content = $response->getContent();
        
        // Look for error-related content
        if (strpos($content, 'invalid-feedback') !== false) {
            echo "Found 'invalid-feedback' in response\n";
        } else {
            echo "No 'invalid-feedback' found in response\n";
        }
        
        if (strpos($content, 'error') !== false) {
            echo "Found 'error' in response\n";
        } else {
            echo "No 'error' found in response\n";
        }
        
        // Extract form section for analysis
        $formStart = strpos($content, '<form');
        $formEnd = strpos($content, '</form>');
        if ($formStart !== false && $formEnd !== false) {
            echo "\n=== FORM SECTION ===\n";
            echo substr($content, $formStart, $formEnd - $formStart + 7) . "\n";
        }
        
        $this->assertResponseIsSuccessful();
    }
}
