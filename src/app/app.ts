import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('TaskFlow-pro');
  private authService = inject(AuthService);

  ngOnInit(): void {
    // Attempt to load profile on boot
    this.authService.loadUserProfile().subscribe();

    // Dynamically apply settings whenever current user updates
    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user && user.settings?.preferences) {
          const preferences = user.settings.preferences;
          const body = document.body;
          
          if (preferences.themeColor) {
            const classesToRemove = Array.from(body.classList).filter(c => c.startsWith('theme-'));
            classesToRemove.forEach(c => body.classList.remove(c));
            body.classList.add(`theme-${preferences.themeColor}`);
          }
          
          if (preferences.darkMode === false) {
            body.classList.add('light-mode');
          } else {
            body.classList.remove('light-mode');
          }
        }
      },
      error: (e) => console.error('Error applying theme settings', e)
    });
  }
}
