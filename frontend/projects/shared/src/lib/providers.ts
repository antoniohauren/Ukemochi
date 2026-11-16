import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { AuthService } from './auth/auth';
import { LanguageService } from './i18n/language';
import { authInterceptor } from './auth/auth.interceptor';

/** App-wide providers both apps share: HTTP with Sanctum XSRF, session restore, icon font. */
export function provideUkemochi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    // Angular sends the header only for same-origin mutating requests; ApiClient uses relative URLs.
    provideHttpClient(
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withInterceptors([authInterceptor]),
    ),
    provideAppInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
      inject(LanguageService); // sets <html lang> before first render
      return inject(AuthService).restore();
    }),
  ]);
}
