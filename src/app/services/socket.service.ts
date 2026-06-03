import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  public newNotification$ = new Subject<any>();

  constructor() {}

  connect(): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to the backend
    // Assumes environment.apiUrl is like "http://localhost:5000/api"
    // We want the domain root for socket.io
    const serverUrl = environment.apiUrl.replace(/\/api\/?$/, '');

    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket server');
    });

    this.socket.on('new_notification', (data: any) => {
      console.log('🔔 New Notification received via WebSocket:', data);
      this.newNotification$.next(data);
    });
  }

  joinTask(taskId: string): void {
    if (this.socket) {
      this.socket.emit('join_task', taskId);
      console.log(`📡 Emitted join_task for task: ${taskId}`);
    }
  }

  leaveTask(taskId: string): void {
    if (this.socket) {
      this.socket.emit('leave_task', taskId);
      console.log(`📡 Emitted leave_task for task: ${taskId}`);
    }
  }

  onNewComment(callback: (comment: any) => void): void {
    if (this.socket) {
      this.socket.on('new_comment', callback);
    }
  }

  offNewComment(): void {
    if (this.socket) {
      this.socket.off('new_comment');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
