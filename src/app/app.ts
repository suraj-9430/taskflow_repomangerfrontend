import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('TaskFlow-pro');

  ngOnInit(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const preferences = user.settings?.preferences;
      if (preferences) {
        if (preferences.themeColor) {
          const body = document.body;
          const classesToRemove = Array.from(body.classList).filter(c => c.startsWith('theme-'));
          classesToRemove.forEach(c => body.classList.remove(c));
          body.classList.add(`theme-${preferences.themeColor}`);
        }
        if (preferences.darkMode === false) {
          document.body.classList.add('light-mode');
        } else {
          document.body.classList.remove('light-mode');
        }
      }
    } catch (e) {
      console.error('Error applying theme settings', e);
    }
  }
}
