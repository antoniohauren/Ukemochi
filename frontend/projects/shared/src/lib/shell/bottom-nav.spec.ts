import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BottomNav } from './bottom-nav';
import type { NavItem } from './nav-item';

const item = (n: number): NavItem => ({ path: `/p${n}`, icon: 'circle', label: 'nav.menu' });

describe('BottomNav', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }])],
    }),
  );

  async function tabs(count: number): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(BottomNav);
    fixture.componentRef.setInput(
      'items',
      Array.from({ length: count }, (_, i) => item(i)),
    );
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows up to 5 items as tabs', async () => {
    const el = await tabs(5);
    expect(el.querySelectorAll('a.tab').length).toBe(5);
    expect(el.querySelector('button.tab')).toBeNull();
  });

  it('moves items past the 4th into a more menu when there are over 5', async () => {
    const el = await tabs(8);
    expect(el.querySelectorAll('a.tab').length).toBe(4);
    expect(el.querySelector('button.tab')?.textContent).toContain('Mais');
  });

  it('marks the more tab active when the current page is in its menu', async () => {
    await TestBed.inject(Router).navigateByUrl('/p6');
    const el = await tabs(8);
    expect(el.querySelector('button.tab')?.classList).toContain('active');
  });

  it('leaves the more tab inactive on a page shown as its own tab', async () => {
    await TestBed.inject(Router).navigateByUrl('/p1');
    const el = await tabs(8);
    expect(el.querySelector('button.tab')?.classList).not.toContain('active');
  });
});
