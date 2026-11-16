import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { StaffFormDialog, type StaffFormData } from './staff-form-dialog';

describe('StaffFormDialog', () => {
  let close: ReturnType<typeof vi.fn>;
  let save: ReturnType<typeof vi.fn<StaffFormData['save']>>;

  async function setup(data: Partial<StaffFormData>) {
    localStorage.clear();
    close = vi.fn();
    save = vi.fn<StaffFormData['save']>().mockResolvedValue(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'create', save, ...data } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(StaffFormDialog);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const inputs = await loader.getAllHarnesses(MatInputHarness);
    const submit = await loader.getHarness(MatButtonHarness.with({ text: 'Salvar' }));
    return { fixture, loader, inputs, submit, el: fixture.nativeElement as HTMLElement };
  }

  it('creates with name, role, active and PIN', async () => {
    const { inputs, submit, fixture, loader } = await setup({});
    await inputs[0].setValue(' Bia ');
    await (await loader.getHarness(MatSelectHarness)).clickOptions({ text: 'Cozinha' });
    await inputs[1].setValue('1234');
    await submit.click();
    await fixture.whenStable();
    expect(save).toHaveBeenCalledWith({ name: 'Bia', role: 'kitchen', active: true, pin: '1234' });
    expect(close).toHaveBeenCalledWith(true);
  });

  it.each(['', '123', '12a4'])('refuses PIN %j', async (pin) => {
    const { inputs, submit, fixture } = await setup({});
    await inputs[0].setValue('Bia');
    await inputs[1].setValue(pin);
    await submit.click();
    await fixture.whenStable();
    expect(save).not.toHaveBeenCalled();
  });

  it('edits without a PIN field', async () => {
    const { inputs, submit, fixture } = await setup({
      mode: 'edit',
      value: { name: 'Amanda', role: 'admin', active: false },
    });
    expect(inputs.length).toBe(1);
    await submit.click();
    await fixture.whenStable();
    expect(save).toHaveBeenCalledWith({ name: 'Amanda', role: 'admin', active: false, pin: '' });
  });

  it('resets only the PIN', async () => {
    const { inputs, submit, fixture, el } = await setup({ mode: 'pin' });
    expect(inputs.length).toBe(1);
    expect(el.textContent).toContain('Redefinir PIN');
    await inputs[0].setValue('9876');
    await submit.click();
    await fixture.whenStable();
    expect(save.mock.calls[0][0].pin).toBe('9876');
  });

  it('shows the API error and stays open', async () => {
    const { inputs, submit, fixture, el } = await setup({ mode: 'edit', value: { name: 'A' } });
    save.mockResolvedValue('error.user.last_admin');
    await inputs[0].setValue('Amanda');
    await submit.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('admin ativo');
    expect(close).not.toHaveBeenCalled();
  });
});
