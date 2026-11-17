import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { ApiError } from '../api/api-client';
import type { Ticket, TicketKind } from '../api/order';
import { OrdersApi } from '../api/orders-api';
import type { Settings } from '../api/settings';
import { SettingsApi } from '../api/settings-api';
import { errorKey } from '../i18n/error-key';
import { LanguageService } from '../i18n/language';
import type { TranslationKey } from '../i18n/pt-br';
import { TPipe } from '../i18n/t.pipe';
import { TicketPrint } from './ticket-print';

/** One ticket and the settings it prints with. */
@Injectable()
export class TicketStore {
  private readonly orders = inject(OrdersApi);
  private readonly settingsApi = inject(SettingsApi);
  private readonly window = inject(DOCUMENT).defaultView;

  readonly ticket = signal<Ticket | null>(null);
  readonly settings = signal<Settings | null>(null);
  readonly loadError = signal<TranslationKey | null>(null);

  async load(id: number, kind: TicketKind): Promise<void> {
    this.loadError.set(null);
    try {
      const [ticket, settings] = await Promise.all([
        firstValueFrom(this.orders.ticket(id, kind)),
        firstValueFrom(this.settingsApi.get()),
      ]);
      this.ticket.set(ticket);
      this.settings.set(settings);
    } catch (e) {
      this.loadError.set(errorKey(e as ApiError));
    }
  }

  /**
   * Opens the browser print (it returns once the dialog closes; with `--kiosk-printing` it prints
   * straight away), then records the version this ticket showed. Returns the error key on failure.
   */
  async print(): Promise<TranslationKey | null> {
    const ticket = this.ticket();
    if (!ticket) {
      return null;
    }
    this.window?.print();
    try {
      await firstValueFrom(this.orders.printed(ticket.number, ticket.kind, ticket.version));
    } catch (e) {
      return errorKey(e as ApiError);
    }
    return null;
  }
}

/** Print view of `orders/:id/print/(kitchen|bill)`; the route's `data.kind` picks the ticket. */
@Component({
  selector: 'lib-ticket-page',
  providers: [TicketStore],
  imports: [MatButton, TicketPrint, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.ticket(); as ticket) {
      @if (store.settings(); as s) {
        <lib-ticket-print
          [ticket]="ticket"
          [paperWidth]="s.paper_width"
          [restaurantName]="s.restaurant_name"
        />
        <div class="action-bar">
          <button matButton="filled" type="button" [disabled]="printing()" (click)="print()">
            {{ 'ticket.print' | t }}
          </button>
        </div>
      }
    } @else if (store.loadError(); as key) {
      <p class="error" role="alert">{{ key | t }}</p>
      <button matButton="tonal" type="button" (click)="load()">{{ 'common.retry' | t }}</button>
    } @else {
      <div class="skeleton" aria-hidden="true"></div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 100%;
    }
    .error {
      color: var(--mat-sys-error);
    }
    .action-bar {
      position: sticky;
      bottom: 0;
      margin-top: auto;
      padding: 8px 0;
      background: var(--mat-sys-surface);
      button {
        width: 100%;
        min-height: 48px;
      }
    }
    .skeleton {
      height: 240px;
      border-radius: var(--mat-sys-corner-small);
      background: var(--mat-sys-surface-container-high);
    }
  `,
})
export class TicketPage {
  protected readonly store = inject(TicketStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute).snapshot;
  private readonly id = Number(this.route.paramMap.get('id'));
  private readonly kind = this.route.data['kind'] as TicketKind;
  protected readonly printing = signal(false);

  constructor() {
    void this.load();
  }

  protected load(): Promise<void> {
    return this.store.load(this.id, this.kind);
  }

  protected async print(): Promise<void> {
    this.printing.set(true);
    const error = await this.store.print();
    this.printing.set(false);
    this.snackBar.open(this.language.t(error ?? 'ticket.printed'), undefined, { duration: 3000 });
  }
}
