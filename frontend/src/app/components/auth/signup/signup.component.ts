import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit, OnDestroy {
  signupForm: FormGroup;
  error: string = '';

  slideshowImages: string[] = [
    'assets/images/ride-sharing1.png',
    'assets/images/ride-sharing2.png',
    'assets/images/ride-sharing3.png',
  ];
  currentSlideIndex = 0;
  private slideInterval: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.startSlideshow();
  }

  ngOnDestroy(): void {
    clearInterval(this.slideInterval);
  }

  startSlideshow(): void {
    this.slideInterval = setInterval(() => {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slideshowImages.length;
    }, 4000);
  }

  onSubmit() {
    if (this.signupForm.valid) {
      this.authService.signup(
        this.signupForm.value.name,
        this.signupForm.value.email,
        this.signupForm.value.password
      ).subscribe({
        next: () => {
          // handle redirect or success feedback
        },
        error: (err) => {
          this.error = err.error?.message || 'An error occurred during signup';
        }
      });
    }
  }

  onGoogleSignup() {
    this.authService.googleLogin();
  }

  onFacebookSignup() {
    this.authService.facebookLogin();
  }
}
