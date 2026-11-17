import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  type ApiError,
  CashApi,
  errorKey,
  type Shift,
  StaffApi,
  TPipe,
  type TranslationKey,
} from 'shared';
import { ShiftSummary } from './shift-summary';

/** One past (or the open) shift, read only. */
@Component({
  selector: 'app-shift-page',
  imports: [ShiftSummary, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shift(); as s) {
      <app-shift-summary [shift]="s" [names]="names()" />
    } @else if (error(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
    }
  `,
  styles: `
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class ShiftPage {
  protected readonly shift = signal<Shift | null>(null);
  protected readonly names = signal<Record<number, string>>({});
  protected readonly error = signal<TranslationKey | null>(null);

  constructor() {
    const id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
    const cash = inject(CashApi);
    const staff = inject(StaffApi);
    void (async () => {
      try {
        const [shift, list] = await Promise.all([
          firstValueFrom(cash.get(id)),
          firstValueFrom(staff.list()),
        ]);
        this.shift.set(shift);
        this.names.set(Object.fromEntries(list.users.map((u) => [u.id, u.name])));
      } catch (e) {
        this.error.set(errorKey(e as ApiError));
      }
    })();
  }
}
