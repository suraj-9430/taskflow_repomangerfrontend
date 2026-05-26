import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Projectservice } from '../../manager/projects/projectservice';
import { AiService } from '../../services/ai.service';

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

  constructor(private http: HttpClient, private projectservice: Projectservice, private aiService: AiService) {}

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

  // ── Employee Kanban Drag & Drop ──
  draggedTask: any = null;
  activeDragColumn: string | null = null;

  onDragStart(task: any): void {
    this.draggedTask = task;
  }

  onDragEnd(): void {
    this.draggedTask = null;
    this.activeDragColumn = null;
  }

  onDragOver(event: DragEvent, column: string): void {
    event.preventDefault(); // Required to allow drop
    this.activeDragColumn = column;
  }

  onDragLeave(event: DragEvent, column: string): void {
    if (this.activeDragColumn === column) {
      this.activeDragColumn = null;
    }
  }

  onDrop(event: DragEvent, newStatus: string): void {
    event.preventDefault();
    this.activeDragColumn = null;
    if (this.draggedTask && this.draggedTask.status !== newStatus) {
      const task = this.draggedTask;
      task.status = newStatus; // Update local state for immediate feedback
      this.onStatusChange(task); // Triggers API call and chime sound effects!
    }
    this.draggedTask = null;
  }

  // ── Employee Task List Helpers ──
  getTasksByStatus(status: string): any[] {
    return this.filteredTasks.filter(t => t.status === status);
  }

  // ── AI Workflow Assistant Functions ──
  isGeneratingBreakdown: boolean = false;

  generateAIBreakdown(task: any): void {
    if (!task.title) return;
    this.isGeneratingBreakdown = true;
    this.aiService.generateBreakdown(task.title, task.description).subscribe({
      next: (subtasks) => {
        this.isGeneratingBreakdown = false;
        
        let formattedChecklist = '\n\n📋 Suggested AI Subtasks:\n';
        subtasks.forEach(step => {
          formattedChecklist += `- [ ] ${step}\n`;
        });
        
        // Find in tasks array
        const found = this.myTasks.find(t => t.id === task.id);
        if (found) {
          if (!found.description.includes('📋 Suggested AI Subtasks:')) {
            found.description = found.description.trim() + formattedChecklist;
          } else {
            const parts = found.description.split('📋 Suggested AI Subtasks:');
            found.description = parts[0].trim() + formattedChecklist;
          }
          
          // Save back to backend!
          const token = localStorage.getItem('token');
          const headers = { Authorization: `Bearer ${token}` };
          this.http.put<any>(`${environment.apiUrl}/tasks/${found.id}`, { description: found.description }, { headers }).subscribe({
            next: () => console.log('Subtask checklist saved to description!'),
            error: (err) => console.error('Failed to save description update to database', err)
          });
        }
      },
      error: (err) => {
        this.isGeneratingBreakdown = false;
        console.error('Failed to generate AI breakdown', err);
      }
    });
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
}
