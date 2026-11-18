import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';
import { type ApiError } from '../../api/api-client';
import { type Customer, type CustomerInput, phoneDigits } from '../../api/customer';
import { CustomersApi } from '../../api/customers-api';
import { errorKey } from '../../i18n/error-key';
import { type TranslationKey } from '../../i18n/pt-br';

/** Phone lookup while taking a phone order; saves the caller as a new customer when not found. */
@Injectable()
export class CustomerLookup {
  private readonly api = inject(CustomersApi);

  /** The customer found or saved; null before a lookup or when none matched. */
  readonly customer = signal<Customer | null>(null);
  /** The last lookup matched no one. */
  readonly missing = signal(false);
  readonly error = signal<TranslationKey | null>(null);

  /** Exact phone match (digits only). */
  find(phone: string): Promise<Customer | null> {
    const digits = phoneDigits(phone);
    return this.run(this.api.list(digits), (r) => r.customers.find((c) => c.phone === digits));
  }

  save(body: CustomerInput): Promise<Customer | null> {
    return this.run(this.api.create(body), (c) => c);
  }

  private async run<T>(
    call: Observable<T>,
    pick: (r: T) => Customer | undefined,
  ): Promise<Customer | null> {
    this.error.set(null);
    try {
      const found = pick(await firstValueFrom(call)) ?? null;
      this.customer.set(found);
      this.missing.set(found === null);
      return found;
    } catch (e) {
      this.error.set(errorKey(e as ApiError));
      return null;
    }
  }
}
