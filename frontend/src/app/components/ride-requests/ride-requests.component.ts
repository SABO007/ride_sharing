import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RideService } from '../../services/ride.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    MatSnackBarModule
  ]
})
export class RideRequestsComponent implements OnInit {
  pendingRequests: any[] = [];
  loading = false;

  constructor(
    private rideService: RideService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadPendingRequests();
  }

  loadPendingRequests() {
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