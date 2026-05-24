import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../createandmanage/user';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  totaluser: number=0
  totalmanager!: number
  totaladmin!: number
  totalemployee!: number
  totalactive!: number
  recentUsers: any[] = []

  adminName: string = 'Admin';
  adminAvatar: string = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  unreadCount: number = 0;

  constructor(
    private router: Router, 
    private user: UserService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (localUser.firstName) {
      this.adminName = `${localUser.firstName} ${localUser.lastName}`;
    }
    if (localUser.avatar) {
      this.adminAvatar = localUser.avatar;
    }
    this.loadAdminProfile();
    this.loadUnreadCount();
    this.loadUsers();
    this.user.countactivveusers().subscribe((res: any) => {
      this.totalactive = res['count'];
    });
    this.user.countuser('manager').subscribe((res: any) => {
      this.totalmanager = res['count'];
      this.totaluser += Number(this.totalmanager);
    });
    this.user.countuser('admin').subscribe((res: any) => {
      this.totaladmin = res['count'];
      this.totaluser += Number(this.totaladmin);
    });
    this.user.countuser('employee').subscribe((res: any) => {
      this.totalemployee = res['count'];
      this.totaluser += Number(this.totalemployee);
    });
    
  }

  loadAdminProfile(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/users/profile`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const user = res.data;
          this.adminName = `${user.firstName} ${user.lastName}`;
          if (user.avatar) {
            this.adminAvatar = user.avatar;
          }
        }
      },
      error: (err) => console.error('Error fetching admin profile', err)
    });
  }

  loadUnreadCount(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/notifications`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.unreadCount = res.data.filter((n: any) => !n.isRead).length;
        }
      },
      error: (err) => console.error('Error fetching unread count', err)
    });
  }


  page = 1;
  totalPages = 0;


  loadUsers() {
    this.user.fetchUsers(this.page).subscribe((res: any) => {
      this.recentUsers = res.users;
      this.totalPages = res.totalPages;
    });
  }

  next() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadUsers();
    }
  }

  prev() {
    if (this.page > 1) {
      this.page--;
      this.loadUsers();
    }
  }





  handleaction(option: any) {
    if (option === 'back') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/dashboard/action'], { queryParams: { option } });
    }
  }





  // Edit user - navigate to create form with user data
  editUser(user: any): void {
    this.router.navigate(['/dashboard/action'], {
      queryParams: {
        option: 'edit',
        userId: user._id
      }
    });
  }

  // Delete user method
  deleteUser(user: any): void {
    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      this.recentUsers = this.recentUsers.filter(u => u.id !== user.id);
      console.log('User deleted:', user);
    }
  }
}
