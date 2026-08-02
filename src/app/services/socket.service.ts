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

    const token = localStorage.getItem('accessToken');
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

  on(eventName: string, callback: (data: any) => void): void {
    if (!this.socket) {
      this.connect();
    }
    const sock = this.socket;
    if (sock) {
      sock.on(eventName, callback);
    }
  }

  off(eventName: string): void {
    const sock = this.socket;
    if (sock) {
      sock.off(eventName);
    }
  }

  listen<T = any>(eventName: string): Subject<T> {
    const subject = new Subject<T>();
    if (!this.socket) {
      this.connect();
    }
    const sock = this.socket;
    if (sock) {
      sock.on(eventName, (data: T) => subject.next(data));
    }
    return subject;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
