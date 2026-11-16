import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService, StaffApi, type StaffUser, type User } from 'shared';
import type { StaffForm } from './staff-form-dialog';
import { StaffStore } from './staff-store';

const AMANDA: StaffUser = { id: 2, name: 'Amanda', role: 'waitress', active: true };
const FORM: StaffForm = { name: 'Bia', role: 'kitchen', active: false, pin: '1234' };

describe('StaffStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let store: StaffStore;
  let snack: ReturnType<typeof vi.spyOn>;
  const me = signal<User | null>({ id: 1, name: 'Boss', role: 'admin' });
  let restore: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    api = {
      list: vi.fn(() => of({ users: [AMANDA] })),
      create: vi.fn(() => of({})),
      update: vi.fn(() => of({})),
      resetPin: vi.fn(() => of(null)),
    };
    me.set({ id: 1, name: 'Boss', role: 'admin' });
    restore = vi.fn(async () => undefined);
    navigate = vi.fn(async () => true);
    TestBed.configureTestingModule({
      providers: [
        StaffStore,
        { provide: StaffApi, useValue: api },
        { provide: AuthService, useValue: { user: me, restore } },
        { provide: Router, useValue: { navigateByUrl: navigate } },
      ],
    });
    store = TestBed.inject(StaffStore);
    snack = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
  });

  const fail = (code: string) => vi.fn(() => throwError(() => ({ code, message: code })));

  it('loads the users, or keeps a translated error', async () => {
    await store.load();
    expect(store.users()).toEqual([AMANDA]);
    api['list'] = fail('network');
    await store.load();
    expect(store.loadError()).toBe('error.network');
  });

  it('creates a user with the PIN, then reloads', async () => {
    expect(await store.save(null, FORM)).toBeNull();
    expect(api['create']).toHaveBeenCalledWith(FORM);
    expect(api['list']).toHaveBeenCalledTimes(1);
    expect(snack).toHaveBeenCalledWith('Salvo.', undefined, { duration: 3000 });
  });

  it('updates a user without the PIN', async () => {
    await store.save(2, FORM);
    expect(api['update']).toHaveBeenCalledWith(2, { name: 'Bia', role: 'kitchen', active: false });
  });

  it('returns the error key and does not reload when the API refuses', async () => {
    api['update'] = fail('user.last_admin');
    expect(await store.save(2, FORM)).toBe('error.user.last_admin');
    expect(api['list']).not.toHaveBeenCalled();
    expect(snack).not.toHaveBeenCalled();
  });

  it('resets a PIN', async () => {
    expect(await store.resetPin(2, { ...FORM, pin: '9876' })).toBeNull();
    expect(api['resetPin']).toHaveBeenCalledWith(2, '9876');
    expect(snack).toHaveBeenCalledWith('PIN redefinido.', undefined, { duration: 3000 });
  });

  it('does not refresh the session user when editing someone else', async () => {
    await store.save(2, FORM);
    expect(restore).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('refreshes the session user after a self-edit and leaves when no longer admin', async () => {
    restore.mockImplementation(async () => me.set({ id: 1, name: 'Boss', role: 'kitchen' }));
    await store.save(1, FORM);
    expect(restore).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
    expect(api['list']).not.toHaveBeenCalled();
  });

  it('stays after a self-edit that keeps admin', async () => {
    await store.save(1, { ...FORM, role: 'admin', active: true });
    expect(restore).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(api['list']).toHaveBeenCalledTimes(1);
  });
});
