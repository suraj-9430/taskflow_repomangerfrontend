import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'task' | 'project' | 'alert' | 'system';
  isRead: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications implements OnInit {
  notifications: NotificationItem[] = [];
  activeFilter: 'all' | 'unread' | 'task' | 'project' | 'alert' | 'system' = 'all';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchNotifications();
  }

  fetchNotifications(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${environment.apiUrl}/notifications`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.notifications = res.data.map((n: any) => ({
            id: n._id,
            title: n.title,
            message: n.message,
            time: this.formatTime(n.createdAt),
            type: n.type,
            isRead: n.isRead
          }));
        }
      },
      error: (err) => {
        console.error('Failed to fetch notifications', err);
      }
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  get filteredNotifications(): NotificationItem[] {
    if (this.activeFilter === 'all') {
      return this.notifications;
    }
    if (this.activeFilter === 'unread') {
      return this.notifications.filter(n => !n.isRead);
    }
    return this.notifications.filter(n => n.type === this.activeFilter);
  }

  setFilter(filter: any): void {
    this.activeFilter = filter;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  getTypeCount(type: 'task' | 'project' | 'alert' | 'system'): number {
    return this.notifications.filter(n => n.type === type).length;
  }

  markAsRead(notification: NotificationItem): void {
    if (notification.isRead) return;

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.put<any>(`${environment.apiUrl}/notifications/${notification.id}/read`, {}, { headers }).subscribe({
      next: () => {
        notification.isRead = true;
      },
      error: (err) => {
        console.error('Failed to mark notification as read', err);
      }
    });
  }

  toggleReadStatus(notification: NotificationItem, event: MouseEvent): void {
    event.stopPropagation();
    
    // Toggle state on backend
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // Since we only have a read endpoint, if they mark as unread, we mock it locally
    // or hit the same read endpoint. If they want to toggle read state:
    if (!notification.isRead) {
      this.http.put<any>(`${environment.apiUrl}/notifications/${notification.id}/read`, {}, { headers }).subscribe({
        next: () => {
          notification.isRead = true;
        },
        error: (err) => console.error(err)
      });
    } else {
      // Mock toggling to unread in frontend since it's just for demo (or backend does not have unread endpoint)
      notification.isRead = false;
    }
  }

  markAllAsRead(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.put<any>(`${environment.apiUrl}/notifications/mark-all-read`, {}, { headers }).subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
      },
      error: (err) => {
        console.error('Failed to mark all as read', err);
      }
    });
  }

  deleteNotification(id: string, event: MouseEvent): void {
    event.stopPropagation();
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.delete<any>(`${environment.apiUrl}/notifications/${id}`, { headers }).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== id);
      },
      error: (err) => {
        console.error('Failed to delete notification', err);
      }
    });
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'task': return 'fa-solid fa-list-check';
      case 'project': return 'fa-solid fa-diagram-project';
      case 'alert': return 'fa-solid fa-triangle-exclamation';
      default: return 'fa-solid fa-circle-info';
    }
  }
}
