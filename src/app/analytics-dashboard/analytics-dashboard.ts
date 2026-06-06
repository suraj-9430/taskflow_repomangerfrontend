import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Projectservice } from '../manager/projects/projectservice';

type TrendTone = 'good' | 'neutral' | 'warning';

interface MetricCard {
  label: string;
  value: string;
  note: string;
  icon: string;
  tone: TrendTone;
}

interface InsightRow {
  label: string;
  value: number;
  helper: string;
  tone: TrendTone;
}

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './analytics-dashboard.html',
  styleUrl: './analytics-dashboard.css',
})
export class AnalyticsDashboard implements OnInit {
  constructor(
    private projectservice: Projectservice,
    private http: HttpClient,
    private router: Router
  ) {}

  isLoading = true;
  loadNotice = '';
  dashboardTitle = 'Operations Analytics';
  dashboardSubtitle =
    'A live snapshot of delivery, staffing, attendance, and leave signals across the workspace.';

  metricCards: MetricCard[] = [];
  workloadRows: InsightRow[] = [];
  attentionItems: { title: string; helper: string; severity: TrendTone }[] = [];
  projectHealthRows: { name: string; progress: number; status: string; deadlineLabel: string }[] = [];
  statusBreakdown: { label: string; count: number; percent: number; tone: TrendTone }[] = [];
  leaveBreakdown: { label: string; count: number; percent: number }[] = [];

  ngOnInit(): void {
    this.loadAnalytics();
  }

  get isManagerView(): boolean {
    return this.router.url.includes('/manager-dashboard');
  }

  get dashboardPrefix(): string {
    return this.isManagerView ? '/manager-dashboard' : '/dashboard';
  }

  get primaryActionLink(): string {
    return this.isManagerView ? '/manager-dashboard/tasks' : '/dashboard/action';
  }

  get primaryActionLabel(): string {
    return this.isManagerView ? 'Open Task Board' : 'Manage People';
  }

  get primaryActionIcon(): string {
    return this.isManagerView ? 'fa-list-check' : 'fa-user-gear';
  }

  get secondaryActionLink(): string {
    return this.isManagerView ? '/manager-dashboard/projects' : '/dashboard/attendance';
  }

  get secondaryActionLabel(): string {
    return this.isManagerView ? 'Review Projects' : 'Review Attendance';
  }

