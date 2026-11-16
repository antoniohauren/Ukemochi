import { Routes } from '@angular/router';
import { authGuard, LoginPage, PlaceholderPage } from 'shared';
import { Layout } from './layout';
import { MorePage } from './more-page';

/** Usable by any signed-in staff member. */
export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orders' },
      { path: 'orders', component: PlaceholderPage, data: { title: 'nav.orders' } },
      { path: 'new', component: PlaceholderPage, data: { title: 'nav.new' } },
      { path: 'customers', component: PlaceholderPage, data: { title: 'nav.customers' } },
      {
        path: 'more',
        component: MorePage,
        data: { title: 'nav.more' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
