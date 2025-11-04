import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../../models/user';
import usersData from '../../../assets/users.json';

const USERS_KEY = 'users';
const CURRENT_USER_KEY = 'currentUser';

function reviveUser(raw: any): User {
  return { ...raw, createdAt: raw?.createdAt ? new Date(raw.createdAt) : new Date() } as User;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private users: User[] = [];
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.loadUsers();

    const storedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (storedUser) {
      try {
        this.currentUserSubject.next(reviveUser(JSON.parse(storedUser)));
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  }

  private loadUsers(): void {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        this.users = Array.isArray(arr) ? arr.map(reviveUser) : [];
      } catch {
        this.users = [];
        localStorage.removeItem(USERS_KEY);
      }
    } else {
      this.users = (usersData as any[]).map(reviveUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
    }
  }

  generateUserId(): string {
    if (!this.users.length) return 'USR-001';
    const last = this.users[this.users.length - 1];
    const n = parseInt(last.id.split('-')[1], 10) || 0;
    return `USR-${(n + 1).toString().padStart(3, '0')}`;
  }

  getAllUsers(): User[] {
    return [...this.users];
  }

  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: User | null): void {
    const revived = user ? reviveUser(user) : null;
    this.currentUserSubject.next(revived);
    if (revived) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(revived));
    else localStorage.removeItem(CURRENT_USER_KEY);
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'admin';
  }

  addUser(user: User): void {
    this.users = [...this.users, reviveUser(user)];
    localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
  }

  findUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }
}
