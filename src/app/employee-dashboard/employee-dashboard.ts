import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Projectservice } from '../manager/projects/projectservice';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css',
})
export class EmployeeDashboard implements OnInit {
  constructor(
    private router: Router, 
    private projectservice: Projectservice,
    private http: HttpClient
  ) {}

  // Current Employee Info
  currentEmployee: any = {};
  unreadCount: number = 0;

  // Projects assigned to this employee
  myProjects: any[] = [];

  // Tasks assigned to this employee
  myTasks: any[] = [];

  // Filter
  statusFilter: string = 'all';
  filteredTasks: any[] = [];

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.currentEmployee = {
      id: user._id || user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.designation || 'Employee',
      department: 'Engineering', 
      phone: user.phone || '+1 234-567-8901',
      joinDate: user.createdAt || new Date().toISOString(),
      avatar: user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U',
      avatarUrl: user.avatar || ''
    };
    
    this.loadEmployeeProfile();
    this.loadUnreadCount();
    this.loadData();
  }

  loadEmployeeProfile(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/users/profile`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const user = res.data;
          this.currentEmployee.name = `${user.firstName} ${user.lastName}`;
          this.currentEmployee.email = user.email;
          this.currentEmployee.phone = user.contactNumber || '';
          this.currentEmployee.role = user.designation || 'Employee';
          this.currentEmployee.department = user.department || 'Engineering';
          this.currentEmployee.avatar = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U';
          this.currentEmployee.avatarUrl = user.avatar || '';
        }
      },
      error: (err) => console.error('Error fetching employee profile', err)
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
    // Load Projects
    this.projectservice.getAllProjects().subscribe({
      next: (res: any) => {
        const allProjects = res.data || [];
        // Filter projects where I am assigned
        this.myProjects = allProjects.filter((p: any) => 
          (p.assignees || []).some((a: any) => String(a._id || a) === String(this.currentEmployee.id))
        );

        // Load Tasks
        this.projectservice.getAllTasks().subscribe({
          next: (taskRes: any) => {
            const allTasks = taskRes.data || [];
            // Filter tasks where I am assigned
            this.myTasks = allTasks.filter((t: any) => 
              String(t.assignedTo?._id || t.assignedTo) === String(this.currentEmployee.id)
            ).map((t: any) => {
              // Normalize ids for frontend use
              const projectId = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
              return { ...t, projectId, _id: t._id };
            });
            this.filterTasks(this.statusFilter);
          },
          error: err => console.error('Error fetching tasks', err)
        });
      },
      error: err => console.error('Error fetching projects', err)
    });
  }

  getProjectName(projectId: string): string {
    const p = this.myProjects.find(proj => proj._id === projectId || proj.id === projectId);
    return p ? p.projectName || p.name : 'Unknown';
  }

  getProjectTasksCount(projectId: string): number {
    return this.myTasks.filter(t => t.projectId === projectId).length;
  }

  // Statistics
  get totalTasks(): number {
    return this.myTasks.length;
  }

  get todoTasks(): number {
    return this.myTasks.filter(t => t.status === 'To Do').length;
  }

  get inProgressTasks(): number {
    return this.myTasks.filter(t => t.status === 'In Progress').length;
  }

  get completedTasks(): number {
    return this.myTasks.filter(t => t.status === 'Completed').length;
  }

  get totalProjects(): number {
    return this.myProjects.length;
  }

  get completionRate(): number {
    if (this.totalTasks === 0) return 0;
    return Math.round((this.completedTasks / this.totalTasks) * 100);
  }

  // Filter tasks
  filterTasks(status: string): void {
    this.statusFilter = status;
    if (status === 'all') {
      this.filteredTasks = [...this.myTasks];
    } else {
      this.filteredTasks = this.myTasks.filter(t => t.status === status);
    }
  }

  // Called when status dropdown changes
  onStatusChange(task: any): void {
    // Status is already updated via ngModel binding
    // Re-filter if needed to update the view
    if (this.statusFilter !== 'all' && task.status !== this.statusFilter) {
      this.filteredTasks = this.filteredTasks.filter(t => t._id !== task._id);
    }
    
    // Call backend to update status
    this.projectservice.updateTask(task._id, { status: task.status }).subscribe({
      next: () => console.log(`Task updated to ${task.status}`),
      error: err => console.error('Error updating task status', err)
    });
    console.log(`Task "${task.title}" status changed to: ${task.status}`);
  }

  // Update task status
  updateTaskStatus(task: any, newStatus: string): void {
    const index = this.myTasks.findIndex(t => t._id === task._id);
    if (index !== -1) {
      this.myTasks[index].status = newStatus;
      this.filterTasks(this.statusFilter);
      
      this.projectservice.updateTask(task._id, { status: newStatus }).subscribe({
        next: () => console.log('Task status updated successfully'),
        error: err => console.error('Error updating task status', err)
      });
    }
  }

  // Move task to next status
  moveToNextStatus(task: any): void {
    if (task.status === 'To Do') {
      this.updateTaskStatus(task, 'In Progress');
    } else if (task.status === 'In Progress') {
      this.updateTaskStatus(task, 'Completed');
    }
  }

  // Move task to previous status
  moveToPreviousStatus(task: any): void {
    if (task.status === 'In Progress') {
      this.updateTaskStatus(task, 'To Do');
    } else if (task.status === 'Completed') {
      this.updateTaskStatus(task, 'In Progress');
    }
  }

  // Get tasks by status for Kanban
  getTasksByStatus(status: string): any[] {
    return this.myTasks.filter(t => t.status === status);
  }

  // Helper methods
  getProgressColor(progress: number): string {
    if (progress >= 75) return '#28a745';
    if (progress >= 50) return '#ffc107';
    if (progress >= 25) return '#fd7e14';
    return '#dc3545';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-progress';
      case 'On Hold': return 'status-hold';
      case 'To Do': return 'status-todo';
      default: return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }

  logout(): void {
    this.router.navigate(['/']);
  }
}
