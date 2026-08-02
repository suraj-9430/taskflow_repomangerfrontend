import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, CommandResponse } from '../services/ai.service';

@Component({
  selector: 'app-command-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './command-center.html',
  styleUrl: './command-center.css',
})
export class CommandCenter implements OnInit {
  isOpen = false;
  isExecuting = false;
  commandInput = '';
  lastCommand = '';

  commandResult: CommandResponse | null = null;
  conversationState: {
    intent?: string;
    entities?: any;
    missingFields?: string[];
  } = {};

  suggestedCommands: string[] = [
    'Create a high priority task for Login API due next Friday',
    'Apply casual leave tomorrow',
    'Mark me present',
    'Schedule sprint review on Friday at 3 PM',
    'Create a project named CRM Portal',
    'Show overdue tasks',
    'Show team workload',
    'Show unread notifications',
  ];

  constructor(private aiService: AiService) {}

  ngOnInit(): void {}

  // Global Ctrl+K / Cmd+K listener to open AI Command Center
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggleCommandCenter();
    }
  }

  toggleCommandCenter(): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.resetState();
    }
  }

  resetState(): void {
    this.commandInput = '';
    this.lastCommand = '';
    this.commandResult = null;
    this.conversationState = {};
  }

  runCommand(cmd?: string): void {
    const text = cmd || this.commandInput;
    if (!text.trim()) return;

    this.lastCommand = text;
    this.isExecuting = true;
    this.commandResult = null;

    this.aiService.executeCommand(text, false, this.conversationState.entities || {}).subscribe({
      next: (res) => {
        this.commandResult = res;
        this.isExecuting = false;

        if (res.status === 'NEED_INFO') {
          this.conversationState = {
            intent: res.intent,
            entities: res.entities,
            missingFields: res.missingFields,
          };
        }
      },
      error: (err) => {
        console.error('Command error:', err);
        this.commandResult = {
          success: false,
          status: 'RBAC_DENIED',
          message: 'Unable to connect to AI Command Center backend service.',
        };
        this.isExecuting = false;
      },
    });
  }

  answerPromptChoice(fieldName: string, optionValue: string): void {
    const updatedEntities = {
      ...(this.conversationState.entities || {}),
      [fieldName]: optionValue,
    };

    this.isExecuting = true;
    this.aiService.executeCommand(this.lastCommand, true, updatedEntities).subscribe({
      next: (res) => {
        this.commandResult = res;
        this.isExecuting = false;
        if (res.status === 'EXECUTED') {
          this.conversationState = {};
        }
      },
      error: (err) => {
        console.error('Command continuation error:', err);
        this.isExecuting = false;
      },
    });
  }
}
