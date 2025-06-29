<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250624205636 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE real_estate_calculations (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, purchase_price NUMERIC(15, 2) NOT NULL, rehab_costs NUMERIC(15, 2) NOT NULL, closing_costs NUMERIC(15, 2) NOT NULL, down_payment NUMERIC(15, 2) NOT NULL, interest_rate NUMERIC(5, 3) NOT NULL, term_years INTEGER NOT NULL, payments_per_year INTEGER NOT NULL, insurance_cost NUMERIC(15, 2) NOT NULL, property_taxes NUMERIC(15, 2) NOT NULL, expected_rental_income NUMERIC(15, 2) NOT NULL, operating_expenses NUMERIC(15, 2) NOT NULL, capital_expenditures NUMERIC(15, 2) NOT NULL, appreciation_rate NUMERIC(5, 3) NOT NULL, use_percentage_for_opex BOOLEAN NOT NULL, use_percentage_for_capex BOOLEAN NOT NULL, created_at DATETIME NOT NULL)
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            DROP TABLE real_estate_calculations
        SQL);
    }
}
