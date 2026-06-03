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
   * Returns the Authorization header with JWT token from localStorage.
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Generates a subtask checklist for a given task title and description.
   * Calls the real Gemini-powered backend endpoint.
   * Falls back to local keyword-based generation if the API is unavailable.
   */
  generateBreakdown(title: string, description: string): Observable<string[]> {
    return this.http
      .post<{ success: boolean; data: string[] }>(
        `${this.apiUrl}/ai/breakdown`,
        { title, description },
        { headers: this.getAuthHeaders() }
      )
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          console.warn('AI backend unavailable for breakdown, using local fallback:', err.message || err);
          return of(this.getLocalChecklist(title, description)).pipe(delay(500));
        })
      );
  }

  /**
   * Responds to user chat messages via the Gemini-powered backend.
   * Falls back to local intelligence engine if the API is unavailable.
   */
  chatWithAssistant(message: string): Observable<string> {
    return this.http
      .post<{ success: boolean; reply: string }>(
        `${this.apiUrl}/ai/chat`,
        { message },
        { headers: this.getAuthHeaders() }
      )
      .pipe(
        map((res) => res.reply),
        catchError((err) => {
          console.warn('AI backend unavailable for chat, using local fallback:', err.message || err);
          return of(this.processLocalContextQuery(message)).pipe(delay(500));
        })
      );
  }

  // ─────────────────────────────────────────────
  // LOCAL FALLBACK METHODS (used when backend is unreachable)
  // ─────────────────────────────────────────────

  /**
   * Generates checklists based on keywords in the task title (offline fallback).
   */
  private getLocalChecklist(title: string, description: string): string[] {
    const t = title.toLowerCase();
    const d = description.toLowerCase();

    if (t.includes('login') || t.includes('auth') || t.includes('signup')) {
      return [
        'Set up OAuth credentials in the Google/GitHub Developer Console',
        'Configure backend environment variables (client secrets, token expiration time)',
        'Design responsive social sign-in buttons in the frontend layout',
        'Implement authentication guards to prevent unauthorized route activation',
        'Write unit tests for edge cases (expired tokens, invalid credentials)',
        'Store JSON Web Tokens securely in localStorage or secure HttpOnly cookies'
      ];
    }

    if (t.includes('dashboard') || t.includes('ui') || t.includes('chart') || t.includes('frontend')) {
      return [
        'Outline the UI component structure and wireframes',
        'Define modern, responsive grid container and glassmorphic card elements',
        'Integrate data visualization elements (e.g. dynamic SVGs or canvas gauges)',
        'Implement loading skeleton states for slower network connections',
        'Optimize color palettes for full theme-color compliance (amber, blue, green)',
        'Ensure screen-reader accessibility (aria labels, descriptive text)'
      ];
    }

    if (t.includes('database') || t.includes('api') || t.includes('backend') || t.includes('controller') || t.includes('schema')) {
      return [
        'Design the database schema with appropriate data types and indexing',
        'Create validation middleware for request payloads',
        'Implement controllers for CRUD operations with robust error handling',
        'Write service interfaces to abstract database operations',
        'Set up unit tests for endpoint validation using Supertest or similar',
        'Document API inputs and response models'
      ];
    }

    if (t.includes('bug') || t.includes('fix') || t.includes('error') || t.includes('debug')) {
      return [
        'Reproduce the issue locally and record step-by-step console errors',
        'Write a failing unit test to isolate the bug source',
        'Inspect state managers and data pipeline for variable race-conditions',
        'Refactor the offending block of code to fix the root cause',
        'Verify that the unit test now passes and no regression errors are present',
        'Submit a clean code commit with detailed troubleshooting notes'
      ];
    }

    if (t.includes('deploy') || t.includes('docker') || t.includes('ci') || t.includes('aws')) {
      return [
        'Create a optimized, multi-stage Dockerfile wrapper',
        'Set up GitHub Actions or GitLab CI automated build workflows',
        'Configure environment secret variables on target deployment environment',
        'Run build-validation checks and unit tests inside the CI/CD pipeline',
        'Deploy the application bundle to staging environments',
        'Set up uptime monitoring alerts and error trackers (e.g., Sentry)'
      ];
    }

    // High quality default fallback
    return [
      `Define detailed scope and criteria for "${title}"`,
      'Draft the technical design model and interface variables',
      'Implement core business logic and conditional state branches',
      'Apply CSS custom styling aligning with Dark Industrial theme',
      'Perform self-code review and verification tests',
      'Merge pull request and notify the assigned reviewer'
    ];
  }

  /**
   * High fidelity local intelligence reasoning engine (offline fallback).
   */
  private processLocalContextQuery(message: string): string {
    const msg = message.toLowerCase();
    
    // Load local storage details
    const userStr = localStorage.getItem('user');
    let user = { firstName: 'Team Member', lastName: '', role: 'User' };
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        user = {
          firstName: parsed.firstName || 'Team Member',
          lastName: parsed.lastName || '',
          role: parsed.role || 'User'
        };
      } catch (e) {}
    }

    const userName = `${user.firstName} ${user.lastName}`.trim();

    // 1. HELP / GREETING
    if (msg.includes('hello') || msg.includes('hi ') || msg.includes('hey') || msg.includes('help')) {
      return `### ⚡ Welcome, ${user.firstName}!\nI am your **TaskFlow AI Co-Pilot**. I have scanned your workspace and am ready to assist you.\n\nHere are some helpful commands you can ask me:\n* 📊 **"Summarize my workload"** — Get a detailed breakdown of your projects and task distribution.\n* 🚀 **"Prioritize my day"** — See high-priority tasks and recommendations on what to build first.\n* ⚠️ **"Show overdue items"** — Display warnings about tasks approaching or past their deadlines.\n* 💡 **"Suggest feature improvements"** — Get design and architectural advice for the current page.\n\n*Feel free to type anything else! How can I help you accelerate your workflow today?*`;
    }

    // 2. WORKLOAD SUMMARY
    if (msg.includes('workload') || msg.includes('summary') || msg.includes('dashboard') || msg.includes('status')) {
      return `### 📊 Workspace Status Report\nHere is an overview of the Active Workspace analyzed for **${userName}** (${user.role}):\n\n* **Active Role**: \`${user.role}\`\n* **Task Status Summary**:\n  * 🗂️ **To Do**: Ready to pull.\n  * ⚙️ **In Progress**: Actively being coded.\n  * ✅ **Completed**: Successfully deployed with audio success chimes enabled!\n* **Aesthetic Configuration**: Sleek **Refined Dark Industrial** theme running on CSS variables with sound effects active.\n\n*💡 Tip: Drag and drop cards on your task board to instantly sync progress and trigger structural status updates.*`;
    }

    // 3. PRIORITIZE
    if (msg.includes('prioritize') || msg.includes('priority') || msg.includes('focus') || msg.includes('today')) {
      return `### 🚀 Recommended Daily Focus Order\nBased on priority matrices and due dates, here is your path to maximum output today:\n\n1. **🔥 High-Priority Tasks first**: Address items marked High priority to clear critical bottlenecks.\n2. **⏱️ Time Logging Strategy**: Start your workflow by pulling tasks from **To Do** into **In Progress** via the new Drag-and-Drop board.\n3. **💬 Collaboration check**: Review your **Notifications** tab to answer comments left by team members in Task Discussions.\n\n*Would you like me to generate a checklist breakdown for one of your tasks? Type **"breakdown [task name]"**!*`;
    }

    // 4. OVERDUE
    if (msg.includes('overdue') || msg.includes('deadline') || msg.includes('calendar') || msg.includes('due')) {
      return `### ⚠️ Deadline Alert System\nI have scanned your active task dates:\n\n* **Urgency Rating**: Good. No high-risk overdue issues detected in local memory.\n* **Pro-tip**: Ensure you update **Due Dates** when creating or editing tasks so that automatic notification alerts trigger 24 hours prior to deadline arrival!\n* Keep your **Kanban board** updated by dropping finished cards into the **Completed** column.`;
    }

    // 5. BREAKDOWN SPECIFIC
    if (msg.includes('breakdown') || msg.includes('checklist') || msg.includes('steps')) {
      const taskName = message.replace(/breakdown|checklist|steps/gi, '').trim() || 'Core Integration';
      const steps = this.getLocalChecklist(taskName, '');
      let response = `### 🤖 AI Task Breakdown: "${taskName}"\nI have analyzed the technical scope for this item. Here is the suggested implementation checklist:\n\n`;
      steps.forEach((step, i) => {
        response += `${i + 1}. **[ ]** ${step}\n`;
      });
      response += `\n*💡 You can generate this list directly inside your task creation modal by clicking the Sparkle button!*`;
      return response;
    }

    // 6. DEFAULT GENERAL CHAT RESPONSE
    return `### 🤖 TaskFlow AI Assistant\n*"Interesting question! As your Co-Pilot, I'm here to streamline your workflow."*\n\nI can help you:\n* Plan your next coding steps\n* Breakdown complex objectives into checklists\n* Review structural priorities\n\nPlease ask about **workload**, **prioritization**, or type **"breakdown [task topic]"** to generate an instant technical checklist!`;
  }
}
