import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  myProjects: any[] = [
    { 
      id: 1, 
      name: 'Website Redesign', 
      description: 'Complete redesign of the company website with modern UI/UX principles and improved performance metrics.',
      status: 'Active', 
      priority: 'High',
      startDate: '2024-03-01',
      deadline: '2024-06-30',
      progress: 65,
      tasks: { total: 15, completed: 10 },
      team: ['John Smith', 'Emily Davis', 'Mike Wilson']
    },
    { 
      id: 2, 
      name: 'Mobile App Development', 
      description: 'Native mobile application for iOS and Android with core business features and push notifications.',
      status: 'Active', 
      priority: 'High',
      startDate: '2024-02-15',
      deadline: '2024-08-15',
      progress: 40,
      tasks: { total: 25, completed: 10 },
      team: ['Sarah Johnson', 'David Lee', 'You']
    },
    { 
      id: 3, 
      name: 'API Integration', 
      description: 'Integration with third-party payment and analytics APIs for the main platform.',
      status: 'Planning', 
      priority: 'Medium',
      startDate: '2024-04-01',
      deadline: '2024-05-30',
      progress: 15,
      tasks: { total: 8, completed: 1 },
      team: ['Mike Wilson', 'You']
    },
    { 
      id: 4, 
      name: 'Database Migration', 
      description: 'Migrate legacy database to new cloud infrastructure with zero downtime.',
      status: 'Completed', 
      priority: 'High',
      startDate: '2024-01-15',
      deadline: '2024-03-01',
      progress: 100,
      tasks: { total: 12, completed: 12 },
      team: ['John Smith', 'You']
    }
  ];

  filteredProjects: any[] = [];
  selectedProject: any = null;
  showDetailsModal: boolean = false;

  ngOnInit(): void {
    this.filteredProjects = [...this.myProjects];
  }

  // Statistics
  get totalProjects(): number {
    return this.myProjects.length;
  }

  get activeProjects(): number {
    return this.myProjects.filter(p => p.status === 'Active').length;
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
      const matchesStatus = this.statusFilter === 'all' || project.status === this.statusFilter;
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
      case 'Active': return 'status-active';
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
    if (progress >= 75) return '#28a745';
    if (progress >= 50) return '#ffc107';
    if (progress >= 25) return '#fd7e14';
    return '#dc3545';
  }

  getDaysRemaining(deadline: string): number {
    const today = new Date();
    const dueDate = new Date(deadline);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isOverdue(deadline: string, status: string): boolean {
    return this.getDaysRemaining(deadline) < 0 && status !== 'Completed';
  }
}
