import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatList, MatListItem, MatListItemLine, MatListItemTitle } from '@angular/material/list';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { formatDateTime, formatMoney, LanguageService, type PaymentMethod, TPipe } from 'shared';
import { ReportsStore, today } from './reports-store';

/** Relatórios: sales by item, payment method and waitress for a range of days; backups to download. */
@Component({
  selector: 'app-reports-page',
  providers: [ReportsStore],
  imports: [
    MatAnchor,
    MatButton,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatFormField,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatIcon,
    MatInput,
    MatLabel,
    MatList,
    MatListItem,
    MatListItemLine,
    MatListItemTitle,
    MatRow,
    MatRowDef,
    MatTable,
    ReactiveFormsModule,
    RouterLink,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="filter" [formGroup]="range" (ngSubmit)="show()">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'report.from' | t }}</mat-label>
        <input matInput type="date" formControlName="from" />
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'report.to' | t }}</mat-label>
        <input matInput type="date" formControlName="to" />
      </mat-form-field>
      <button matButton="filled" type="submit" [disabled]="range.invalid">
        {{ 'report.show' | t }}
      </button>
    </form>
    @if (store.error(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
    }
    @if (store.report(); as r) {
      <dl class="summary">
        <div>
          <dt>{{ 'report.revenue' | t }}</dt>
          <dd>{{ money(r.revenue_cents) }}</dd>
        </div>
        <div>
          <dt>{{ 'report.orders' | t }}</dt>
          <dd>{{ r.orders_count }}</dd>
        </div>
        <div>
          <dt>{{ 'report.cancelled' | t }}</dt>
          <dd>{{ r.cancelled_count }}</dd>
        </div>
      </dl>

      <h2 class="label">{{ 'report.by_method' | t }}</h2>
      <div class="scroll">
        <table mat-table [dataSource]="r.by_method">
          <ng-container matColumnDef="method">
            <th mat-header-cell *matHeaderCellDef>{{ 'report.method' | t }}</th>
            <td mat-cell *matCellDef="let m">{{ methodKey(m.method) | t }}</td>
          </ng-container>
          <ng-container matColumnDef="count">
            <th mat-header-cell *matHeaderCellDef class="num">{{ 'report.qty' | t }}</th>
            <td mat-cell *matCellDef="let m" class="num">{{ m.count }}</td>
          </ng-container>
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef class="num">{{ 'report.amount' | t }}</th>
            <td mat-cell *matCellDef="let m" class="num">{{ money(m.amount_cents) }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="methodColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: methodColumns"></tr>
        </table>
      </div>
      @if (r.by_method.length === 0) {
        <p class="muted">{{ 'report.empty' | t }}</p>
      }

      <h2 class="label">{{ 'report.by_waitress' | t }}</h2>
      <div class="scroll">
        <table mat-table [dataSource]="r.by_waitress">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>{{ 'report.waitress' | t }}</th>
            <td mat-cell *matCellDef="let w">{{ w.user_name }}</td>
          </ng-container>
          <ng-container matColumnDef="count">
            <th mat-header-cell *matHeaderCellDef class="num">{{ 'report.orders' | t }}</th>
            <td mat-cell *matCellDef="let w" class="num">{{ w.orders_count }}</td>
          </ng-container>
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef class="num">{{ 'report.revenue' | t }}</th>
            <td mat-cell *matCellDef="let w" class="num">{{ money(w.revenue_cents) }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="waitressColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: waitressColumns"></tr>
        </table>
      </div>
      @if (r.by_waitress.length === 0) {
        <p class="muted">{{ 'report.empty' | t }}</p>
      }

      <h2 class="label">{{ 'report.by_item' | t }}</h2>
      <div class="scroll">
        <table mat-table [dataSource]="r.by_item">
          <ng-container matColumnDef="item">
            <th mat-header-cell *matHeaderCellDef>{{ 'report.item' | t }}</th>
            <td mat-cell *matCellDef="let i">{{ i.item_name }} · {{ i.variant_name }}</td>
          </ng-container>
          <ng-container matColumnDef="qty">
            <th mat-header-cell *matHeaderCellDef class="num">{{ 'report.qty' | t }}</th>
            <td mat-cell *matCellDef="let i" class="num">{{ i.qty }}</td>
          </ng-container>
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef class="num">{{ 'report.amount' | t }}</th>
            <td mat-cell *matCellDef="let i" class="num">{{ money(i.amount_cents) }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="itemColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: itemColumns"></tr>
        </table>
      </div>
      @if (r.by_item.length === 0) {
        <p class="muted">{{ 'report.empty' | t }}</p>
      }
    }
    <p class="muted">
      <a routerLink="/cash">{{ 'report.shifts' | t }}</a>
    </p>

    <h2 class="label">{{ 'backup.title' | t }}</h2>
    <p class="muted">{{ 'backup.hint' | t }}</p>
    @if (store.backupsError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
    }
    @if (store.backups(); as backups) {
      <mat-list>
        @for (b of backups; track b.name) {
          <mat-list-item>
            <span matListItemTitle>{{ at(b.created_at) }}</span>
            <span matListItemLine>{{ b.name }} · {{ size(b.size_bytes) }}</span>
          </mat-list-item>
          <a
            matButton
            class="download"
            [href]="store.backupUrl(b.name)"
            [attr.download]="b.name"
            [attr.aria-label]="('backup.download' | t) + ' ' + b.name"
          >
            <mat-icon aria-hidden="true">download</mat-icon>
            {{ 'backup.download' | t }}
          </a>
        } @empty {
          <p class="muted">{{ 'backup.empty' | t }}</p>
        }
      </mat-list>
    }
  `,
  styles: `
    .filter {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 32px;
      margin: 0 0 24px;
      dt {
        font: var(--mat-sys-label-large);
        color: var(--mat-sys-on-surface-variant);
      }
      dd {
        margin: 0;
        font: var(--mat-sys-headline-small);
      }
    }
    .label {
      margin: 24px 0 8px;
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    .scroll {
      overflow-x: auto;
    }
    .num {
      text-align: end;
    }
    .muted {
      color: var(--mat-sys-on-surface-variant);
    }
    .error {
      color: var(--mat-sys-error);
    }
    .download {
      margin: 0 0 8px 16px;
    }
  `,
})
export class ReportsPage {
  protected readonly store = inject(ReportsStore);
  private readonly lang = inject(LanguageService).lang;
  protected readonly methodColumns = ['method', 'count', 'amount'];
  protected readonly waitressColumns = ['name', 'count', 'amount'];
  protected readonly itemColumns = ['item', 'qty', 'amount'];
  protected readonly range = new FormGroup({
    from: new FormControl(today(), { nonNullable: true, validators: Validators.required }),
    to: new FormControl(today(), { nonNullable: true, validators: Validators.required }),
  });

  constructor() {
    this.show();
    void this.store.loadBackups();
  }

  protected show(): void {
    if (this.range.valid) {
      const { from, to } = this.range.getRawValue();
      void this.store.load(from, to);
    }
  }

  protected methodKey(m: PaymentMethod) {
    return `payment.method.${m}` as const;
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }

  protected at(iso: string): string {
    return formatDateTime(iso, this.lang());
  }

  protected size(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
