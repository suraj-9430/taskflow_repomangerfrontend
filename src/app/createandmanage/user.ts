import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private http: HttpClient) {

  }
  createuser(user: any) {
    return this.http.post('http://localhost:5000/api/users', user);
  }
  
  updateRole(userId: string, role: string) {
    return this.http.put(`http://localhost:5000/api/users/${userId}`, { role });
  }

  updateStatus(userId: string, empStatus: string) {
    return this.http.put(`http://localhost:5000/api/users/${userId}`, { empStatus });
  }

  // private deleteuser(user:any){
  //   return this.http.delete('http://localhost:5000/users',user);
  // }

  fetchUsers(page: number) {
    return this.http.get(`http://localhost:5000/api/users/fetchuserlimit?page=${page}&limit=5`);
  }

  countuser(role:string){
    return this.http.get(`http://localhost:5000/api/users/countuserbyrole?role=${role}`);
  }
  
  countactivveusers(){
    return this.http.get('http://localhost:5000/api/users/countactiveusers?empStatus=active');
  }   

  // getuser() {
  //   return this.http.get('http://localhost:5000/api/users');
  // }
  getuserbyid(id: number) {
    return this.http.get('http://localhost:5000/api/users/' + id);
  }

}
