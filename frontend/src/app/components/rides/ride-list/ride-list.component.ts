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
    MatSliderModule
  ],
  templateUrl: './ride-list.component.html',
  styleUrls: ['./ride-list.component.scss']
})
export class RideListComponent implements OnInit {
  rides: Ride[] = [];
  loading = false;
  error: string | null = null;
  maxPriceValue: number = 0;
  seatsValue: number = 1;
  showFilters: boolean = false;
  today: Date = new Date();

  searchParams: SearchParams = {
    from: '',
    to: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    seats: 1,
    maxPrice: undefined
  };

  constructor(private rideService: RideService) {}

  ngOnInit() {
    this.loadRides();
    this.seatsValue = this.searchParams.seats || 1;
    this.maxPriceValue = this.searchParams.maxPrice || 1000;
  }

  loadRides() {
    this.loading = true;
    this.error = null;
    
    this.rideService.getRides().subscribe({
      next: (rides) => {
        console.log('Received rides:', rides);
        this.rides = rides;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading rides:', error);
        this.error = 'Failed to load rides. Please try again.';
        this.loading = false;
      }
    });
  }

  onSeatsChange(event: any) {
    console.log('Seats change event:', event);
    const value = event.target?.value || event.value;
    if (value !== null && value !== undefined) {
      this.seatsValue = Number(value);
      this.searchParams.seats = this.seatsValue;
      console.log('Updated seats value:', this.seatsValue);
    }
  }

  onPriceChange(event: any) {
    console.log('Price change event:', event);
    const value = event.target?.value || event.value;
    if (value !== null && value !== undefined) {
      this.maxPriceValue = Number(value);
      this.searchParams.maxPrice = this.maxPriceValue;
      console.log('Updated price value:', this.maxPriceValue);
    }
  }

  searchRides() {
    this.loading = true;
    this.error = null;

    if (!this.searchParams.from || !this.searchParams.to) {
      this.error = 'Please enter both from and to locations';
      this.loading = false;
      return;
    }

    // Use the date directly without timezone adjustment
    const formattedDate = this.searchParams.date;
    console.log('Original date:', this.searchParams.date);
    console.log('Formatted date:', formattedDate);

    let formattedTime = this.searchParams.time || '';
    if (formattedTime.length === 5) formattedTime += ':00';
    if (formattedTime.length > 8) formattedTime = formattedTime.slice(0, 8);

    if (!formattedTime) {
      const now = new Date();
      formattedTime = now.toTimeString().slice(0, 8);
    }

    // Prepare search parameters with explicitly set filter values
    const searchParams: SearchParams = {
      from: this.searchParams.from,
      to: this.searchParams.to,
      date: formattedDate,
      time: formattedTime,
      seats: this.seatsValue,            
      maxPrice: this.maxPriceValue        
    };

    console.log('Preparing search with params:', searchParams);

    this.rideService.searchRides(searchParams).subscribe({
      next: (rides) => {
        console.log('Search results:', rides);
        this.rides = rides;
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

  resetSearch() {
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

  // Add method to format date without timezone conversion
  formatDate(dateStr: string): string {
    try {
      // Handle both YYYY-MM-DD and other date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateStr);
        return 'Invalid Date';
      }
      
      // Format the date using UTC to avoid timezone issues
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
}