import { Injectable } from '@angular/core';
import { UserService } from '../user/user.service';
import { User } from '../../models/user';

const CURRENT_USER_KEY = 'currentUser';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private userService: UserService) {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      try {
        const u = reviveUser(JSON.parse(raw));
        this.userService.setCurrentUser(u);
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  }

  login(email: string, password: string): boolean {
    const foundUser = this.userService
      .getAllUsers()
      .find(u => u.email === email && u.password === password);

    if (foundUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(foundUser));
      this.userService.setCurrentUser(foundUser);
      return true;
    }
    return false;
  }

  signup(user: User): void {
    const exists = this.userService.findUserByEmail(user.email);
    if (exists) throw new Error('User already exists!');

    const newUser: User = {
      ...user,
      id: this.userService.generateUserId(),
      createdAt: new Date(),
    };

    this.userService.addUser(newUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    this.userService.setCurrentUser(newUser);
  }

  logout(): void {
    localStorage.removeItem(CURRENT_USER_KEY);
    this.userService.setCurrentUser(null);
  }

  isLoggedIn(): boolean {
    if (!this.userService.getCurrentUser()) {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      if (raw) {
        try {
          const u = reviveUser(JSON.parse(raw));
          this.userService.setCurrentUser(u);
        } catch {
          localStorage.removeItem(CURRENT_USER_KEY);
        }
      }
    }
    return !!localStorage.getItem(CURRENT_USER_KEY);
  }
}

function reviveUser(raw: any): User {
  return { ...raw, createdAt: raw?.createdAt ? new Date(raw.createdAt) : new Date() } as User;
}
