import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

/** Any signed-in staff member; everyone else goes to login. */
export const authGuard: CanActivateFn = () =>
  inject(AuthService).user() !== null || inject(Router).createUrlTree(['/login']);
