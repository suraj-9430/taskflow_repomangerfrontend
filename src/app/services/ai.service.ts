import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map } from 'rxjs';

export interface RiskItem {
  risk: string;
  probability: 'High' | 'Medium' | 'Low';
  impact: 'Critical' | 'High' | 'Medium' | 'Low';
  reason: string;
  recommendation: string;
}

export interface WorkloadItem {
  employeeId?: string;
  employee: string;
  tasks: number;
  activeTasks?: number;
  utilization: number;
  department?: string;
  recommendation: string;
  targetUtilization?: number;
}

export interface DeadlinePrediction {
  originalDeadline: string;
  predictedCompletion: string;
  delayDays: number;
  confidence: number;
}

export interface ProjectHealthData {
  healthScore: number;
  status: 'Excellent' | 'Healthy' | 'Needs Attention' | 'Critical';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  summary: string;
  deadlinePrediction: DeadlinePrediction;
  risks: RiskItem[];
  workload: WorkloadItem[];
  recommendations: string[];
}

export interface ExecutiveBrief {
  user: string;
  projectsHealthy: number;
  projectsAtRisk: number;
  highPriorityTasks: number;
  pendingApprovals: number;
  employeesOnLeave: number;
  todayRecommendation: string;
}

export interface WeeklyReport {
  weeklySummary: string;
  projectsCompleted: number;
  tasksCompleted: number;
  delayedTasks: number;
  overallHealth: string;
  achievements: string[];
  focusNextWeek: string[];
}

export interface QAResponse {
  answer: string;
  riskLevel?: string;
  reason?: string;
  recommendation?: string;
}

export interface TechnicalSkill {
  name: string;
  category: string;
  rating: number;
  verified?: boolean;
}

export interface SkillsProfile {
  technical: TechnicalSkill[];
  soft: string[];
  experience: string[];
}

export interface EmployeeSuggestion {
  recommendedEmployeeId: string;
  recommendedEmployee: string;
  confidence: number;
  matchedSkills: string[];
  utilization: number;
  reason: string;
}

export interface SkillGapAnalysis {
  teamCoverage: string;
  activeProjectsCount: number;
  existingSkills: string[];
  missingSkills: Array<{ name: string; level: string; reason: string }>;
  recommendations: string[];
}

export interface LearningRoadmap {
  user: string;
  currentTopSkills: string[];
  recommendedLearning: Array<{ name: string; priority: string; expectedGrowth: string; courseUrl?: string }>;
  reason: string;
}

export interface CommandResponse {
  success: boolean;
  status: 'EXECUTED' | 'NEED_INFO' | 'RBAC_DENIED';
  intent?: string;
  entities?: any;
  missingFields?: string[];
  promptChoices?: {
    fieldName: string;
    question: string;
    options: string[];
  };
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Generates a subtask checklist for a given task title and description.
   */
  generateBreakdown(title: string, description: string): Observable<string[]> {
    return this.http
      .post<{ success: boolean; data: string[] }>(
        `${this.apiUrl}/ai/breakdown`,
        { title, description },
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Responds to user chat messages via the Gemini-powered backend.
   */
  chatWithAssistant(message: string): Observable<string> {
    return this.http
      .post<{ success: boolean; reply: string }>(
        `${this.apiUrl}/ai/chat`,
        { message },
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.reply));
  }

  /**
   * Generates a daily plan for a manager.
   */
  generateDailyPlan(projects: any[], tasks: any[]): Observable<string[]> {
    return this.http
      .post<{ success: boolean; data: string[] }>(
        `${this.apiUrl}/ai/daily-plan`,
        { projects, tasks },
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Fetches AI Project Health Center report.
   */
  getProjectHealth(projectId?: string, refresh: boolean = false): Observable<ProjectHealthData> {
    const param = projectId ? `/${projectId}` : '';
    const query = refresh ? '?refresh=true' : '';
    return this.http
      .get<{ success: boolean; data: ProjectHealthData }>(
        `${this.apiUrl}/ai/project-health${param}${query}`,
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Fetches Daily Morning Executive Brief for Managers.
   */
  getExecutiveBrief(): Observable<ExecutiveBrief> {
    return this.http
      .get<{ success: boolean; data: ExecutiveBrief }>(
        `${this.apiUrl}/ai/executive-brief`,
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Fetches Weekly Project Intelligence Report.
   */
  getWeeklyReport(): Observable<WeeklyReport> {
    return this.http
      .get<{ success: boolean; data: WeeklyReport }>(
        `${this.apiUrl}/ai/weekly-report`,
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Queries AI Project Health Q&A in natural language.
   */
  askQuestion(question: string, projectId?: string): Observable<QAResponse> {
    return this.http
      .post<{ success: boolean; data: QAResponse }>(
        `${this.apiUrl}/ai/qa`,
        { question, projectId },
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.data));
  }

  // ── 🎯 Feature 1: Skills Matrix API Calls ──

  getMySkills(): Observable<{ user: any; skills: SkillsProfile }> {
    return this.http
      .get<{ success: boolean; data: { user: any; skills: SkillsProfile } }>(
        `${this.apiUrl}/skills/my-skills`,
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.data));
  }

  updateMySkills(skills: SkillsProfile): Observable<any> {
    return this.http.put(`${this.apiUrl}/skills/my-skills`, skills, { headers: this.getAuthHeaders() });
  }

  suggestEmployee(taskData: { title: string; description?: string; requiredSkills?: string[]; projectId?: string }): Observable<EmployeeSuggestion> {
    return this.http
      .post<{ success: boolean; data: EmployeeSuggestion }>(
        `${this.apiUrl}/skills/suggest-employee`,
        taskData,
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.data));
  }

  getSkillGapAnalysis(): Observable<SkillGapAnalysis> {
    return this.http
      .get<{ success: boolean; data: SkillGapAnalysis }>(
        `${this.apiUrl}/skills/gap-analysis`,
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.data));
  }

  getLearningRecommendations(): Observable<LearningRoadmap> {
    return this.http
      .get<{ success: boolean; data: LearningRoadmap }>(
        `${this.apiUrl}/skills/learning-recommendations`,
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.data));
  }

  // ── 🤖 Feature 2: AI Command Center Action Execution ──

  executeCommand(command: string, confirmed: boolean = false, contextData: any = {}): Observable<CommandResponse> {
    return this.http.post<CommandResponse>(
      `${this.apiUrl}/command/command`,
      { command, confirmed, contextData },
      { headers: this.getAuthHeaders() }
    );
  }
}


