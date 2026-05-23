import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  myTasks: any[] = [
    { id: 1, title: 'Implement User Authentication', description: 'Set up JWT authentication system with login/logout functionality', projectId: 2, projectName: 'Mobile App Development', status: 'In Progress', priority: 'High', dueDate: '2024-04-15', createdDate: '2024-04-01' },
    { id: 2, title: 'API Documentation', description: 'Document all REST API endpoints with examples and response formats', projectId: 1, projectName: 'Website Redesign', status: 'To Do', priority: 'Low', dueDate: '2024-05-01', createdDate: '2024-04-10' },
    { id: 3, title: 'Performance Optimization', description: 'Optimize website loading speed and reduce bundle size by 40%', projectId: 1, projectName: 'Website Redesign', status: 'To Do', priority: 'Medium', dueDate: '2024-05-15', createdDate: '2024-04-18' },
    { id: 4, title: 'Fix Login Bug', description: 'Users unable to login with special characters in password - critical fix needed', projectId: 2, projectName: 'Mobile App Development', status: 'In Progress', priority: 'High', dueDate: '2024-04-12', createdDate: '2024-04-10' },
    { id: 5, title: 'Dashboard UI Updates', description: 'Update dashboard with new design mockups from the design team', projectId: 1, projectName: 'Website Redesign', status: 'Completed', priority: 'Medium', dueDate: '2024-04-08', createdDate: '2024-04-01' },
    { id: 6, title: 'Unit Test Coverage', description: 'Increase unit test coverage to 80% for core modules', projectId: 2, projectName: 'Mobile App Development', status: 'To Do', priority: 'Medium', dueDate: '2024-05-20', createdDate: '2024-04-15' },
    { id: 7, title: 'Database Query Optimization', description: 'Optimize slow database queries identified in performance audit', projectId: 1, projectName: 'Website Redesign', status: 'Completed', priority: 'High', dueDate: '2024-04-05', createdDate: '2024-03-28' },
  ];

  filteredTasks: any[] = [];

  ngOnInit(): void {
    this.filteredTasks = [...this.myTasks];
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

  // Status change handler
  onStatusChange(task: any): void {
    console.log(`Task "${task.title}" status changed to: ${task.status}`);
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
    return new Date(dueDate) < new Date() && status !== 'Completed';
  }
}
