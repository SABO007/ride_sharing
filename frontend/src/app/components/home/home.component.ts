import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home-container">
      <div class="hero-section">
        <h1>Welcome to Ride Sharing</h1>
        <p class="subtitle">Find your perfect ride today!</p>
        <div class="cta-buttons">
          <a routerLink="/rides" class="btn btn-primary">Find a Ride</a>
          <a routerLink="/rides/new" class="btn btn-secondary">Offer a Ride</a>
        </div>
      </div>

      <div class="features-section">
        <div class="feature-card">
          <i class="feature-icon">🚗</i>
          <h3>Safe Rides</h3>
          <p>Verified drivers and passenger safety features</p>
        </div>
        <div class="feature-card">
          <i class="feature-icon">💰</i>
          <h3>Best Prices</h3>
          <p>Affordable rides with transparent pricing</p>
        </div>
        <div class="feature-card">
          <i class="feature-icon">🌍</i>
          <h3>Go Anywhere</h3>
          <p>Long distance or local rides available</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .hero-section {
      text-align: center;
      padding: 4rem 2rem;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 1rem;
      color: white;
      margin-bottom: 3rem;
    }

    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
      font-weight: bold;
    }

    .subtitle {
      font-size: 1.5rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }

    .cta-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 1.1rem;
      font-weight: 500;
      text-decoration: none;
      transition: transform 0.2s;
    }

    .btn:hover {
      transform: translateY(-2px);
    }

    .btn-primary {
      background-color: white;
      color: #6366f1;
    }

    .btn-secondary {
      background-color: transparent;
      border: 2px solid white;
      color: white;
    }

    .features-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      padding: 2rem 0;
    }

    .feature-card {
      text-align: center;
      padding: 2rem;
      background-color: white;
      border-radius: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s;
    }

    .feature-card:hover {
      transform: translateY(-5px);
    }

    .feature-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      display: block;
    }

    .feature-card h3 {
      color: #374151;
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .feature-card p {
      color: #6b7280;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .hero-section {
        padding: 3rem 1rem;
      }

      h1 {
        font-size: 2.5rem;
      }

      .subtitle {
        font-size: 1.25rem;
      }

      .cta-buttons {
        flex-direction: column;
      }

      .btn {
        width: 100%;
        margin-bottom: 1rem;
      }
    }
  `]
})
export class HomeComponent {} 