import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
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
import { formatDateTime, LanguageService, TPipe } from 'shared';
import { AuditStore } from './audit-store';

/** Auditoria: who changed what and when, filterable by record (e.g. order 42). */
@Component({
  selector: 'app-audit-page',
  providers: [AuditStore],
  imports: [
    MatButton,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatFormField,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatInput,
    MatLabel,
    MatRow,
    MatRowDef,
    MatTable,
    ReactiveFormsModule,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="filter" [formGroup]="filter" (ngSubmit)="search()">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'audit.entity' | t }}</mat-label>
        <input matInput formControlName="entity" maxlength="50" autocomplete="off" />
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>{{ 'audit.entity_id' | t }}</mat-label>
        <input matInput formControlName="entity_id" maxlength="50" autocomplete="off" />
      </mat-form-field>
      <button matButton="filled" type="submit">{{ 'audit.search' | t }}</button>
    </form>
    @if (store.error(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
    }
    @if (store.entries(); as entries) {
      <div class="scroll">
        <table mat-table [dataSource]="entries">
          <ng-container matColumnDef="at">
            <th mat-header-cell *matHeaderCellDef>{{ 'audit.at' | t }}</th>
            <td mat-cell *matCellDef="let e">{{ at(e.at) }}</td>
          </ng-container>
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>{{ 'audit.user' | t }}</th>
            <td mat-cell *matCellDef="let e">{{ e.user_name ?? ('audit.system' | t) }}</td>
          </ng-container>
          <ng-container matColumnDef="record">
            <th mat-header-cell *matHeaderCellDef>{{ 'audit.record' | t }}</th>
            <td mat-cell *matCellDef="let e">{{ e.entity }} #{{ e.entity_id }}</td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef>{{ 'audit.action' | t }}</th>
            <td mat-cell *matCellDef="let e">{{ e.action }}</td>
          </ng-container>
          <ng-container matColumnDef="summary">
            <th mat-header-cell *matHeaderCellDef>{{ 'audit.summary' | t }}</th>
            <td mat-cell *matCellDef="let e" class="summary">{{ json(e.summary) }}</td>
          </ng-container>
          <ng-container matColumnDef="note">
            <th mat-header-cell *matHeaderCellDef>{{ 'order.note' | t }}</th>
            <td mat-cell *matCellDef="let e">{{ e.note }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </div>
      @if (entries.length === 0) {
        <p class="meta">{{ 'audit.empty' | t }}</p>
      }
      @if (store.next() !== null) {
        <button matButton="tonal" type="button" class="more" (click)="store.more()">
          {{ 'audit.more' | t }}
        </button>
      }
    }
  `,
  styles: `
    .filter {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      button {
        min-height: 48px;
      }
    }
    .scroll {
      overflow-x: auto;
    }
    .summary {
      font-family: monospace;
      font-size: 12px;
      overflow-wrap: anywhere;
      max-width: 360px;
    }
    .meta {
      color: var(--mat-sys-on-surface-variant);
    }
    .error {
      color: var(--mat-sys-error);
    }
    .more {
      margin: 16px 0;
      min-height: 48px;
    }
  `,
})
export class AuditPage {
  protected readonly store = inject(AuditStore);
  private readonly lang = inject(LanguageService).lang;
  protected readonly columns = ['at', 'user', 'record', 'action', 'summary', 'note'];
  protected readonly filter = new FormGroup({
    entity: new FormControl('', { nonNullable: true }),
    entity_id: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    void this.search();
  }

  protected search(): Promise<void> {
    const v = this.filter.getRawValue();
    return this.store.search(v.entity, v.entity_id);
  }

  protected at(iso: string): string {
    return formatDateTime(iso, this.lang());
  }

  protected json(value: unknown): string {
    return JSON.stringify(value);
  }
}
