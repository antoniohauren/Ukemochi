import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import {
  type ApiError,
  type Customer,
  type CustomerInput,
  CustomersApi,
  errorKey,
  LanguageService,
  type Order,
  type TranslationKey,
} from 'shared';

/** Customer search, one profile with its order history, and saves. */
@Injectable()
export class CustomersStore {
  private readonly api = inject(CustomersApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);

  readonly customers = signal<Customer[] | null>(null);
  readonly customer = signal<Customer | null>(null);
  readonly orders = signal<Order[] | null>(null);
  readonly loadError = signal<TranslationKey | null>(null);
  private searchSeq = 0;

  async search(q: string): Promise<void> {
    const seq = ++this.searchSeq;
    try {
      const { customers } = await firstValueFrom(this.api.list(q.trim()));
      // A slower earlier search must not overwrite a newer one.
      if (seq === this.searchSeq) {
        this.customers.set(customers);
        this.loadError.set(null);
      }
    } catch (e) {
      this.loadError.set(errorKey(e as ApiError));
    }
  }

  async load(id: number): Promise<void> {
    try {
      const [customer, history] = await Promise.all([
        firstValueFrom(this.api.get(id)),
        firstValueFrom(this.api.orders(id)),
      ]);
      this.customer.set(customer);
      this.orders.set(history.orders);
      this.loadError.set(null);
    } catch (e) {
      this.loadError.set(errorKey(e as ApiError));
    }
  }

  /** Returns the saved customer, or the error key so the form can show it. */
  async save(id: number | null, body: CustomerInput): Promise<Customer | TranslationKey> {
    try {
      const saved = await firstValueFrom(
        id === null ? this.api.create(body) : this.api.update(id, body),
      );
      this.customer.set(saved);
      this.snackBar.open(this.language.t('customer.saved'), undefined, { duration: 3000 });
      return saved;
    } catch (e) {
      return errorKey(e as ApiError);
    }
  }
}
