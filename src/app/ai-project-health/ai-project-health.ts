import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Projectservice } from '../manager/projects/projectservice';
import {
  AiService,
  ProjectHealthData,
  ExecutiveBrief,
  WeeklyReport,
  QAResponse,
  WorkloadItem,
} from '../services/ai.service';
import { SocketService } from '../services/socket.service';

@Component({
  selector: 'app-ai-project-health',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-project-health.html',
  styleUrl: './ai-project-health.css',
})
export class AiProjectHealth implements OnInit {
  isLoading = true;
  isAsking = false;
  isRebalancing = false;
  showWeeklyReportModal = false;
  selectedProjectId = 'all';
  projectsList: { _id: string; projectName: string }[] = [];

  // Core Intelligence Data
  healthData: ProjectHealthData | null = null;
  executiveBrief: ExecutiveBrief | null = null;
  weeklyReport: WeeklyReport | null = null;
  lastUpdated: Date = new Date();

  // Natural Language Q&A state
  userQuestion = '';
  qaResult: QAResponse | null = null;
  suggestedQuestions: string[] = [
    'Which project is at risk?',
    'Which employee has the highest workload?',
    'Which tasks are overdue?',
    'Will we complete before deadline?',
    'What should I prioritize today?',
  ];

  constructor(
    private aiService: AiService,
    private projectService: Projectservice,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.fetchData();
    this.listenRealtimeUpdates();
  }

  loadProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.projectsList = res.data.map((p: any) => ({
            _id: p._id,
            projectName: p.projectName || p.name || 'Untitled Project',
          }));
        }
      },
      error: (err) => console.warn('Could not load projects list:', err),
    });
  }

  fetchData(refresh: boolean = false): void {
    this.isLoading = true;
    const projId = this.selectedProjectId === 'all' ? undefined : this.selectedProjectId;

    this.aiService.getProjectHealth(projId, refresh).subscribe({
      next: (data) => {
        this.healthData = data;
        this.lastUpdated = new Date();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load project health data:', err);
        this.isLoading = false;
      },
    });

    this.aiService.getExecutiveBrief().subscribe({
      next: (brief) => (this.executiveBrief = brief),
      error: (err) => console.warn('Executive brief error:', err),
    });

    this.aiService.getWeeklyReport().subscribe({
      next: (report) => (this.weeklyReport = report),
      error: (err) => console.warn('Weekly report error:', err),
    });
  }

  onProjectChange(): void {
    this.fetchData();
  }

  refreshHealth(): void {
    this.fetchData(true);
  }

  askQuestion(q?: string): void {
    const questionText = q || this.userQuestion;
    if (!questionText.trim()) return;

    this.userQuestion = questionText;
    this.isAsking = true;
    this.qaResult = null;

    const projId = this.selectedProjectId === 'all' ? undefined : this.selectedProjectId;
    this.aiService.askQuestion(questionText, projId).subscribe({
      next: (res) => {
        this.qaResult = res;
        this.isAsking = false;
      },
      error: (err) => {
        console.error('Q&A error:', err);
        this.qaResult = {
          answer: 'Unable to reach AI decision engine right now. Please try again.',
          riskLevel: 'Medium',
          reason: 'Network or API latency.',
          recommendation: 'Check connection and retry.',
        };
        this.isAsking = false;
      },
    });
  }

  applyWorkloadRebalance(): void {
    if (!this.healthData || !this.healthData.workload) return;
    this.isRebalancing = true;

    setTimeout(() => {
      // Re-balance simulation for active view
      this.healthData!.workload = this.healthData!.workload.map((emp) => {
        const target = emp.targetUtilization || 70;
        return {
          ...emp,
          utilization: target,
          recommendation: 'Workload successfully re-balanced by AI co-pilot.',
        };
      });
      if (this.healthData) {
        this.healthData.summary = `${this.healthData.summary} (Workload rebalancing applied across team members).`;
      }
      this.isRebalancing = false;
    }, 900);
  }

  toggleWeeklyReportModal(): void {
    this.showWeeklyReportModal = !this.showWeeklyReportModal;
  }

  getHealthCategoryClass(score: number): string {
    if (score >= 90) return 'category-excellent';
    if (score >= 75) return 'category-healthy';
    if (score >= 60) return 'category-attention';
    return 'category-critical';
  }

  getRiskBadgeClass(level: string): string {
    const l = (level || '').toLowerCase();
    if (l === 'critical') return 'badge-critical';
    if (l === 'high') return 'badge-high';
    if (l === 'medium') return 'badge-medium';
    return 'badge-low';
  }

  getUtilizationClass(util: number): string {
    if (util >= 85) return 'util-overloaded';
    if (util >= 60) return 'util-balanced';
    return 'util-underutilized';
  }

  private listenRealtimeUpdates(): void {
    this.socketService.listen('project_health_updated').subscribe(() => {
      console.log('⚡ Real-time project health update received via Socket.io');
      this.fetchData(false);
    });
  }
}
