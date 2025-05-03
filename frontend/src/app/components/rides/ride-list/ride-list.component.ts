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
import { RideService, Ride } from '../../../services/ride.service';

interface SearchParams {
  from: string;
  to: string;
  date: Date;
  time?: string;
  seats: number;
}

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
    MatIconModule
  ],
  templateUrl: './ride-list.component.html',
  styleUrls: ['./ride-list.component.scss']
})
export class RideListComponent implements OnInit {
  rides: Ride[] = [];
  loading = false;
  error: string | null = null;

  searchParams: SearchParams = {
    from: '',
    to: '',
    date: new Date(),
    time: '',
    seats: 1
  };

  today: Date = new Date();

  constructor(private rideService: RideService) {}

  ngOnInit() {
    this.loadRides();
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

  searchRides() {
    this.loading = true;
    this.error = null;

    // Validate required fields
    if (!this.searchParams.from || !this.searchParams.to) {
      this.error = 'Please enter both from and to locations';
      this.loading = false;
      return;
    }

    // Format date as YYYY-MM-DD
    const formattedDate = this.searchParams.date instanceof Date
      ? this.searchParams.date.toISOString().split('T')[0]
      : this.searchParams.date;

    // Format time as HH:MM:SS if present
    let formattedTime = this.searchParams.time || '';
    if (formattedTime.length === 5) formattedTime += ':00';
    if (formattedTime.length > 8) formattedTime = formattedTime.slice(0, 8);

    // If no time is specified, use current time
    if (!formattedTime) {
      const now = new Date();
      formattedTime = now.toTimeString().slice(0, 8);
    }

    console.log('Searching with params:', {
      from: this.searchParams.from,
      to: this.searchParams.to,
      date: formattedDate,
      time: formattedTime
    });

    this.rideService.searchRides({
      from: this.searchParams.from,
      to: this.searchParams.to,
      date: formattedDate,
      time: formattedTime
    }).subscribe({
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

  resetSearch() {
    this.searchParams = {
      from: '',
      to: '',
      date: new Date(),
      time: '',
      seats: 1
    };
    this.loadRides();
  }
} 