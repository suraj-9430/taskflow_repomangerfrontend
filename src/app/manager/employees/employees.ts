import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Projectservice } from '../projects/projectservice';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.html',
  styleUrl: './employees.css',
})
export class Employees implements OnInit {
  constructor(private projectservice: Projectservice) {}
  // Search and Filter
  searchTerm: string = '';
  roleFilter: string = 'all';
  workloadFilter: string = 'all';

  // Real Data
  projects: any[] = [];
  employees: any[] = [];

  filteredEmployees: any[] = [];
  selectedEmployee: any = null;
  showDetailModal: boolean = false;

  ngOnInit(): void {
    this.loadData();
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

              return {
                id: emp._id,
                _id: emp._id,
                name: `${emp.firstName} ${emp.lastName}`,
                email: emp.email,
                role: emp.designation || 'Employee',
                department: 'Not Specified', // Default, update if backend provides
                phone: 'Not Specified',
                joinDate: emp.createdAt,
                status: emp.empStatus === 'active' ? 'Active' : 'Inactive',
                projectIds: assignedProjects.map(p => p._id)
              };
            });
            this.filteredEmployees = [...this.employees];
          },
          error: err => console.error('Error fetching employees', err)
        });
      },
      error: err => console.error('Error fetching projects', err)
    });
  }

  // Filter employees
  filterEmployees(): void {
    this.filteredEmployees = this.employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           emp.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesRole = this.roleFilter === 'all' || emp.role === this.roleFilter;
      const matchesWorkload = this.workloadFilter === 'all' || this.getWorkloadLevel(emp) === this.workloadFilter;
      return matchesSearch && matchesRole && matchesWorkload;
    });
  }

  // Get unique roles
  get uniqueRoles(): string[] {
    return [...new Set(this.employees.map(e => e.role))];
  }

  // Get employee tasks (dummy until task API exists)
  getEmployeeTasks(employeeId: string): any[] {
    return [];
  }

  // Get employee projects
  getEmployeeProjects(employee: any): any[] {
    return this.projects.filter(p => employee.projectIds.includes(p._id));
  }

  // Get task counts (dummy until task API exists)
  getTotalTasks(employeeId: string): number { return 0; }
  getCompletedTasks(employeeId: string): number { return 0; }
  getInProgressTasks(employeeId: string): number { return 0; }
  getPendingTasks(employeeId: string): number { return 0; }

  // Calculate workload level based on projects since tasks are dummy
  getWorkloadLevel(employee: any): string {
    const projCount = employee.projectIds.length;
    if (projCount > 2) return 'High';
    if (projCount > 0) return 'Medium';
    return 'Low';
  }

  getWorkloadClass(workload: string): string {
    switch (workload) {
      case 'High': return 'workload-high';
      case 'Medium': return 'workload-medium';
      case 'Low': return 'workload-low';
      default: return '';
    }
  }

  // Completion rate (dummy until task API exists)
  getCompletionRate(employeeId: string): number {
    return 0;
  }

  // View employee details
  viewEmployee(employee: any): void {
    this.selectedEmployee = employee;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedEmployee = null;
  }

  // Get project name
  getProjectName(projectId: string): string {
    const project = this.projects.find(p => p._id === projectId);
    return project ? (project.projectName || project.name) : 'Unknown';
  }

  // Statistics
  get totalEmployees(): number {
    return this.employees.length;
  }

  get activeEmployees(): number {
    return this.employees.filter(e => e.status === 'Active').length;
  }

  get highWorkloadCount(): number {
    return this.employees.filter(e => this.getWorkloadLevel(e) === 'High').length;
  }

  get averageCompletionRate(): number {
    const total = this.employees.reduce((sum, e) => sum + this.getCompletionRate(e.id), 0);
    return Math.round(total / this.employees.length);
  }
}
