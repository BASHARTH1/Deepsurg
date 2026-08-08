import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'DeepSurg — AI for the operating room',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  { path: '**', redirectTo: '' },
];
