import { Component, OnInit, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

export interface AttendanceRecord {
  _id?: string;
  user: any;
  type: 'Office Present' | 'Remote Present' | 'Clocked Out';
  coordinates: string;
  distanceMeters: number;
  status?: 'Approved' | 'Pending' | 'Rejected';
  timestamp: string;
  createdAt: string;
}

export interface CalendarDay {
  dayNumber: number;
  date: Date;
  isWeekend: boolean;
  isFuture: boolean;
  isToday: boolean;
  status: 'office' | 'remote' | 'absent' | 'weekend' | 'pending' | 'rejected';
  log?: AttendanceRecord;
  workingHours?: number;
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
  styleUrl: './attendance.css'
})
export class AttendanceComponent implements OnInit {
  isAdmin = false;
  isManager = false;
  isEmployee = false;
  
  currentUser: any = null;
  users: any[] = []; // List of all employees/managers (Admin view)
  selectedUserId: string = '';
  showDropdown = false; // Custom dropdown state
  officeLat = 17.443500;
  officeLng = 78.385000;
  resolvedAddress = '';
  
  attendanceLogs: AttendanceRecord[] = [];
  filteredLogs: AttendanceRecord[] = [];
  pendingApprovals: AttendanceRecord[] = []; // Admin approvals queue
  
  // Calendar variables
  currentMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Statistical summaries
  totalOfficePresent = 0;
  totalRemotePresent = 0;
  totalAbsent = 0;
  totalWeekends = 0;
  attendancePercentage = 0;
  totalWorkingHours = '0.0';

  private authService = inject(AuthService);

