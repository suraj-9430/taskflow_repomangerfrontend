import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { SocketService } from '../services/socket.service';

@Component({
  selector: 'app-chat-channels',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-channels.html',
  styleUrl: './chat-channels.css'
})
export class ChatChannels implements OnInit, OnDestroy {
  projects: any[] = [];
  activeProject: any = null;
  messages: any[] = [];
  messageText: string = '';
  usersList: any[] = [];
  isSending: boolean = false;

  quickReplies: string[] = [
    'Acknowledged. On it!',
    'Let’s schedule a brief sync.',
    'PR is ready for review.',
    'Blocked on this. Need help.'
  ];

  constructor(private http: HttpClient, private socketService: SocketService) {}

  ngOnInit(): void {
    this.fetchProjects();
    this.fetchUsers();
    this.socketService.connect();

    // Listen to live channel updates
    this.socketService.onNewComment((msg: any) => {
      // General listener handles channel updates if event name matches or custom events triggered
    });

    // Custom connection listener for project chat messages
    (this.socketService as any).socket?.on('new_channel_message', (msg: any) => {
      if (msg && msg.channelType === 'project' && String(msg.targetId) === String(this.activeProject?._id)) {
        const exists = this.messages.some(m => m._id === msg._id);
        if (!exists) {
          this.messages.push(msg);
          this.scrollToBottom();
        }
      }
    });

    // Listen to live mentions
    (this.socketService as any).socket?.on('new_mention', (data: any) => {
      alert(`🔔 Mentioned by ${data.senderName} inside ${data.channelType}: "${data.content}"`);
    });
  }

  ngOnDestroy(): void {
    if (this.activeProject) {
      this.socketService.leaveTask(this.activeProject._id); // Reuses leave room socket helpers
    }
  }

  getLoggedInUser(): any {
    return JSON.parse(localStorage.getItem('user') || '{}');
  }

  fetchProjects(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/projects`, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.projects = res.data || [];
          if (this.projects.length > 0) {
            this.selectProject(this.projects[0]);
          }
        }
      },
      error: (err) => console.error('Failed to fetch projects', err)
    });
  }

  fetchUsers(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<any>(`${environment.apiUrl}/users`, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.usersList = res.data || [];
        }
      },
      error: (err) => console.error('Failed to fetch users', err)
    });
  }

  selectProject(project: any): void {
    if (this.activeProject) {
      // Leave previous project room
      (this.socketService as any).socket?.emit('leave_project', this.activeProject._id);
    }

    this.activeProject = project;
    this.messages = [];
    
    // Join new project room
    (this.socketService as any).socket?.emit('join_project', project._id);
    this.fetchMessages();
  }

  fetchMessages(): void {
    if (!this.activeProject) return;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${environment.apiUrl}/chats/project/${this.activeProject._id}`, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.messages = res.data || [];
          this.scrollToBottom();
        }
      },
      error: (err) => console.error('Failed to fetch chat messages', err)
    });
  }

  sendMessage(overrideText?: string): void {
    const textToSend = overrideText || this.messageText;
    if (!textToSend.trim() || !this.activeProject || this.isSending) return;

    this.isSending = true;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // Extract mentions (e.g. '@John')
    const mentions: string[] = [];
    this.usersList.forEach(u => {
      if (textToSend.includes(`@${u.firstName}`)) {
        mentions.push(u._id);
      }
    });

    const payload = {
      channelType: 'project',
      targetId: this.activeProject._id,
      content: textToSend,
      mentions,
      quickReply: !!overrideText
    };

    this.http.post<any>(`${environment.apiUrl}/chats`, payload, { headers }).subscribe({
      next: (res) => {
        this.isSending = false;
        if (res.success) {
          if (!overrideText) this.messageText = '';
          const exists = this.messages.some(m => m._id === res.data._id);
          if (!exists) {
            this.messages.push(res.data);
            this.scrollToBottom();
          }
        }
      },
      error: (err) => {
        console.error('Failed to send message', err);
        this.isSending = false;
      }
    });
  }

  sendQuickReply(reply: string): void {
    this.sendMessage(reply);
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('chat-history-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }
}
