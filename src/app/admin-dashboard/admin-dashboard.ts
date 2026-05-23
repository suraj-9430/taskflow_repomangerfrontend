import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../createandmanage/user';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(private router: Router, private user: UserService) { }
  ngOnInit(): void {
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
