import { formDialogConfig } from './form-dialog';

describe('formDialogConfig', () => {
  it('closes only through its own buttons, so a stray tap keeps typed input', () => {
    expect(formDialogConfig({}, false).disableClose).toBe(true);
    expect(formDialogConfig({}, true).disableClose).toBe(true);
  });

  it('fills the screen on phones', () => {
    expect(formDialogConfig({}, true)).toMatchObject({
      height: '100%',
      panelClass: 'full-screen-dialog',
    });
    expect(formDialogConfig({}, false).width).toBe('480px');
  });
});
