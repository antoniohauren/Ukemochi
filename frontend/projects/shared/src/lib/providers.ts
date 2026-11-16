import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import {
  effect,
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { SettingsApi } from './api/settings-api';
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
      const language = inject(LanguageService); // sets <html lang> before first render
      const auth = inject(AuthService);
      const settings = inject(SettingsApi);
      // Once signed in (restore or login): the restaurant's default language, unless the device chose one.
      effect(() => {
        if (auth.user()) {
          settings.get().subscribe({
            next: (s) => language.useDefault(s.language),
            error: () => undefined, // offline: keep the current language
          });
        }
      });
      return auth.restore();
    }),
  ]);
}
