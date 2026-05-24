import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Projectservice } from '../manager/projects/projectservice';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css',
})
export class ManagerDashboard implements OnInit {
  constructor(
    private router: Router, 
    private projectservice: Projectservice,
    private http: HttpClient
  ) {}

  // Manager Info
  managerName: string = 'Manager';
  managerAvatar: string = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  unreadCount: number = 0;

  // Real Data
  employees: any[] = [];
  projects: any[] = [];

  // Tasks Data (Recent)
  recentTasks: any[] = [];

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.firstName) {
      this.managerName = `${user.firstName} ${user.lastName}`;
    }
    if (user.avatar) {
      this.managerAvatar = user.avatar;
    }
    this.loadManagerProfile();
    this.loadUnreadCount();
    this.loadData();
  }

  loadManagerProfile(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/users/profile`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const user = res.data;
          this.managerName = `${user.firstName} ${user.lastName}`;
          if (user.avatar) {
            this.managerAvatar = user.avatar;
          }

          // Save loaded user with settings to localStorage
          const localUser = JSON.parse(localStorage.getItem('user') || '{}');
          localUser.avatar = user.avatar || localUser.avatar;
          localUser.firstName = user.firstName || localUser.firstName;
          localUser.lastName = user.lastName || localUser.lastName;
          if (user.settings) {
            localUser.settings = user.settings;
          }
          localStorage.setItem('user', JSON.stringify(localUser));
        }
      },
      error: (err) => console.error('Error fetching manager profile', err)
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

  loadData(): void {
    this.projectservice.getAllProjects().subscribe({
      next: (projRes: any) => {
        this.projects = projRes.data || [];
        
        this.projectservice.getEmployees().subscribe({
          next: (empRes: any) => {
            const rawEmployees = empRes.data || [];
            this.employees = rawEmployees.map((emp: any) => {
              // Calculate how many projects this employee is assigned to
              const assignedProjects = this.projects.filter(p => 
                (p.assignees || []).some((a: any) => String(a._id || a) === String(emp._id))
              );
              
              const projCount = assignedProjects.length;
              let workload = 'Low';
              if (projCount > 2) workload = 'High';
              else if (projCount > 0) workload = 'Medium';

              return {
                id: emp._id, // Use string _id
                name: `${emp.firstName} ${emp.lastName}`,
                role: emp.designation || 'Employee',
                tasksAssigned: 0, // No backend for tasks yet
                workload: workload,
                projectIds: assignedProjects.map(p => p._id),
                empStatus: emp.empStatus
              };
            });
          },
          error: err => console.error('Error fetching employees', err)
        });

        // Load Tasks
        this.projectservice.getAllTasks().subscribe({
          next: (taskRes: any) => {
            this.recentTasks = (taskRes.data || []).map((t: any) => {
              const projectId = t.projectId && typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
              const assignedTo = t.assignedTo && typeof t.assignedTo === 'object' ? t.assignedTo._id : t.assignedTo;
              return { ...t, projectId, assignedTo };
            });
            
            // Recalculate tasksAssigned for employees now that we have tasks
            this.employees = this.employees.map(emp => {
              const assignedTaskCount = this.recentTasks.filter(t => 
                String(t.assignedTo) === String(emp.id)
              ).length;
              return { ...emp, tasksAssigned: assignedTaskCount };
            });
          },
          error: err => console.error('Error fetching tasks', err)
        });
      },
      error: err => console.error('Error fetching projects', err)
    });
  }

  // Statistics
  get totalProjects(): number {
    return this.projects.length;
  }

  get totalTasks(): number {
    return this.recentTasks.length;
  }

  get inProgressTasks(): number {
    return this.recentTasks.filter(t => t.status === 'In Progress').length;
  }

  get completedTasks(): number {
    return this.recentTasks.filter(t => t.status === 'Completed').length;
  }

  get totalEmployees(): number {
    return this.employees.length;
  }

  // Get project name by ID
  getProjectName(projectId: string | number): string {
    const project = this.projects.find(p => p._id === projectId || p.id === projectId);
    return project ? (project.projectName || project.name) : 'Unknown';
  }

  // Get employee name by ID
  getEmployeeName(employeeId: string | number): string {
    const employee = this.employees.find(e => e.id === employeeId || e._id === employeeId);
    return employee ? employee.name : 'Unassigned';
  }

  // Progress color
  getProgressColor(progress: number): string {
    if (progress >= 75) return '#28a745';
    if (progress >= 50) return '#ffc107';
    if (progress >= 25) return '#fd7e14';
    return '#dc3545';
  }

  // Workload color
  getWorkloadClass(workload: string): string {
    switch (workload) {
      case 'High': return 'workload-high';
      case 'Medium': return 'workload-medium';
      case 'Low': return 'workload-low';
      default: return '';
    }
  }

  // Status class
  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-progress';
      case 'On Hold': return 'status-hold';
      default: return '';
    }
  }

  // Task status class
  getTaskStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'task-completed';
      case 'In Progress': return 'task-progress';
      case 'To Do': return 'task-todo';
      default: return '';
    }
  }

  // Priority class
  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  }

  logout(): void {
    this.router.navigate(['/']);
  }
}
