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
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

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
    ToastModule, // keep ToastModule
  ],
  providers: [MessageService], // provide the service (or provide it once at a higher level)
})
export class CreateIssueComponent implements OnInit {
  @Output() issueCreated = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  title = '';
  description = '';
  assignedTo = '';
  estimatedTime: number | null = null;
  dueDate: Date | null = null;
  minDueDate!: Date;

  allUsers: User[] = [];
  currentUser: User | null = null;
  loading = false;
  showMenu = false;
  userOptions: { label: string; value: string }[] = [];

  constructor(
    private issueService: IssueService,
    private userService: UserService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.userService.getCurrentUser();
    if (!this.currentUser) {
      this.toastError('No user logged in');
      return;
    }

    this.allUsers = this.userService.getAllUsers();
    this.userOptions = this.allUsers.map((user) => ({
      label: `${user.firstName} ${user.lastName}`,
      value: user.id,
    }));

    this.assignedTo = this.currentUser.id;
    this.minDueDate = this.getMinDueDate();
  }

  getMinDueDate(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.showMenu = false;

    // validations -> toast errors
    if (!this.title.trim() || this.title.length < 5) {
      this.toastError('Title must be at least 5 characters.');
      return;
    }
    if (!this.description.trim() || this.description.length < 10) {
      this.toastError('Description must be at least 10 characters.');
      return;
    }
    if (!this.estimatedTime || this.estimatedTime <= 0) {
      this.toastError('Estimated time must be greater than 0.');
      return;
    }
    if (!this.dueDate || new Date(this.dueDate) <= new Date()) {
      this.toastError('Select a valid future due date.');
      return;
    }
    if (this.currentUser?.role === 'admin' && !this.assignedTo) {
      this.toastError('Please select an assignee.');
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

      this.toastSuccess('✅ Issue created successfully!');
      this.resetFormData();

      setTimeout(() => {
        this.issueCreated.emit();
        this.closed.emit();
      }, 800);
    } catch (err: any) {
      this.toastError(err?.message || 'Failed to create issue. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  resetForm(): void {
    this.showMenu = false;
    if (confirm('Are you sure you want to reset the form?')) {
      this.resetFormData();
      this.toastSuccess('Form has been reset.');
    }
  }

  resetFormData(): void {
    this.title = '';
    this.description = '';
    this.estimatedTime = null;
    this.dueDate = null;
    this.assignedTo = this.currentUser?.id || '';
  }

  onCancel(): void {
    if (this.title || this.description || this.estimatedTime || this.dueDate) {
      if (confirm('You have unsaved changes. Do you want to discard them?')) {
        this.cancelled.emit();
        this.toastSuccess('Changes discarded.');
      }
    } else {
      this.cancelled.emit();
    }
  }

  closeModal(): void {
    if (this.title || this.description || this.estimatedTime || this.dueDate) {
      if (confirm('You have unsaved data. Do you want to close without saving?')) {
        this.closed.emit();
        this.toastSuccess('Closed without saving.');
      }
    } else {
      this.closed.emit();
    }
  }

  // toast helpers
  private toastSuccess(detail: string) {
    this.messageService.add({ severity: 'success', summary: 'Success', detail });
  }
  private toastError(detail: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }
}
