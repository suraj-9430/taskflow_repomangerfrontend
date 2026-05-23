import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-my-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-projects.html',
  styleUrl: './my-projects.css',
})
export class MyProjects implements OnInit {
  // Filters
  searchTerm: string = '';
  statusFilter: string = 'all';

  // Projects assigned to this employee
  myProjects: any[] = [];
  filteredProjects: any[] = [];
  selectedProject: any = null;
  showDetailsModal: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchMyProjects();
  }

  fetchMyProjects(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${environment.apiUrl}/projects`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            const activeUserId = user.id;

            this.myProjects = res.data.filter((p: any) => 
              p.assignees && p.assignees.some((a: any) => a._id === activeUserId)
            ).map((p: any) => ({
              id: p._id,
              name: p.projectName,
              description: p.description || 'No description provided.',
              status: p.status || 'Active',
              priority: p.priority || 'Medium',
              startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : 'N/A',
              deadline: p.deadline ? new Date(p.deadline).toISOString().split('T')[0] : 'N/A',
              progress: p.progress || 0,
              tasks: { total: 0, completed: 0 }, // Will load dynamically
              team: p.assignees ? p.assignees.map((a: any) => `${a.firstName} ${a.lastName}`) : []
            }));

            // Dynamically query task completions ratios and repaint progress!
            this.fetchTaskCounts();
          }
        }
      },
      error: (err) => {
        console.error('Failed to fetch projects', err);
      }
    });
  }

  fetchTaskCounts(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${environment.apiUrl}/tasks`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const allTasks = res.data;
          this.myProjects.forEach(proj => {
            const projTasks = allTasks.filter((t: any) => t.projectId && t.projectId._id === proj.id);
            const total = projTasks.length;
            const completed = projTasks.filter((t: any) => t.status === 'Completed').length;
            proj.tasks = { total, completed };
            
            // Recalculate progress dynamically based on completed tasks ratio
            if (total > 0) {
              proj.progress = Math.round((completed / total) * 100);
            } else {
              proj.progress = 0;
            }
          });
          this.filterProjects();
        }
      },
      error: (err) => {
        console.error('Failed to fetch task counts', err);
        this.filterProjects();
      }
    });
  }

  // Statistics
  get totalProjects(): number {
    return this.myProjects.length;
  }

  get activeProjects(): number {
    return this.myProjects.filter(p => p.status === 'Active' || p.status === 'In Progress').length;
  }

  get completedProjects(): number {
    return this.myProjects.filter(p => p.status === 'Completed').length;
  }

  get planningProjects(): number {
    return this.myProjects.filter(p => p.status === 'Planning').length;
  }

  // Filter projects
  filterProjects(): void {
    this.filteredProjects = this.myProjects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           project.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      let matchesStatus = false;
      if (this.statusFilter === 'all') {
        matchesStatus = true;
      } else if (this.statusFilter === 'Active') {
        matchesStatus = project.status === 'Active' || project.status === 'In Progress';
      } else {
        matchesStatus = project.status === this.statusFilter;
      }
      
      return matchesSearch && matchesStatus;
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.filterProjects();
  }

  // View project details
  viewDetails(project: any): void {
    this.selectedProject = project;
    this.showDetailsModal = true;
  }

  closeModal(): void {
    this.showDetailsModal = false;
    this.selectedProject = null;
  }

  // Helper methods
  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'Active':
      case 'In Progress': return 'status-active';
      case 'Planning': return 'status-planning';
      case 'On Hold': return 'status-hold';
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

  getProgressColor(progress: number): string {
    if (progress >= 75) return 'var(--color-success)';
    if (progress >= 50) return 'var(--accent)';
    if (progress >= 25) return 'var(--color-info)';
    return 'var(--color-danger)';
  }

  getDaysRemaining(deadline: string): number {
    if (deadline === 'N/A') return 0;
    const today = new Date();
    const dueDate = new Date(deadline);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isOverdue(deadline: string, status: string): boolean {
    if (deadline === 'N/A' || status === 'Completed') return false;
    return this.getDaysRemaining(deadline) < 0;
  }
}
