import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
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
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.authService.handleAuthResponse({
          token,
          user: this.authService.decodeToken(token)
        });
        this.router.navigate(['/dashboard']);
      }
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
    if (this.loginForm.valid) {
      this.authService.login(
        this.loginForm.value.email,
        this.loginForm.value.password
      ).subscribe({
        next: () => {},
        error: (err) => {
          this.error = err.error?.message || 'An error occurred during login';
        }
      });
    }
  }

  onGoogleLogin() {
    this.authService.googleLogin();
  }

  onFacebookLogin() {
    this.authService.facebookLogin();
  }
}
