import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  createuser(user: any) {
    return this.http.post(`${environment.apiUrl}/users`, user, this.getHeaders());
  }
  
  updateRole(userId: string, role: string) {
    return this.http.put(`${environment.apiUrl}/users/${userId}`, { role }, this.getHeaders());
  }

  updateStatus(userId: string, empStatus: string) {
    return this.http.put(`${environment.apiUrl}/users/${userId}`, { empStatus }, this.getHeaders());
  }

  fetchUsers(page: number) {
    return this.http.get(`${environment.apiUrl}/users/fetchuserlimit?page=${page}&limit=5`, this.getHeaders());
  }

  countuser(role: string) {
    return this.http.get(`${environment.apiUrl}/users/countuserbyrole?role=${role}`, this.getHeaders());
  }
  
  countactivveusers() {
    return this.http.get(`${environment.apiUrl}/users/countactiveusers?empStatus=active`, this.getHeaders());
  }   

  getuserbyid(id: number) {
    return this.http.get(`${environment.apiUrl}/users/` + id, this.getHeaders());
  }
}
