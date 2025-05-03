import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RideService } from '../../../services/ride.service';
import { debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';

declare var google: any;

@Component({
  selector: 'app-ride-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
  templateUrl: './ride-form.component.html',
  styleUrls: ['./ride-form.component.scss']
})
export class RideFormComponent implements AfterViewInit, OnDestroy {
  ride = {
    driver: '',
    from: '',
    to: '',
    date: '',
    time: '',
    seats: 1,
    price: 0,
    description: '',
    status: 'available'
  };
  loading = false;
  error: string | null = null;
  @ViewChild('fromInput') fromInput!: ElementRef;
  @ViewChild('toInput') toInput!: ElementRef;
  private fromAutocomplete: any;
  private toAutocomplete: any;
  fromSuggestions: any[] = [];
  toSuggestions: any[] = [];
  fromControl = new FormControl('');
  toControl = new FormControl('');
  fromInputSub: any;
  toInputSub: any;
  rideDate: Date | null = null;
  rideTime: string = '';
  today: Date = new Date();

  constructor(
    private rideService: RideService,
    private router: Router
  ) {}

  ngAfterViewInit() {
    // Suggestions for 'from' field
    this.fromInputSub = this.fromControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: string | null) => {
        const val = value || '';
        if (val.length > 1) {
          return this.rideService.getPlaceSuggestions(val).pipe(
            map((res: any) => res.predictions ? res.predictions.slice(0, 3) : [])
          );
        } else {
          return of([]);
        }
      })
    ).subscribe(suggestions => this.fromSuggestions = suggestions);

    // Suggestions for 'to' field
    this.toInputSub = this.toControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: string | null) => {
        const val = value || '';
        if (val.length > 1) {
          return this.rideService.getPlaceSuggestions(val).pipe(
            map((res: any) => res.predictions ? res.predictions.slice(0, 3) : [])
          );
        } else {
          return of([]);
        }
      })
    ).subscribe(suggestions => this.toSuggestions = suggestions);
  }

  selectFromSuggestion(suggestion: any) {
    this.ride.from = suggestion.description;
    this.fromControl.setValue(suggestion.description, { emitEvent: false });
    this.fromSuggestions = [];
  }

  selectToSuggestion(suggestion: any) {
    this.ride.to = suggestion.description;
    this.toControl.setValue(suggestion.description, { emitEvent: false });
    this.toSuggestions = [];
  }

  ngOnDestroy() {
    if (this.fromAutocomplete) {
      google.maps.event.clearInstanceListeners(this.fromAutocomplete);
    }
    if (this.toAutocomplete) {
      google.maps.event.clearInstanceListeners(this.toAutocomplete);
    }
    if (this.fromInputSub) this.fromInputSub.unsubscribe();
    if (this.toInputSub) this.toInputSub.unsubscribe();
  }

  onSubmit() {
    this.loading = true;
    this.error = null;

    // Prevent submission if time is empty
    if (!this.rideTime) {
      this.error = 'Time is required.';
      this.loading = false;
      return;
    }

    // Ensure only date and time are sent, not full ISO string
    if (this.rideDate && this.rideTime) {
      // Format date as YYYY-MM-DD
      const formattedDate = this.rideDate instanceof Date
        ? this.rideDate.toISOString().split('T')[0]
        : this.rideDate;
      // Format time as HH:MM:SS
      let formattedTime = this.rideTime;
      if (formattedTime.length === 5) formattedTime += ':00';
      if (formattedTime.length > 8) formattedTime = formattedTime.slice(0, 8); // Remove ms or Z if present
      this.ride.date = formattedDate;
      this.ride.time = formattedTime;
    }

    const rideToSubmit = {
      ...this.ride,
      date: this.ride.date,
      time: this.ride.time
    };

    console.log('Submitting ride:', rideToSubmit);

    this.rideService.createRide(rideToSubmit).subscribe({
      next: (createdRide) => {
        console.log('Ride created:', createdRide);
        this.router.navigate(['/rides']);
      },
      error: (error) => {
        console.error('Error creating ride:', error);
        this.error = error.message || 'Failed to create ride. Please try again.';
        this.loading = false;
      }
    });
  }

  private formatDate(date: Date): string {
    // Ensure we're working with a Date object
    const d = new Date(date);
    // Return in ISO format
    return d.toISOString();
  }
} 