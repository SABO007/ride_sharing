import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { RideListComponent } from './components/rides/ride-list/ride-list.component';
import { RideFormComponent } from './components/rides/ride-form/ride-form.component';
import { LoginComponent } from './components/auth/login/login.component';
import { SignupComponent } from './components/auth/signup/signup.component';
import { BookNowComponent } from './components/rides/book-now/book-now.component';
import { RideRequestsComponent } from './components/ride-requests/ride-requests.component';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { map } from 'rxjs/operators';

// Auth guard function
const authGuard = () => {
  const authService = inject(AuthService);
  return authService.isAuthenticated().pipe(
    map(isAuthenticated => {
      if (!isAuthenticated) {
        return '/login';
      }
      return true;
    })
  );
};

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: HomeComponent,
    title: 'Home - GatoRide',
    canActivate: [() => authGuard()]
  },
  {
    path: 'rides',
    component: RideListComponent,
    title: 'Find Rides - GatoRide',
    canActivate: [() => authGuard()]
  },
  {
    path: 'rides/new',
    component: RideFormComponent,
    title: 'Offer a Ride - GatoRide',
    canActivate: [() => authGuard()]
  },
  {
    path: 'rides/book/:id',
    component: BookNowComponent,
    title: 'Book a Ride - GatoRide',
    canActivate: [() => authGuard()]
  },
  {
    path: 'rides/requests',
    component: RideRequestsComponent,
    title: 'Ride Requests - GatoRide',
    canActivate: [() => authGuard()]
  },
  { 
    path: 'login', 
    component: LoginComponent,
    title: 'Login - GatoRide'
  },
  { 
    path: 'signup', 
    component: SignupComponent,
    title: 'Sign Up - GatoRide'
  },
  // {
  //   path: 'about',
  //   redirectTo: '/about',
  //   title: 'About - GatoRide',
  //   canActivate: [() => authGuard()]
  // },
  // {
  //   path: 'contact',
  //   redirectTo: '/contact',
  //   title: 'Contact - GatoRide',
  //   canActivate: [() => authGuard()]
  // },
  // {
  //   path: 'safety',
  //   redirectTo: '/safety',
  //   title: 'Safety - GatoRide',
  //   canActivate: [() => authGuard()]
  // },
  {
    path: '**',
    redirectTo: '/home',
    pathMatch: 'full'
  }
];