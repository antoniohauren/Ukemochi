import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSlideToggleHarness } from '@angular/material/slide-toggle/testing';
import { of, throwError } from 'rxjs';
import { type Settings, SettingsApi } from 'shared';
import { SettingsPage } from './settings-page';

const SETTINGS: Settings = {
  restaurant_name: 'Ukemochi',
  language: 'pt-BR',
  paper_width: 80,
  delivery_fee_enabled: false,
  delivery_fee_cents: 500,
};

describe('SettingsPage', () => {
  let api: { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  async function setup() {
    localStorage.clear();
    api = { get: vi.fn(() => of(SETTINGS)), update: vi.fn((body: Settings) => of(body)) };
    TestBed.configureTestingModule({ providers: [{ provide: SettingsApi, useValue: api }] });
    const fixture = TestBed.createComponent(SettingsPage);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    return { fixture, loader, el: fixture.nativeElement as HTMLElement };
  }

  it('fills the form from the API and saves the fee as cents', async () => {
    const { fixture, loader } = await setup();
    const inputs = await loader.getAllHarnesses(MatInputHarness);
    expect(await inputs[0].getValue()).toBe('Ukemochi');
    await inputs[0].setValue(' Sushi Ya ');
    await inputs[1].setValue('7,50');
    await (await loader.getHarness(MatSlideToggleHarness)).check();
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Salvar' }))).click();
    await fixture.whenStable();
    expect(api.update).toHaveBeenCalledWith({
      restaurant_name: 'Sushi Ya',
      language: 'pt-BR',
      paper_width: 80,
      delivery_fee_enabled: true,
      delivery_fee_cents: 750,
    });
  });

  it('does not save an invalid fee', async () => {
    const { fixture, loader } = await setup();
    const inputs = await loader.getAllHarnesses(MatInputHarness);
    await inputs[1].setValue('-1');
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Salvar' }))).click();
    await fixture.whenStable();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('shows the API error', async () => {
    const { fixture, loader, el } = await setup();
    api.update.mockReturnValue(throwError(() => ({ code: 'forbidden', message: '' })));
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Salvar' }))).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Sem permissão.');
  });

  it('keeps the device language switch', async () => {
    const { el } = await setup();
    expect(el.querySelector('lib-lang-switch')).not.toBeNull();
  });
});
