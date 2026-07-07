import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of, delay, map, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}



  /**
   * Generates a subtask checklist for a given task title and description.
   * Calls the real Gemini-powered backend endpoint.
   */
  generateBreakdown(title: string, description: string): Observable<string[]> {
    return this.http
      .post<{ success: boolean; data: string[] }>(
        `${this.apiUrl}/ai/breakdown`,
        { title, description }
      )
      .pipe(
        map((res) => res.data)
      );
  }

  /**
   * Responds to user chat messages via the Gemini-powered backend.
   */
  chatWithAssistant(message: string): Observable<string> {
    return this.http
      .post<{ success: boolean; reply: string }>(
        `${this.apiUrl}/ai/chat`,
        { message }
      )
      .pipe(
        map((res) => res.reply)
      );
  }

  /**
   * Generates a daily plan for a manager.
   * Calls the real Gemini-powered backend endpoint.
   */
  generateDailyPlan(projects: any[], tasks: any[]): Observable<string[]> {
    return this.http
      .post<{ success: boolean; data: string[] }>(
        `${this.apiUrl}/ai/daily-plan`,
        { projects, tasks }
      )
      .pipe(
        map((res) => res.data)
      );
  }
}
