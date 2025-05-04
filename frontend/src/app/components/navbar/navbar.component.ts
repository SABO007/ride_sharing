import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar">
      <div class="navbar-brand">
        <a routerLink="/" class="logo">GatorRide</a>
      </div>
      
      <div class="navbar-menu">
        <ng-container *ngIf="authService.isAuthenticated() | async; else notAuthenticated">
          <div class="navbar-end">
            <div class="user-profile">
              <div class="avatar" *ngIf="(authService.currentUser$ | async)?.profile_image; else noImage">
                <img [src]="(authService.currentUser$ | async)?.profile_image" alt="Profile" />
              </div>
              <ng-template #noImage>
                <div class="avatar fallback">
                  {{ (authService.currentUser$ | async)?.name?.charAt(0) }}
                </div>
              </ng-template>
              <span class="user-info">
                {{ (authService.currentUser$ | async)?.name }}
              </span>
            </div>
            <button (click)="logout()" class="logout-button">
              Logout
            </button>
          </div>
        </ng-container>
        
        <ng-template #notAuthenticated>
          <div class="navbar-end">
            <a routerLink="/login" class="nav-link">Login</a>
            <a routerLink="/signup" class="nav-link primary">Sign Up</a>
          </div>
        </ng-template>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background-color: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .navbar-brand {
      font-size: 1.5rem;
      font-weight: bold;
    }

    .logo {
      color: #4f46e5;
      text-decoration: none;
    }

    .navbar-menu {
      display: flex;
      align-items: center;
    }

    .navbar-end {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      background-color: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      &.fallback {
        background-color: #4f46e5;
        color: white;
        font-weight: bold;
        font-size: 1.2rem;
      }
    }

    .user-info {
      color: #4b5563;
    }

    .nav-link {
      color: #4b5563;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      transition: all 0.2s;

      &:hover {
        color: #4f46e5;
      }

      &.primary {
        background-color: #4f46e5;
        color: white;

        &:hover {
          background-color: #4338ca;
        }
      }
    }

    .logout-button {
      background-color: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: #dc2626;
      }
    }
  `]
})
export class NavbarComponent {
  constructor(public authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
} 