  get secondaryActionIcon(): string {
    return this.isManagerView ? 'fa-diagram-project' : 'fa-clipboard-user';
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private loadAnalytics(): void {
    this.isLoading = true;
    this.loadNotice = '';

    forkJoin({
      projects: this.projectservice.getAllProjects().pipe(
        map((res: any) => res?.data || []),
        catchError(() => of([]))
      ),
      tasks: this.projectservice.getAllTasks().pipe(
        map((res: any) => res?.data || []),
        catchError(() => of([]))
      ),
      employees: this.projectservice.getEmployees().pipe(
        map((res: any) => res?.data || []),
        catchError(() => of([]))
      ),
      leaves: this.http
        .get<any>(`${environment.apiUrl}/leaves/all`, {
          headers: this.getAuthHeaders(),
        })
        .pipe(
          map((res) => res?.data || []),
          catchError(() => of([]))
        ),
      attendance: this.http
        .get<any>(`${environment.apiUrl}/attendance/all`, {
          headers: this.getAuthHeaders(),
        })
        .pipe(
          map((res) => res?.data || []),
          catchError(() => of([]))
        ),
    }).subscribe({
      next: ({ projects, tasks, employees, leaves, attendance }) => {
        this.buildAnalytics(projects, tasks, employees, leaves, attendance);
        this.isLoading = false;
      },
      error: () => {
        this.loadNotice =
          'Some analytics sources are unavailable right now. The dashboard is showing the data it could recover.';
        this.isLoading = false;
      },
    });
  }

  private buildAnalytics(
    projects: any[],
    tasks: any[],
    employees: any[],
    leaves: any[],
    attendance: any[]
  ): void {
    const normalizedTasks = tasks.map((task) => {
      const projectId = typeof task.projectId === 'object' ? task.projectId?._id : task.projectId;
      const assignedTo =
        typeof task.assignedTo === 'object' ? task.assignedTo?._id : task.assignedTo;
      return { ...task, projectId, assignedTo };
    });

    const normalizedProjects = projects.map((project) => ({
      ...project,
      progress: Number(project.progress || 0),
      assigneeIds: (project.assignees || []).map((assignee: any) =>
        typeof assignee === 'object' ? assignee._id : assignee
      ),
    }));

    const activeEmployees = employees.filter((employee) => employee.empStatus === 'active');
    const completedTasks = normalizedTasks.filter((task) => task.status === 'Completed');
    const overdueTasks = normalizedTasks.filter((task) => this.isOverdue(task.dueDate, task.status));
    const highPriorityOpenTasks = normalizedTasks.filter(
      (task) => task.priority === 'High' && task.status !== 'Completed'
    );
    const completedProjects = normalizedProjects.filter((project) => project.status === 'Completed');
    const pendingLeaves = leaves.filter((leave) => leave.status === 'Pending');
    const remotePending = attendance.filter((log) => log.status === 'Pending');

    const averageProjectProgress = normalizedProjects.length
      ? Math.round(
          normalizedProjects.reduce((sum, project) => sum + Number(project.progress || 0), 0) /
            normalizedProjects.length
        )
      : 0;

    const attendanceToday = attendance.filter((entry) => this.isSameDay(entry.timestamp));
    const officeToday = attendanceToday.filter((entry) => entry.type === 'Office Present').length;
    const remoteToday = attendanceToday.filter((entry) => entry.type === 'Remote Present').length;

    this.metricCards = [
      {
        label: 'Task Completion',
        value: this.formatPercent(completedTasks.length, normalizedTasks.length),
        note: `${completedTasks.length} of ${normalizedTasks.length || 0} tasks closed`,
        icon: 'fa-list-check',
        tone: completedTasks.length >= overdueTasks.length ? 'good' : 'warning',
      },
      {
        label: 'Project Health',
        value: `${averageProjectProgress}%`,
        note: `${completedProjects.length} completed, ${normalizedProjects.length - completedProjects.length} active`,
        icon: 'fa-diagram-project',
        tone: averageProjectProgress >= 65 ? 'good' : averageProjectProgress >= 40 ? 'neutral' : 'warning',
      },
      {
        label: 'Active Employees',
        value: `${activeEmployees.length}`,
        note: `${employees.length - activeEmployees.length} unavailable or on hold`,
        icon: 'fa-users',
        tone: activeEmployees.length > 0 ? 'good' : 'warning',
      },
      {
        label: 'Pending Approvals',
        value: `${pendingLeaves.length + remotePending.length}`,
        note: `${pendingLeaves.length} leave, ${remotePending.length} attendance`,
        icon: 'fa-hourglass-half',
        tone: pendingLeaves.length + remotePending.length > 5 ? 'warning' : 'neutral',
      },
    ];

    this.workloadRows = employees
      .map((employee) => {
        const taskCount = normalizedTasks.filter(
          (task) => String(task.assignedTo || '') === String(employee._id)
        ).length;
        const projectCount = normalizedProjects.filter((project) =>
          (project.assigneeIds || []).some((id: string) => String(id) === String(employee._id))
        ).length;
        const tone: TrendTone = taskCount >= 6 ? 'warning' : taskCount >= 3 ? 'neutral' : 'good';

        return {
          label: `${employee.firstName} ${employee.lastName}`,
          value: taskCount,
          helper: `${projectCount} projects`,
          tone,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    this.projectHealthRows = normalizedProjects
      .map((project) => ({
        name: project.projectName || project.name || 'Untitled Project',
        progress: Number(project.progress || 0),
        status: project.status || 'In Progress',
        deadlineLabel: this.formatDeadlineLabel(project.deadline),
      }))
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 5);

    const taskStatuses = ['To Do', 'In Progress', 'Completed'];
    this.statusBreakdown = taskStatuses.map((label) => {
      const count = normalizedTasks.filter((task) => task.status === label).length;
      return {
        label,
        count,
        percent: this.toPercent(count, normalizedTasks.length),
        tone:
          label === 'Completed' ? 'good' : label === 'In Progress' ? 'neutral' : count > 0 ? 'warning' : 'neutral',
      };
    });

    const leaveTypes = ['sick', 'casual', 'earned'];
    this.leaveBreakdown = leaveTypes.map((label) => {
      const count = leaves.filter((leave) => leave.leaveType === label).length;
      return {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        count,
        percent: this.toPercent(count, leaves.length),
      };
    });

    this.attentionItems = [
      {
        title: `${overdueTasks.length} overdue tasks need attention`,
        helper: highPriorityOpenTasks.length
          ? `${highPriorityOpenTasks.length} of them are high priority`
          : 'No high-priority blockers detected',
        severity: overdueTasks.length > 0 ? 'warning' : 'good',
      },
      {
        title: `${officeToday + remoteToday} employees marked present today`,
        helper: `${officeToday} office, ${remoteToday} remote`,
        severity: remoteToday > officeToday ? 'neutral' : 'good',
      },
      {
        title: `${pendingLeaves.length} leave requests are waiting`,
        helper:
          pendingLeaves.length > 0
            ? 'Managers should review approvals before the next shift cycle'
            : 'Leave queue is clear',
        severity: pendingLeaves.length > 2 ? 'warning' : 'neutral',
      },
    ];

    const missingFeeds = [
      !projects.length ? 'projects' : '',
      !tasks.length ? 'tasks' : '',
      !employees.length ? 'employees' : '',
    ].filter(Boolean);
    this.loadNotice = missingFeeds.length
      ? `Some live data could not be loaded for: ${missingFeeds.join(', ')}.`
      : '';
  }

  getBarWidth(value: number, rows: InsightRow[]): number {
    const max = Math.max(...rows.map((row) => row.value), 1);
    return (value / max) * 100;
  }

  getToneClass(tone: TrendTone): string {
    return `tone-${tone}`;
  }

  private formatPercent(value: number, total: number): string {
    return `${this.toPercent(value, total)}%`;
  }

  private toPercent(value: number, total: number): number {
    if (!total) {
      return 0;
    }
    return Math.round((value / total) * 100);
  }

  private isOverdue(dateValue?: string, status?: string): boolean {
    if (!dateValue || status === 'Completed') {
      return false;
    }
    const dueDate = new Date(dateValue);
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  private isSameDay(dateValue?: string): boolean {
    if (!dateValue) {
      return false;
    }
    const input = new Date(dateValue);
    const today = new Date();
    return (
      input.getDate() === today.getDate() &&
      input.getMonth() === today.getMonth() &&
      input.getFullYear() === today.getFullYear()
    );
  }

  private formatDeadlineLabel(dateValue?: string): string {
    if (!dateValue) {
      return 'No deadline';
    }
    const deadline = new Date(dateValue);
    const today = new Date();
    const diffMs = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    }
    if (diffDays === 0) {
      return 'Due today';
    }
    if (diffDays === 1) {
      return 'Due tomorrow';
    }
    return `Due in ${diffDays} days`;
  }
}
