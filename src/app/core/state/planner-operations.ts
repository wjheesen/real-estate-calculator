import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PlannerOperations {
  private pending = Promise.resolve();
  private readonly exclusiveInProgress = signal(false);
  private readonly refreshPending = signal(false);
  private readonly replacements = new Subject<void>();

  readonly refreshRequired = this.refreshPending.asReadonly();
  readonly replaced$ = this.replacements.asObservable();

  read<T>(run: () => Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      if (this.refreshPending()) throw new Error('Refresh imported data before reloading the planner.');
      return run();
    });
  }

  write<T>(run: () => Promise<T>): Promise<T> {
    if (this.exclusiveInProgress() || this.refreshPending()) {
      return Promise.reject(new Error('Finish the backup operation before saving.'));
    }
    return this.enqueue(run);
  }

  exclusive<T>(run: () => Promise<T>, refresh = false): Promise<T> {
    if (this.exclusiveInProgress() || (this.refreshPending() && !refresh)) {
      return Promise.reject(new Error('A backup operation is already in progress.'));
    }
    this.exclusiveInProgress.set(true);
    return this.enqueue(async () => {
      try {
        return await run();
      } finally {
        this.exclusiveInProgress.set(false);
      }
    });
  }

  requireRefresh(): void {
    this.refreshPending.set(true);
  }

  publishReplacement(): void {
    this.refreshPending.set(false);
    this.replacements.next();
  }

  private enqueue<T>(run: () => Promise<T>): Promise<T> {
    const result = this.pending.then(run);
    this.pending = result.then(() => undefined, () => undefined);
    return result;
  }
}
