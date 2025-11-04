import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardLayoutComponent } from './components/layouts/dashboard-layout/dashboard-layout.component';
import { AuthLayoutComponent } from './components/layouts/auth-layout/auth-layout.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'signup',
        loadComponent: () => import('./components/auth/signup/signup.component').then(m => m.SignupComponent)
      }
    ]
  },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'issues',
        loadComponent: () => import('./components/issue/all-issues/all-issues.component').then(m => m.AllIssuesComponent)
      },
    //   {
    //     path: 'my-issues',
    //     loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
    //   },
      {
        path: 'issue/create',
        loadComponent: () => import('./components/issue/create-issue/create-issue.component').then(m => m.CreateIssueComponent)
      },
      {
        path: 'issue/edit/:id',
        loadComponent: () => import('./components/issue/edit-issue/edit-issue.component').then(m => m.EditIssueComponent)
      },
      {
        path: 'issue/:id',
        loadComponent: () => import('./components/issue/view-issue/view-issue.component').then(m => m.ViewIssueComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];



@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
