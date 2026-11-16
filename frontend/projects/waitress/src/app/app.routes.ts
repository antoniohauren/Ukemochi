import { Routes } from '@angular/router';
import { authGuard, LoginPage, PlaceholderPage } from 'shared';
import { Layout } from './layout';
import { MorePage } from './more-page';
import { OrdersPage } from './orders/orders-page';

/** Usable by any signed-in staff member. */
export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orders' },
      { path: 'orders', component: OrdersPage, data: { title: 'nav.orders' } },
      {
        path: 'orders/:id',
        loadComponent: () => import('./orders/order-page').then((m) => m.OrderPage),
        data: { title: 'order.title', back: '/orders' },
      },
      {
        path: 'orders/:id/edit',
        loadComponent: () => import('./orders/order-editor-page').then((m) => m.OrderEditorPage),
        data: { title: 'order.edit', back: '/orders' },
      },
      {
        path: 'new',
        loadComponent: () => import('./orders/order-editor-page').then((m) => m.OrderEditorPage),
        data: { title: 'nav.new' },
      },
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
