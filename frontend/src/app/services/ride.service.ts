import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Ride {
  id?: string;
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  seats: number;
  driver: string;
  description?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface SearchParams {
  from?: string;
  to?: string;
  date?: string;
  time?: string;
  seats?: number;
  maxPrice?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RideService {
  private apiUrl = 'http://localhost:8080/rides';
  private googlePlacesUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

  constructor(private http: HttpClient) { }

  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error);
    let errorMessage = 'An error occurred. Please try again later.';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.status === 400) {
        errorMessage = 'Invalid ride data. Please check your input.';
      } else if (error.status === 404) {
        errorMessage = 'Ride not found.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

  getRides(): Observable<Ride[]> {
    return this.http.get<Ride[]>(this.apiUrl).pipe(
      tap(rides => console.log('Fetched rides:', rides)),
      catchError(this.handleError)
    );
  }

  getRide(id: string): Observable<Ride> {
    return this.http.get<Ride>(`${this.apiUrl}/${id}`).pipe(
      tap(ride => console.log('Fetched ride:', ride)),
      catchError(this.handleError)
    );
  }

  createRide(ride: Omit<Ride, 'id'>): Observable<Ride> {
    console.log('Creating ride with data:', ride);
    return this.http.post<Ride>(this.apiUrl, ride).pipe(
      tap(createdRide => console.log('Created ride:', createdRide)),
      catchError(this.handleError)
    );
  }

  updateRide(id: string, ride: Partial<Ride>): Observable<Ride> {
    return this.http.put<Ride>(`${this.apiUrl}/${id}`, ride).pipe(
      tap(updatedRide => console.log('Updated ride:', updatedRide)),
      catchError(this.handleError)
    );
  }

  deleteRide(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => console.log('Deleted ride:', id)),
      catchError(this.handleError)
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
    
    // Add all valid parameters to the query string
    Object.entries(validParams).forEach(([key, value]) => {
      queryParams.append(key, value.toString());
    });
    
    console.log('Searching with validated params:', validParams);

    return this.http.get<Ride[]>(`${this.apiUrl}/find?${queryParams}`).pipe(
      tap(rides => console.log('Search results before filtering:', rides)),
      map(rides => {
        // Filter rides based on seats and maxPrice
        return rides.filter(ride => {
          const meetsSeatsRequirement = !validParams.seats || ride.seats >= validParams.seats;
          const meetsPriceRequirement = !validParams.maxPrice || ride.price <= validParams.maxPrice;
          return meetsSeatsRequirement && meetsPriceRequirement;
        });
      }),
      tap(filteredRides => console.log('Search results after filtering:', filteredRides)),
      catchError(this.handleError)
    );
  }

  getPlaceSuggestions(input: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/places-autocomplete`, { 
      params: { input } 
    }).pipe(
      tap(suggestions => console.log('Place suggestions:', suggestions)),
      catchError(this.handleError)
    );
  }
}