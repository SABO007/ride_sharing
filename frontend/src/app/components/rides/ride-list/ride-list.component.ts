import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatSliderChange } from '@angular/material/slider';
import { RideService, Ride, SearchParams } from '../../../services/ride.service';
import { AuthService } from '../../../services/auth.service';
import { debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-ride-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSliderModule,
    ReactiveFormsModule,
  ],
  templateUrl: './ride-list.component.html',
  styleUrls: ['./ride-list.component.scss']
})
export class RideListComponent implements OnInit {
  rides: Ride[] = [];
  filteredRides: Ride[] = [];
  loading = false;
  error: string | null = null;
  maxPriceValue: number = 0;
  seatsValue: number = 1;
  showFilters: boolean = false;
  today: Date = new Date();
  currentUserId: string | null = null;
  fromSuggestions: any[] = [];
  toSuggestions: any[] = [];

  searchParams: SearchParams = {
    from: '',
    to: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    seats: 1,
    maxPrice: undefined
  };

  fromControl = new FormControl('');
  toControl = new FormControl('');

  constructor(
    private rideService: RideService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loading = true;
    this.error = null;

    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.loadRides();
      }
    });


    // Handle autocomplete for 'from'
    this.fromControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: string | null) => {
        const val = value || '';
        if (val.length >= 3) {
          return this.rideService.getPlaceSuggestions(val).pipe(
            map((res: any) => res.predictions ? res.predictions.slice(0, 3) : [])
          );
        } else {
          return of([]);
        }
      })
    ).subscribe(suggestions => this.fromSuggestions = suggestions);

    // Handle autocomplete for 'to'
    this.toControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: string | null) => {
        const val = value || '';
        if (val.length >= 3) {
          return this.rideService.getPlaceSuggestions(val).pipe(
            map((res: any) => res.predictions ? res.predictions.slice(0, 3) : [])
          );
        } else {
          return of([]);
        }
      })
    ).subscribe(suggestions => this.toSuggestions = suggestions);

    this.seatsValue = this.searchParams.seats || 1;
    this.maxPriceValue = this.searchParams.maxPrice || 1000;
  }

  loadRides() {
    this.rideService.getRides().subscribe({
      next: (rides) => {
        // Filter out rides where the current user is the driver
        this.filteredRides = rides.filter(ride => ride.driver !== this.currentUserId);
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load rides. Please try again later.';
        this.loading = false;
      }
    });
  }

  onSeatsChange(event: any) {
    const value = event.target?.value || event.value;
    if (value !== null && value !== undefined) {
      this.seatsValue = Number(value);
      this.searchParams.seats = this.seatsValue;
    }
  }

  onPriceChange(event: any) {
    const value = event.target?.value || event.value;
    if (value !== null && value !== undefined) {
      this.maxPriceValue = Number(value);
      this.searchParams.maxPrice = this.maxPriceValue;
    }
  }

  searchRides() {
    this.loading = true;
    this.error = null;

    const from = this.fromControl.value;
    const to = this.toControl.value;

    if (!from || !to) {
      this.error = 'Please enter both from and to locations';
      this.loading = false;
      return;
    }

    const searchParams: SearchParams = {
      from,
      to,
      date: this.searchParams.date,
      time: this.searchParams.time,
      seats: this.seatsValue,
      maxPrice: this.maxPriceValue
    };

    this.rideService.searchRides(searchParams).subscribe({
      next: (rides) => {
        console.log('Search results:', rides);
        this.rides = rides.map(ride => ({
          ...ride,
          from: ride.from ?? ride.origin,
          to: ride.to ?? ride.destination,
          seats: ride.seats ?? ride.availableSeats
        }));
        // Filter out rides posted by the current user
        this.filteredRides = this.currentUserId 
          ? this.rides.filter(ride => ride.driver !== this.currentUserId)
          : this.rides;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error searching rides:', error);
        this.error = 'Failed to search rides. Please try again.';
        this.loading = false;
      }
    });
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  clearSearch() {
    this.searchParams = {
      from: '',
      to: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      seats: 1,
      maxPrice: undefined
    };
    this.maxPriceValue = 1000;
    this.seatsValue = 1;
    this.loadRides();
  }

  formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateStr);
        return 'Invalid Date';
      }
      
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[month]} ${day}, ${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  getDisplayLocation(address: string): string {
    if (!address) return '';
    if (address.length <= 10) return address;
    const parts = address.split(',').map(part => part.trim());
    if (parts.length >= 2) {
      return parts[parts.length - 3];
    }
    return address;
  }

  selectFromSuggestion(suggestion: any) {
    this.searchParams.from = suggestion.description;
    this.fromControl.setValue(suggestion.description, { emitEvent: false });
    this.fromSuggestions = [];
  }

  selectToSuggestion(suggestion: any) {
    this.searchParams.to = suggestion.description;
    this.toControl.setValue(suggestion.description, { emitEvent: false });
    this.toSuggestions = [];
  }
  
}