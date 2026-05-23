import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-tasks.html',
  styleUrl: './my-tasks.css',
})
export class MyTasks implements OnInit {
  // Filter
  searchTerm: string = '';
  statusFilter: string = 'all';
  priorityFilter: string = 'all';
  
  // Tasks assigned to this employee
  myTasks: any[] = [];
  filteredTasks: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchMyTasks();
  }

  fetchMyTasks(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${environment.apiUrl}/tasks`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            const activeUserId = user.id;

            // Filter tasks assigned to the logged-in user
            this.myTasks = res.data.filter((t: any) => t.assignedTo && t.assignedTo._id === activeUserId)
              .map((t: any) => ({
                id: t._id,
                title: t.title,
                description: t.description || 'No description provided.',
                projectName: t.projectId ? t.projectId.projectName : 'Unassigned Project',
                projectId: t.projectId ? t.projectId._id : null,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'N/A',
                createdDate: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : 'N/A'
              }));

            this.filterTasks();
          }
        }
      },
      error: (err) => {
        console.error('Failed to fetch tasks', err);
      }
    });
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

  // Filter tasks
  filterTasks(): void {
    this.filteredTasks = this.myTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           task.projectName.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.statusFilter === 'all' || task.status === this.statusFilter;
      const matchesPriority = this.priorityFilter === 'all' || task.priority === this.priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.filterTasks();
  }

  // Status change handler - save to database!
  onStatusChange(task: any): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.put<any>(`${environment.apiUrl}/tasks/${task.id}`, { status: task.status }, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          console.log(`Task "${task.title}" status updated to: ${task.status}`);
          this.filterTasks();
        }
      },
      error: (err) => {
        console.error('Failed to update task status in database', err);
      }
    });
  }

  // Helper methods
  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-progress';
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

  isOverdue(dueDate: string, status: string): boolean {
    if (dueDate === 'N/A' || status === 'Completed') return false;
    return new Date(dueDate) < new Date();
  }
}
