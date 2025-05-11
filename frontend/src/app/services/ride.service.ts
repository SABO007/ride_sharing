import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { isPlatformServer } from '@angular/common';

export interface Ride {
  id: string;
  driverId: string;
  driverName: string;
  driver: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  availableSeats: number;
  price: number;
  seats: number;
  from?: string;
  to?: string;
  description?: string;
  carDetails: {
    model: string;
    color: string;
    licensePlate: string;
  };
}

export interface CreateRideDto {
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  seats: number;
  driver: string;
  description?: string;
  status: string;
}

export interface Booking {
  rideId: string;
  passengerId: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  passengers: number;
  specialRequests?: string;
}

export interface SearchParams {
  from?: string;
  to?: string;
  date?: string;
  time?: string;
  seats?: number;
  maxPrice?: number;
}

export interface RideRequest {
  id: string;
  rideId: string;
  passengerId: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  passengers: number;
  specialRequests?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class RideService {
  private apiUrl = 'http://localhost:8080';
  private googlePlacesUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  private readonly TIMEOUT_MS = 60000; // Increased to 60 seconds for SSR
  private isSSR = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isSSR = isPlatformServer(this.platformId);
  }

  private handleError<T>(error: HttpErrorResponse, defaultValue: T) {
    // During SSR, return the default value immediately without logging
    if (this.isSSR) {
      return of(defaultValue);
    }
    
    console.error('An error occurred:', error);
    let errorMessage = 'An error occurred. Please try again later.';
    if (error.status === 400) {
      errorMessage = 'Invalid ride data. Please check your input.';
    } else if (error.status === 404) {
      errorMessage = 'Ride not found.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to the server. Please check your connection.';
    }
    
    return of(defaultValue);
  }

  private addTimeout<T>(observable: Observable<T>): Observable<T> {
    // Skip timeout during SSR
    if (this.isSSR) {
      return observable;
    }
    
    return observable.pipe(
      timeout(this.TIMEOUT_MS),
      catchError(error => {
        if (error.name === 'TimeoutError') {
          console.warn('Request timed out');
          return of([] as any);
        }
        throw error;
      })
    );
  }

  getRides(): Observable<Ride[]> {
    return this.addTimeout(
      this.http.get<Ride[]>(`${this.apiUrl}/rides`).pipe(
        catchError(error => this.handleError(error, []))
      )
    );
  }

  getRideById(id: string): Observable<Ride | null> {
    return this.addTimeout(
      this.http.get<Ride>(`${this.apiUrl}/rides/${id}`).pipe(
        catchError(error => this.handleError(error, null))
      )
    );
  }

  createRide(ride: CreateRideDto): Observable<Ride | null> {
    return this.http.post<Ride>(`${this.apiUrl}/rides`, ride).pipe(
      catchError(error => this.handleError(error, null))
    );
  }

  bookRide(booking: Booking): Observable<any> {
    return this.http.post(`${this.apiUrl}/rides/${booking.rideId}/book`, booking).pipe(
      catchError(error => this.handleError(error, null))
    );
  }

  updateRide(id: string, ride: Partial<Ride>): Observable<Ride | null> {
    return this.http.put<Ride>(`${this.apiUrl}/rides/${id}`, ride).pipe(
      tap(updatedRide => console.log('Updated ride:', updatedRide)),
      catchError(error => this.handleError(error, null))
    );
  }

