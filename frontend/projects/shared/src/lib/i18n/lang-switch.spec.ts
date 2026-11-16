import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonToggleHarness } from '@angular/material/button-toggle/testing';
import { LangSwitch } from './lang-switch';
import { LanguageService } from './language';

describe('LangSwitch', () => {
  beforeEach(() => localStorage.clear());

  it('marks the current language and switches on click', async () => {
    const fixture = TestBed.createComponent(LangSwitch);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const pt = await loader.getHarness(MatButtonToggleHarness.with({ text: 'Português' }));
    const en = await loader.getHarness(MatButtonToggleHarness.with({ text: 'English' }));
    expect(await pt.isChecked()).toBe(true);

    await en.check();

    expect(TestBed.inject(LanguageService).lang()).toBe('en');
    expect(await en.isChecked()).toBe(true);
  });
});
