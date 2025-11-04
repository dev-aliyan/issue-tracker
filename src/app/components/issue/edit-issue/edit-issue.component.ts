import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IssueService } from '../../../services/issue/issue.service';
import { UserService } from '../../../services/user/user.service';
import { Issue } from '../../../models/issue';
import { User } from '../../../models/user';

import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Router } from '@angular/router';

@Component({
  selector: 'app-edit-issue',
  templateUrl: './edit-issue.component.html',
  styleUrls: ['./edit-issue.component.css'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    InputTextModule, InputTextareaModule, DropdownModule, CalendarModule,
    InputNumberModule, ButtonModule, MessageModule, MessagesModule, ToastModule, ProgressSpinnerModule
  ]
})
export class EditIssueComponent implements OnInit, OnChanges {
  @Input() issueId = '';
  @Output() issueUpdated = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  issue: Issue | null = null;

  title = '';
  description = '';
  state: 'new' | 'in-progress' | 'completed' | 'blocked' = 'new';
  assignedTo = '';
  estimatedTime: number | null = null;
  completedTime: number | null = null;
  dueDate: Date | null = null;

  allUsers: User[] = [];
  currentUser: User | null = null;
  loading = false;
  error = '';
  success = false;
  notFound = false;
  permissionDenied = false;

  stateOptions = [
    { label: 'New', value: 'new' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Blocked', value: 'blocked' }
  ];

  userOptions: { label: string; value: string }[] = [];
  originalIssue: Issue | null = null;
  hasChanges = false;

  constructor(
    private issueService: IssueService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.userService.getCurrentUser();
    this.allUsers = this.userService.getAllUsers();
    this.buildUserOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issueId'] && this.issueId) {
      this.loadIssue();
    }
  }

  buildUserOptions(): void {
    this.userOptions = this.allUsers.map(u => ({ label: `${u.firstName} ${u.lastName}`, value: u.id }));
  }

  loadIssue(): void {
    this.loading = true;
    this.error = '';
    this.notFound = false;
    this.permissionDenied = false;

    const foundIssue = this.issueService.getIssueById(this.issueId);

    if (!foundIssue) {
      this.notFound = true;
      this.loading = false;
      return;
    }

    if (this.currentUser?.role !== 'admin' && foundIssue.createdBy !== this.currentUser?.id) {
      this.permissionDenied = true;
      this.loading = false;
      return;
    }

    this.originalIssue = JSON.parse(JSON.stringify(foundIssue));
    this.issue = foundIssue;

    this.title = foundIssue.title;
    this.description = foundIssue.description;
    this.state = foundIssue.state;
    this.assignedTo = foundIssue.assignedTo;
    this.estimatedTime = foundIssue.estimatedTime;
    this.completedTime = foundIssue.completedTime;
    this.dueDate = new Date(foundIssue.dueDate);

    this.loading = false;
  }

  onInputChange(): void { this.checkForChanges(); }

  checkForChanges(): void {
    if (!this.originalIssue) return;
    this.hasChanges =
      this.title !== this.originalIssue.title ||
      this.description !== this.originalIssue.description ||
      this.state !== this.originalIssue.state ||
      this.assignedTo !== this.originalIssue.assignedTo ||
      this.estimatedTime !== this.originalIssue.estimatedTime ||
      this.completedTime !== this.originalIssue.completedTime ||
      new Date(this.dueDate || '').getTime() !== new Date(this.originalIssue.dueDate).getTime();
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.error = '';
    this.success = false;

    if (!this.title.trim() || this.title.trim().length < 5) { this.error = 'Issue title must be at least 5 characters long.'; return; }
    if (!this.description.trim() || this.description.trim().length < 10) { this.error = 'Issue description must be at least 10 characters long.'; return; }
    if (!this.estimatedTime || this.estimatedTime <= 0 || this.estimatedTime > 1000) { this.error = 'Estimated time must be between 1 and 1000 hours.'; return; }
    if (this.completedTime == null || this.completedTime < 0 || this.completedTime > 1000) { this.error = 'Completed time must be between 0 and 1000 hours.'; return; }
    if (!this.dueDate) { this.error = 'Due date is required.'; return; }
    if (!this.assignedTo) { this.error = 'Please assign this issue to a user.'; return; }

    this.loading = true;
    try {
      this.issueService.updateIssue(this.issueId, {
        title: this.title.trim(),
        description: this.description.trim(),
        state: this.state,
        estimatedTime: this.estimatedTime!,
        completedTime: this.completedTime!,
        dueDate: this.dueDate,
        assignedTo: this.assignedTo
      });

      this.success = true;
      this.originalIssue = JSON.parse(JSON.stringify(this.issue));
      this.hasChanges = false;

      setTimeout(() => {
        this.issueUpdated.emit();
      }, 800);

    } catch (err: any) {
      this.error = err?.message || 'Failed to update issue. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    if (this.hasChanges) {
      if (confirm('You have unsaved changes. Do you want to discard them?')) {
        this.cancelled.emit();
      }
    } else {
      this.cancelled.emit();
    }
  }

  resetForm(): void {
    if (!this.originalIssue) return;
    this.title = this.originalIssue.title;
    this.description = this.originalIssue.description;
    this.state = this.originalIssue.state;
    this.assignedTo = this.originalIssue.assignedTo;
    this.estimatedTime = this.originalIssue.estimatedTime;
    this.completedTime = this.originalIssue.completedTime;
    this.dueDate = new Date(this.originalIssue.dueDate);
    this.error = '';
    this.hasChanges = false;
  }

  markAsCompleted(): void {
    this.state = 'completed';
    this.completedTime = this.estimatedTime || 0;
    this.checkForChanges();
  }

  getCreatorName(id: string): string {
    const u = this.allUsers.find(x => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : 'Unknown';
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

}


