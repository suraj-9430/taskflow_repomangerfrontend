import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  // Tabs
  activeTab: 'profile' | 'notifications' | 'preferences' = 'profile';

  // Profile data
  profile = {
    fullName: 'Suraj Kumar',
    email: 'suraj@taskflow.pro',
    phone: '',
    title: '',
    department: '',
    bio: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
  };

  // Notification Preferences
  notifications = {
    emailUpdates: true,
    pushAlerts: false,
    taskAssigned: true,
    statusChanged: true,
    deadlineAlerts: true,
    weeklySummary: false
  };

  // UI preferences
  preferences = {
    themeColor: 'amber',
    density: 'cozy',
    soundEffects: true,
    sidebarExpanded: true,
    animationsEnabled: true
  };

  // Action states
  isSaving = false;
  showToast = false;
  toastMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchUserProfile();
  }

  fetchUserProfile(): void {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${environment.apiUrl}/users/profile`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const user = res.data;
          
          this.profile.fullName = `${user.firstName} ${user.lastName}`;
          this.profile.email = user.email;
          this.profile.phone = user.contactNumber || '';
          this.profile.title = user.designation || '';
          this.profile.department = user.department || '';
          this.profile.bio = user.bio || '';
          if (user.avatar) {
            this.profile.avatar = user.avatar;
          }

          // Load nested settings if configured on backend
          if (user.settings) {
            if (user.settings.notifications) {
              this.notifications = { ...this.notifications, ...user.settings.notifications };
            }
            if (user.settings.preferences) {
              this.preferences = { ...this.preferences, ...user.settings.preferences };
              // Apply theme instantly
              this.applyTheme(this.preferences.themeColor);
            }
          }
        }
      },
      error: (err) => {
        console.error('Failed to fetch user profile', err);
      }
    });
  }

  setTab(tab: 'profile' | 'notifications' | 'preferences'): void {
    this.activeTab = tab;
  }

  onAvatarChange(event: Event): void {
    // Demo uploader: for custom image change, let's allow editing avatar input string
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profile.avatar = e.target.result;
        this.triggerToast('Avatar preview updated! Press Save to commit changes.');
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  saveSettings(): void {
    this.isSaving = true;
    
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // Split name
    const nameParts = this.profile.fullName.trim().split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || ' ';

    const payload = {
      firstName,
      lastName,
      contactNumber: this.profile.phone,
      avatar: this.profile.avatar,
      bio: this.profile.bio,
      settings: {
        notifications: this.notifications,
        preferences: this.preferences
      }
    };

    this.http.put<any>(`${environment.apiUrl}/users/profile`, payload, { headers }).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.success) {
          // Save locally
          localStorage.setItem('themeColor', this.preferences.themeColor);
          this.applyTheme(this.preferences.themeColor);
          this.triggerToast('Settings updated successfully!');
        }
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Failed to save settings', err);
        this.triggerToast('Failed to save settings. Please try again.');
      }
    });
  }

  applyTheme(color: string): void {
    const body = document.body;
    const classesToRemove = Array.from(body.classList).filter(c => c.startsWith('theme-'));
    classesToRemove.forEach(c => body.classList.remove(c));
    body.classList.add(`theme-${color}`);
  }

  triggerToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}
