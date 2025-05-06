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
    title: 'Home - GatoRide'
  },
  {
    path: 'rides',
    component: RideListComponent,
    title: 'Find Rides - GatoRide'
  },
  {
    path: 'rides/new',
    component: RideFormComponent,
    title: 'Offer a Ride - GatoRide'
  },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'about', redirectTo:'/about', title: 'About - GatoRide'
  },
  {
    path: 'contact', redirectTo:'/contact', title: 'Contact - GatoRide'
  },
  {
    path: 'safety', redirectTo:'/safety', title: 'Safety - GatoRide'
  }


];