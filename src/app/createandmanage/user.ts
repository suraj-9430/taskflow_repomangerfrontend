import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private http: HttpClient) {

  }
  createuser(user: any) {
    return this.http.post(`${environment.apiUrl}/users`, user);
  }
  
  updateRole(userId: string, role: string) {
    return this.http.put(`${environment.apiUrl}/users/${userId}`, { role });
  }

  updateStatus(userId: string, empStatus: string) {
    return this.http.put(`${environment.apiUrl}/users/${userId}`, { empStatus });
  }

  // private deleteuser(user:any){
  //   return this.http.delete(`${environment.apiUrl}/users`,user);
  // }

  fetchUsers(page: number) {
    return this.http.get(`${environment.apiUrl}/users/fetchuserlimit?page=${page}&limit=5`);
  }

  countuser(role:string){
    return this.http.get(`${environment.apiUrl}/users/countuserbyrole?role=${role}`);
  }
  
  countactivveusers(){
    return this.http.get(`${environment.apiUrl}/users/countactiveusers?empStatus=active`);
  }   

  // getuser() {
  //   return this.http.get(`${environment.apiUrl}/users`);
  // }
  getuserbyid(id: number) {
    return this.http.get(`${environment.apiUrl}/users/` + id);
  }

}
