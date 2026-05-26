import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Projectservice } from '../projects/projectservice';
import { AiService } from '../../services/ai.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css',
})
export class Tasks implements OnInit {
  constructor(
    private projectservice: Projectservice,
    private aiService: AiService,
    private http: HttpClient
  ) {}
  // Search and Filter
  searchTerm: string = '';
  statusFilter: string = 'all';
  projectFilter: string = 'all';
  employeeFilter: string = 'all';

  // Real Data
  projects: any[] = [];
  employees: any[] = [];

  // Tasks Data
  tasks: any[] = [];

  filteredTasks: any[] = [];

  // Modal
  showModal: boolean = false;
  isEditing: boolean = false;
  currentTask: any = this.getEmptyTask();

  // Chat Modal
  showChatModal: boolean = false;
  activeChatTask: any = null;
  chatComments: any[] = [];
  newMessageText: string = '';
  isSendingMessage: boolean = false;

  ngOnInit(): void {
    this.filteredTasks = [...this.tasks];
    this.loadData();
  }

  getLoggedInUserId(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || user.id || '';
  }

  loadData(): void {
    // Load real tasks
    this.projectservice.getAllTasks().subscribe({
      next: (res: any) => {
        this.tasks = res.data.map((t: any) => {
          // Normalize IDs to strings since they might come back as full populated objects
          const projectId = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
          const assignedTo = typeof t.assignedTo === 'object' && t.assignedTo ? t.assignedTo._id : t.assignedTo;
          return { ...t, projectId, assignedTo };
        });
        this.filterTasks();
      },
      error: err => console.error('Error fetching tasks', err)
    });
    // Load real projects
    this.projectservice.getAllProjects().subscribe({
      next: (res: any) => {
        this.projects = res.data || [];
      },
      error: err => console.error('Error fetching projects', err)
    });

    // Load real employees
    this.projectservice.getEmployees().subscribe({
      next: (res: any) => {
        this.employees = res.data || [];
      },
      error: err => console.error('Error fetching employees', err)
    });
  }

  getEmptyTask(): any {
    return {
      _id: null,
      title: '',
      description: '',
      projectId: null,
      assignedTo: null,
      status: 'To Do',
      priority: 'Medium',
      dueDate: '',
      createdBy: this.getLoggedInUserId(),
      createdDate: new Date().toISOString().split('T')[0]
    };
  }

  // Filter tasks
  filterTasks(): void {
    this.filteredTasks = this.tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.statusFilter === 'all' || task.status === this.statusFilter;
      const matchesProject = this.projectFilter === 'all' || String(task.projectId) === String(this.projectFilter);
      const matchesEmployee = this.employeeFilter === 'all' || String(task.assignedTo) === String(this.employeeFilter);
      return matchesSearch && matchesStatus && matchesProject && matchesEmployee;
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.filterTasks();
  }

  // Get project name
  getProjectName(projectId: string | number): string {
    const project = this.projects.find(p => p._id === projectId || p.id === projectId);
    return project ? (project.projectName || project.name) : 'Unknown';
  }

  // Get employee name
  getEmployeeName(employeeId: string | number): string {
    const employee = this.employees.find(e => e._id === employeeId || e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unassigned';
  }

  // Get employee object
  getEmployee(employeeId: string | number): any {
    return this.employees.find(e => e._id === employeeId || e.id === employeeId);
  }

  // Get employees assigned to the current project
  getAvailableAssignees(): any[] {
    if (!this.currentTask.projectId) {
      return this.employees;
    }
    const project = this.projects.find(p => p._id === this.currentTask.projectId);
    if (!project || !project.assignees) {
      return [];
    }
    const assigneeIds = project.assignees.map((a: any) => a._id || a);
    return this.employees.filter(emp => assigneeIds.includes(emp._id));
  }

  // Modal operations
  openCreateModal(): void {
    this.isEditing = false;
    this.currentTask = this.getEmptyTask();
    this.showModal = true;
  }

  openEditModal(task: any): void {
    this.isEditing = true;
    this.currentTask = { ...task };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.currentTask = this.getEmptyTask();
  }

  saveTask(): void {
    if (!this.currentTask.title || !this.currentTask.projectId) {
      alert('Title and Project are required');
      return;
    }

    const payload = {
      ...this.currentTask,
      createdBy: this.currentTask.createdBy || this.getLoggedInUserId()
    };

    if (this.isEditing) {
      this.projectservice.updateTask(this.currentTask._id, payload).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
        },
        error: err => console.error('Error updating task', err)
      });
    } else {
      this.projectservice.createTask(payload).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
        },
        error: err => console.error('Error creating task', err)
      });
    }
  }

  deleteTask(task: any): void {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.projectservice.deleteTask(task._id).subscribe({
        next: () => {
          this.loadData();
        },
        error: err => console.error('Error deleting task', err)
      });
    }
  }

  // Update task status (drag-drop simulation)
  updateStatus(task: any, newStatus: string): void {
    task.status = newStatus;
    this.projectservice.updateTask(task._id, { status: newStatus }).subscribe({
      next: () => {
        this.loadData();
      },
      error: err => console.error('Error updating task status', err)
    });
  }

  // Helper methods
  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-progress';
      case 'To Do': return 'status-todo';
      default: return '';
    }
  }

  // Statistics
  get totalTasks(): number {
    return this.tasks.length;
  }

  get todoTasks(): number {
    return this.tasks.filter(t => t.status === 'To Do').length;
  }

  get inProgressTasks(): number {
    return this.tasks.filter(t => t.status === 'In Progress').length;
  }

  get completedTasks(): number {
    return this.tasks.filter(t => t.status === 'Completed').length;
  }

  // Get tasks by status for Kanban view
  getTasksByStatus(status: string): any[] {
    return this.filteredTasks.filter(t => t.status === status);
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

  // ── Drag & Drop State & Event Handlers ──
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
      this.updateStatus(task, newStatus);
      if (newStatus === 'Completed') {
        this.playSuccessChime();
      }
    }
    this.draggedTask = null;
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

      // Chime note 2 (E5, slightly delayed)
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
      console.warn('Web Audio API error:', e);
    }
  }

  // ── AI Workflow Assistant Functions ──
  isGeneratingBreakdown: boolean = false;

  generateAIBreakdown(): void {
    if (!this.currentTask.title) {
      alert('Please enter a task title first so the AI can analyze the scope.');
      return;
    }
    this.isGeneratingBreakdown = true;
    this.aiService.generateBreakdown(this.currentTask.title, this.currentTask.description).subscribe({
      next: (subtasks) => {
        this.isGeneratingBreakdown = false;
        
        let formattedChecklist = '\n\n📋 Suggested AI Subtasks:\n';
        subtasks.forEach(step => {
          formattedChecklist += `- [ ] ${step}\n`;
        });
        
        if (!this.currentTask.description.includes('📋 Suggested AI Subtasks:')) {
          this.currentTask.description = this.currentTask.description.trim() + formattedChecklist;
        } else {
          const parts = this.currentTask.description.split('📋 Suggested AI Subtasks:');
          this.currentTask.description = parts[0].trim() + formattedChecklist;
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
