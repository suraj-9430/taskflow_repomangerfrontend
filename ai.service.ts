import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatResponse {
  success: boolean;
  reply: string;
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private apiUrl = `${environment.apiUrl}/ai`;

  // Conversation history kept in memory per session
  private conversationHistory: ChatMessage[] = [];

  constructor(private http: HttpClient) {}

  /**
   * Send a message to the AI assistant.
   * Automatically maintains conversation history.
   */
  chat(message: string): Observable<string> {
    const body = {
      message,
      history: this.conversationHistory,
    };

    return this.http.post<AIChatResponse>(`${this.apiUrl}/chat`, body).pipe(
      map((res) => {
        if (res.success && res.reply) {
          // Save both messages to history for context
          this.conversationHistory.push({ role: 'user', content: message });
          this.conversationHistory.push({ role: 'assistant', content: res.reply });

          // Keep last 20 messages to avoid token overflow
          if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
          }

          return res.reply;
        }
        throw new Error('Invalid response from AI');
      }),
      catchError((err) => {
        console.error('AI service error:', err);
        return throwError(() => new Error('Failed to get AI response. Please try again.'));
      })
    );
  }

  /**
   * Generate a task breakdown — calls AI with a structured prompt.
   * Replaces the old keyword-matching generateBreakdown method.
   */
  generateBreakdown(title: string, description: string): Observable<string> {
    const prompt = `Break down this task into 5-6 clear, actionable subtasks:
Task title: "${title}"
Description: "${description || 'No description provided'}"

Format as a numbered list. Each subtask should be specific and achievable.`;

    return this.chat(prompt);
  }

  /**
   * Get workload summary for the current user.
   * Pass in the user's tasks from your task service.
   */
  getWorkloadSummary(tasks: any[]): Observable<string> {
    const taskSummary = tasks
      .slice(0, 10) // Limit to 10 tasks to avoid large payloads
      .map((t) => `- ${t.title} (${t.priority} priority, ${t.status}, due: ${t.dueDate || 'no date'})`)
      .join('\n');

    const prompt = `Summarize my current workload and give me 2-3 actionable recommendations:

My tasks:
${taskSummary || 'No tasks found.'}`;

    return this.chat(prompt);
  }

  /**
   * Get daily priority recommendations.
   */
  getDailyPriorities(tasks: any[]): Observable<string> {
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed'
    );
    const today = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate).toDateString() === new Date().toDateString()
    );

    const prompt = `Based on my tasks, what should I focus on today?
Overdue tasks: ${overdue.length}
Due today: ${today.length}
Total open: ${tasks.filter((t) => t.status !== 'Completed').length}

Give me a short, motivating daily plan.`;

    return this.chat(prompt);
  }

  /**
   * Clear conversation history (e.g. on logout or new session).
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get current conversation history (for display in UI).
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }
}
