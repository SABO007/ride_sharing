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
import { UserService } from '../../../services/user.service';
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
  passengerError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rideService: RideService,
    private authService: AuthService,
    private userService: UserService,
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
                  if (this.currentUserId === ride.driver) {
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
  
                  this.shouldRenderForm = true;
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
  

  validatePassengers(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    const availableSeats = this.ride?.seats || this.ride?.availableSeats || 0;

    if (value > availableSeats) {
      this.passengerError = `Not enough seats available. Only ${availableSeats} seats are available for this ride.`;
      this.snackBar.open(this.passengerError, 'Close', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      // Reset the input value to the maximum available seats
      this.bookingDetails.passengers = availableSeats;
    } else {
      this.passengerError = null;
    }
  }

  confirmBooking() {
    if (!this.rideId || !this.ride) {
      this.error = 'Invalid ride ID';
      return;
    }

    // Check if there's a passenger error
    if (this.passengerError) {
      return; // Don't proceed with booking if there's a validation error
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

      const booking = {
        rideId: this.rideId!,
        passengerId: user.id,
        passengerName: user.name || 'Unknown User',
        profilePic: (user as any).profilePic || '',
        from: this.ride?.from || this.ride?.origin || '',
        to: this.ride?.to || this.ride?.destination || '',
        date: this.bookingDetails.date,
        time: this.bookingDetails.time,
        passengers: this.bookingDetails.passengers,
        specialRequests: this.bookingDetails.specialRequests || ''
      };

      console.log('Creating ride request with data:', booking);

      this.loading = true;
      this.rideService.createRideRequest(booking).subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('🎉 Ride request sent to the driver! You will be notified when they respond.', 'Close', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['custom-snackbar']
          });
          this.router.navigate(['/rides']);
        },
        error: (err) => {
          this.error = 'Failed to send ride request. Please try again later.';
          this.loading = false;
          console.error('Error creating ride request:', err);
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

  getDisplayLocation(address: string): string {
    if (!address) return '';
    if (address.length <= 10) return address;
    const parts = address.split(',').map(part => part.trim());
    if (parts.length >= 2) {
      return parts[parts.length - 3] + ', ' + parts[parts.length - 2];
    }
    return address;
  }

}
