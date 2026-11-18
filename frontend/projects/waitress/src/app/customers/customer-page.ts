import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import {
  MatListItem,
  MatListItemLine,
  MatListItemMeta,
  MatListItemTitle,
  MatNavList,
} from '@angular/material/list';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  formatDateTime,
  formatMoney,
  LanguageService,
  type Order,
  type TranslationKey,
  TPipe,
} from 'shared';
import { addressGroup, customerBody, customerForm, MAX_ADDRESSES } from './customer-form';
import { CustomersStore } from './customers-store';

/** One customer: profile form (new or saved) and, once saved, their orders. */
@Component({
  selector: 'app-customer-page',
  providers: [CustomersStore],
  imports: [
    MatButton,
    MatError,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatListItem,
    MatListItemLine,
    MatListItemMeta,
    MatListItemTitle,
    MatNavList,
    MatSuffix,
    ReactiveFormsModule,
    RouterLink,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.loadError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
      <button matButton="tonal" type="button" (click)="store.load(id!)">
        {{ 'common.retry' | t }}
      </button>
    } @else if (id === null || store.customer()) {
      <form class="fields" [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ 'customer.name' | t }}</mat-label>
          <input matInput formControlName="name" maxlength="255" autocomplete="off" />
          <mat-error>{{ 'customer.name.required' | t }}</mat-error>
        </mat-form-field>
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ 'customer.phone' | t }}</mat-label>
          <input
            matInput
            formControlName="phone"
            type="tel"
            inputmode="tel"
            maxlength="30"
            autocomplete="off"
          />
          <mat-error>{{ 'customer.phone.invalid' | t }}</mat-error>
        </mat-form-field>

        <h2 class="label">{{ 'customer.addresses' | t }}</h2>
        @for (a of form.controls.addresses.controls; track a; let i = $index) {
          <div class="address" [formGroup]="a">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>{{ 'customer.address' | t }}</mat-label>
              <textarea matInput formControlName="text" rows="2" maxlength="1000"></textarea>
              <button
                matIconButton
                matSuffix
                type="button"
                [attr.aria-label]="'common.remove' | t"
                (click)="form.controls.addresses.removeAt(i)"
              >
                <mat-icon aria-hidden="true">delete</mat-icon>
              </button>
              <mat-error>{{ 'customer.address.required' | t }}</mat-error>
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>{{ 'customer.note' | t }}</mat-label>
              <input matInput formControlName="note" maxlength="1000" autocomplete="off" />
            </mat-form-field>
          </div>
        }
        @if (form.controls.addresses.length < maxAddresses) {
          <button
            matButton="tonal"
            type="button"
            (click)="form.controls.addresses.push(newAddress())"
          >
            <mat-icon aria-hidden="true">add</mat-icon>
            {{ 'customer.add_address' | t }}
          </button>
        }

        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ 'customer.note' | t }}</mat-label>
          <textarea matInput formControlName="note" rows="2" maxlength="1000"></textarea>
        </mat-form-field>
        @if (error(); as key) {
          <p class="error" role="alert">{{ key | t }}</p>
        }

        @if (id !== null) {
          <h2 class="label">{{ 'customer.history' | t }}</h2>
          <mat-nav-list>
            @for (o of store.orders(); track o.id) {
              <a mat-list-item [routerLink]="['/orders', o.id]">
                <span matListItemTitle>#{{ o.id }} · {{ typeKey(o) | t }}</span>
                <span matListItemLine>{{ statusKey(o) | t }} · {{ date(o.created_at) }}</span>
                <span matListItemMeta class="total">{{ money(o.total_cents) }}</span>
              </a>
            } @empty {
              <p class="empty">{{ 'customer.history.empty' | t }}</p>
            }
          </mat-nav-list>
        }

        <div class="action-bar">
          <button matButton="filled" type="submit" [disabled]="busy()">
            {{ 'common.save' | t }}
          </button>
        </div>
      </form>
    } @else {
      <div class="skeleton" aria-hidden="true">
        @for (row of [1, 2, 3]; track row) {
          <span class="bar"></span>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .fields {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 12px;
      max-width: 600px;
    }
    .address {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .label {
      margin: 8px 0 0;
      font: var(--mat-sys-title-small);
    }
    .mat-mdc-list-item {
      height: auto;
      min-height: 64px;
    }
    .total {
      align-self: center;
      color: var(--mat-sys-on-surface);
    }
    .empty {
      color: var(--mat-sys-on-surface-variant);
    }
    .error {
      color: var(--mat-sys-error);
    }
    .action-bar {
      position: sticky;
      bottom: 0;
      display: flex;
      justify-content: flex-end;
      margin-top: auto;
      padding: 8px 0;
      background: var(--mat-sys-surface);
      button {
        min-height: 48px;
      }
    }
    .skeleton {
      display: flex;
      flex-direction: column;
      gap: 12px;
      .bar {
        height: 56px;
        border-radius: var(--mat-sys-corner-small);
        background: var(--mat-sys-surface-container-high);
      }
    }
  `,
})
export class CustomerPage {
  protected readonly store = inject(CustomersStore);
  private readonly router = inject(Router);
  private readonly lang = inject(LanguageService).lang;
  protected readonly id = ((id) => (id === null ? null : Number(id)))(
    inject(ActivatedRoute).snapshot.paramMap.get('id'),
  );
  protected readonly form = customerForm();
  protected readonly maxAddresses = MAX_ADDRESSES;
  protected readonly newAddress = () => addressGroup();
  protected readonly busy = signal(false);
  protected readonly error = signal<TranslationKey | null>(null);

  constructor() {
    // A saved customer fills the form once loaded.
    effect(() => {
      const c = this.store.customer();
      if (c) {
        const filled = customerForm(c);
        this.form.setControl('addresses', filled.controls.addresses);
        this.form.patchValue(filled.getRawValue());
      }
    });
    if (this.id !== null) {
      void this.store.load(this.id);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    const result = await this.store.save(this.id, customerBody(this.form.getRawValue()));
    this.busy.set(false);
    if (typeof result === 'string') {
      this.error.set(result);
      return;
    }
    this.error.set(null);
    if (this.id === null) {
      await this.router.navigate(['/customers', result.id], { replaceUrl: true });
    }
  }

  protected typeKey(o: Order) {
    return `order.type.${o.type}` as const;
  }

  protected statusKey(o: Order) {
    return `order.status.${o.status}` as const;
  }

  protected date(iso: string): string {
    return formatDateTime(iso, this.lang());
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }
}
