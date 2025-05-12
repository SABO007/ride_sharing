import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { switchMap, map, catchError, tap, timeout } from 'rxjs/operators';
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
  passengerName?: string;
  profilePic?: string;
  from: string;
  to: string;
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
  passengerName?: string;
  profilePic?: string;
  from?: string;
  to?: string;
  date: string;
  time: string;
  passengers: number;
  specialRequests?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
  price?: number;
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
    return observable.pipe(
      timeout(this.TIMEOUT_MS),
      catchError(error => {
        console.error('Request timed out or failed:', error);
        return throwError(() => new Error('Request timed out. Please try again.'));
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

  getPendingRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/rides/requests`).pipe(
      tap(requests => {
        console.log('Original requests from API:', JSON.stringify(requests));
      }),
      map(requests => {
        // Map the API response to match your expected interface
        return requests.map(request => {
          // Log each request to see actual structure
          console.log('Processing request in service:', request);
          
          // Return the original request but ensure all required fields exist
          return {
            ...request, // Include all original fields
            // Add fallbacks for essential fields
            id: request.id,
            rideId: request.rideId || request.ride_id,
            passengerId: request.passengerId || request.passenger_id,
            passengerName: request.passengerName || 'Unknown User',
            profilePic: request.profilePic || '',
            // Keep both naming conventions for location fields
            from: request.from || request.pickupLocation || request.origin || 'Unknown',
            to: request.to || request.dropoffLocation || request.destination || 'Unknown',
            pickupLocation: request.pickupLocation || request.from || request.origin || 'Unknown',
            dropoffLocation: request.dropoffLocation || request.to || request.destination || 'Unknown',
            date: request.date || new Date().toISOString().split('T')[0],
            time: request.time || '00:00',
            passengers: request.passengers || 1,
            specialRequests: request.specialRequests || request.special_requests || '',
            status: request.status || 'pending'
          };
        });
      }),
      catchError(error => {
        console.error('Error in getPendingRequests:', error);
        return of([]);
      })
    );
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

  createRideRequest(booking: Booking): Observable<any> {
    console.log('Creating ride request with data:', booking);
    return this.http.post(`${this.apiUrl}/rides/${booking.rideId}/request`, booking).pipe(
      catchError(error => this.handleError(error, null))
    );
  }

  getPendingRequestsForUser(userId: string): Observable<RideRequest[]> {
    if (this.isSSR) {
      return of([]);
    }

    return this.http.get<RideRequest[]>(`${this.apiUrl}/rides/requests`).pipe(
      map(requests => requests.filter(request => request.passengerId === userId)),
      catchError(error => this.handleError(error, []))
    );
  }

  getPendingRequestsForDriverRides(driverId: string): Observable<RideRequest[]> {
    if (this.isSSR) {
      return of([]);
    }

    // First, get all driver's rides
    return this.http.get<Ride[]>(`${this.apiUrl}/rides`).pipe(
      switchMap(rides => {
        // Filter rides by driver
        const driverRides = rides.filter(ride => ride.driver === driverId);
        
        if (driverRides.length === 0) {
          return of([]);
        }
        
        // Extract the ride IDs
        const driverRideIds = driverRides.map(ride => ride.id);
        
        // Now get all pending requests
        return this.http.get<RideRequest[]>(`${this.apiUrl}/rides/requests`).pipe(
          map(requests => {
            // Filter requests for this driver's rides
            return requests.filter(
              request => driverRideIds.includes(request.rideId) && request.status === 'pending'
            );
          })
        );
      }),
      catchError(error => this.handleError(error, []))
    );
  }

  getPendingRequestsForDrivers(driverId: string): Observable<RideRequest[]> {
    if (this.isSSR) {
      return of([]);
    }

    // Get all pending requests
    return this.http.get<RideRequest[]>(`${this.apiUrl}/rides/requests`).pipe(
      // Get all rides to determine which ones belong to this driver
      switchMap(requests => {
        return this.http.get<Ride[]>(`${this.apiUrl}/rides`).pipe(
          map(rides => {
            // Filter for rides owned by this driver
            const driverRideIds = rides
              .filter(ride => ride.driver === driverId)
              .map(ride => ride.id);

            console.log('Driver ride IDs:', driverRideIds);
            
            // Filter requests that are for this driver's rides
            return requests.filter(request => 
              driverRideIds.includes(request.rideId) && 
              request.status === 'pending'
            );
          })
        );
      }),
      catchError(error => this.handleError(error, []))
    );
  }
}