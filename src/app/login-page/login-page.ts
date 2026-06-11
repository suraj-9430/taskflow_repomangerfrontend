import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ RouterOutlet, FormsModule, CommonModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  // Login State
  email = '';
  password = '';
  
  // Forgot Password State
  viewState: 'login' | 'forgot' | 'verify' | 'reset' = 'login';
  forgotEmail = '';
  otp = '';
  newPassword = '';
  
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor(private router: Router) {}

  login(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        if (response.success) {
          const role = response.user.role;
          
          if (role === 'admin') {
            this.router.navigate(['/dashboard']);
          } else if (role === 'manager') {
            this.router.navigate(['/manager-dashboard']);
          } else if (role === 'employee') {
            this.router.navigate(['/employee-dashboard']);
          } else {
            // Default fallback
            this.router.navigate(['/dashboard']);
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err.error && err.error.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Login failed. Please check your credentials.';
        }
      }
    });
  }

  // --- Forgot Password Flow ---

  setView(state: 'login' | 'forgot' | 'verify' | 'reset') {
    this.viewState = state;
    this.errorMessage = '';
    this.successMessage = '';
  }

  sendOtp(): void {
    if (!this.forgotEmail) {
      this.errorMessage = 'Please enter your email';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post(`${environment.apiUrl}/users/forgot-password`, {
      email: this.forgotEmail
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success) {
          this.successMessage = res.message;
          this.viewState = 'verify';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP';
      }
    });
  }

  verifyOtp(): void {
    if (!this.otp) {
      this.errorMessage = 'Please enter the OTP';
      return;
    }
    // We just move to reset step since backend verifies OTP together with new password
    this.viewState = 'reset';
    this.errorMessage = '';
  }

  resetPassword(): void {
    if (!this.newPassword) {
      this.errorMessage = 'Please enter a new password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post(`${environment.apiUrl}/users/reset-password`, {
      email: this.forgotEmail,
      otp: this.otp,
      newPassword: this.newPassword
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success) {
          this.successMessage = 'Password reset successfully! You can now log in.';
          // Reset states
          this.forgotEmail = '';
          this.otp = '';
          this.newPassword = '';
          this.viewState = 'login';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to reset password';
        if (err.error?.message?.includes('OTP')) {
          // If OTP was invalid, send them back to verify step
          this.viewState = 'verify';
        }
      }
    });
  }
}
