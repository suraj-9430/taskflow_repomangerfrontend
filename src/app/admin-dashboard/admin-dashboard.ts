import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../createandmanage/user';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  totaluser: number=0
  totalmanager!: number
  totaladmin!: number
  totalemployee!: number
  totalactive!: number
  recentUsers: any[] = []

  adminName: string = 'Admin';
  adminAvatar: string = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  unreadCount: number = 0;

  constructor(
    private router: Router, 
    private user: UserService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (localUser.firstName) {
      this.adminName = `${localUser.firstName} ${localUser.lastName}`;
    }
    if (localUser.avatar) {
      this.adminAvatar = localUser.avatar;
    }
    this.loadAdminProfile();
    this.loadUnreadCount();
    this.loadUsers();
    this.user.countactivveusers().subscribe((res: any) => {
      this.totalactive = res['count'];
    });
    this.user.countuser('manager').subscribe((res: any) => {
      this.totalmanager = res['count'];
      this.totaluser += Number(this.totalmanager);
    });
    this.user.countuser('admin').subscribe((res: any) => {
      this.totaladmin = res['count'];
      this.totaluser += Number(this.totaladmin);
    });
    this.user.countuser('employee').subscribe((res: any) => {
      this.totalemployee = res['count'];
      this.totaluser += Number(this.totalemployee);
    });
    this.loadAttendanceState();
  }

  loadAdminProfile(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/users/profile`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const user = res.data;
          this.adminName = `${user.firstName} ${user.lastName}`;
          if (user.avatar) {
            this.adminAvatar = user.avatar;
          }

          // Save loaded user with settings to localStorage
          const localUser = JSON.parse(localStorage.getItem('user') || '{}');
          localUser.avatar = user.avatar || localUser.avatar;
          localUser.firstName = user.firstName || localUser.firstName;
          localUser.lastName = user.lastName || localUser.lastName;
          if (user.settings) {
            localUser.settings = user.settings;
          }
          localStorage.setItem('user', JSON.stringify(localUser));
        }
      },
      error: (err) => console.error('Error fetching admin profile', err)
    });
  }

  loadUnreadCount(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/notifications`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.unreadCount = res.data.filter((n: any) => !n.isRead).length;
        }
      },
      error: (err) => console.error('Error fetching unread count', err)
    });
  }


  page = 1;
  totalPages = 0;


  loadUsers() {
    this.user.fetchUsers(this.page).subscribe((res: any) => {
      this.recentUsers = res.users;
      this.totalPages = res.totalPages;
    });
  }

  next() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadUsers();
    }
  }

  prev() {
    if (this.page > 1) {
      this.page--;
      this.loadUsers();
    }
  }





  handleaction(option: any) {
    if (option === 'back') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/dashboard/action'], { queryParams: { option } });
    }
  }





  // Edit user - navigate to create form with user data
  editUser(user: any): void {
    this.router.navigate(['/dashboard/action'], {
      queryParams: {
        option: 'edit',
        userId: user._id
      }
    });
  }

  // Delete user method
  deleteUser(user: any): void {
    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      this.recentUsers = this.recentUsers.filter(u => u.id !== user.id);
      console.log('User deleted:', user);
    }
  }

  // ── Geo-Fenced Compact Punch Logic ──
  officeCoords = { lat: 17.443500, lng: 78.385000 };
  geofenceRadius = 10;
  clockStatus = 'Clocked Out';
  isCheckingLocation = false;
  pendingCoords = { lat: 0, lng: 0 };
  geofenceDistance = 0;

  getUserId(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || user.id || 'anonymous';
  }

  loadAttendanceState(): void {
    const userId = this.getUserId();
    this.clockStatus = localStorage.getItem('clockStatus_' + userId) || 'Clocked Out';
  }

  togglePunch(): void {
    if (this.clockStatus !== 'Clocked Out') {
      this.clockOut();
    } else {
      this.clockIn();
    }
  }

  getPunchTitle(): string {
    if (this.clockStatus === 'Clocked Out') {
      return 'Click to Punch-In (GPS Coordinates Geofence Match)';
    }
    return `Punch-Out (Current Status: ${this.clockStatus})`;
  }

  clockIn(): void {
    this.isCheckingLocation = true;
    
    if (!navigator.geolocation) {
      this.isCheckingLocation = false;
      alert('Error: Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.verifyLocation(lat, lng);
      },
      (error) => {
        this.isCheckingLocation = false;
        console.warn('GPS query blocked or timed out, triggering fallback.');
        if (confirm('📡 GPS coordinates check blocked or timed out.\n\nWould you like to simulate check-in inside the Office Geofence? (Cancel to simulate out-of-bounds)')) {
          this.verifyLocation(17.443500, 78.385000); // Office
        } else {
          this.verifyLocation(17.4520, 78.4060); // Remote
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  verifyLocation(lat: number, lng: number): void {
    this.isCheckingLocation = false;
    const distance = this.getDistanceInMeters(lat, lng, this.officeCoords.lat, this.officeCoords.lng);
    this.geofenceDistance = Math.round(distance);
    const userId = this.getUserId();

    if (distance <= this.geofenceRadius) {
      this.clockStatus = 'Office Present';
      localStorage.setItem('clockStatus_' + userId, this.clockStatus);
      this.playSuccessChime();
      this.logAttendanceLog('Office Present', `${lat.toFixed(4)}, ${lng.toFixed(4)}`, this.geofenceDistance);
      alert(`🟢 Punch-In Successful!\nStatus: Office Present\nDistance: ${this.geofenceDistance}m to office hub.`);
    } else {
      this.playWarningChime();
      if (confirm(`⚠️ Out of Geofence bounds!\n\nYou are ${this.geofenceDistance} meters away from the office hub.\n\nDo you want to send a Remote Present request to the Admin for approval?`)) {
        this.clockStatus = 'Remote Present';
        localStorage.setItem('clockStatus_' + userId, this.clockStatus);
        this.playSuccessChime();
        this.logAttendanceLog('Remote Present', `${lat.toFixed(4)}, ${lng.toFixed(4)}`, this.geofenceDistance);
        alert(`🟢 Remote Check-In Requested!\n\nYour request has been submitted to the Admin. It will be marked as Present once approved.`);
      } else {
        this.clockStatus = 'Clocked Out';
        localStorage.setItem('clockStatus_' + userId, this.clockStatus);
      }
    }
  }

  clockOut(): void {
    this.isCheckingLocation = true;
    
    if (!navigator.geolocation) {
      this.isCheckingLocation = false;
      this.performClockOut('N/A', 0);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const distance = this.getDistanceInMeters(lat, lng, this.officeCoords.lat, this.officeCoords.lng);
        this.performClockOut(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, Math.round(distance));
      },
      (error) => {
        this.isCheckingLocation = false;
        console.warn('GPS query blocked or timed out during check-out.');
        if (confirm('📡 GPS coordinates check blocked or timed out.\n\nWould you like to simulate check-out from the Office? (Cancel to simulate remote check-out)')) {
          this.performClockOut(`${this.officeCoords.lat.toFixed(4)}, ${this.officeCoords.lng.toFixed(4)}`, 0);
        } else {
          this.performClockOut('17.4520, 78.4060', 1800);
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  performClockOut(coords: string, distance: number): void {
    this.isCheckingLocation = false;
    const userId = this.getUserId();
    this.clockStatus = 'Clocked Out';
    localStorage.setItem('clockStatus_' + userId, this.clockStatus);
    this.playSuccessChime();
    this.logAttendanceLog('Clocked Out', coords, distance);
    alert(`🔴 Punch-Out Successful!\nLocation: ${coords}\nHave a wonderful evening!`);
  }

  logAttendanceLog(type: string, coordinates: string, distance: number): void {
    const userId = this.getUserId();
    const timestamp = new Date();
    const log = {
      timestamp,
      type,
      coordinates,
      distanceMeters: distance
    };
    
    const saved = localStorage.getItem('attendanceLogs_' + userId);
    let logs: any[] = [];
    if (saved) {
      try { logs = JSON.parse(saved); } catch(e) {}
    }
    logs.unshift(log);
    if (logs.length > 20) logs = logs.slice(0, 20);
    localStorage.setItem('attendanceLogs_' + userId, JSON.stringify(logs));

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.post(`${environment.apiUrl}/attendance/clock-${type === 'Clocked Out' ? 'out' : 'in'}`, log, { headers }).subscribe({
      next: () => console.log('Attendance synced.'),
      error: () => console.log('Simulated bypass logged.')
    });
  }

  getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  playSuccessChime(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      if (context.state === 'suspended') {
        context.resume();
      }
      
      const osc1 = context.createOscillator();
      const gain1 = context.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, context.currentTime); 
      gain1.gain.setValueAtTime(0.12, context.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(context.destination);
      osc1.start();
      osc1.stop(context.currentTime + 0.3);

      const osc2 = context.createOscillator();
      const gain2 = context.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, context.currentTime + 0.08); 
      gain2.gain.setValueAtTime(0.12, context.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
      osc2.connect(gain2);
      gain2.connect(context.destination);
      osc2.start(context.currentTime + 0.08);
      osc2.stop(context.currentTime + 0.4);
    } catch (e) {}
  }

  playWarningChime(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      if (context.state === 'suspended') {
        context.resume();
      }
      
      const osc1 = context.createOscillator();
      const gain1 = context.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(220, context.currentTime); 
      gain1.gain.setValueAtTime(0.08, context.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
      osc1.connect(gain1);
      gain1.connect(context.destination);
      osc1.start();
      osc1.stop(context.currentTime + 0.5);
    } catch (e) {}
  }
}
