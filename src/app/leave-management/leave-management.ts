import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface LeaveRecord {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedAt: string;
  userId?: any;
}

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-management.html',
  styleUrl: './leave-management.css'
})
export class LeaveManagement implements OnInit {
  currentUser: any = null;
  isAdminOrManager = false;
  todayDate = new Date().toISOString().split('T')[0];

  leaveBalances = {
    sick: 0,
    casual: 0,
    earned: 0
  };

  myLeaves: LeaveRecord[] = [];
  pendingLeaves: LeaveRecord[] = [];

  // All employees leaves (admin/manager)
  allLeaves: LeaveRecord[] = [];
  filteredLeaves: LeaveRecord[] = [];
  statusFilter = 'all';
  employeeSearch = '';
  activeTab: 'pending' | 'all' = 'pending';

  // Employee detail modal
  showEmployeeDetail = false;
  selectedEmployee: any = null;
  selectedEmployeeLeaves: LeaveRecord[] = [];

  // Form data
  showApplyModal = false;
  applyForm = {
    leaveType: 'sick',
    startDate: '',
    endDate: '',
    reason: ''
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.currentUser = JSON.parse(userStr);
      this.isAdminOrManager = ['admin', 'manager'].includes(this.currentUser.role);
    }

    this.fetchLeaveBalances();
    this.fetchMyLeaves();

    if (this.isAdminOrManager) {
      this.fetchPendingLeaves();
      this.fetchAllLeaves();
    }
  }

  get headers() {
    return { Authorization: `Bearer ${localStorage.getItem('token')}` };
  }

  fetchLeaveBalances(): void {
    this.http.get<any>(`${environment.apiUrl}/leaves/balance`, { headers: this.headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.leaveBalances = res.data;
        }
      },
      error: (err) => console.error('Failed to fetch leave balances', err)
    });
  }

  fetchMyLeaves(): void {
    this.http.get<any>(`${environment.apiUrl}/leaves/my-leaves`, { headers: this.headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.myLeaves = res.data;
        }
      },
      error: (err) => console.error('Failed to fetch personal leaves', err)
    });
  }

  fetchPendingLeaves(): void {
    this.http.get<any>(`${environment.apiUrl}/leaves/pending`, { headers: this.headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.pendingLeaves = res.data;
        }
      },
      error: (err) => console.error('Failed to fetch pending leaves', err)
    });
  }

  fetchAllLeaves(): void {
    this.http.get<any>(`${environment.apiUrl}/leaves/all`, { headers: this.headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allLeaves = res.data;
          this.applyFilters();
        }
      },
      error: (err) => console.error('Failed to fetch all leaves', err)
    });
  }

  applyFilters(): void {
    let filtered = [...this.allLeaves];

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === this.statusFilter);
    }

    // Employee name search
    if (this.employeeSearch.trim()) {
      const search = this.employeeSearch.toLowerCase();
      filtered = filtered.filter(l => {
        const name = `${l.userId?.firstName || ''} ${l.userId?.lastName || ''}`.toLowerCase();
        const email = (l.userId?.email || '').toLowerCase();
        return name.includes(search) || email.includes(search);
      });
    }

    this.filteredLeaves = filtered;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  viewEmployeeLeaves(employee: any): void {
    this.selectedEmployee = employee;
    this.selectedEmployeeLeaves = this.allLeaves.filter(l => l.userId?._id === employee._id);
    this.showEmployeeDetail = true;
  }

  closeEmployeeDetail(): void {
    this.showEmployeeDetail = false;
    this.selectedEmployee = null;
    this.selectedEmployeeLeaves = [];
  }

  // Get unique employees from all leaves
  getUniqueEmployees(): any[] {
    const seen = new Map();
    for (const leave of this.allLeaves) {
      if (leave.userId && !seen.has(leave.userId._id)) {
        seen.set(leave.userId._id, leave.userId);
      }
    }
    return Array.from(seen.values());
  }

  openApplyModal(): void {
    this.applyForm = {
      leaveType: 'sick',
      startDate: '',
      endDate: '',
      reason: ''
    };
    this.showApplyModal = true;
  }

  closeApplyModal(): void {
    this.showApplyModal = false;
  }

  getRequestedDays(): number {
    if (!this.applyForm.startDate || !this.applyForm.endDate) return 0;
    const start = new Date(this.applyForm.startDate);
    const end = new Date(this.applyForm.endDate);
    if (end < start) return 0;
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  getAvailableBalance(): number {
    const type = this.applyForm.leaveType as keyof typeof this.leaveBalances;
    return this.leaveBalances[type] ?? 0;
  }

  isBalanceExceeded(): boolean {
    const days = this.getRequestedDays();
    return days > 0 && days > this.getAvailableBalance();
  }

  submitLeave(): void {
    if (!this.applyForm.startDate || !this.applyForm.endDate || !this.applyForm.reason) {
      alert('Please fill out all fields');
      return;
    }

    const requestedDays = this.getRequestedDays();
    const available = this.getAvailableBalance();

    if (requestedDays <= 0) {
      alert('End date must be on or after the start date');
      return;
    }

    if (requestedDays > available) {
      alert(`Insufficient leave balance! You are requesting ${requestedDays} day(s) but only have ${available} ${this.applyForm.leaveType} leave day(s) remaining.`);
      return;
    }

    this.http.post<any>(`${environment.apiUrl}/leaves/apply`, this.applyForm, { headers: this.headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.showApplyModal = false;
          this.fetchLeaveBalances();
          this.fetchMyLeaves();
          alert('Leave applied successfully');
        }
      },
      error: (err) => {
        console.error('Failed to apply for leave', err);
        alert(err.error?.message || 'Failed to apply for leave');
      }
    });
  }

  approveLeave(id: string): void {
    this.http.put<any>(`${environment.apiUrl}/leaves/${id}/approve`, {}, { headers: this.headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.fetchPendingLeaves();
          this.fetchAllLeaves();
          alert('Leave approved');
        }
      },
      error: (err) => console.error('Failed to approve leave', err)
    });
  }

  rejectLeave(id: string): void {
    if (confirm('Are you sure you want to reject this leave request?')) {
      this.http.put<any>(`${environment.apiUrl}/leaves/${id}/reject`, {}, { headers: this.headers }).subscribe({
        next: (res) => {
          if (res.success) {
            this.fetchPendingLeaves();
            this.fetchAllLeaves();
            alert('Leave rejected');
          }
        },
        error: (err) => console.error('Failed to reject leave', err)
      });
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'Approved': return 'status-approved';
      case 'Rejected': return 'status-rejected';
      case 'Pending': default: return 'status-pending';
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  getLeaveDays(leave: LeaveRecord): number {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
}
