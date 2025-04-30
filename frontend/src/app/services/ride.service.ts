import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Ride {
  id: number;
  driver: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RideService {
  private apiUrl = 'http://localhost:3000/api/rides'; // Update with your actual API URL

  constructor(private http: HttpClient) { }

  getRides(): Observable<Ride[]> {
    return this.http.get<Ride[]>(this.apiUrl);
  }

  getRide(id: number): Observable<Ride> {
    return this.http.get<Ride>(`${this.apiUrl}/${id}`);
  }

  createRide(ride: Omit<Ride, 'id'>): Observable<Ride> {
    return this.http.post<Ride>(this.apiUrl, ride);
  }

  updateRide(id: number, ride: Partial<Ride>): Observable<Ride> {
    return this.http.put<Ride>(`${this.apiUrl}/${id}`, ride);
  }

  deleteRide(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  searchRides(params: {
    origin?: string;
    destination?: string;
    date?: string;
    seats?: number;
  }): Observable<Ride[]> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value.toString());
      }
    });
    return this.http.get<Ride[]>(`${this.apiUrl}/search?${queryParams}`);
  }
} 