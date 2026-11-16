import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language';
import { TPipe } from './t.pipe';

@Component({
  imports: [TPipe],
  template: `<span>{{ 'common.save' | t }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {}

describe('TPipe', () => {
  beforeEach(() => localStorage.clear());

  it('updates an OnPush view on language switch', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toBe('Salvar');

    TestBed.inject(LanguageService).setLang('en');
    await fixture.whenStable();
    expect(el.textContent).toBe('Save');
  });
});
