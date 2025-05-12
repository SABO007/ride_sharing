import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { RideService } from '../../../services/ride.service';
import { AuthService } from '../../../services/auth.service';
import { interval, Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';

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
    MatButtonModule
  ]
})
export class NavbarComponent implements OnInit, OnDestroy {
  pendingRequestsCount = 0;
  isRideCreator = false;
  private isSSR = false;
  private refreshSubscription?: Subscription;
  private userId: string | null = null;

  constructor(
    private router: Router,
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
        this.isRideCreator = true;
        this.loadPendingRequests();
      }
    });

    // Update count every 30 seconds only in browser
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadPendingRequests();
    });
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadPendingRequests() {
    // Skip if in SSR
    if (this.isSSR) {
      return;
    }

    this.rideService.getPendingRequests().subscribe(requests => {
      // Filter requests for this user's rides
      this.pendingRequestsCount = requests.length;
    });
  }

  onNotificationClick() {
    // If user has pending driver requests, navigate to driver requests page
    // Otherwise, navigate to user's ride requests page
    if (this.isRideCreator && this.pendingRequestsCount > 0) {
      this.router.navigate(['/rides/requests']);
    } else {
      this.router.navigate(['/my-requests']);
    }
  }

  logout() {
    this.authService.logout();
  }
} 