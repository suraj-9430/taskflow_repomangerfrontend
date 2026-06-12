import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<boolean | null> = new BehaviorSubject<boolean | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const authService = inject(AuthService);

  // Set withCredentials globally so HttpOnly cookies are automatically sent (for refresh token)
  // Also attach the access token from localStorage for cross-domain requests
  const token = localStorage.getItem('accessToken');
  const authReq = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {}
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Intercept 401 Unauthorized errors but not on login or refresh itself
      if (error.status === 401 && !req.url.includes('/users/login') && !req.url.includes('/users/refresh-token')) {
        return handle401Error(authReq, next, http, router, authService);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(request: HttpRequest<any>, next: HttpHandlerFn, http: HttpClient, router: Router, authService: AuthService): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return http.post<any>(`${environment.apiUrl}/users/refresh-token`, {}, { withCredentials: true }).pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(true);

        if (res && res.token) {
          localStorage.setItem('accessToken', res.token);
        }

        const newToken = localStorage.getItem('accessToken');
        return next(request.clone({
          withCredentials: true,
          setHeaders: newToken ? { Authorization: `Bearer ${newToken}` } : {}
        }));
      }),
      catchError((err) => {
        isRefreshing = false;
        // Refresh token expired or revoked, clear memory auth state and redirect to login
        authService.setCurrentUser(null);
        router.navigate(['/']);
        return throwError(() => err);
      })
    );
  } else {
    // Wait for the active refresh token request to finish
    return refreshTokenSubject.pipe(
      filter(success => success !== null),
      take(1),
      switchMap(() => {
        const currentToken = localStorage.getItem('accessToken');
        return next(request.clone({
          withCredentials: true,
          setHeaders: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
        }));
      })
    );
  }
}
