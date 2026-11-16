import { inject } from '@angular/core';
import { type CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from 'shared';

/** Admin sees everything, kitchen only `/kitchen`, waitress is refused with a message. */
export const roleGuard: CanActivateChildFn = (route) => {
  const router = inject(Router);
  switch (inject(AuthService).user()?.role) {
    case 'admin':
      return true;
    case 'kitchen':
      return route.routeConfig?.path === 'kitchen' || router.createUrlTree(['/kitchen']);
    case 'waitress':
      return router.createUrlTree(['/blocked']);
    default:
      return router.createUrlTree(['/login']);
  }
};
