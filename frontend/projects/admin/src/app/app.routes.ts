import { Routes } from '@angular/router';
import { authGuard, LoginPage, PlaceholderPage } from 'shared';
import { BlockedPage } from './blocked-page';
import { Layout } from './layout';
import { MenuPage } from './menu/menu-page';
import { roleGuard } from './role.guard';
import { SettingsPage } from './settings-page';
import { StaffPage } from './staff/staff-page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: 'blocked',
    component: BlockedPage,
    canActivate: [authGuard],
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    canActivateChild: [roleGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orders' },
      { path: 'orders', component: PlaceholderPage, data: { title: 'nav.orders' } },
      { path: 'menu', component: MenuPage, data: { title: 'nav.menu' } },
      { path: 'kitchen', component: PlaceholderPage, data: { title: 'nav.kitchen' } },
      { path: 'cash', component: PlaceholderPage, data: { title: 'nav.cash' } },
      { path: 'reports', component: PlaceholderPage, data: { title: 'nav.reports' } },
      { path: 'staff', component: StaffPage, data: { title: 'nav.staff' } },
      { path: 'audit', component: PlaceholderPage, data: { title: 'nav.audit' } },
      {
        path: 'settings',
        component: SettingsPage,
        data: { title: 'nav.settings' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
