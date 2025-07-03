import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CloudStorageService } from './services/cloud-storage.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  title = 'Real Estate Investment Calculator';
  
  private cloudStorageService = inject(CloudStorageService);
  private snackBar = inject(MatSnackBar);
  
  cloudOperationInProgress = false;

  get isCloudStorageAvailable(): boolean {
    return this.cloudStorageService.isCloudStorageAvailable();
  }

  /**
   * Upload portfolio data and settings to cloud storage (export as ZIP)
   */
  uploadToCloud(): void {
    if (this.cloudOperationInProgress) return;
    
    this.cloudOperationInProgress = true;
    this.cloudStorageService.uploadToCloud().subscribe({
      next: () => {
        this.snackBar.open('All application data and settings exported as ZIP file successfully!', 'Close', { duration: 3000 });
        this.cloudOperationInProgress = false;
      },
      error: (error) => {
        this.snackBar.open(`Export failed: ${error.message}`, 'Close', { duration: 5000 });
        this.cloudOperationInProgress = false;
      }
    });
  }

  /**
   * Download portfolio data and settings from cloud storage (import from ZIP)
   */
  downloadFromCloud(): void {
    if (this.cloudOperationInProgress) return;
    
    if (!confirm('This will replace all current portfolio data and settings. Are you sure you want to continue?')) {
      return;
    }
    
    this.cloudOperationInProgress = true;
    this.cloudStorageService.downloadFromCloud().subscribe({
      next: () => {
        this.snackBar.open('All application data and settings imported from ZIP file successfully!', 'Close', { duration: 3000 });
        this.cloudOperationInProgress = false;
        // Reload the page to reflect imported data
        window.location.reload();
      },
      error: (error) => {
        this.snackBar.open(`Import failed: ${error.message}`, 'Close', { duration: 5000 });
        this.cloudOperationInProgress = false;
      }
    });
  }
}
