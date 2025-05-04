import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { RideListComponent } from './components/rides/ride-list/ride-list.component';
import { RideFormComponent } from './components/rides/ride-form/ride-form.component';
import { LoginComponent } from './components/auth/login/login.component';
import { SignupComponent } from './components/auth/signup/signup.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Home - Ride Sharing'
  },
  {
    path: 'rides',
    component: RideListComponent,
    title: 'Find Rides - Ride Sharing'
  },
  {
    path: 'rides/new',
    component: RideFormComponent,
    title: 'Offer a Ride - Ride Sharing'
  },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];