import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { StaffApi, type StaffUser } from 'shared';
import type { StaffForm } from './staff-form-dialog';
import { StaffStore } from './staff-store';

const AMANDA: StaffUser = { id: 2, name: 'Amanda', role: 'waitress', active: true };
const FORM: StaffForm = { name: 'Bia', role: 'kitchen', active: false, pin: '1234' };

describe('StaffStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let store: StaffStore;
  let snack: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    api = {
      list: vi.fn(() => of({ users: [AMANDA] })),
      create: vi.fn(() => of({})),
      update: vi.fn(() => of({})),
      resetPin: vi.fn(() => of(null)),
    };
    TestBed.configureTestingModule({
      providers: [StaffStore, { provide: StaffApi, useValue: api }],
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
});
