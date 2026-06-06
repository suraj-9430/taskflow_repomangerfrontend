import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Projectservice } from '../manager/projects/projectservice';

interface CalendarEventItem {
  id: string;
  source: 'schedule' | 'task' | 'project' | 'leave';
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  type: string;
  badge: string;
  meta?: any;
}

interface CalendarDay {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEventItem[];
}

@Component({
  selector: 'app-calendar-scheduler',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar-scheduler.html',
  styleUrl: './calendar-scheduler.css',
})
export class CalendarScheduler implements OnInit {
  constructor(private projectservice: Projectservice) {}

  currentMonth = new Date();
  selectedDate = new Date();
  calendarDays: CalendarDay[] = [];
  calendarEvents: CalendarEventItem[] = [];
  selectedDayEvents: CalendarEventItem[] = [];
  employees: any[] = [];
  isLoading = true;
  showModal = false;
  isSaving = false;

  scheduleForm = this.getEmptyScheduleForm();

  ngOnInit(): void {
    this.loadEmployees();
    this.loadCalendar();
  }

  get monthLabel(): string {
    return this.currentMonth.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  }

  get canManageSchedules(): boolean {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === 'admin' || user.role === 'manager';
  }

  getEmptyScheduleForm() {
    const defaultDate = this.toDateInputValue(this.selectedDate);
    return {
      id: '',
      title: '',
      description: '',
      eventType: 'meeting',
      startDate: defaultDate,
      endDate: defaultDate,
      allDay: true,
      audience: 'all',
      participants: [] as string[],
    };
  }

  loadEmployees(): void {
    this.projectservice.getEmployees().subscribe({
      next: (res: any) => {
        this.employees = res.data || [];
      },
      error: (err) => console.error('Failed to load employees for calendar', err),
    });
  }

  loadCalendar(): void {
    this.isLoading = true;
    const range = this.getVisibleRange();

    this.projectservice
      .getCalendarEvents({
        start: range.start,
        end: range.end,
      })
      .subscribe({
        next: (res: any) => {
          this.calendarEvents = res.data || [];
          this.buildCalendarDays();
          this.selectDate(this.selectedDate);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load calendar events', err);
          this.calendarEvents = [];
          this.buildCalendarDays();
          this.selectDate(this.selectedDate);
          this.isLoading = false;
        },
      });
  }

  getVisibleRange() {
    const monthStart = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const monthEnd = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());
    const gridEnd = new Date(monthEnd);
    gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

    return {
      start: gridStart.toISOString(),
      end: new Date(gridEnd.setHours(23, 59, 59, 999)).toISOString(),
    };
  }

  buildCalendarDays(): void {
    const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];

    for (let index = 0; index < 42; index++) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      days.push({
        date,
        iso: this.toDateInputValue(date),
        inCurrentMonth: date.getMonth() === this.currentMonth.getMonth(),
        isToday: this.isSameDay(date, new Date()),
        isSelected: this.isSameDay(date, this.selectedDate),
        events: this.getEventsForDate(date),
      });
    }

    this.calendarDays = days;
  }

  getEventsForDate(date: Date): CalendarEventItem[] {
    return this.calendarEvents.filter((event) => this.isEventOnDate(event, date));
  }

  selectDate(date: Date): void {
    this.selectedDate = new Date(date);
    this.calendarDays = this.calendarDays.map((day) => ({
      ...day,
      isSelected: this.isSameDay(day.date, this.selectedDate),
    }));
    this.selectedDayEvents = this.getEventsForDate(this.selectedDate).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.loadCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.loadCalendar();
  }

  openCreateModal(date?: Date): void {
    this.scheduleForm = this.getEmptyScheduleForm();
    if (date) {
      const value = this.toDateInputValue(date);
      this.scheduleForm.startDate = value;
      this.scheduleForm.endDate = value;
    }
    this.showModal = true;
  }

  openEditModal(event: CalendarEventItem): void {
    if (event.source !== 'schedule') {
      return;
    }

    this.scheduleForm = {
      id: event.id,
      title: event.title,
      description: event.description || '',
      eventType: event.type || 'meeting',
      startDate: this.toDateInputValue(new Date(event.startDate)),
      endDate: this.toDateInputValue(new Date(event.endDate)),
      allDay: event.allDay,
      audience: (event as any).audience || 'all',
      participants: ((event as any).participants || []).map((participant: any) => participant._id || participant),
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.scheduleForm = this.getEmptyScheduleForm();
  }

  saveScheduleEvent(): void {
    if (!this.scheduleForm.title || !this.scheduleForm.startDate || !this.scheduleForm.endDate) {
      alert('Title, start date, and end date are required.');
      return;
    }

    const payload = {
      title: this.scheduleForm.title,
      description: this.scheduleForm.description,
      eventType: this.scheduleForm.eventType,
      startDate: this.scheduleForm.startDate,
      endDate: this.scheduleForm.endDate,
      allDay: this.scheduleForm.allDay,
      audience: this.scheduleForm.audience,
      participants: this.scheduleForm.participants,
    };

    this.isSaving = true;
    const request = this.scheduleForm.id
      ? this.projectservice.updateCalendarEvent(this.scheduleForm.id, payload)
      : this.projectservice.createCalendarEvent(payload);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadCalendar();
      },
      error: (err) => {
        console.error('Failed to save schedule event', err);
        this.isSaving = false;
      },
    });
  }

  deleteScheduleEvent(event: CalendarEventItem): void {
    if (event.source !== 'schedule') {
      return;
    }
    if (!confirm(`Delete "${event.title}" from the calendar?`)) {
      return;
    }

    this.projectservice.deleteCalendarEvent(event.id).subscribe({
      next: () => {
        this.loadCalendar();
      },
      error: (err) => console.error('Failed to delete calendar event', err),
    });
  }

  getEventClass(event: CalendarEventItem): string {
    return `event-${event.source}`;
  }

  formatAgendaTime(event: CalendarEventItem): string {
    if (event.allDay) {
      return 'All day';
    }

    return new Date(event.startDate).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private isEventOnDate(event: CalendarEventItem, date: Date): boolean {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate || event.startDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const current = new Date(date);
    current.setHours(12, 0, 0, 0);
    return current >= start && current <= end;
  }

  private isSameDay(first: Date, second: Date): boolean {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }

  private toDateInputValue(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
