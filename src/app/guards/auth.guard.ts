import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  const userJson = localStorage.getItem('user');
  
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      
      // Basic Role checking based on route path
      const url = state.url;
      const role = user.role.toLowerCase();
      
      if (url.startsWith('/dashboard') && role !== 'admin') {
        router.navigate(['/']); // Not authorized for admin dashboard
        return false;
      }
      
      if (url.startsWith('/manager-dashboard') && role !== 'manager') {
        router.navigate(['/']); // Not authorized for manager dashboard
        return false;
      }
      
      if (url.startsWith('/employee-dashboard') && role !== 'employee') {
        router.navigate(['/']); // Not authorized for employee dashboard
        return false;
      }

      return true; // Authenticated and role is appropriate (or no specific role enforced)
    } catch (e) {
      localStorage.removeItem('user');
      router.navigate(['/']);
      return false;
    }
  }

  // Not logged in
  router.navigate(['/']);
  return false;
};
