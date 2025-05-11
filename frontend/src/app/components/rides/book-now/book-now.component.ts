import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RideService, Ride, Booking } from '../../../services/ride.service';
import { AuthService } from '../../../services/auth.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-book-now',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './book-now.component.html',
  styleUrls: ['./book-now.component.scss']
})

export class BookNowComponent implements OnInit {
  shouldRenderForm = false;
  rideId: string | null = null;
  ride: Ride | null = null;
  loading = false;
  error: string | null = null;
  success = false;
  isOwner = false;
  currentUserId: string | null = null;
  bookingDetails = {
    pickupLocation: '',
    dropoffLocation: '',
    date: '',
    time: '',
    passengers: 1,
    specialRequests: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rideService: RideService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loading = true;
  
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
  
        this.route.params.subscribe(params => {
          const rideId = params['id'];
          if (rideId) {
            this.rideId = rideId;
            this.rideService.getRideById(rideId).subscribe({
              next: (ride) => {
                if (ride) {
                  if (this.currentUserId === ride.driverId) {
                    this.error = 'You cannot book your own ride';
                    this.snackBar.open(this.error, 'Close', {
                      duration: 4000,
                      horizontalPosition: 'center',
                      verticalPosition: 'top',
                      panelClass: ['error-snackbar']
                    });
                    this.router.navigate(['/rides']);
                    return;
                  }
  
                  this.ride = ride;
                  this.bookingDetails.pickupLocation = ride.origin;
                  this.bookingDetails.dropoffLocation = ride.destination;
                  this.bookingDetails.date = ride.date;
                  this.bookingDetails.time = ride.time;
  
                  this.shouldRenderForm = true;  // ✅ Render form only now
                }
                this.loading = false;
              },
              error: () => {
                this.error = 'Failed to load ride details';
                this.loading = false;
              }
            });
          }
        });
      }
    });
  }
  

  confirmBooking() {
    if (!this.rideId || !this.ride) {
      this.error = 'Invalid ride ID';
      return;
    }

    if (this.isOwner) {
      this.error = 'You cannot book your own ride';
      this.snackBar.open(this.error, 'Close', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      this.router.navigate(['/rides']);
      return;
    }

    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) {
        this.error = 'User not logged in';
        return;
      }

      const booking: Booking = {
        rideId: this.rideId!,
        passengerId: user.id,
        pickupLocation: this.bookingDetails.pickupLocation,
        dropoffLocation: this.bookingDetails.dropoffLocation,
        date: this.bookingDetails.date,
        time: this.bookingDetails.time,
        passengers: this.bookingDetails.passengers,
        specialRequests: this.bookingDetails.specialRequests
      };

      this.loading = true;
      this.rideService.bookRide(booking).subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('🎉 Ride request sent to the user!', 'Close', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['custom-snackbar']
          });
          this.router.navigate(['/rides']);
        },
        error: (err) => {
          this.error = 'Failed to book ride. Please try again later.';
          this.loading = false;
          console.error('Error booking ride:', err);
          this.snackBar.open(this.error, 'Close', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
    } catch {
      return 'Invalid Date';
    }
  }

  get rideDateForInput(): string {
    return this.ride?.date ? new Date(this.ride.date).toISOString().split('T')[0] : '';
  }

  cancelBooking() {
    this.router.navigate(['/rides']);
  }

  goToRides() {
    this.router.navigate(['/rides']);
  }
}
