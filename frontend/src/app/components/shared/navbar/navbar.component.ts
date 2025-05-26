import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { RideService } from '../../../services/ride.service';
import { AuthService } from '../../../services/auth.service';
import { interval, Subscription, forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatBadgeModule,
    MatButtonModule,
    MatTooltipModule
  ]
})
export class NavbarComponent implements OnInit, OnDestroy {
  notificationCount = 0;
  private isSSR = false;
  private refreshSubscription?: Subscription;
  private userId: string | null = null;

  constructor(
    public router: Router,
    private rideService: RideService,
    public authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isSSR = isPlatformServer(this.platformId);
  }

  ngOnInit() {
    // Skip request fetching during SSR
    if (this.isSSR) {
      return;
    }

    // Subscribe to current user changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userId = user.id;
        this.loadNotifications();
      }
    });

    // Update count every 15 seconds only in browser
    this.refreshSubscription = interval(15000).subscribe(() => {
      this.loadNotifications();
    });
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadNotifications() {
    // Skip if in SSR
    if (this.isSSR || !this.userId) {
      return;
    }

    // Load both types of notifications in parallel
    if (this.userId) {
      forkJoin({
        passengerRequests: this.rideService.getPendingRequestsForUser(this.userId),
        driverRequests: this.rideService.getPendingRequestsForDrivers(this.userId)
      }).subscribe(results => {
        // Count all notifications
        const passengerCount = results.passengerRequests.length;
        const driverCount = results.driverRequests.length;
        
        // Set total notification count
        this.notificationCount = passengerCount + driverCount;
      });
    }
  }

  onNotificationClick() {
    // Always navigate to the universal ride notifications page
    this.router.navigate(['/rides/requests']);
  }

  logout() {
    this.authService.logout();
  }
} 