  deleteRide(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/rides/${id}`).pipe(
      tap(() => console.log('Deleted ride:', id)),
      catchError(error => this.handleError(error, undefined))
    );
  }

  /**
   * Extract valid search parameters, preserving explicitly set values
   * @param params The search parameters object
   * @returns Cleaned search parameters object
   */
  extractValidSearchParams(params: SearchParams): SearchParams {
    const validParams: SearchParams = {};
    
    if (params.from) validParams.from = params.from.trim();
    if (params.to) validParams.to = params.to.trim();
    if (params.date) validParams.date = params.date.trim();
    if (params.time) validParams.time = params.time.trim();
    
    // Validate seats parameter
    if (params.seats !== undefined) {
      const seats = Number(params.seats);
      if (isNaN(seats) || seats < 1) {
        console.warn('Invalid seats value:', params.seats, 'using default value 1');
        validParams.seats = 1;
      } else {
        validParams.seats = Math.floor(seats); // Ensure integer value
      }
    }
    
    // Validate maxPrice parameter
    if (params.maxPrice !== undefined) {
      const maxPrice = Number(params.maxPrice);
      if (isNaN(maxPrice) || maxPrice < 0) {
        console.warn('Invalid maxPrice value:', params.maxPrice, 'using default value 1000');
        validParams.maxPrice = 1000;
      } else {
        validParams.maxPrice = maxPrice;
      }
    }
    
    return validParams;
  }

  searchRides(params: SearchParams): Observable<Ride[]> {
    const validParams = this.extractValidSearchParams(params);
    const queryParams = new URLSearchParams();
    
    Object.entries(validParams).forEach(([key, value]) => {
      queryParams.append(key, value.toString());
    });
    
    console.log('Searching with validated params:', validParams);

    return this.http.get<Ride[]>(`${this.apiUrl}/rides/find?${queryParams}`).pipe(
      tap(rides => console.log('Search results before filtering:', rides)),
      map(rides => {
        return rides.filter(ride => {
          const seats = ride.availableSeats ?? ride.seats;
          const price = ride.price;
          const meetsSeatsRequirement = !validParams.seats || seats >= validParams.seats;
          const meetsPriceRequirement = !validParams.maxPrice || price <= validParams.maxPrice;
          return meetsSeatsRequirement && meetsPriceRequirement;
        });
      }),
      tap(filteredRides => console.log('Search results after filtering:', filteredRides)),
      catchError(error => this.handleError(error, []))
    );
  }

  getPlaceSuggestions(input: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/places-autocomplete`, { 
      params: { input } 
    }).pipe(
      tap(suggestions => console.log('Place suggestions:', suggestions)),
      catchError(error => this.handleError(error, []))
    );
  }

  getPendingRequests(): Observable<RideRequest[]> {
    // During SSR, return empty array immediately
    if (this.isSSR) {
      console.log('SSR detected, skipping pending requests fetch');
      return of([]);
    }

    // Only fetch if we're in the browser
    if (typeof window !== 'undefined') {
      return this.addTimeout(
        this.http.get<RideRequest[]>(`${this.apiUrl}/rides/requests`).pipe(
          tap(requests => console.log('Received pending requests:', requests)),
          catchError(error => {
            console.error('Error fetching pending requests:', error);
            if (error.status === 0 || error.name === 'TimeoutError') {
              console.warn('Backend server is not running or request timed out');
              return of([]); // Return empty array instead of throwing error
            }
            return this.handleError(error, []);
          })
        )
      );
    }

    // Default to empty array for SSR
    return of([]);
  }

  handleRideRequest(requestId: string, status: 'approved' | 'rejected'): Observable<void> {
    return this.addTimeout(
      this.http.put<void>(`${this.apiUrl}/rides/requests/${requestId}`, { status }).pipe(
        tap(() => console.log(`Request ${requestId} ${status} successfully`)),
        catchError(error => {
          console.error(`Error handling request ${requestId}:`, error);
          return this.handleError(error, undefined);
        })
      )
    );
  }

  getRideRequests(timeFilter?: 'today' | 'week' | 'month'): Observable<any[]> {
    const params = new URLSearchParams();
    if (timeFilter) {
      params.append('timeFilter', timeFilter);
    }
    
    return this.addTimeout(
      this.http.get<any[]>(`${this.apiUrl}/rides/requests?${params}`).pipe(
        catchError(error => this.handleError(error, []))
      )
    );
  }
}