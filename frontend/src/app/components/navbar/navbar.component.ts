import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RideService } from '../../services/ride.service';
import { interval } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  imports: [
    MatIconModule,
    MatBadgeModule
  ]
})
export class NavbarComponent implements OnInit {
  pendingRequestsCount = 0;
  isAdmin = true; // Replace with actual admin check

  constructor(
    private router: Router,
    private rideService: RideService
  ) {}

  ngOnInit() {
    // Initial load
    this.rideService.getPendingRequests().subscribe({
      next: (requests) => {
        this.pendingRequestsCount = requests.length;
      },
      error: (error) => {
        console.warn('Could not fetch pending requests:', error);
        this.pendingRequestsCount = 0;
      }
    });
  }

  goToRequests() {
    this.router.navigate(['/requests']);
  }
} 