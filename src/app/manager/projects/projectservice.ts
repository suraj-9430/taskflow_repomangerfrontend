import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Projectservice {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Auth header helper ────────────────────
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Users ─────────────────────────────────
  getuser() {
    return this.http.get(`${this.baseUrl}/users`, {
      headers: this.getAuthHeaders(),
    });
  }

  // GET /api/users/employees — role=employee only, all statuses
  getEmployees() {
    return this.http.get(`${this.baseUrl}/users/employees`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ── Projects (all protected) ──────────────
  getAllProjects() {
    return this.http.get(`${this.baseUrl}/projects`, {
      headers: this.getAuthHeaders(),
    });
  }

  getProjectById(id: string) {
    return this.http.get(`${this.baseUrl}/projects/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  createProject(payload: any) {
    return this.http.post(`${this.baseUrl}/projects`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  updateProject(id: string, payload: any) {
    return this.http.put(`${this.baseUrl}/projects/${id}`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteProject(id: string) {
    return this.http.delete(`${this.baseUrl}/projects/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // ── Tasks ─────────────────────────────────
  getAllTasks() {
    return this.http.get(`${this.baseUrl}/tasks`, {
      headers: this.getAuthHeaders(),
    });
  }

  getTaskById(id: string) {
    return this.http.get(`${this.baseUrl}/tasks/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  createTask(payload: any) {
    return this.http.post(`${this.baseUrl}/tasks`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  updateTask(id: string, payload: any) {
    return this.http.put(`${this.baseUrl}/tasks/${id}`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteTask(id: string) {
    return this.http.delete(`${this.baseUrl}/tasks/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  getTaskComments(taskId: string) {
    return this.http.get(`${this.baseUrl}/tasks/${taskId}/comments`, {
      headers: this.getAuthHeaders(),
    });
  }

  createTaskComment(taskId: string, payload: any) {
    return this.http.post(`${this.baseUrl}/tasks/${taskId}/comments`, payload, {
      headers: this.getAuthHeaders(),
    });
  }
}