  constructor(
    private http: HttpClient,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.querySelector('.custom-select-wrapper')?.contains(event.target)) {
      this.showDropdown = false;
    }
  }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    
    this.checkViewRole();
    this.initializeData();
  }

  checkViewRole(): void {
    const url = this.router.url;
    this.isManager = url.includes('/manager-dashboard');
    this.isEmployee = url.includes('/employee-dashboard');
    this.isAdmin = !this.isManager && !this.isEmployee;
  }

  initializeData(): void {
    this.loadOfficeCoords();
    if (this.isAdmin) {
      // 1. Fetch all users so admin can select one
      this.fetchUsers();
      // 2. Fetch all logs to show admin a general overview of everyone
      this.fetchAllAttendance();
      // 3. Fetch pending requests
      this.fetchPendingApprovals();
    } else {
      // Fetch personal logs
      this.fetchPersonalAttendance();
    }
  }

  loadOfficeCoords(): void {
    this.http.get<any>(`${environment.apiUrl}/attendance/office-coords`).subscribe({
      next: (res) => {
        if (res.lat !== undefined && res.lng !== undefined) {
          this.officeLat = Number(res.lat);
          this.officeLng = Number(res.lng);
          this.resolveAddress();
        }
      },
      error: (err) => console.error('Error loading office coords', err)
    });
  }

  resolveAddress(): void {
    if (!this.officeLat || !this.officeLng) return;
    this.resolvedAddress = 'Searching location name...';
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${this.officeLat}&lon=${this.officeLng}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res && res.display_name) {
          this.resolvedAddress = res.display_name;
        } else {
          this.resolvedAddress = 'Unknown Location';
        }
      },
      error: (err) => {
        console.warn('Geocoding search failed:', err);
        this.resolvedAddress = 'Location resolved (unable to load street address)';
      }
    });
  }

  saveOfficeCoords(): void {
    if (this.officeLat === undefined || this.officeLng === undefined) {
      alert('Please enter valid coordinates');
      return;
    }
    this.http.put<any>(
      `${environment.apiUrl}/attendance/office-coords`,
      { lat: this.officeLat, lng: this.officeLng }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          alert('🟢 Office coordinates updated successfully!');
          this.resolveAddress();
        }
      },
      error: (err) => {
        console.error('Error saving office coords', err);
        alert('❌ Failed to update office coordinates');
      }
    });
  }

  fetchUsers(): void {
    this.http.get<any>(`${environment.apiUrl}/users`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          // Filter out other admins or just keep employees and managers
          this.users = res.data.filter((u: any) => u.role !== 'admin');
          if (this.users.length > 0) {
            this.selectedUserId = this.users[0]._id || this.users[0].id;
            this.onUserChange();
          }
        }
      },
      error: (err) => console.error('Failed to fetch users', err)
    });
  }

  fetchPersonalAttendance(): void {
    this.http.get<any>(`${environment.apiUrl}/attendance/history`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.attendanceLogs = res.data;
          this.generateCalendar();
        }
      },
      error: (err) => console.error('Failed to fetch attendance history', err)
    });
  }

  fetchAllAttendance(): void {
    this.http.get<any>(`${environment.apiUrl}/attendance/all`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.attendanceLogs = res.data;
          this.filteredLogs = [...this.attendanceLogs];
        }
      },
      error: (err) => console.error('Failed to fetch all attendance records', err)
    });
  }

  fetchPendingApprovals(): void {
    this.http.get<any>(`${environment.apiUrl}/attendance/pending`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.pendingApprovals = res.data;
        }
      },
      error: (err) => console.error('Failed to fetch pending approvals', err)
    });
  }

  approveRecord(id: string): void {
    this.http.put<any>(`${environment.apiUrl}/attendance/approve/${id}`, {}).subscribe({
      next: (res) => {
        if (res.success) {
          alert('🟢 Remote Check-In approved successfully!');
          this.fetchPendingApprovals();
          this.fetchAllAttendance();
          this.onUserChange();
        }
      },
      error: (err) => console.error('Failed to approve attendance', err)
    });
  }

  rejectRecord(id: string): void {
    if (confirm('Are you sure you want to REJECT this remote work check-in? it will mark this day as Absent.')) {
      this.http.put<any>(`${environment.apiUrl}/attendance/reject/${id}`, {}).subscribe({
        next: (res) => {
          if (res.success) {
            alert('🔴 Remote Check-In rejected.');
            this.fetchPendingApprovals();
            this.fetchAllAttendance();
            this.onUserChange();
          }
        },
        error: (err) => console.error('Failed to reject attendance', err)
      });
    }
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  selectUser(user: any): void {
    this.selectedUserId = user._id || user.id;
    this.showDropdown = false;
    this.onUserChange();
  }

  onUserChange(): void {
    if (!this.selectedUserId) return;
    
    this.http.get<any>(`${environment.apiUrl}/attendance/user/${this.selectedUserId}`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          // These logs are specifically for the selected user
          this.attendanceLogs = res.data;
          this.generateCalendar();
        }
      },
      error: (err) => console.error('Failed to fetch user specific attendance history', err)
    });
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  generateCalendar(): void {
    this.calendarDays = [];
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const today = new Date();
    
    // Add empty days for offset matching calendar grid starting day
    for (let i = 0; i < firstDayIndex; i++) {
      this.calendarDays.push({
        dayNumber: 0,
        date: new Date(),
        isWeekend: false,
        isFuture: false,
        isToday: false,
        status: 'pending'
      });
    }

    // Initialize statistics counters
    this.totalOfficePresent = 0;
    this.totalRemotePresent = 0;
    this.totalAbsent = 0;
    this.totalWeekends = 0;
    let businessDays = 0;
    let totalPresent = 0;
    let totalMsSum = 0;

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      const isFuture = date.getTime() > today.getTime() && date.toDateString() !== today.toDateString();
      const isToday = date.toDateString() === today.toDateString();
      
      // Find log corresponding to this date for cell indicator
      const log = this.attendanceLogs.find(l => {
        const logDate = new Date(l.timestamp);
        return logDate.toDateString() === date.toDateString() && l.type !== 'Clocked Out';
      });

      // Calculate working hours for this day
      const dayLogs = this.attendanceLogs.filter(l => {
        const logDate = new Date(l.timestamp);
        return logDate.toDateString() === date.toDateString();
      });
      dayLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let dailyMs = 0;
      let activeClockIn: Date | null = null;

      for (const record of dayLogs) {
        if (record.type === 'Office Present' || record.type === 'Remote Present') {
          if (record.type === 'Remote Present' && record.status === 'Rejected') {
            continue;
          }
          activeClockIn = new Date(record.timestamp);
        } else if (record.type === 'Clocked Out') {
          if (activeClockIn) {
            dailyMs += new Date(record.timestamp).getTime() - activeClockIn.getTime();
            activeClockIn = null;
          }
        }
      }

      if (activeClockIn && isToday) {
        dailyMs += new Date().getTime() - activeClockIn.getTime();
      }

      const workingHours = dailyMs > 0 ? Number((dailyMs / (1000 * 60 * 60)).toFixed(1)) : 0;
      if (workingHours > 0) {
        totalMsSum += dailyMs;
      }

      let status: 'office' | 'remote' | 'absent' | 'weekend' | 'pending' | 'rejected' = 'pending';
      
      if (isWeekend) {
        status = 'weekend';
        this.totalWeekends++;
      } else if (isFuture) {
        status = 'pending';
      } else {
        businessDays++;
        if (log) {
          if (log.type === 'Office Present') {
            status = 'office';
            this.totalOfficePresent++;
            totalPresent++;
          } else if (log.type === 'Remote Present') {
            if (log.status === 'Pending') {
              status = 'pending'; // Shows as pending / yellow pulse
            } else if (log.status === 'Rejected') {
              status = 'rejected'; // Shows as rejected / red
              this.totalAbsent++;
            } else {
              status = 'remote'; // Approved remote work
              this.totalRemotePresent++;
              totalPresent++;
            }
          }
        } else {
          status = 'absent';
          this.totalAbsent++;
        }
      }

      this.calendarDays.push({
        dayNumber: day,
        date,
        isWeekend,
        isFuture,
        isToday,
        status,
        log,
        workingHours: workingHours > 0 ? workingHours : undefined
      });
    }

    this.attendancePercentage = businessDays > 0 ? Math.round((totalPresent / businessDays) * 100) : 0;
    this.totalWorkingHours = (totalMsSum / (1000 * 60 * 60)).toFixed(1);
  }

  // Helper method to resolve selected user name for Calendar header
  getSelectedUserName(): string {
    if (!this.isAdmin) {
      return this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}` : 'My';
    }
    const user = this.users.find(u => (u._id || u.id) === this.selectedUserId);
    return user ? `${user.firstName} ${user.lastName}` : 'Selected User';
  }

  getSelectedUserFullNameWithRole(): string {
    const user = this.users.find(u => (u._id || u.id) === this.selectedUserId);
    return user ? `${user.firstName} ${user.lastName} (${user.designation || user.role})` : 'Select Team Member...';
  }
}
