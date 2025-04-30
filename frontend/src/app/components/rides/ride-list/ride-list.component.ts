import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

import { RideService, Ride } from '../../../services/ride.service';

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
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule
  ],
  templateUrl: './ride-list.component.html',
  styleUrls: ['./ride-list.component.scss']
})
export class RideListComponent implements OnInit {
  rides: Ride[] = [];
  searchParams = {
    origin: '',
    destination: '',
    date: '',
    seats: 1
  };

  constructor(private rideService: RideService) {}

  ngOnInit(): void {
    this.loadRides();
  }

  loadRides(): void {
    this.rideService.getRides().subscribe(
      rides => this.rides = rides,
      error => console.error('Error loading rides:', error)
    );
  }

  searchRides(): void {
    this.rideService.searchRides(this.searchParams).subscribe(
      rides => this.rides = rides,
      error => console.error('Error searching rides:', error)
    );
  }

  resetSearch(): void {
    this.searchParams = {
      origin: '',
      destination: '',
      date: '',
      seats: 1
    };
    this.loadRides();
  }
} 