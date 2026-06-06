import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Projectservice } from './projectservice';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit {
  constructor(private projectservice: Projectservice) {}

  // ── State ──────────────────────────────────
  searchTerm: string = '';
  statusFilter: string = 'all';
  priorityFilter: string = 'all';
  assigneeFilter: string = 'all';
  deadlineFromFilter: string = '';
  deadlineToFilter: string = '';
  projects: any[] = [];
  employees: any[] = [];
  filteredProjects: any[] = [];
  selectedProjectIds: string[] = [];
  bulkStatus = '';
  bulkPriority = '';
  isApplyingBulkAction = false;

  // ── Modal ──────────────────────────────────
  showModal = false;
  isEditing = false;
  isSaving = false;
  saveError = '';
  currentProject: any = this.getEmptyProject();

  // ── Lifecycle ──────────────────────────────
  ngOnInit(): void {
    this.loadEmployees();
    this.loadProjects();
  }

  // ── Data Loading ───────────────────────────
  loadProjects(): void {
    this.projectservice.getAllProjects({
      search: this.searchTerm.trim(),
      status: this.statusFilter,
      priority: this.priorityFilter,
      assigneeId: this.assigneeFilter,
      deadlineFrom: this.deadlineFromFilter,
      deadlineTo: this.deadlineToFilter,
    }).subscribe({
      next: (res: any) => {
        this.projects = res.data.map((p: any) => this.mapProject(p));
        this.selectedProjectIds = this.selectedProjectIds.filter(id =>
          this.projects.some(project => project._id === id)
        );
        this.filterProjects();
      },
      error: (err) => console.error('Failed to load projects', err),
    });
  }

  loadEmployees(): void {
    this.projectservice.getEmployees().subscribe({
      next: (res: any) => {
        if (!res?.data) return;
        this.employees = res.data.map((emp: any) => ({
          id: emp._id,
          _id: emp._id,
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          designation: emp.designation || 'Employee',
          empStatus: emp.empStatus || 'active',
        }));
        console.log('Employees loaded:', this.employees.length);
      },
      error: (err) => console.error('Failed to load employees', err),
    });
  }

  // Map raw backend doc → local format
  mapProject(p: any): any {
    return {
      _id: p._id,
      projectId: p.projectId,
      name: p.projectName || p.name || 'Untitled Project',
      description: p.description,
      startDate: p.startDate ? p.startDate.substring(0, 10) : '',
      deadline: p.deadline ? p.deadline.substring(0, 10) : '',
      status: p.status,
      priority: p.priority,
      progress: p.progress,
      // store array of employee _id strings for matching
      employeeIds: (p.assignees || []).map((a: any) =>
        typeof a === 'object' ? a._id : a
      ),
      createdBy: p.createdBy,
    };
  }

  // ── Helpers ────────────────────────────────
  getEmptyProject(): any {
    return {
      _id: null,
      projectId: '',
      name: '',
      description: '',
      startDate: '',
      deadline: '',
      status: 'In Progress',
      priority: 'Medium',
      progress: 0,
      employeeIds: [],
    };
  }

  getLoggedInUserId(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || user.id || '';
  }

  // ── Filter ─────────────────────────────────
  filterProjects(): void {
    this.filteredProjects = this.projects.filter((p) => {
      const matchSearch =
        (p.name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus =
        this.statusFilter === 'all' || p.status === this.statusFilter;
      const matchPriority =
        this.priorityFilter === 'all' || p.priority === this.priorityFilter;
      const matchAssignee =
        this.assigneeFilter === 'all' || (p.employeeIds || []).some(
          (id: string) => String(id) === String(this.assigneeFilter)
        );
      const projectDeadline = p.deadline ? new Date(p.deadline) : null;
      const matchDeadlineFrom = !this.deadlineFromFilter || (!!projectDeadline && projectDeadline >= new Date(this.deadlineFromFilter));
      const matchDeadlineTo = !this.deadlineToFilter || (!!projectDeadline && projectDeadline <= new Date(this.deadlineToFilter));
      return matchSearch && matchStatus && matchPriority && matchAssignee && matchDeadlineFrom && matchDeadlineTo;
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.loadProjects();
  }

  applyFilters(): void {
    this.loadProjects();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.priorityFilter = 'all';
    this.assigneeFilter = 'all';
    this.deadlineFromFilter = '';
    this.deadlineToFilter = '';
    this.loadProjects();
  }

  toggleProjectSelection(projectId: string): void {
    if (this.selectedProjectIds.includes(projectId)) {
      this.selectedProjectIds = this.selectedProjectIds.filter(id => id !== projectId);
      return;
    }
    this.selectedProjectIds = [...this.selectedProjectIds, projectId];
  }

  isProjectSelected(projectId: string): boolean {
    return this.selectedProjectIds.includes(projectId);
  }

  toggleSelectAllFiltered(): void {
    const filteredIds = this.filteredProjects.map(project => project._id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => this.selectedProjectIds.includes(id));
    this.selectedProjectIds = allSelected
      ? this.selectedProjectIds.filter(id => !filteredIds.includes(id))
      : Array.from(new Set([...this.selectedProjectIds, ...filteredIds]));
  }

  get areAllFilteredSelected(): boolean {
    return this.filteredProjects.length > 0 && this.filteredProjects.every(project => this.selectedProjectIds.includes(project._id));
  }

  applyBulkProjectUpdate(): void {
    if (!this.selectedProjectIds.length || this.isApplyingBulkAction) {
      return;
    }

    const updates: any = {};
    if (this.bulkStatus) updates.status = this.bulkStatus;
    if (this.bulkPriority) updates.priority = this.bulkPriority;

    if (!Object.keys(updates).length) {
      alert('Choose a bulk project status or priority first.');
      return;
    }

    this.isApplyingBulkAction = true;
    this.projectservice.bulkUpdateProjects(this.selectedProjectIds, updates).subscribe({
      next: () => {
        this.bulkStatus = '';
        this.bulkPriority = '';
        this.isApplyingBulkAction = false;
        this.loadProjects();
      },
      error: (err) => {
        console.error('Bulk project update failed', err);
        this.isApplyingBulkAction = false;
      },
    });
  }

  deleteSelectedProjects(): void {
    if (!this.selectedProjectIds.length || this.isApplyingBulkAction) {
      return;
    }
    if (!confirm(`Delete ${this.selectedProjectIds.length} selected projects?`)) {
      return;
    }

    this.isApplyingBulkAction = true;
    this.projectservice.bulkDeleteProjects(this.selectedProjectIds).subscribe({
      next: () => {
        this.selectedProjectIds = [];
        this.isApplyingBulkAction = false;
        this.loadProjects();
      },
      error: (err) => {
        console.error('Bulk project delete failed', err);
        this.isApplyingBulkAction = false;
      },
    });
  }

  // ── Employee helpers ───────────────────────
  getProjectEmployees(project: any): any[] {
    return this.employees.filter((emp) =>
      (project.employeeIds || []).some(
        (id: string) => String(id) === String(emp._id)
      )
    );
  }

  getAvailableEmployees(): any[] {
    return this.employees.filter(
      (emp) =>
        !(this.currentProject.employeeIds || []).some(
          (id: string) => String(id) === String(emp._id)
        )
    );
  }

  addEmployee(event: any): void {
    const empId = event.target.value;
    if (empId && !this.currentProject.employeeIds.includes(empId)) {
      this.currentProject.employeeIds.push(empId);
    }
    event.target.value = '';
  }

  removeEmployee(empId: string): void {
    this.currentProject.employeeIds = this.currentProject.employeeIds.filter(
      (id: string) => String(id) !== String(empId)
    );
  }

  // ── Modal ──────────────────────────────────
  openCreateModal(): void {
    this.isEditing = false;
    this.saveError = '';
    this.currentProject = this.getEmptyProject();
    this.showModal = true;
  }

  openEditModal(project: any): void {
    this.isEditing = true;
    this.saveError = '';
    this.currentProject = {
      ...project,
      employeeIds: [...(project.employeeIds || [])],
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.saveError = '';
    this.currentProject = this.getEmptyProject();
  }

  // ── Save (Create / Update) ─────────────────
  saveProject(): void {
    if (!this.currentProject.name || !this.currentProject.startDate || !this.currentProject.deadline) {
      this.saveError = 'Please fill in all required fields.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    const payload = {
      projectName: this.currentProject.name,
      description: this.currentProject.description,
      startDate: this.currentProject.startDate,
      deadline: this.currentProject.deadline,
      status: this.currentProject.status,
      priority: this.currentProject.priority,
      progress: this.currentProject.progress,
      assignees: this.currentProject.employeeIds,
      createdBy: this.getLoggedInUserId(),
    };

    if (this.isEditing) {
      this.projectservice.updateProject(this.currentProject._id, payload).subscribe({
        next: (res: any) => {
          // update local list
          const idx = this.projects.findIndex((p) => p._id === this.currentProject._id);
          if (idx !== -1) this.projects[idx] = this.mapProject(res.data);
          this.filterProjects();
          this.isSaving = false;
          this.closeModal();
        },
        error: (err) => {
          this.saveError = err.error?.message || 'Failed to update project.';
          this.isSaving = false;
        },
      });
    } else {
      this.projectservice.createProject(payload).subscribe({
        next: (res: any) => {
          this.projects.unshift(this.mapProject(res.data));
          this.filterProjects();
          this.isSaving = false;
          this.closeModal();
        },
        error: (err) => {
          this.saveError = err.error?.message || 'Failed to create project.';
          this.isSaving = false;
        },
      });
    }
  }

  // ── Delete ─────────────────────────────────
  deleteProject(project: any): void {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    this.projectservice.deleteProject(project._id).subscribe({
      next: () => {
        this.projects = this.projects.filter((p) => p._id !== project._id);
        this.filterProjects();
      },
      error: (err) => console.error('Delete failed', err),
    });
  }

  // ── Display helpers ────────────────────────
  getProgressColor(progress: number): string {
    if (progress >= 75) return '#28a745';
    if (progress >= 50) return '#ffc107';
    if (progress >= 25) return '#fd7e14';
    return '#dc3545';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed':   return 'status-completed';
      case 'In Progress': return 'status-progress';
      case 'On Hold':     return 'status-hold';
      default:            return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'High':   return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low':    return 'priority-low';
      default:       return '';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Stats ──────────────────────────────────
  get totalProjects(): number { return this.projects.length; }
  get completedProjects(): number { return this.projects.filter(p => p.status === 'Completed').length; }
  get inProgressProjects(): number { return this.projects.filter(p => p.status === 'In Progress').length; }
  get onHoldProjects(): number { return this.projects.filter(p => p.status === 'On Hold').length; }
}
