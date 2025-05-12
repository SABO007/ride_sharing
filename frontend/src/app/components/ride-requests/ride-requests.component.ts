import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RideService, RideRequest } from '../../services/ride.service';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-ride-requests',
  templateUrl: './ride-requests.component.html',
  styleUrls: ['./ride-requests.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatDividerModule,
    MatTooltipModule
  ]
})
export class RideRequestsComponent implements OnInit, OnDestroy {
  pendingRequests: RideRequest[] = [];
  loading = false;
  timerSubscription: Subscription | null = null;
  requestTimers: { [requestId: string]: string } = {};
  currentUserId: string | null = null;

  constructor(
    private rideService: RideService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // First get the current user
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.loadPendingRequestsForDrivers();
      }
    });
    
    // Update timers every second
    this.timerSubscription = interval(1000).subscribe(() => {
      this.updateRequestTimers();
    });
  }
  
  ngOnDestroy() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  updateRequestTimers() {
    for (const request of this.pendingRequests) {
      if (request.status === 'pending' && request.createdAt) {
        this.requestTimers[request.id] = this.getTimeElapsed(request.createdAt);
      }
    }
  }

  getTimeElapsed(createdAtStr: string): string {
    const createdAt = new Date(createdAtStr);
    const now = new Date();
    
    if (isNaN(createdAt.getTime())) {
      return '';
    }
    
    const diffMs = now.getTime() - createdAt.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    
    if (diffHr > 0) {
      return `${diffHr}h ${diffMin % 60}m`;
    } else if (diffMin > 0) {
      return `${diffMin}m ${diffSec % 60}s`;
    } else {
      return `${diffSec}s`;
    }
  }

  loadPendingRequestsForDrivers() {
    if (!this.currentUserId) {
      this.snackBar.open('User not authenticated', 'Close', {
        duration: 3000
      });
      return;
    }
    
    console.log('Loading pending requests for driver ID:', this.currentUserId);
    this.loading = true;
    
    this.rideService.getPendingRequestsForDrivers(this.currentUserId).subscribe({
      next: (requests) => {
        console.log('Received driver ride requests:', requests);
        this.loadPriceInformation(requests);
      },
      error: (error) => {
        console.error('Error loading driver ride requests:', error);
        this.loading = false;
        this.snackBar.open('Failed to load ride requests', 'Close', {
          duration: 3000
        });
      }
    });
  }

  loadUserRideRequests() {
    if (!this.currentUserId) {
      this.snackBar.open('User not authenticated', 'Close', {
        duration: 3000
      });
      return;
    }
    
    console.log('Loading ride requests for user ID:', this.currentUserId);
    this.loading = true;
    
    this.rideService.getPendingRequestsForUser(this.currentUserId).subscribe({
      next: (requests) => {
        console.log('Received user ride requests:', requests);
        this.loadPriceInformation(requests);
      },
      error: (error) => {
        console.error('Error loading user ride requests:', error);
        this.loading = false;
        this.snackBar.open('Failed to load ride requests', 'Close', {
          duration: 3000
        });
      }
    });
  }

  loadPriceInformation(requests: RideRequest[]) {
    if (requests.length === 0) {
      this.pendingRequests = requests;
      this.updateRequestTimers();
      this.loading = false;
      return;
    }

    const pendingRideInfo = requests.map(request => ({
      request,
      priceLoaded: false
    }));
    
    for (const item of pendingRideInfo) {
      this.rideService.getRideById(item.request.rideId).subscribe({
        next: (ride) => {
          if (ride) {
            item.request.price = ride.price;
          }
          item.priceLoaded = true;
          
          if (pendingRideInfo.every(item => item.priceLoaded)) {
            this.pendingRequests = pendingRideInfo.map(item => item.request);
            this.updateRequestTimers();
            this.loading = false;
          }
        },
        error: (error) => {
          console.error(`Error loading ride info for request ${item.request.id}:`, error);
          item.priceLoaded = true;
          
          if (pendingRideInfo.every(item => item.priceLoaded)) {
            this.pendingRequests = pendingRideInfo.map(item => item.request);
            this.updateRequestTimers();
            this.loading = false;
          }
        }
      });
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'Not specified';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateStr;
    }
  }

  handleRequest(requestId: string, status: 'approved' | 'rejected') {
    this.loading = true;
    this.rideService.handleRideRequest(requestId, status).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open(`Request ${status} successfully`, 'Close', {
          duration: 3000
        });
        this.loadPendingRequestsForDrivers();
      },
      error: (error) => {
        console.error(`Error ${status} request:`, error);
        this.loading = false;
        this.snackBar.open(`Failed to ${status} request`, 'Close', {
          duration: 3000
        });
      }
    });
  }

  getInitial(name: string | undefined): string {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : 'U';
  }

  isDriver(request: RideRequest): boolean {
    return request.passengerId !== this.currentUserId;
  }
} 