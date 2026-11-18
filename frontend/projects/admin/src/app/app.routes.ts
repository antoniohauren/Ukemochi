import { Routes } from '@angular/router';
import { authGuard, LoginPage, PlaceholderPage, TicketPage } from 'shared';
import { Layout } from './layout';
import { roleGuard } from './role.guard';

// Feature screens load on first visit, keeping the initial bundle small.
export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: 'blocked',
    loadComponent: () => import('./blocked-page').then((m) => m.BlockedPage),
    canActivate: [authGuard],
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    canActivateChild: [roleGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orders' },
      {
        path: 'orders',
        loadComponent: () => import('./orders/orders-page').then((m) => m.OrdersPage),
        data: { title: 'nav.orders' },
      },
      {
        path: 'orders/:id/edit',
        loadComponent: () => import('shared/order-editor').then((m) => m.OrderEditorPage),
        data: { title: 'order.edit', back: '/orders', afterSave: '/orders' },
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
        path: 'menu',
        loadComponent: () => import('./menu/menu-page').then((m) => m.MenuPage),
        data: { title: 'nav.menu' },
      },
      { path: 'kitchen', component: PlaceholderPage, data: { title: 'nav.kitchen' } },
      {
        path: 'cash',
        loadComponent: () => import('./cash/cash-page').then((m) => m.CashPage),
        data: { title: 'nav.cash' },
      },
      {
        path: 'cash/:id',
        loadComponent: () => import('./cash/shift-page').then((m) => m.ShiftPage),
        data: { title: 'cash.shift', back: '/cash' },
      },
      {
        path: 'stock',
        loadComponent: () => import('./stock/stock-page').then((m) => m.StockPage),
        data: { title: 'nav.stock' },
      },
      { path: 'reports', component: PlaceholderPage, data: { title: 'nav.reports' } },
      {
        path: 'staff',
        loadComponent: () => import('./staff/staff-page').then((m) => m.StaffPage),
        data: { title: 'nav.staff' },
      },
      {
        path: 'audit',
        loadComponent: () => import('./audit/audit-page').then((m) => m.AuditPage),
        data: { title: 'nav.audit' },
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings-page').then((m) => m.SettingsPage),
        data: { title: 'nav.settings' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
