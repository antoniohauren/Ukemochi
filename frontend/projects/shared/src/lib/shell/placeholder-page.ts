import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TPipe } from '../i18n/t.pipe';

/** Stand-in for screens of later steps; the app bar shows the route title. */
@Component({
  selector: 'lib-placeholder-page',
  imports: [TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ 'page.soon' | t }}</p>`,
})
export class PlaceholderPage {}
