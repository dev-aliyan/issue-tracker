import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { User } from '../../../models/user';
import { AuthService } from '../../../services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
})
export class SignupComponent {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  role: 'admin' | 'user' = 'user';
  error = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  roles = [
    { label: 'User', value: 'user' },
    { label: 'Admin', value: 'admin' },
  ];

  constructor(private auth: AuthService, private router: Router) {}

  onSignup(): void {
    this.error = '';

    if (!this.firstName || !this.lastName || !this.email || !this.password) {
      this.error = 'All fields are required.';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.error = 'Please enter a valid email address.';
      return;
    }

    if (this.password.length < 5) {
      this.error = 'Password must be at least 5 characters long.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    const newUser: Omit<User, 'id' | 'createdAt'> = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
      role: this.role,
    };

    try {
      this.auth.signup(newUser as User);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error = err.message || 'Signup failed. Please try again.';
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }
}
