import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';
import type {
  Addon,
  AddonInput,
  Category,
  CategoryInput,
  Item,
  ItemInput,
  Menu,
  NewItemInput,
  NewVariantInput,
  Variant,
  VariantInput,
} from './menu';

/** Menu endpoints. Writes are admin-only, except the availability toggles (admin + kitchen). */
@Injectable({ providedIn: 'root' })
export class MenuApi {
  private readonly api = inject(ApiClient);

  menu(): Observable<Menu> {
    return this.api.get<Menu>('/menu');
  }

  createCategory(body: CategoryInput): Observable<Category> {
    return this.api.post<Category>('/categories', body);
  }

  updateCategory(id: number, body: CategoryInput): Observable<Category> {
    return this.api.put<Category>(`/categories/${id}`, body);
  }

  createItem(body: NewItemInput): Observable<Item> {
    return this.api.post<Item>('/items', body);
  }

  updateItem(id: number, body: ItemInput): Observable<Item> {
    return this.api.put<Item>(`/items/${id}`, body);
  }

  /** `note` goes to the audit log (e.g. why it is unavailable). */
  setItemActive(id: number, active: boolean, note?: string): Observable<Item> {
    return this.api.put<Item>(`/items/${id}/active`, { active, note });
  }

  createVariant(itemId: number, body: NewVariantInput): Observable<Variant> {
    return this.api.post<Variant>(`/items/${itemId}/variants`, body);
  }

  updateVariant(id: number, body: VariantInput): Observable<Variant> {
    return this.api.put<Variant>(`/variants/${id}`, body);
  }

  setVariantAvailable(id: number, available: boolean, note?: string): Observable<Variant> {
    return this.api.put<Variant>(`/variants/${id}/available`, { available, note });
  }

  /** Soft delete; fails with `menu.last_variant` for an item's only variant. */
  deleteVariant(id: number, note?: string): Observable<null> {
    return this.api.delete<null>(`/variants/${id}`, note === undefined ? undefined : { note });
  }

  createAddon(body: AddonInput): Observable<Addon> {
    return this.api.post<Addon>('/addons', body);
  }

  updateAddon(id: number, body: AddonInput): Observable<Addon> {
    return this.api.put<Addon>(`/addons/${id}`, body);
  }
}
