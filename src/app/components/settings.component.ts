import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Settings, DEFAULT_SETTINGS } from '../models/settings.interface';
import { SettingsService } from '../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private settingsService = inject(SettingsService);
  private dialogRef = inject(MatDialogRef<SettingsComponent>);

  settingsForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
    this.loadSettings();
  }

  private initializeForm(): void {
    this.settingsForm = this.fb.group({
      interestRate: [DEFAULT_SETTINGS.interestRate, [Validators.required, Validators.min(0), Validators.max(100)]],
      downPaymentPercentage: [DEFAULT_SETTINGS.downPaymentPercentage, [Validators.required, Validators.min(0), Validators.max(100)]],
      termInYears: [DEFAULT_SETTINGS.termInYears, [Validators.required, Validators.min(1), Validators.max(50)]],
      paymentsPerYear: [DEFAULT_SETTINGS.paymentsPerYear, [Validators.required, Validators.min(1), Validators.max(365)]],
      operatingExpensesPercentage: [DEFAULT_SETTINGS.operatingExpensesPercentage, [Validators.required, Validators.min(0), Validators.max(100)]],
      capitalExpendituresPercentage: [DEFAULT_SETTINGS.capitalExpendituresPercentage, [Validators.required, Validators.min(0), Validators.max(100)]],
      mortgageInsuranceRatePercentage: [DEFAULT_SETTINGS.mortgageInsuranceRatePercentage, [Validators.required, Validators.min(0), Validators.max(10)]],
      appreciationPercentage: [DEFAULT_SETTINGS.appreciationPercentage, [Validators.required, Validators.min(-50), Validators.max(50)]]
    });
  }

  private loadSettings(): void {
    const currentSettings = this.settingsService.getCurrentSettings();
    this.settingsForm.patchValue(currentSettings);
  }

  onSave(): void {
    if (this.settingsForm.valid) {
      try {
        const settings: Settings = this.settingsForm.value;
        this.settingsService.saveSettings(settings);
        this.showSnackBar('Settings saved successfully!');
        // Close dialog with result indicating success
        this.dialogRef.close(true);
      } catch (error) {
        this.showSnackBar('Error saving settings. Please try again.');
      }
    } else {
      this.showSnackBar('Please fix validation errors before saving.');
    }
  }

  onCancel(): void {
    // Close dialog without saving
    this.dialogRef.close(false);
  }

  onReset(): void {
    this.settingsService.resetToDefaults();
    this.settingsForm.patchValue(DEFAULT_SETTINGS);
    this.showSnackBar('Settings reset to defaults.');
  }

  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
