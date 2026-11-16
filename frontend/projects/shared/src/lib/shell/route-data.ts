import { inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type Data, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** `data` of the deepest active route, updated after each navigation. Call in an injection context. */
export function activeRouteData(): Signal<Data> {
  const router = inject(Router);
  const read = (): Data => {
    let route = router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data;
  };
  return toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(read),
    ),
    { initialValue: read() },
  );
}
