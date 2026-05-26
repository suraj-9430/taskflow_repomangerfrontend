import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Projectservice } from '../manager/projects/projectservice';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AiService } from '../services/ai.service';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css',
})
export class ManagerDashboard implements OnInit {
  constructor(
    private router: Router, 
    private projectservice: Projectservice,
    private http: HttpClient,
    private aiService: AiService
  ) {}

  // Manager Info
  managerName: string = 'Manager';
  managerAvatar: string = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  unreadCount: number = 0;

  // Real Data
  employees: any[] = [];
  projects: any[] = [];

  // Tasks Data (Recent)
  recentTasks: any[] = [];

  // ── Personal Daily To-Do & Meeting Notes State ──
  personalTodos: any[] = [];
  newTodoText: string = '';
  meetingNotes: string = '';
  activeTab: 'todos' | 'notes' = 'todos';
  isGeneratingPersonalTodos: boolean = false;

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.firstName) {
      this.managerName = `${user.firstName} ${user.lastName}`;
    }
    if (user.avatar) {
      this.managerAvatar = user.avatar;
    }
    this.loadManagerProfile();
    this.loadUnreadCount();
    this.loadData();
    this.loadAttendanceState();
    this.loadPersonalData();
  }

  loadManagerProfile(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/users/profile`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const user = res.data;
          this.managerName = `${user.firstName} ${user.lastName}`;
          if (user.avatar) {
            this.managerAvatar = user.avatar;
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
      error: (err) => console.error('Error fetching manager profile', err)
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
              
              const projCount = assignedProjects.length;
              let workload = 'Low';
              if (projCount > 2) workload = 'High';
              else if (projCount > 0) workload = 'Medium';

              return {
                id: emp._id, // Use string _id
                name: `${emp.firstName} ${emp.lastName}`,
                role: emp.designation || 'Employee',
                tasksAssigned: 0, // No backend for tasks yet
                workload: workload,
                projectIds: assignedProjects.map(p => p._id),
                empStatus: emp.empStatus
              };
            });
          },
          error: err => console.error('Error fetching employees', err)
        });

        // Load Tasks
        this.projectservice.getAllTasks().subscribe({
          next: (taskRes: any) => {
            this.recentTasks = (taskRes.data || []).map((t: any) => {
              const projectId = t.projectId && typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
              const assignedTo = t.assignedTo && typeof t.assignedTo === 'object' ? t.assignedTo._id : t.assignedTo;
              return { ...t, projectId, assignedTo };
            });
            
            // Recalculate tasksAssigned for employees now that we have tasks
            this.employees = this.employees.map(emp => {
              const assignedTaskCount = this.recentTasks.filter(t => 
                String(t.assignedTo) === String(emp.id)
              ).length;
              return { ...emp, tasksAssigned: assignedTaskCount };
            });
          },
          error: err => console.error('Error fetching tasks', err)
        });
      },
      error: err => console.error('Error fetching projects', err)
    });
  }

  // Statistics
  get totalProjects(): number {
    return this.projects.length;
  }

  get totalTasks(): number {
    return this.recentTasks.length;
  }

  get inProgressTasks(): number {
    return this.recentTasks.filter(t => t.status === 'In Progress').length;
  }

  get completedTasks(): number {
    return this.recentTasks.filter(t => t.status === 'Completed').length;
  }

  get totalEmployees(): number {
    return this.employees.length;
  }

  // Get project name by ID
  getProjectName(projectId: string | number): string {
    const project = this.projects.find(p => p._id === projectId || p.id === projectId);
    return project ? (project.projectName || project.name) : 'Unknown';
  }

  // Get employee name by ID
  getEmployeeName(employeeId: string | number): string {
    const employee = this.employees.find(e => e.id === employeeId || e._id === employeeId);
    return employee ? employee.name : 'Unassigned';
  }

  // Progress color
  getProgressColor(progress: number): string {
    if (progress >= 75) return '#28a745';
    if (progress >= 50) return '#ffc107';
    if (progress >= 25) return '#fd7e14';
    return '#dc3545';
  }

  // Workload color
  getWorkloadClass(workload: string): string {
    switch (workload) {
      case 'High': return 'workload-high';
      case 'Medium': return 'workload-medium';
      case 'Low': return 'workload-low';
      default: return '';
    }
  }

  // Status class
  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-progress';
      case 'On Hold': return 'status-hold';
      default: return '';
    }
  }

  // Task status class
  getTaskStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'task-completed';
      case 'In Progress': return 'task-progress';
      case 'To Do': return 'task-todo';
      default: return '';
    }
  }

  // Priority class
  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  }

  logout(): void {
    this.router.navigate(['/']);
  }

  // ── Geo-Fenced Compact Punch Logic ──
  officeCoords = { lat: 17.440861, lng: 78.395125 };
  geofenceRadius = 150;
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
          this.verifyLocation(17.440861, 78.395125); // Office
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

  // ── Personal To-Do & Meeting Notes Pad Handlers ──
  loadPersonalData(): void {
    const userId = this.getUserId();
    
    // Load To-Dos
    const savedTodos = localStorage.getItem('personalTodos_' + userId);
    if (savedTodos) {
      try {
        this.personalTodos = JSON.parse(savedTodos);
      } catch (e) {
        this.personalTodos = [];
      }
    } else {
      this.personalTodos = [
        { id: '1', text: '🔔 Clock in & verify GPS attendance', completed: false, createdAt: new Date().toISOString() },
        { id: '2', text: '📊 Review active team task backlog', completed: false, createdAt: new Date().toISOString() },
        { id: '3', text: '🔒 Inspect remote punch requests for approval', completed: false, createdAt: new Date().toISOString() }
      ];
      this.savePersonalTodos();
    }

    // Load Meeting Notes
    const savedNotes = localStorage.getItem('meetingNotes_' + userId);
    this.meetingNotes = savedNotes || '';
  }

  savePersonalTodos(): void {
    const userId = this.getUserId();
    localStorage.setItem('personalTodos_' + userId, JSON.stringify(this.personalTodos));
  }

  saveMeetingNotes(): void {
    const userId = this.getUserId();
    localStorage.setItem('meetingNotes_' + userId, this.meetingNotes);
  }

  addPersonalTodo(): void {
    if (!this.newTodoText.trim()) return;
    const newTodo = {
      id: Date.now().toString(),
      text: this.newTodoText.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    this.personalTodos.push(newTodo);
    this.newTodoText = '';
    this.savePersonalTodos();
  }

  togglePersonalTodo(todo: any): void {
    todo.completed = !todo.completed;
    if (todo.completed) {
      this.playSuccessChime();
    }
    this.savePersonalTodos();
  }

  deletePersonalTodo(id: string): void {
    this.personalTodos = this.personalTodos.filter(t => t.id !== id);
    this.savePersonalTodos();
  }

  clearCompletedPersonalTodos(): void {
    this.personalTodos = this.personalTodos.filter(t => !t.completed);
    this.savePersonalTodos();
  }

  convertNotesToTodos(): void {
    if (!this.meetingNotes.trim()) {
      alert('Notepad is empty! Type some meeting notes or bullet points first.');
      return;
    }

    const lines = this.meetingNotes.split('\n');
    let addedCount = 0;

    lines.forEach(line => {
      let trimmed = line.trim();
      trimmed = trimmed.replace(/^[-*•]\s*/, '');
      trimmed = trimmed.replace(/^\d+[\.)]\s*/, '');
      
      if (trimmed.length > 0) {
        const isDup = this.personalTodos.some(t => t.text.toLowerCase() === trimmed.toLowerCase());
        if (!isDup) {
          this.personalTodos.push({
            id: (Date.now() + addedCount).toString(),
            text: trimmed,
            completed: false,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      this.savePersonalTodos();
      this.playSuccessChime();
      this.activeTab = 'todos';
      alert(`⚡ Success! Converted ${addedCount} meeting lines into checkable daily To-Dos!`);
    } else {
      alert('All lines are already in your To-Do list.');
    }
  }

  generateAIPersonalTodos(): void {
    this.isGeneratingPersonalTodos = true;
    
    // Generate specialized Manager daily task items based on active project names
    setTimeout(() => {
      this.isGeneratingPersonalTodos = false;
      
      const managerAITasks: string[] = [];
      if (this.projects.length > 0) {
        const p1 = this.projects[0];
        managerAITasks.push(`Review overall timeline and progress for project "${p1.projectName || p1.name}"`);
        managerAITasks.push(`Check assigned assignees workload statuses for "${p1.projectName || p1.name}"`);
      } else {
        managerAITasks.push('Conduct project roadmap estimations alignment audit');
      }

      if (this.recentTasks.length > 0) {
        const unassigned = this.recentTasks.filter(t => !t.assignedTo);
        if (unassigned.length > 0) {
          managerAITasks.push(`Assign open team backlog task: "${unassigned[0].title}"`);
        }
        const highPriority = this.recentTasks.filter(t => t.priority === 'High' && t.status !== 'Completed');
        if (highPriority.length > 0) {
          managerAITasks.push(`Follow up with assignee on High Priority task: "${highPriority[0].title}"`);
        }
      }

      managerAITasks.push('Audit employee attendance logs and approve pending remote work requests');
      managerAITasks.push('Schedule daily standup meeting and post notes details');
      
      let added = 0;
      managerAITasks.forEach(taskText => {
        const isDup = this.personalTodos.some(t => t.text.toLowerCase() === taskText.toLowerCase());
        if (!isDup) {
          this.personalTodos.push({
            id: Date.now().toString() + '-' + added,
            text: '🤖 ' + taskText,
            completed: false,
            createdAt: new Date().toISOString()
          });
          added++;
        }
      });

      if (added > 0) {
        this.savePersonalTodos();
        this.playSuccessChime();
      }
      alert('🤖 AI Co-Pilot analyzed active projects & tasks to generate manager daily tasks!');
    }, 1500);
  }
}
