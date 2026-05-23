import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginPage } from './login-page/login-page';
import { Layout } from './layout/layout';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { Createandmanage } from './createandmanage/createandmanage';
import { ManagerDashboard } from './manager-dashboard/manager-dashboard';
import { Projects } from './manager/projects/projects';
import { Tasks } from './manager/tasks/tasks';
import { Employees } from './manager/employees/employees';
import { EmployeeDashboard } from './employee-dashboard/employee-dashboard';
import { MyTasks } from './employee/my-tasks/my-tasks';
import { MyProjects } from './employee/my-projects/my-projects';
import { Settings } from './settings/settings';
import { Notifications } from './notifications/notifications';

export const routes: Routes = [
  { path:"", loadComponent: () => import('./login-page/login-page').then(m => m.LoginPage) ,pathMatch:'full'},

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout').then(m => m.Layout),
    children: [
      { path: '', component: AdminDashboard },
      { path: 'action', component: Createandmanage },
      { path: 'settings', component: Settings },
      { path: 'notifications', component: Notifications }
    ]
  },

  {
    path: 'manager-dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout').then(m => m.Layout),
    children: [
      { path: '', component: ManagerDashboard },
      { path: 'projects', component: Projects },
      { path: 'tasks', component: Tasks },
      { path: 'employees', component: Employees },
      { path: 'settings', component: Settings },
      { path: 'notifications', component: Notifications }
    ]
  },

  {
    path: 'employee-dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout').then(m => m.Layout),
    children: [
      { path: '', component: EmployeeDashboard },
      { path: 'my-tasks', component: MyTasks },
      { path: 'my-projects', component: MyProjects },
      { path: 'settings', component: Settings },
      { path: 'notifications', component: Notifications }
    ]
  },

  { path: '**', redirectTo: '' }
];

