import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatListItem, MatListItemLine, MatListItemTitle, MatNavList } from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { TPipe } from 'shared';
import { CustomersStore } from './customers-store';

/** Clientes: search by name or phone; opens a profile or a new one. */
@Component({
  selector: 'app-customers-page',
  providers: [CustomersStore],
  imports: [
    MatButton,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    MatListItem,
    MatListItemLine,
    MatListItemTitle,
    MatNavList,
    MatPrefix,
    ReactiveFormsModule,
    RouterLink,
    TPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field subscriptSizing="dynamic" class="search">
      <mat-label>{{ 'customer.search' | t }}</mat-label>
      <mat-icon matPrefix aria-hidden="true">search</mat-icon>
      <input matInput type="search" [formControl]="query" autocomplete="off" maxlength="255" />
    </mat-form-field>
    @if (store.loadError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
    }
    @if (store.customers(); as customers) {
      <mat-nav-list>
        @for (c of customers; track c.id) {
          <a mat-list-item [routerLink]="['/customers', c.id]">
            <span matListItemTitle>{{ c.name }}</span>
            @if (c.phone) {
              <span matListItemLine>{{ c.phone }}</span>
            }
          </a>
        } @empty {
          <p class="empty">{{ 'customer.empty' | t }}</p>
        }
      </mat-nav-list>
    } @else if (!store.loadError()) {
      <div class="skeleton" aria-hidden="true">
        @for (row of [1, 2, 3, 4]; track row) {
          <span class="bar"></span>
        }
      </div>
    }
    <div class="action-bar">
      <a matButton="filled" routerLink="/customers/new">
        <mat-icon aria-hidden="true">person_add</mat-icon>
        {{ 'customer.new' | t }}
      </a>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .search {
      width: 100%;
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
      a {
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
export class CustomersPage {
  protected readonly store = inject(CustomersStore);
  protected readonly query = new FormControl('', { nonNullable: true });

  constructor() {
    void this.store.search('');
    const sub = this.query.valueChanges
      .pipe(debounceTime(250))
      .subscribe((q) => void this.store.search(q));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}
