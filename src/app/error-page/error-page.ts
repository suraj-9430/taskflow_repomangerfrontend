import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-page.html',
  styleUrl: './error-page.css'
})
export class ErrorPage {
  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/']);
  }
}
