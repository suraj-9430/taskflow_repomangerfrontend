import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { UserPreferences } from 'typescript';
import { UserService } from '../createandmanage/user';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass, CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout implements OnInit {
  isSidebarHidden = false;
  isManagerView = false;
  isEmployeeView = false;
  isAdminView = false;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.checkRoute();
    this.router.events.subscribe(() => {
      this.checkRoute();
    });
    
  }

  checkRoute(): void {
    const url = this.router.url;
    this.isManagerView = url.includes('manager-dashboard');
    this.isEmployeeView = url.includes('employee-dashboard');
    this.isAdminView = !this.isManagerView && !this.isEmployeeView;
  }

  toggleSidebar() {
    this.isSidebarHidden = !this.isSidebarHidden;
  }

  logout(): void {
    this.http.post('https://taskflow-repomanger.onrender.com/api/users/logout', {}, { withCredentials: true }).subscribe({
      next: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Logout failed', err);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        this.router.navigate(['/']);
      }
    });
  }
}
