import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../models/user';
import { UserService } from '../../../services/user/user.service';
import { IssueService } from '../../../services/issue/issue.service';

import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-create-issue',
  templateUrl: './create-issue.component.html',
  styleUrls: ['./create-issue.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    CalendarModule,
    InputNumberModule,
    ButtonModule,
    MessageModule,
    ToastModule,
  ],
})
export class CreateIssueComponent implements OnInit {
  @Output() issueCreated = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  title = '';
  description = '';
  assignedTo = '';
  estimatedTime: number | null = null;
  dueDate: Date | null = null;

  allUsers: User[] = [];
  currentUser: User | null = null;
  loading = false;
  error = '';
  success = false;
  userOptions: { label: string; value: string }[] = [];

  constructor(
    private issueService: IssueService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.userService.getCurrentUser();
    if (!this.currentUser) {
      this.error = 'No user logged in';
      return;
    }

    this.allUsers = this.userService.getAllUsers();
    this.userOptions = this.allUsers.map((user) => ({
      label: `${user.firstName} ${user.lastName}`,
      value: user.id,
    }));

    // Default assignee = self (unless admin chooses)
    this.assignedTo = this.currentUser.id;
  }

  getMinDueDate(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.error = '';
    this.success = false;

    if (!this.title.trim() || this.title.length < 5) {
      this.error = 'Title must be at least 5 characters.';
      return;
    }
    if (!this.description.trim() || this.description.length < 10) {
      this.error = 'Description must be at least 10 characters.';
      return;
    }
    if (!this.estimatedTime || this.estimatedTime <= 0) {
      this.error = 'Estimated time must be greater than 0.';
      return;
    }
    if (!this.dueDate || new Date(this.dueDate) <= new Date()) {
      this.error = 'Select a valid future due date.';
      return;
    }
    if (this.currentUser?.role === 'admin' && !this.assignedTo) {
      this.error = 'Please select an assignee.';
      return;
    }

    this.loading = true;
    try {
      this.issueService.createIssue({
        title: this.title.trim(),
        description: this.description.trim(),
        estimatedTime: this.estimatedTime,
        completedTime: 0,
        dueDate: this.dueDate,
        assignedTo: this.assignedTo,
      });

      this.success = true;
      this.resetForm();

      setTimeout(() => {
        this.issueCreated.emit();
      }, 800);
    } catch (err: any) {
      this.error = err?.message || 'Failed to create issue. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  resetForm(): void {
    this.title = '';
    this.description = '';
    this.estimatedTime = null;
    this.dueDate = null;
    this.assignedTo = this.currentUser?.id || '';
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
