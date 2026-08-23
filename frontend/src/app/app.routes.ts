import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'DeepSurg — AI for the operating room',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'products',
    title: 'Products — DeepSurg',
    loadComponent: () => import('./pages/products/products').then((m) => m.Products),
  },
  {
    path: 'blog',
    title: 'Blog — DeepSurg',
    loadComponent: () => import('./pages/blog/blog-list').then((m) => m.BlogList),
  },
  {
    path: 'blog/:slug',
    title: 'Blog — DeepSurg',
    loadComponent: () => import('./pages/blog/blog-post').then((m) => m.BlogPost),
  },
  {
    path: 'admin',
    title: 'Admin — DeepSurg',
    loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin),
  },
  { path: '**', redirectTo: '' },
];
