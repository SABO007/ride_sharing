import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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

@Injectable({
  providedIn: 'root'
})
export class RideService {
  private apiUrl = 'http://localhost:8080/api/rides';
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

  searchRides(params: {
    from?: string;
    to?: string;
    date?: string;
    time?: string;
  }): Observable<Ride[]> {
    const queryParams = new URLSearchParams();
    if (params.from) queryParams.append('from', params.from.trim());
    if (params.to) queryParams.append('to', params.to.trim());
    if (params.date) queryParams.append('date', params.date.trim());
    if (params.time) queryParams.append('time', params.time?.trim() || '');

    console.log('Searching rides with params:', {
      from: params.from,
      to: params.to,
      date: params.date,
      time: params.time
    });

    return this.http.get<Ride[]>(`${this.apiUrl}/find?${queryParams}`).pipe(
      tap(rides => console.log('Search results:', rides)),
      catchError(this.handleError)
    );
  }

  getPlaceSuggestions(input: string): Observable<any[]> {
    return this.http.get<any>(`/api/places-autocomplete`, { params: { input } }).pipe(
      tap(res => console.log('Backend Places API response:', res)),
      catchError(this.handleError)
    );
  }
} 