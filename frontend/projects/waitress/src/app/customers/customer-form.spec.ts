import { addressGroup, customerBody, customerForm } from './customer-form';

describe('customer form', () => {
  it('needs a name and accepts no phone or one with 11 digits, masked', () => {
    const form = customerForm();
    expect(form.valid).toBe(false);
    form.controls.name.setValue('Ana');
    expect(form.valid).toBe(true);
    form.controls.phone.setValue('123');
    expect(form.valid).toBe(false);
    form.controls.phone.setValue('1187654321');
    expect(form.valid).toBe(false);
    form.controls.phone.setValue('11987654321');
    expect(form.controls.phone.value).toBe('(11) 9.8765-4321');
    expect(form.valid).toBe(true);
  });

  it('fills from a customer and builds the body with digits and nulls', () => {
    const form = customerForm({
      id: 1,
      name: 'Ana',
      phone: '11987654321',
      note: null,
      addresses: [{ text: 'Rua A', note: 'portão' }],
    });
    form.controls.addresses.push(addressGroup());
    expect(form.valid).toBe(false); // the new address is empty
    form.controls.addresses.at(1).controls.text.setValue(' Rua B ');
    form.controls.phone.setValue('(11) 9.2222-3333');
    expect(customerBody(form.getRawValue())).toEqual({
      name: 'Ana',
      phone: '11922223333',
      note: null,
      addresses: [
        { text: 'Rua A', note: 'portão' },
        { text: 'Rua B', note: null },
      ],
    });
  });
});
