import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
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
import { formatDateTime, formatMoney, LanguageService, TPipe } from 'shared';
import { formDialogConfig } from '../form-dialog';
import { CashFormDialog, type CashFormData } from './cash-form-dialog';
import { CashStore } from './cash-store';
import { ShiftSummary } from './shift-summary';

/** Caixa: the open shift (or opening one), its movements and close, then the recent shifts. */
@Component({
  selector: 'app-cash-page',
  providers: [CashStore],
  imports: [
    MatButton,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatIcon,
    MatRow,
    MatRowDef,
    MatTable,
    RouterLink,
    ShiftSummary,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.loadError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
      <button matButton="tonal" type="button" (click)="store.load()">
        {{ 'common.retry' | t }}
      </button>
    } @else if (store.current() === undefined) {
      <div class="skeleton" aria-hidden="true"><span class="bar"></span></div>
    } @else {
      @if (store.current(); as shift) {
        <app-shift-summary [shift]="shift" [names]="store.names()" />
        <div class="actions">
          <button matButton="filled" type="button" (click)="close(shift.expected_cents)">
            {{ 'cash.close' | t }}
          </button>
          <button matButton="tonal" type="button" (click)="movement()">
            <mat-icon aria-hidden="true">add</mat-icon>
            {{ 'cash.movement.new' | t }}
          </button>
        </div>
      } @else {
        <p class="meta">{{ 'cash.none_open' | t }}</p>
        <div class="actions">
          <button matButton="filled" type="button" (click)="open()">{{ 'cash.open' | t }}</button>
        </div>
      }
      @if (store.recent().length > 0) {
        <h3 class="title">{{ 'cash.recent' | t }}</h3>
        <table mat-table [dataSource]="store.recent()" class="table">
          <ng-container matColumnDef="opened">
            <th mat-header-cell *matHeaderCellDef>{{ 'cash.opened_at' | t }}</th>
            <td mat-cell *matCellDef="let s">
              <a [routerLink]="['/cash', s.id]">{{ at(s.opened_at) }}</a>
            </td>
          </ng-container>
          <ng-container matColumnDef="closed">
            <th mat-header-cell *matHeaderCellDef>{{ 'cash.closed_at' | t }}</th>
            <td mat-cell *matCellDef="let s">{{ s.closed_at ? at(s.closed_at) : '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="expected">
            <th mat-header-cell *matHeaderCellDef class="num">{{ 'cash.expected' | t }}</th>
            <td mat-cell *matCellDef="let s" class="num">{{ money(s.expected_cents) }}</td>
          </ng-container>
          <ng-container matColumnDef="difference">
            <th mat-header-cell *matHeaderCellDef class="num">{{ 'cash.difference' | t }}</th>
            <td mat-cell *matCellDef="let s" class="num" [class.error]="s.difference_cents < 0">
              {{ s.difference_cents === null ? '—' : money(s.difference_cents) }}
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      }
    }
  `,
  styles: `
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0;
      button {
        min-height: 48px;
      }
    }
    .meta {
      color: var(--mat-sys-on-surface-variant);
    }
    .title {
      margin: 24px 0 8px;
      font: var(--mat-sys-title-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .table {
      max-width: 720px;
    }
    .num {
      text-align: end;
    }
    .error {
      color: var(--mat-sys-error);
    }
    .skeleton .bar {
      display: block;
      height: 240px;
      border-radius: var(--mat-sys-corner-small);
      background: var(--mat-sys-surface-container-high);
    }
  `,
})
export class CashPage {
  protected readonly store = inject(CashStore);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly lang = inject(LanguageService).lang;
  protected readonly columns = ['opened', 'closed', 'expected', 'difference'];

  constructor() {
    void this.store.load();
  }

  protected open(): void {
    this.form({ mode: 'open', save: (v) => this.store.open(v.amount_cents, v.note) });
  }

  protected movement(): void {
    this.form({
      mode: 'movement',
      save: (v) =>
        this.store.addMovement({
          kind: v.kind,
          amount_cents: v.amount_cents,
          staff_name: v.staff_name,
          note: v.note,
        }),
    });
  }

  protected close(expectedCents: number): void {
    this.form({
      mode: 'close',
      expectedCents,
      save: (v) => this.store.close(v.amount_cents, v.note),
    });
  }

  protected at(iso: string): string {
    return formatDateTime(iso, this.lang());
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.lang());
  }

  private form(data: CashFormData): void {
    this.dialog.open(
      CashFormDialog,
      formDialogConfig(data, this.breakpoints.isMatched(Breakpoints.XSmall)),
    );
  }
}
