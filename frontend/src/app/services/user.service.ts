import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  getUserById(userId: string): Observable<User | null> {
    // Log the user ID we're trying to fetch
    console.log(`Fetching user details for ID: ${userId}`);
    
    return this.http.get<User>(`${this.apiUrl}/users/${userId}`).pipe(
      // Add logging to see response
      map(user => {
        console.log('User details received:', user);
        return user;
      }),
      catchError(error => {
        console.error(`Error fetching user ${userId}:`, error);
        
        // Return a default user object instead of null
        return of({
          id: userId,
          name: 'Unknown User',
          email: 'N/A',
          provider: 'N/A',
          created_at: new Date().toISOString()
        });
      })
    );
  }
} 