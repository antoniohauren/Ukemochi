import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatInputHarness } from '@angular/material/input/testing';
import { MenuFormDialog, type MenuFormData } from './menu-form-dialog';

describe('MenuFormDialog', () => {
  let close: ReturnType<typeof vi.fn>;
  let save: ReturnType<typeof vi.fn<MenuFormData['save']>>;

  async function setup(data: Partial<MenuFormData>) {
    localStorage.clear();
    close = vi.fn();
    save = vi.fn<MenuFormData['save']>().mockResolvedValue(null);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { title: 'menu.item.new', fields: [], save, ...data },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(MenuFormDialog);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const inputs = await loader.getAllHarnesses(MatInputHarness);
    const submit = await loader.getHarness(MatButtonHarness.with({ text: 'Salvar' }));
    return { fixture, inputs, submit, el: fixture.nativeElement as HTMLElement };
  }

  it('parses the typed price into cents and closes when saved', async () => {
    const { inputs, submit, fixture } = await setup({ fields: ['name', 'price_cents'] });
    await inputs[0].setValue(' Carne ');
    await inputs[1].setValue('12,50');
    await submit.click();
    await fixture.whenStable();
    expect(save).toHaveBeenCalledWith({
      name: 'Carne',
      note: '',
      price_cents: 1250,
      flag: true,
    });
    expect(close).toHaveBeenCalledWith(true);
  });

  it.each(['', 'abc', '-1', '1,2,3'])('refuses price %j without saving', async (price) => {
    const { inputs, submit, fixture, el } = await setup({ fields: ['name', 'price_cents'] });
    await inputs[0].setValue('Carne');
    await inputs[1].setValue(price);
    await submit.click();
    await fixture.whenStable();
    expect(save).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Informe um valor');
  });

  it('requires a name unless it is optional', async () => {
    const required = await setup({ fields: ['name'] });
    await required.inputs[0].setValue('  ');
    await required.submit.click();
    expect(save).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const optional = await setup({ fields: ['name'], nameOptional: true });
    await optional.submit.click();
    await optional.fixture.whenStable();
    expect(save).toHaveBeenCalled();
  });

  it('prefills the price and keeps the dialog open with the error on failure', async () => {
    const { inputs, submit, fixture, el } = await setup({
      fields: ['name', 'price_cents'],
      value: { name: 'Carne', price_cents: 1250 },
    });
    expect(await inputs[1].getValue()).toBe('R$ 12,50');
    save.mockResolvedValue({ code: 'menu.invalid_price', message: 'x' });
    await submit.click();
    await fixture.whenStable();
    expect(close).not.toHaveBeenCalled();
    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'O preço não pode ser negativo.',
    );
  });

  it('puts per-field API errors on their fields', async () => {
    const { inputs, submit, fixture, el } = await setup({ fields: ['name', 'price_cents'] });
    await inputs[0].setValue('Carne');
    await inputs[1].setValue('5');
    save.mockResolvedValue({
      code: 'validation',
      message: 'x',
      errors: { price_cents: ['The price cents field must be at least 0.'] },
    });
    await submit.click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Informe um valor');
    expect(el.textContent).not.toContain('Informe o nome.');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Verifique os campos.');
  });

  it('has a back button that closes it', async () => {
    const { el } = await setup({ fields: ['name'] });
    expect(el.querySelector('.close[mat-dialog-close]')).not.toBeNull();
  });
});
