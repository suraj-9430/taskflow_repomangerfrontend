import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Projectservice } from '../projects/projectservice';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css',
})
export class Tasks implements OnInit {
  constructor(private projectservice: Projectservice) {}
  // Search and Filter
  searchTerm: string = '';
  statusFilter: string = 'all';
  projectFilter: string = 'all';
  employeeFilter: string = 'all';

  // Real Data
  projects: any[] = [];
  employees: any[] = [];

  // Tasks Data
  tasks: any[] = [];

  filteredTasks: any[] = [];

  // Modal
  showModal: boolean = false;
  isEditing: boolean = false;
  currentTask: any = this.getEmptyTask();

  ngOnInit(): void {
    this.filteredTasks = [...this.tasks];
    this.loadData();
  }

  getLoggedInUserId(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || user.id || '';
  }

  loadData(): void {
    // Load real tasks
    this.projectservice.getAllTasks().subscribe({
      next: (res: any) => {
        this.tasks = res.data.map((t: any) => {
          // Normalize IDs to strings since they might come back as full populated objects
          const projectId = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
          const assignedTo = typeof t.assignedTo === 'object' && t.assignedTo ? t.assignedTo._id : t.assignedTo;
          return { ...t, projectId, assignedTo };
        });
        this.filterTasks();
      },
      error: err => console.error('Error fetching tasks', err)
    });
    // Load real projects
    this.projectservice.getAllProjects().subscribe({
      next: (res: any) => {
        this.projects = res.data || [];
      },
      error: err => console.error('Error fetching projects', err)
    });

    // Load real employees
    this.projectservice.getEmployees().subscribe({
      next: (res: any) => {
        this.employees = res.data || [];
      },
      error: err => console.error('Error fetching employees', err)
    });
  }

  getEmptyTask(): any {
    return {
      _id: null,
      title: '',
      description: '',
      projectId: null,
      assignedTo: null,
      status: 'To Do',
      priority: 'Medium',
      dueDate: '',
      createdBy: this.getLoggedInUserId(),
      createdDate: new Date().toISOString().split('T')[0]
    };
  }

  // Filter tasks
  filterTasks(): void {
    this.filteredTasks = this.tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.statusFilter === 'all' || task.status === this.statusFilter;
      const matchesProject = this.projectFilter === 'all' || String(task.projectId) === String(this.projectFilter);
      const matchesEmployee = this.employeeFilter === 'all' || String(task.assignedTo) === String(this.employeeFilter);
      return matchesSearch && matchesStatus && matchesProject && matchesEmployee;
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.filterTasks();
  }

  // Get project name
  getProjectName(projectId: string | number): string {
    const project = this.projects.find(p => p._id === projectId || p.id === projectId);
    return project ? (project.projectName || project.name) : 'Unknown';
  }

  // Get employee name
  getEmployeeName(employeeId: string | number): string {
    const employee = this.employees.find(e => e._id === employeeId || e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unassigned';
  }

  // Get employee object
  getEmployee(employeeId: string | number): any {
    return this.employees.find(e => e._id === employeeId || e.id === employeeId);
  }

  // Get employees assigned to the current project
  getAvailableAssignees(): any[] {
    if (!this.currentTask.projectId) {
      return this.employees;
    }
    const project = this.projects.find(p => p._id === this.currentTask.projectId);
    if (!project || !project.assignees) {
      return [];
    }
    const assigneeIds = project.assignees.map((a: any) => a._id || a);
    return this.employees.filter(emp => assigneeIds.includes(emp._id));
  }

  // Modal operations
  openCreateModal(): void {
    this.isEditing = false;
    this.currentTask = this.getEmptyTask();
    this.showModal = true;
  }

  openEditModal(task: any): void {
    this.isEditing = true;
    this.currentTask = { ...task };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.currentTask = this.getEmptyTask();
  }

  saveTask(): void {
    if (!this.currentTask.title || !this.currentTask.projectId) {
      alert('Title and Project are required');
      return;
    }

    const payload = {
      ...this.currentTask,
      createdBy: this.currentTask.createdBy || this.getLoggedInUserId()
    };

    if (this.isEditing) {
      this.projectservice.updateTask(this.currentTask._id, payload).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
        },
        error: err => console.error('Error updating task', err)
      });
    } else {
      this.projectservice.createTask(payload).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
        },
        error: err => console.error('Error creating task', err)
      });
    }
  }

  deleteTask(task: any): void {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.projectservice.deleteTask(task._id).subscribe({
        next: () => {
          this.loadData();
        },
        error: err => console.error('Error deleting task', err)
      });
    }
  }

  // Update task status (drag-drop simulation)
  updateStatus(task: any, newStatus: string): void {
    task.status = newStatus;
    this.projectservice.updateTask(task._id, { status: newStatus }).subscribe({
      next: () => {
        this.loadData();
      },
      error: err => console.error('Error updating task status', err)
    });
  }

  // Helper methods
  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-progress';
      case 'To Do': return 'status-todo';
      default: return '';
    }
  }

  // Statistics
  get totalTasks(): number {
    return this.tasks.length;
  }

  get todoTasks(): number {
    return this.tasks.filter(t => t.status === 'To Do').length;
  }

  get inProgressTasks(): number {
    return this.tasks.filter(t => t.status === 'In Progress').length;
  }

  get completedTasks(): number {
    return this.tasks.filter(t => t.status === 'Completed').length;
  }

  // Get tasks by status for Kanban view
  getTasksByStatus(status: string): any[] {
    return this.filteredTasks.filter(t => t.status === status);
  }
}
