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
import { MatTabsModule } from '@angular/material/tabs';
import { RideService, RideRequest } from '../../services/ride.service';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription, forkJoin } from 'rxjs';

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
    MatTooltipModule,
    MatTabsModule
  ]
})
export class RideRequestsComponent implements OnInit, OnDestroy {
  allRequests: RideRequest[] = [];
  myRequests: RideRequest[] = [];
  rideRequests: RideRequest[] = [];
  activeTabIndex = 0;
  loading = false;
  timerSubscription: Subscription | null = null;
  statusCheckSubscription: Subscription | null = null;
  requestTimers: { [requestId: string]: string } = {};
  currentUserId: string | null = null;
  previousRequestStatuses: { [requestId: string]: string } = {};
  hasNewApprovedRequests = false;

  constructor(
    private rideService: RideService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        
        // Check URL to determine which tab to activate by default
        const path = window.location.pathname;
        if (path.includes('my-requests')) {
          this.activeTabIndex = 0; // My Requests tab
        } else {
          this.activeTabIndex = 1; // Ride Requests tab
        }
        
        this.loadAllRequests();
        
        // Check for stored notifications (new addition)
        this.checkStoredNotifications();
      }
    });
    
    this.timerSubscription = interval(1000).subscribe(() => {
      this.updateRequestTimers();
    });

    this.statusCheckSubscription = interval(10000).subscribe(() => {
      if (this.currentUserId) {
        this.checkForStatusChanges();
      }
    });
  }
  
  ngOnDestroy() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.statusCheckSubscription) {
      this.statusCheckSubscription.unsubscribe();
    }
  }

  loadAllRequests() {
    if (!this.currentUserId) {
      this.snackBar.open('User not authenticated', 'Close', {
        duration: 3000
      });
      return;
    }
    
    this.loading = true;
    
    // Load both types of requests
    forkJoin({
      myRequests: this.rideService.getPendingRequestsForUser(this.currentUserId),
      rideRequests: this.rideService.getPendingRequestsForDrivers(this.currentUserId)
    }).subscribe({
      next: (result) => {
        this.myRequests = result.myRequests;
        this.rideRequests = result.rideRequests;
        
        // Store previous statuses for checking changes
        this.myRequests.forEach(request => {
          this.previousRequestStatuses[request.id] = request.status;
        });
        
        // Check if there are any approved requests
        this.hasNewApprovedRequests = this.myRequests.some(request => request.status === 'approved');
        
        // Load price information for all requests
        this.loadPriceInformation(this.myRequests.concat(this.rideRequests));
      },
      error: (error) => {
        console.error('Error loading ride requests:', error);
        this.loading = false;
        this.snackBar.open('Failed to load ride requests', 'Close', {
          duration: 3000
        });
      }
    });
  }

  checkForStatusChanges() {
    if (!this.currentUserId) return;
    
    this.rideService.getPendingRequestsForUser(this.currentUserId).subscribe({
      next: (requests) => {
        requests.forEach(request => {
          const prevStatus = this.previousRequestStatuses[request.id];
          
          if (prevStatus && prevStatus === 'pending' && request.status === 'approved') {
            // Show notification immediately
            this.showRideApprovedNotification(request);
            
            // Also store it for persistence
            const notification = {
              type: 'ride_approved',
              requestId: request.id,
              from: request.from,
              to: request.to,
              timestamp: new Date().toISOString(),
              seen: true // Already shown to the user
            };
            
            // Get existing notifications or create empty array
            const existingNotifications = JSON.parse(localStorage.getItem('ride_notifications') || '[]');
            existingNotifications.push(notification);
            localStorage.setItem('ride_notifications', JSON.stringify(existingNotifications));
          }
          
          this.previousRequestStatuses[request.id] = request.status;
        });
        
        // Update the approved requests flag
        this.hasNewApprovedRequests = requests.some(request => request.status === 'approved');
      },
      error: (error) => {
        console.error('Error checking ride request status changes:', error);
      }
    });
  }

  showRideApprovedNotification(request: RideRequest) {
    this.snackBar.open(
      `🎉 Great news! Your ride request from ${request.from} to ${request.to} has been approved!`, 
      'View Details', 
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['custom-snackbar', 'ride-approved-notification']
      }
    ).onAction().subscribe(() => {
      // Switch to the My Requests tab
      this.activeTabIndex = 0;
      // Refresh the list
      this.loadAllRequests();
    });
  }

  updateRequestTimers() {
    // Update timers for all requests
    const allRequests = this.myRequests.concat(this.rideRequests);
    for (const request of allRequests) {
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

  loadPriceInformation(requests: RideRequest[]) {
    if (requests.length === 0) {
      this.allRequests = requests;
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
            this.allRequests = pendingRideInfo.map(item => item.request);
            this.updateRequestTimers();
            this.loading = false;
          }
        },
        error: (error) => {
          console.error(`Error loading ride info for request ${item.request.id}:`, error);
          item.priceLoaded = true;
          
          if (pendingRideInfo.every(item => item.priceLoaded)) {
            this.allRequests = pendingRideInfo.map(item => item.request);
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
    
    // Find the request to get passenger details
    const request = this.rideRequests.find(req => req.id === requestId);
    
    this.rideService.handleRideRequest(requestId, status).subscribe({
      next: () => {
        this.loading = false;
        
        // Show appropriate notification based on action
        if (status === 'approved') {
          // Immediately store a notification in localStorage to ensure it persists
          if (request) {
            // Store approval data to show a notification next time the user opens the app
            const notification = {
              type: 'ride_approved',
              requestId: requestId,
              from: request.from,
              to: request.to,
              timestamp: new Date().toISOString(),
              seen: false
            };
            
            // Get existing notifications or create empty array
            const existingNotifications = JSON.parse(localStorage.getItem('ride_notifications') || '[]');
            existingNotifications.push(notification);
            localStorage.setItem('ride_notifications', JSON.stringify(existingNotifications));
          }
          
          // Show notification to the driver
          this.snackBar.open(
            `🎉 You've approved the ride request! The passenger will be notified.`, 
            'View Details', 
            {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['custom-snackbar', 'driver-approved-notification']
            }
          ).onAction().subscribe(() => {
            // Refresh the list and switch to the Driver Requests tab
            this.activeTabIndex = 1;
            this.loadAllRequests();
          });
        } else {
          // Show rejection notification
          this.snackBar.open(
            `❌ You've rejected the ride request from ${request?.passengerName || 'passenger'}.`,
            'Close', 
            {
              duration: 4000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar']
            }
          );
        }
        
        this.loadAllRequests();
      },
      error: (error) => {
        console.error(`Error ${status} request:`, error);
        this.loading = false;
        this.snackBar.open(`Failed to ${status} request`, 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
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

  isPassenger(request: RideRequest): boolean {
    return request.passengerId === this.currentUserId;
  }

  onTabChange(event: any) {
    this.activeTabIndex = event.index;
  }

  // Add this new method to check for stored notifications
  checkStoredNotifications() {
    try {
      const notifications = JSON.parse(localStorage.getItem('ride_notifications') || '[]');
      
      if (notifications.length > 0) {
        // Process unseen notifications
        const unseenNotifications = notifications.filter((n: any) => !n.seen);
        
        // Show notifications for approved rides
        unseenNotifications.forEach((notification: any) => {
          if (notification.type === 'ride_approved') {
            this.showRideApprovedNotification({
              id: notification.requestId,
              from: notification.from,
              to: notification.to
            } as RideRequest);
            
            // Mark as seen
            notification.seen = true;
          }
        });
        
        // Update localStorage with seen status
        localStorage.setItem('ride_notifications', JSON.stringify(notifications));
      }
    } catch (error) {
      console.error('Error processing stored notifications:', error);
    }
  }
}