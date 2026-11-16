import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { provideRouter, Router } from '@angular/router';
import type { ApiError } from '../api/api-client';
import { AuthService } from './auth';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let login: ReturnType<typeof vi.fn>;
  const retryIn = signal(0);

  beforeEach(() => {
    localStorage.clear();
    retryIn.set(0);
    login = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { login, retryIn } }],
    });
  });

  async function setup(name: string, pin: string) {
    const fixture = TestBed.createComponent(LoginPage);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const [nameInput, pinInput] = await loader.getAllHarnesses(MatInputHarness);
    await nameInput.setValue(name);
    await pinInput.setValue(pin);
    const submit = await loader.getHarness(MatButtonHarness.with({ text: 'Entrar' }));
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, submit, pinInput };
  }

  const fail = (error: ApiError) => login.mockRejectedValue(error);

  it('uses a numeric keypad without autocomplete for the PIN', async () => {
    const { pinInput } = await setup('', '');
    const host = await pinInput.host();
    expect(await host.getAttribute('inputmode')).toBe('numeric');
    expect(await host.getAttribute('autocomplete')).toBe('off');
  });

  it.each(['', '123', '12345', '12a4'])('refuses PIN %j without calling the API', async (pin) => {
    const { el, submit, fixture } = await setup('Amanda', pin);
    await submit.click();
    await fixture.whenStable();
    expect(login).not.toHaveBeenCalled();
    expect(el.textContent).toContain('O PIN tem 4 dígitos.');
  });

  it('signs in and goes to the start page', async () => {
    login.mockResolvedValue({ id: 1, name: 'Amanda', role: 'waitress' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { submit, fixture } = await setup('Amanda', '1234');
    await submit.click();
    await fixture.whenStable();
    expect(login).toHaveBeenCalledWith('Amanda', '1234');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows the translated error for a wrong PIN', async () => {
    fail({ code: 'auth.invalid_credentials', message: 'Wrong name or PIN.' });
    const { el, submit, fixture } = await setup('Amanda', '0000');
    await submit.click();
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Nome ou PIN errado.');
  });

  it('falls back to a generic message for an unknown code', async () => {
    fail({ code: 'server_error', message: 'Server error.' });
    const { el, submit, fixture } = await setup('Amanda', '0000');
    await submit.click();
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Algo deu errado.');
  });

  it('shows the throttle countdown instead of an error and blocks submit meanwhile', async () => {
    fail({ code: 'auth.throttled', message: 'Too many', retry_after: 2 });
    const { el, submit, fixture } = await setup('Amanda', '0000');
    await submit.click();
    retryIn.set(2);
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Tente de novo em 2s');
    expect(await submit.isDisabled()).toBe(true);

    retryIn.set(0);
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')).toBeNull();
    expect(await submit.isDisabled()).toBe(false);
  });
});
