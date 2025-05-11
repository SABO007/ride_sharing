import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RideService } from '../../../services/ride.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

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
    MatSnackBarModule,
    MatProgressSpinnerModule
  ]
})
export class RideRequestsComponent implements OnInit, OnDestroy {
  pendingRequests: any[] = [];
  loading = false;
  private isComponentActive = true;
  private refreshSubscription?: Subscription;

  constructor(
    private rideService: RideService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadPendingRequests();
    // Refresh every 30 seconds while component is active
    this.refreshSubscription = interval(30000)
      .pipe(takeWhile(() => this.isComponentActive))
      .subscribe(() => this.loadPendingRequests());
  }

  ngOnDestroy() {
    this.isComponentActive = false;
    this.refreshSubscription?.unsubscribe();
  }

  loadPendingRequests() {
    if (this.loading) return; // Prevent concurrent requests
    this.loading = true;
    this.rideService.getPendingRequests().subscribe({
      next: (requests) => {
        this.pendingRequests = requests;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Failed to load requests', 'Close', {
          duration: 3000,
          horizontalPosition: 'start',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  handleRequest(requestId: string, status: 'approved' | 'rejected') {
    this.loading = true;
    this.rideService.handleRideRequest(requestId, status).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open(`Request ${status} successfully`, 'Close', {
          duration: 3000,
          horizontalPosition: 'start',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.loadPendingRequests(); // Reload the list
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Failed to handle request', 'Close', {
          duration: 3000,
          horizontalPosition: 'start',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }
} 