import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  public get currentUserValue(): any | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: any | null): void {
    this.currentUserSubject.next(user);
  }

  loadUserProfile(): Observable<any | null> {
    return this.http.get<any>(`${environment.apiUrl}/users/profile`, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.currentUserSubject.next(res.data);
        } else {
          this.currentUserSubject.next(null);
        }
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/users/login`, credentials, { withCredentials: true }).pipe(
      tap(res => {
        if (res.success && res.user) {
          if (res.token) {
            localStorage.setItem('accessToken', res.token);
          }
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/users/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        localStorage.removeItem('accessToken');
        this.currentUserSubject.next(null);
      }),
      catchError((err) => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }
}
