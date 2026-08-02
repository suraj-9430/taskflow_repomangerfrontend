import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AiService,
  SkillsProfile,
  TechnicalSkill,
  EmployeeSuggestion,
  SkillGapAnalysis,
  LearningRoadmap,
} from '../services/ai.service';
import { Projectservice } from '../manager/projects/projectservice';

@Component({
  selector: 'app-skills-matrix',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './skills-matrix.html',
  styleUrl: './skills-matrix.css',
})
export class SkillsMatrix implements OnInit {
  isLoading = true;
  isSuggesting = false;
  showSuggestModal = false;
  activeTab: 'my-skills' | 'team-matrix' | 'learning-path' = 'my-skills';

  // Profile data
  userInfo: any = null;
  skills: SkillsProfile = {
    technical: [],
    soft: [],
    experience: [],
  };

  // Categories list
  categories: string[] = [
    'Programming Languages',
    'Frontend',
    'Backend',
    'Database',
    'DevOps',
    'Cloud',
    'Domain Skills',
  ];

  // Suggestion Modal state
  taskTitle = '';
  taskDescription = '';
  requiredSkillInput = '';
  requiredSkills: string[] = ['Node.js', 'Angular'];
  suggestionResult: EmployeeSuggestion | null = null;

  // Gap & Learning Path
  gapAnalysis: SkillGapAnalysis | null = null;
  learningRoadmap: LearningRoadmap | null = null;

  // New Skill Form
  newSkillName = '';
  newSkillCategory = 'Backend';
  newSkillRating = 3;

  constructor(
    private aiService: AiService,
    private projectService: Projectservice
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.isLoading = true;

    this.aiService.getMySkills().subscribe({
      next: (res) => {
        this.userInfo = res.user;
        this.skills = res.skills;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Skills error:', err);
        this.isLoading = false;
      },
    });

    this.aiService.getSkillGapAnalysis().subscribe({
      next: (gap) => (this.gapAnalysis = gap),
      error: (err) => console.warn('Gap analysis error:', err),
    });

    this.aiService.getLearningRecommendations().subscribe({
      next: (roadmap) => (this.learningRoadmap = roadmap),
      error: (err) => console.warn('Learning roadmap error:', err),
    });
  }

  getSkillsByCategory(cat: string): TechnicalSkill[] {
    return (this.skills.technical || []).filter((s) => s.category === cat);
  }

  setRating(skill: TechnicalSkill, rating: number): void {
    skill.rating = rating;
    this.saveSkills();
  }

  addTechnicalSkill(): void {
    if (!this.newSkillName.trim()) return;
    this.skills.technical.push({
      name: this.newSkillName.trim(),
      category: this.newSkillCategory,
      rating: this.newSkillRating,
      verified: false,
    });
    this.newSkillName = '';
    this.saveSkills();
  }

  removeSkill(index: number): void {
    this.skills.technical.splice(index, 1);
    this.saveSkills();
  }

  saveSkills(): void {
    this.aiService.updateMySkills(this.skills).subscribe({
      next: () => console.log('Skills saved successfully'),
      error: (err) => console.error('Save failed:', err),
    });
  }

  // Suggest Employee Modal
  toggleSuggestModal(): void {
    this.showSuggestModal = !this.showSuggestModal;
    this.suggestionResult = null;
  }

  addRequiredSkill(): void {
    if (!this.requiredSkillInput.trim()) return;
    this.requiredSkills.push(this.requiredSkillInput.trim());
    this.requiredSkillInput = '';
  }

  removeRequiredSkill(index: number): void {
    this.requiredSkills.splice(index, 1);
  }

  requestEmployeeSuggestion(): void {
    if (!this.taskTitle.trim()) return;
    this.isSuggesting = true;
    this.suggestionResult = null;

    this.aiService
      .suggestEmployee({
        title: this.taskTitle,
        description: this.taskDescription,
        requiredSkills: this.requiredSkills,
      })
      .subscribe({
        next: (suggestion) => {
          this.suggestionResult = suggestion;
          this.isSuggesting = false;
        },
        error: (err) => {
          console.error('Suggestion error:', err);
          this.isSuggesting = false;
        },
      });
  }
}
