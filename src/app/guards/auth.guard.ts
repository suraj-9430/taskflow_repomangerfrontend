import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const checkUserAndRole = (user: any): boolean => {
    if (!user) {
      router.navigate(['/']);
      return false;
    }

    const url = state.url;
    const role = user.role.toLowerCase();

    if (url.startsWith('/dashboard') && role !== 'admin') {
      router.navigate(['/']);
      return false;
    }

    if (url.startsWith('/manager-dashboard') && role !== 'manager') {
      router.navigate(['/']);
      return false;
    }

    if (url.startsWith('/employee-dashboard') && role !== 'employee') {
      router.navigate(['/']);
      return false;
    }

    return true;
  };

  const currentUser = authService.currentUserValue;
  if (currentUser) {
    return checkUserAndRole(currentUser);
  }

  return authService.loadUserProfile().pipe(
    map((user) => checkUserAndRole(user))
  );
};
