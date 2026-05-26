import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Projectservice } from '../manager/projects/projectservice';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AiService } from '../services/ai.service';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css',
})
export class EmployeeDashboard implements OnInit {
  constructor(
    private router: Router, 
    private projectservice: Projectservice,
    private http: HttpClient,
    private aiService: AiService
  ) {}

  // Current Employee Info
  currentEmployee: any = {};
  unreadCount: number = 0;

  // Projects assigned to this employee
  myProjects: any[] = [];

  // Tasks assigned to this employee
  myTasks: any[] = [];

  // Filter
  statusFilter: string = 'all';
  filteredTasks: any[] = [];

  // Chat Modal
  showChatModal: boolean = false;
  activeChatTask: any = null;
  chatComments: any[] = [];
  newMessageText: string = '';
  isSendingMessage: boolean = false;

  // ── Geo-Fenced Coordinates Attendance System State ──
  officeCoords = { lat: 17.440861, lng: 78.395125 }; // Configurable Target Office Coordinates (User custom location)
  geofenceRadius = 150; // Geofencing boundary in meters
  currentCoords: { lat: number | null; lng: number | null } = { lat: null, lng: null };
  calculatedDistance: number | null = null;
  isCheckingLocation = false;
  clockStatus: 'Clocked Out' | 'Office Present' | 'Remote Present' = 'Clocked Out';
  attendanceMessage = '';
  attendanceLogs: any[] = [];
  isMockMode = true; // Enabled by default for easy demo testing
  mockPreset: 'office' | 'remote' = 'office';

  // ── Personal Daily To-Do & Meeting Notes State ──
  personalTodos: any[] = [];
  newTodoText: string = '';
  meetingNotes: string = '';
  activeTab: 'todos' | 'notes' = 'todos';
  isGeneratingPersonalTodos: boolean = false;

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.currentEmployee = {
      id: user._id || user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.designation || 'Employee',
      department: 'Engineering', 
      phone: user.phone || '+1 234-567-8901',
      joinDate: user.createdAt || new Date().toISOString(),
      avatar: user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U',
      avatarUrl: user.avatar || ''
    };
    
