import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { AiService } from './ai.service';
import { AttendanceService } from './attendance.service';

@Injectable({
  providedIn: 'root'
})
export class PersonalNotesService {
  private authService = inject(AuthService);
  private aiService = inject(AiService);
  private attendanceService = inject(AttendanceService);

  getUserId(): string {
    const user = this.authService.currentUserValue || {};
    return user._id || user.id || 'anonymous';
  }

  loadTodos(): any[] {
    const savedTodos = localStorage.getItem('personalTodos_' + this.getUserId());
    if (savedTodos) {
      try { return JSON.parse(savedTodos); } catch (e) { return []; }
    }
    return [
      { id: '1', text: '🔔 Clock in & verify GPS attendance', completed: false, createdAt: new Date().toISOString() },
      { id: '2', text: '📊 Review active team task backlog', completed: false, createdAt: new Date().toISOString() },
      { id: '3', text: '🔒 Inspect remote punch requests for approval', completed: false, createdAt: new Date().toISOString() }
    ];
  }

  saveTodos(todos: any[]): void {
    localStorage.setItem('personalTodos_' + this.getUserId(), JSON.stringify(todos));
  }

  loadNotes(): string {
    return localStorage.getItem('meetingNotes_' + this.getUserId()) || '';
  }

  saveNotes(notes: string): void {
    localStorage.setItem('meetingNotes_' + this.getUserId(), notes);
  }

  convertNotesToTodos(notes: string, currentTodos: any[]): { addedCount: number, newTodos: any[] } {
    const lines = notes.split('\n');
    let addedCount = 0;
    const newTodos = [...currentTodos];

    lines.forEach(line => {
      let trimmed = line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[\.)]\s*/, '');
      if (trimmed.length > 0 && !newTodos.some(t => t.text.toLowerCase() === trimmed.toLowerCase())) {
        newTodos.push({ id: (Date.now() + addedCount).toString(), text: trimmed, completed: false, createdAt: new Date().toISOString() });
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      this.saveTodos(newTodos);
      this.attendanceService.playSuccessChime();
    }
    return { addedCount, newTodos };
  }
}
