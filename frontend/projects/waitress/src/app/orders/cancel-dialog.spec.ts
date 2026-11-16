import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatInputHarness } from '@angular/material/input/testing';
import type { TranslationKey } from 'shared';
import { CancelDialog } from './cancel-dialog';

describe('CancelDialog', () => {
  let cancel: ReturnType<typeof vi.fn<(reason: string) => Promise<TranslationKey | null>>>;
  let close: ReturnType<typeof vi.fn>;

  async function setup() {
    localStorage.clear();
    cancel = vi.fn<(reason: string) => Promise<TranslationKey | null>>().mockResolvedValue(null);
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { cancel } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(CancelDialog);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    return {
      fixture,
      reason: await loader.getHarness(MatInputHarness),
      submit: await loader.getHarness(MatButtonHarness.with({ text: 'Cancelar pedido' })),
    };
  }

  it.each(['', '   '])('refuses reason %j', async (value) => {
    const { reason, submit, fixture } = await setup();
    await reason.setValue(value);
    await submit.click();
    await fixture.whenStable();
    expect(cancel).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('cancels with the trimmed reason and closes', async () => {
    const { reason, submit, fixture } = await setup();
    await reason.setValue(' cliente desistiu ');
    await submit.click();
    await fixture.whenStable();
    expect(cancel).toHaveBeenCalledWith('cliente desistiu');
    expect(close).toHaveBeenCalledWith(true);
  });

  it('stays open with the error when the API refuses', async () => {
    cancel = vi.fn();
    const { reason, submit, fixture } = await setup();
    cancel.mockResolvedValue('error.order.not_found');
    await reason.setValue('x');
    await submit.click();
    await fixture.whenStable();
    expect(close).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pedido não encontrado.');
  });
});
