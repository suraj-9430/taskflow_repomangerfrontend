import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Projectservice } from '../../manager/projects/projectservice';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-tasks.html',
  styleUrl: './my-tasks.css',
})
export class MyTasks implements OnInit {
  // Filter
  searchTerm: string = '';
  statusFilter: string = 'all';
  priorityFilter: string = 'all';
  
  // Tasks assigned to this employee
  myTasks: any[] = [];
  filteredTasks: any[] = [];

  // Chat Modal
  showChatModal: boolean = false;
  activeChatTask: any = null;
  chatComments: any[] = [];
  newMessageText: string = '';
  isSendingMessage: boolean = false;

  constructor(private http: HttpClient, private projectservice: Projectservice) {}

  ngOnInit(): void {
    this.fetchMyTasks();
  }

  fetchMyTasks(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${environment.apiUrl}/tasks`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            const activeUserId = user.id;

            // Filter tasks assigned to the logged-in user
            this.myTasks = res.data.filter((t: any) => t.assignedTo && t.assignedTo._id === activeUserId)
              .map((t: any) => ({
                id: t._id,
                title: t.title,
                description: t.description || 'No description provided.',
                projectName: t.projectId ? t.projectId.projectName : 'Unassigned Project',
                projectId: t.projectId ? t.projectId._id : null,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'N/A',
                createdDate: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : 'N/A'
              }));

            this.filterTasks();
          }
        }
      },
      error: (err) => {
        console.error('Failed to fetch tasks', err);
      }
    });
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

  // Filter tasks
  filterTasks(): void {
    this.filteredTasks = this.myTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           task.projectName.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.statusFilter === 'all' || task.status === this.statusFilter;
      const matchesPriority = this.priorityFilter === 'all' || task.priority === this.priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.filterTasks();
  }

  // Status change handler - save to database!
  onStatusChange(task: any): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.put<any>(`${environment.apiUrl}/tasks/${task.id}`, { status: task.status }, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          console.log(`Task "${task.title}" status updated to: ${task.status}`);
          this.filterTasks();
          
          if (task.status === 'Completed') {
            this.playSuccessChime();
          }
        }
      },
      error: (err) => {
        console.error('Failed to update task status in database', err);
      }
    });
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

  // Helper methods
  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-progress';
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

  isOverdue(dueDate: string, status: string): boolean {
    if (dueDate === 'N/A' || status === 'Completed') return false;
    return new Date(dueDate) < new Date();
  }

  getLoggedInUserId(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || user.id || '';
  }

  // Task Discussion / Chat Modal Methods
  openChatModal(task: any): void {
    // Make sure we have the correct ID shape
    const normalizedTask = { ...task, _id: task.id || task._id };
    this.activeChatTask = normalizedTask;
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
}