    this.loadEmployeeProfile();
    this.loadUnreadCount();
    this.loadData();
    this.loadAttendanceState();
    this.loadPersonalData();
  }

  loadEmployeeProfile(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/users/profile`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const user = res.data;
          this.currentEmployee.name = `${user.firstName} ${user.lastName}`;
          this.currentEmployee.email = user.email;
          this.currentEmployee.phone = user.contactNumber || '';
          this.currentEmployee.role = user.designation || 'Employee';
          this.currentEmployee.department = user.department || 'Engineering';
          this.currentEmployee.avatar = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U';
          this.currentEmployee.avatarUrl = user.avatar || '';

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
      error: (err) => console.error('Error fetching employee profile', err)
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
    // Load Projects
    this.projectservice.getAllProjects().subscribe({
      next: (res: any) => {
        const allProjects = res.data || [];
        // Filter projects where I am assigned
        this.myProjects = allProjects.filter((p: any) => 
          (p.assignees || []).some((a: any) => String(a._id || a) === String(this.currentEmployee.id))
        );

        // Load Tasks
        this.projectservice.getAllTasks().subscribe({
          next: (taskRes: any) => {
            const allTasks = taskRes.data || [];
            // Filter tasks where I am assigned
            this.myTasks = allTasks.filter((t: any) => 
              String(t.assignedTo?._id || t.assignedTo) === String(this.currentEmployee.id)
            ).map((t: any) => {
              // Normalize ids for frontend use
              const projectId = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
              return { ...t, projectId, _id: t._id };
            });
            this.filterTasks(this.statusFilter);
          },
          error: err => console.error('Error fetching tasks', err)
        });
      },
      error: err => console.error('Error fetching projects', err)
    });
  }

  getProjectName(projectId: string): string {
    const p = this.myProjects.find(proj => proj._id === projectId || proj.id === projectId);
    return p ? p.projectName || p.name : 'Unknown';
  }

  getProjectTasksCount(projectId: string): number {
    return this.myTasks.filter(t => t.projectId === projectId).length;
  }

  // Statistics
  get totalTasks(): number {
    return this.myTasks.length;
  }

  get todoTasks(): number {
    return this.myTasks.filter(t => t.status === 'To Do').length;
  }

  get inProgressTasks(): number {
    return this.myTasks.filter(t => t.status === 'In Progress').length;
  }

  get completedTasks(): number {
    return this.myTasks.filter(t => t.status === 'Completed').length;
  }

  get totalProjects(): number {
    return this.myProjects.length;
  }

  get completionRate(): number {
    if (this.totalTasks === 0) return 0;
    return Math.round((this.completedTasks / this.totalTasks) * 100);
  }

  // Filter tasks
  filterTasks(status: string): void {
    this.statusFilter = status;
    if (status === 'all') {
      this.filteredTasks = [...this.myTasks];
    } else {
      this.filteredTasks = this.myTasks.filter(t => t.status === status);
    }
  }

  // Called when status dropdown changes
  onStatusChange(task: any): void {
    // Status is already updated via ngModel binding
    // Re-filter if needed to update the view
    if (this.statusFilter !== 'all' && task.status !== this.statusFilter) {
      this.filteredTasks = this.filteredTasks.filter(t => t._id !== task._id);
    }
    
    // Call backend to update status
    this.projectservice.updateTask(task._id, { status: task.status }).subscribe({
      next: () => {
        console.log(`Task updated to ${task.status}`);
        if (task.status === 'Completed') {
          this.playSuccessChime();
        }
      },
      error: err => console.error('Error updating task status', err)
    });
    console.log(`Task "${task.title}" status changed to: ${task.status}`);
  }

  // Update task status
  updateTaskStatus(task: any, newStatus: string): void {
    const index = this.myTasks.findIndex(t => t._id === task._id);
    if (index !== -1) {
      this.myTasks[index].status = newStatus;
      this.filterTasks(this.statusFilter);
      
      this.projectservice.updateTask(task._id, { status: newStatus }).subscribe({
        next: () => {
          console.log('Task status updated successfully');
          if (newStatus === 'Completed') {
            this.playSuccessChime();
          }
        },
        error: err => console.error('Error updating task status', err)
      });
    }
  }

  playSuccessChime(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const soundEnabled = user.settings?.preferences?.soundEffects ?? true;
      if (!soundEnabled) return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      if (context.state === 'suspended') {
        context.resume();
      }
      
      // Chime note 1 (C5)
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

      // Chime note 2 (E5, slightly delayed for a beautiful musical chime)
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
    } catch (e) {
      console.warn('Web Audio API not supported or blocked by browser policy:', e);
    }
  }

  // Move task to next status
  moveToNextStatus(task: any): void {
    if (task.status === 'To Do') {
      this.updateTaskStatus(task, 'In Progress');
    } else if (task.status === 'In Progress') {
      this.updateTaskStatus(task, 'Completed');
    }
  }

  // Move task to previous status
  moveToPreviousStatus(task: any): void {
    if (task.status === 'In Progress') {
      this.updateTaskStatus(task, 'To Do');
    } else if (task.status === 'Completed') {
      this.updateTaskStatus(task, 'In Progress');
    }
  }

  // Get tasks by status for Kanban
  getTasksByStatus(status: string): any[] {
    return this.myTasks.filter(t => t.status === status);
  }

  // Helper methods
  getProgressColor(progress: number): string {
    if (progress >= 75) return '#28a745';
    if (progress >= 50) return '#ffc107';
    if (progress >= 25) return '#fd7e14';
    return '#dc3545';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-progress';
      case 'On Hold': return 'status-hold';
      case 'To Do': return 'status-todo';
      default: return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }

  logout(): void {
    this.router.navigate(['/']);
  }

  getLoggedInUserId(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || user.id || '';
  }

  // Task Discussion / Chat Modal Methods
  openChatModal(task: any): void {
    this.activeChatTask = task;
    this.chatComments = [];
    this.newMessageText = '';
    this.showChatModal = true;
    this.loadChatComments();
  }

  closeChatModal(): void {
    this.showChatModal = false;
    this.activeChatTask = null;
    this.chatComments = [];
  }

  loadChatComments(): void {
    if (!this.activeChatTask) return;
    this.projectservice.getTaskComments(this.activeChatTask._id).subscribe({
      next: (res: any) => {
        this.chatComments = res.data || [];
        this.scrollToBottom();
      },
      error: err => console.error('Error fetching comments', err)
    });
  }

  sendChatMessage(): void {
    if (!this.newMessageText.trim() || !this.activeChatTask || this.isSendingMessage) return;
    this.isSendingMessage = true;
    
    const senderId = this.getLoggedInUserId();
    const payload = {
      senderId,
      content: this.newMessageText
    };

    this.projectservice.createTaskComment(this.activeChatTask._id, payload).subscribe({
      next: (res: any) => {
        this.newMessageText = '';
        this.isSendingMessage = false;
        this.chatComments.push(res.data);
        this.scrollToBottom();
      },
      error: err => {
        console.error('Error sending message', err);
        this.isSendingMessage = false;
      }
    });
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  // ── Geo-Fenced Compact Punch Logic ──
  pendingCoords = { lat: 0, lng: 0 };
  geofenceDistance = 0;

  getUserId(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || user.id || 'anonymous';
  }

  loadAttendanceState(): void {
    const userId = this.getUserId();
    this.clockStatus = (localStorage.getItem('clockStatus_' + userId) as any) || 'Clocked Out';
    const savedLogs = localStorage.getItem('attendanceLogs_' + userId);
    if (savedLogs) {
      try { this.attendanceLogs = JSON.parse(savedLogs); } catch(e) {}
    }
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
    this.attendanceLogs = logs; // sync to binding

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

  getActualDescription(description: string): string {
    if (!description) return '';
    const index = description.indexOf('📋 Suggested AI Subtasks:');
    if (index === -1) return description;
    return description.substring(0, index).trim();
  }

  hasAISuggestions(description: string): boolean {
    if (!description) return false;
    return description.includes('📋 Suggested AI Subtasks:');
  }

  getAISuggestions(description: string): { text: string; completed: boolean }[] {
    if (!description) return [];
    const index = description.indexOf('📋 Suggested AI Subtasks:');
    if (index === -1) return [];
    const suggestionPart = description.substring(index + '📋 Suggested AI Subtasks:'.length);
    return suggestionPart
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        const match = trimmed.match(/^-\s*\[\s*([ xX])\s*\]\s*(.*)$/);
        if (!match) return null;
        return {
          text: match[2].trim(),
          completed: match[1].toLowerCase() === 'x'
        };
      })
      .filter((item): item is { text: string; completed: boolean } => item !== null && item.text.length > 0);
  }

  toggleAISubtask(task: any, indexToToggle: number): void {
    if (!task.description) return;
    const headerIndex = task.description.indexOf('📋 Suggested AI Subtasks:');
    if (headerIndex === -1) return;

    const baseDescription = task.description.substring(0, headerIndex).trim();
    const suggestionPart = task.description.substring(headerIndex + '📋 Suggested AI Subtasks:'.length);
    
    const lines = suggestionPart.split('\n');
    let subtaskIndex = 0;
    
    const updatedLines = lines.map((line: string) => {
      const trimmed = line.trim();
      const match = trimmed.match(/^-\s*\[\s*([ xX])\s*\]\s*(.*)$/);
      if (!match) return line;
      
      if (subtaskIndex === indexToToggle) {
        const isCurrentCompleted = match[1].toLowerCase() === 'x';
        const newStatus = isCurrentCompleted ? ' ' : 'x';
        subtaskIndex++;
        
        if (newStatus === 'x') {
          this.playSuccessChime();
        }
        
        return `- [${newStatus}] ${match[2].trim()}`;
      }
      
      subtaskIndex++;
      return line;
    });

    const updatedDescription = baseDescription + '\n\n📋 Suggested AI Subtasks:\n' + updatedLines.join('\n');
    task.description = updatedDescription;

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const taskId = task.id || task._id;
    
    this.http.put<any>(`${environment.apiUrl}/tasks/${taskId}`, { description: updatedDescription }, { headers }).subscribe({
      next: () => console.log('Interactive subtask state successfully updated in MongoDB!'),
      error: (err: any) => console.error('Failed to update subtask check state in database', err)
    });
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
        { id: '2', text: '📋 Check today\'s assigned project tasks', completed: false, createdAt: new Date().toISOString() },
        { id: '3', text: '💬 Review discussion boards for manager feedback', completed: false, createdAt: new Date().toISOString() }
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
    const activeTasks = this.myTasks.filter(t => t.status === 'To Do' || t.status === 'In Progress');
    
    this.isGeneratingPersonalTodos = true;
    
    if (activeTasks.length === 0) {
      setTimeout(() => {
        this.isGeneratingPersonalTodos = false;
        const defaultAITasks = [
          'Log daily attendance punch status',
          'Review open pull requests in repository backlog',
          'Write code comments for recently implemented methods',
          'Organize visual layout structure for next meeting demo',
          'Check task board discussion threads for comments'
        ];
        let added = 0;
        defaultAITasks.forEach(taskText => {
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
        alert('🤖 AI Co-Pilot generated 5 daily engineering To-Dos for you!');
      }, 1500);
    } else {
      const firstTask = activeTasks[0];
      this.aiService.generateBreakdown(firstTask.title, firstTask.description).subscribe({
        next: (steps) => {
          this.isGeneratingPersonalTodos = false;
          let added = 0;
          steps.forEach((stepText, idx) => {
            const isDup = this.personalTodos.some(t => t.text.toLowerCase().includes(stepText.toLowerCase()));
            if (!isDup) {
              this.personalTodos.push({
                id: Date.now().toString() + '-' + idx,
                text: '🛠️ [' + firstTask.title.substring(0, 15) + '] ' + stepText,
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
          alert(`🤖 AI Co-Pilot analyzed "${firstTask.title}" and generated ${added} technical subtasks!`);
        },
        error: (err) => {
          this.isGeneratingPersonalTodos = false;
          console.error(err);
          alert('Failed to connect to AI engine. Defaulting to standard roadmap.');
        }
      });
    }
  }
}
