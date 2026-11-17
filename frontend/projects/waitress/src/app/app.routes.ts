import { Routes } from '@angular/router';
import { authGuard, LoginPage, PlaceholderPage, TicketPage } from 'shared';
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
        loadComponent: () => import('shared/order-editor').then((m) => m.OrderEditorPage),
        data: { title: 'order.edit', back: '/orders' },
      },
      {
        path: 'orders/:id/pay',
        loadComponent: () => import('./orders/pay-page').then((m) => m.PayPage),
        data: { title: 'payment.pay', back: '/orders' },
      },
      {
        path: 'orders/:id/print/kitchen',
        component: TicketPage,
        data: { title: 'ticket.kitchen', back: '/orders', kind: 'kitchen' },
      },
      {
        path: 'orders/:id/print/bill',
        component: TicketPage,
        data: { title: 'ticket.bill', back: '/orders', kind: 'bill' },
      },
      {
        path: 'new',
        loadComponent: () => import('shared/order-editor').then((m) => m.OrderEditorPage),
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
