import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BrowserBackupFiles {
  private readonly document = inject(DOCUMENT);

  chooseZip(): Promise<File | undefined> {
    return new Promise((resolve, reject) => {
      const input = this.document.createElement('input');
      input.type = 'file';
      input.accept = '.zip,application/zip';
      input.hidden = true;

      const finish = (file?: File) => {
        input.remove();
        resolve(file);
      };
      input.addEventListener('change', () => finish(input.files?.[0]), { once: true });
      input.addEventListener('cancel', () => finish(), { once: true });
      this.document.body.append(input);

      try {
        input.click();
      } catch (error) {
        input.remove();
        reject(error);
      }
    });
  }

  downloadZip(bytes: Uint8Array, now: Date): void {
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = `${now.getFullYear()}-${month}-${day}`;
    const anchor = this.document.createElement('a');
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/zip' }));
    anchor.href = url;
    anchor.download = `real-estate-planner-${date}.zip`;
    this.document.body.append(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }
}
