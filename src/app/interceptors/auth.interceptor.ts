import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const token = localStorage.getItem('token');

  let authReq = req;

  // Add authorization header if token exists and not already set manually
  if (token && !req.headers.has('Authorization')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Force withCredentials on refresh-token and API endpoints so cookies are passed
  if (req.url.includes('/users/refresh-token') || req.url.includes('/users/logout')) {
    authReq = authReq.clone({
      withCredentials: true
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Intercept 401 Unauthorized errors but not on login or refresh itself
      if (error.status === 401 && !req.url.includes('/users/login') && !req.url.includes('/users/refresh-token')) {
        return handle401Error(authReq, next, http, router);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(request: HttpRequest<any>, next: HttpHandlerFn, http: HttpClient, router: Router): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return http.post(`${environment.apiUrl}/users/refresh-token`, {}, { withCredentials: true }).pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        const newToken = res.token;
        localStorage.setItem('token', newToken);
        refreshTokenSubject.next(newToken);

        // Retry original request with new token
        return next(request.clone({
          setHeaders: {
            Authorization: `Bearer ${newToken}`
          }
        }));
      }),
      catchError((err) => {
        isRefreshing = false;
        // Refresh token expired or revoked, clean local storage and go to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.navigate(['/']);
        return throwError(() => err);
      })
    );
  } else {
    // Wait for the active refresh token request to finish
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => {
        return next(request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        }));
      })
    );
  }
}
