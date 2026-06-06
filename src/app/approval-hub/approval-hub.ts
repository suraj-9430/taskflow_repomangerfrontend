import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-approval-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approval-hub.html',
  styleUrl: './approval-hub.css'
})
export class ApprovalHub implements OnInit {
  approvals: any[] = [];
  activeFilter: string = 'all';
  remarksText: string = '';
  selectedApproval: any = null;
  showDetailsModal: boolean = false;

  // New Request Form states
  showRequestModal: boolean = false;
  requestType: string = 'Expense';
  expenseAmount: number = 0;
  requestDescription: string = '';
  documentUrl: string = '';
  overtimeHours: number = 0;
  shiftSwapUserId: string = '';
  targetDate: string = '';
  availableUsers: any[] = [];

  isSubmitting: boolean = false;
  isProcessing: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchApprovals();
    this.fetchUsers();
  }

  getLoggedInUser(): any {
    return JSON.parse(localStorage.getItem('user') || '{}');
  }

  isAdminOrManager(): boolean {
    const role = this.getLoggedInUser().role;
    return role === 'admin' || role === 'manager';
  }

  fetchApprovals(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${environment.apiUrl}/approvals`, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.approvals = res.data || [];
        }
      },
      error: (err) => console.error('Failed to fetch approvals', err)
    });
  }

  fetchUsers(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/users`, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.availableUsers = res.data || [];
        }
      },
      error: (err) => console.error('Failed to fetch users', err)
    });
  }

  getFilteredApprovals(): any[] {
    if (this.activeFilter === 'all') return this.approvals;
    return this.approvals.filter(a => a.type === this.activeFilter);
  }

  openDetailsModal(approval: any): void {
    this.selectedApproval = approval;
    this.remarksText = approval.remarks || '';
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedApproval = null;
  }

  openRequestModal(): void {
    this.showRequestModal = true;
  }

  closeRequestModal(): void {
    this.showRequestModal = false;
    this.resetRequestForm();
  }

  resetRequestForm(): void {
    this.expenseAmount = 0;
    this.requestDescription = '';
    this.documentUrl = '';
    this.overtimeHours = 0;
    this.shiftSwapUserId = '';
    this.targetDate = '';
  }

  submitRequest(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const details: any = {
      description: this.requestDescription,
      targetDate: this.targetDate ? new Date(this.targetDate) : undefined
    };

    if (this.requestType === 'Expense') {
      details.amount = this.expenseAmount;
      details.documentUrl = this.documentUrl;
    } else if (this.requestType === 'Overtime') {
      details.hoursRequested = this.overtimeHours;
    } else if (this.requestType === 'Shift Swap') {
      details.shiftSwapWith = this.shiftSwapUserId;
    } else if (this.requestType === 'Document') {
      details.documentUrl = this.documentUrl;
    }

    const payload = {
      type: this.requestType,
      details
    };

    this.http.post<any>(`${environment.apiUrl}/approvals`, payload, { headers }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.fetchApprovals();
          this.closeRequestModal();
        }
      },
      error: (err) => {
        console.error('Failed to submit approval request', err);
        this.isSubmitting = false;
      }
    });
  }

  processApproval(status: 'Approved' | 'Rejected'): void {
    if (this.isProcessing || !this.selectedApproval) return;
    this.isProcessing = true;

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.put<any>(`${environment.apiUrl}/approvals/${this.selectedApproval._id}`, {
      status,
      remarks: this.remarksText
    }, { headers }).subscribe({
      next: (res) => {
        this.isProcessing = false;
        if (res.success) {
          this.fetchApprovals();
          this.closeDetailsModal();
        }
      },
      error: (err) => {
        console.error('Failed to process approval', err);
        this.isProcessing = false;
      }
    });
  }

  getSwapUserName(id: string): string {
    const user = this.availableUsers.find(u => u._id === id);
    return user ? `${user.firstName} ${user.lastName}` : 'N/A';
  }
}
