import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  officeCoords = { lat: 17.443500, lng: 78.385000 };
  geofenceRadius = 10;
  
  public clockStatusChange = new Subject<string>();

  getUserId(): string {
    const user = this.authService.currentUserValue || {};
    return user._id || user.id || 'anonymous';
  }

  loadAttendanceState(): string {
    return localStorage.getItem('clockStatus_' + this.getUserId()) || 'Clocked Out';
  }

  setClockStatus(status: string) {
    localStorage.setItem('clockStatus_' + this.getUserId(), status);
    this.clockStatusChange.next(status);
  }

  loadOfficeCoords() {
    this.http.get<any>(`${environment.apiUrl}/attendance/office-coords`).subscribe({
      next: (res) => {
        if (res.lat !== undefined && res.lng !== undefined) {
          this.officeCoords = { lat: Number(res.lat), lng: Number(res.lng) };
        }
      },
      error: (err) => console.error('Error loading office coords', err)
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
    new Audio('assets/success.mp3').play().catch(() => {});
  }

  playWarningChime(): void {
    new Audio('assets/warning.mp3').play().catch(() => {});
  }

  logAttendanceLog(type: string, coordinates: string, distance: number): void {
    const userId = this.getUserId();
    const timestamp = new Date();
    const log = { timestamp, type, coordinates, distanceMeters: distance };
    
    const saved = localStorage.getItem('attendanceLogs_' + userId);
    let logs: any[] = [];
    if (saved) {
      try { logs = JSON.parse(saved); } catch(e) {}
    }
    logs.unshift(log);
    if (logs.length > 20) logs = logs.slice(0, 20);
    localStorage.setItem('attendanceLogs_' + userId, JSON.stringify(logs));

    this.http.post(`${environment.apiUrl}/attendance/clock-${type === 'Clocked Out' ? 'out' : 'in'}`, log).subscribe({
      next: () => console.log('Attendance synced.'),
      error: () => console.log('Simulated bypass logged.')
    });
  }
}
