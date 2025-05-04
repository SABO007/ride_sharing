import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  signupForm: FormGroup;
  error: string = '';

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

  onSubmit() {
    if (this.signupForm.valid) {
      this.authService.signup(
        this.signupForm.value.name,
        this.signupForm.value.email,
        this.signupForm.value.password
      ).subscribe({
        next: () => {
          // Navigation will be handled by the auth service
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