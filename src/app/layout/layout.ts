import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { AiService } from '../services/ai.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass, CommonModule, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout implements OnInit {
  isSidebarHidden = false;
  isMobileSidebarOpen = false;
  isManagerView = false;
  isEmployeeView = false;
  isAdminView = false;

  private authService = inject(AuthService);

  constructor(private router: Router, private http: HttpClient, private aiService: AiService) {}

  ngOnInit(): void {
    this.checkRoute();
    this.router.events.subscribe(() => {
      this.checkRoute();
    });
    
  }

  checkRoute(): void {
    const url = this.router.url;
    this.isManagerView = url.includes('manager-dashboard');
    this.isEmployeeView = url.includes('employee-dashboard');
    this.isAdminView = !this.isManagerView && !this.isEmployeeView;
    this.isMobileSidebarOpen = false;
  }

  toggleSidebar() {
    this.isSidebarHidden = !this.isSidebarHidden;
  }

  toggleMobileSidebar() {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  getDashboardPrefix(): string {
    if (this.isManagerView) return '/manager-dashboard';
    if (this.isEmployeeView) return '/employee-dashboard';
    return '/dashboard';
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Logout failed', err);
        this.router.navigate(['/']);
      }
    });
  }

  // ── AI Co-Pilot State & Controls ──
  showAiDrawer = false;
  aiMessages: { sender: 'user' | 'assistant'; text: string; time: Date }[] = [];
  userInput = '';
  isAiTyping = false;

  toggleAiDrawer(): void {
    this.showAiDrawer = !this.showAiDrawer;
    if (this.showAiDrawer && this.aiMessages.length === 0) {
      this.loadWelcomeMessage();
    }
  }

  loadWelcomeMessage(): void {
    this.isAiTyping = true;
    setTimeout(() => {
      this.isAiTyping = false;
      const user = this.authService.currentUserValue;
      const firstName = user?.firstName || 'Team Member';
      this.aiMessages.push({
        sender: 'assistant',
        text: `### ⚡ Welcome to TaskFlow Co-Pilot, ${firstName}!
I am your **AI Workflow Assistant**. I have fully scanned the local projects and tasks in your workspace.

Ask me anything, or try these quick suggestions:
* 📊 **"Summarize my workload"**
* 🚀 **"Prioritize my today's tasks"**
* 💡 **"Explain a bug checklist"**`,
        time: new Date()
      });
      this.scrollAiToBottom();
    }, 600);
  }

  sendAiMessage(): void {
    if (!this.userInput.trim() || this.isAiTyping) return;

    const userQuery = this.userInput;
    this.aiMessages.push({
      sender: 'user',
      text: userQuery,
      time: new Date()
    });
    this.userInput = '';
    this.isAiTyping = true;
    this.scrollAiToBottom();

    this.aiService.chatWithAssistant(userQuery).subscribe({
      next: (response) => {
        this.isAiTyping = false;
        this.aiMessages.push({
          sender: 'assistant',
          text: response,
          time: new Date()
        });
        this.scrollAiToBottom();
      },
      error: (err) => {
        this.isAiTyping = false;
        this.aiMessages.push({
          sender: 'assistant',
          text: `### ⚠️ API Response Error
I encountered a network issue contacting the AI interface. Here is my local offline response:

*Ensure your local API backend is active! Let me know if you would like me to draft your priorities locally.*`,
          time: new Date()
        });
        this.scrollAiToBottom();
      }
    });
  }

  askQuickQuestion(questionText: string): void {
    this.userInput = questionText;
    this.sendAiMessage();
  }

  scrollAiToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('ai-chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }
}
