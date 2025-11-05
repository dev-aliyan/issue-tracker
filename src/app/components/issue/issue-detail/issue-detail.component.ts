import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabViewModule } from 'primeng/tabview';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-issue-detail',
  templateUrl: './issue-detail.component.html',
  styleUrls: ['./issue-detail.component.css'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    InputTextModule, InputTextareaModule, DropdownModule, CalendarModule,
    InputNumberModule, ButtonModule,
    ToastModule, ProgressSpinnerModule, TabViewModule
  ],
  providers: [MessageService]
})
export class IssueDetailComponent implements OnInit, OnChanges {
  @Input() issueId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();
  @Output() issueUpdated = new EventEmitter<void>();

  editingField: string | null = null;
  showDeleteMenu = false;

  issue: Issue | null = null;
  originalIssue: Issue | null = null;

  title = '';
  description = '';
  state: 'new' | 'in-progress' | 'completed' | 'blocked' = 'new';
  assignedTo = '';
  estimatedTime: number | null = null;
  completedTime: number | null = null;
  dueDate: Date | null = null;
  minDueDate!: Date;

  allUsers: User[] = [];
  currentUser: User | null = null;

  loading = false;
  
  error = '';
  success = false;
  notFound = false;
  permissionDenied = false;
  hasChanges = false;

  activityLogs: any[] = [];

  stateOptions = [
    { label: 'New', value: 'new' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Blocked', value: 'blocked' }
  ];
  userOptions: { label: string; value: string }[] = [];

  constructor(
    private issueService: IssueService,
    private userService: UserService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.userService.getCurrentUser();
    this.allUsers = this.userService.getAllUsers();
    this.buildUserOptions();
    this.minDueDate = this.getMinDueDate();
  }

  getMinDueDate(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issueId'] && this.issueId) {
      this.loadIssue();
    }
  }

  buildUserOptions(): void {
    this.userOptions = this.allUsers.map(u => ({
      label: `${u.firstName} ${u.lastName}`,
      value: u.id
    }));
  }

  loadIssue(): void {
    this.loading = true;
    this.error = '';
    this.notFound = false;
    this.permissionDenied = false;
    this.editingField = null;

    const foundIssue = this.issueService.getIssueById(this.issueId);

    if (!foundIssue) {
      this.notFound = true;
      this.loading = false;
      this.toastError(`Issue ${this.issueId} was not found.`);
      return;
    }

    this.issue = foundIssue;
    this.originalIssue = JSON.parse(JSON.stringify(foundIssue));
    this.activityLogs = this.issueService.getActivityLogs(this.issueId);

    this.title = foundIssue.title;
    this.description = foundIssue.description;
    this.state = foundIssue.state;
    this.assignedTo = foundIssue.assignedTo;
    this.estimatedTime = foundIssue.estimatedTime;
    this.completedTime = foundIssue.completedTime;
    this.dueDate = new Date(foundIssue.dueDate);

    this.loading = false;
  }

  getUserName(userId: string): string {
    const user = this.allUsers.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  }

  getStateClass(state: string): string {
    switch (state) {
      case 'new':         return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'in-progress': return 'bg-yellow-500/50 text-yellow-300 border-yellow-400/50';
      case 'completed':   return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'blocked':     return 'bg-red-500/20 text-red-300 border-red-400/30';
      default:            return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  }

  getStateIcon(state: string): string {
    switch (state) {
      case 'new':         return 'pi-circle';
      case 'in-progress': return 'pi-spinner';
      case 'completed':   return 'pi-check-circle';
      case 'blocked':     return 'pi-lock';
      default:            return 'pi-circle';
    }
  }

  calculateDelay(): number {
    if (!this.issue) return 0;
    return this.issueService.calculateDelay(this.issue);
  }

  isOverdue(): boolean {
    if (!this.issue) return false;
    return this.issueService.isOverdue(this.issue);
  }

  canEditIssue(): boolean {
    if (!this.currentUser || !this.issue) return false;
    return this.currentUser.role === 'admin' || this.issue.createdBy === this.currentUser.id;
  }

  canDeleteIssue(): boolean {
    if (!this.currentUser || !this.issue) return false;
    return this.currentUser.role === 'admin' || this.issue.createdBy === this.currentUser.id;
  }

  startEditing(field: string): void {
    if (!this.canEditIssue()) {
      this.permissionDenied = true;
      setTimeout(() => this.permissionDenied = false, 3000);
      this.toastError('Only admins or the issue creator can edit this issue.', 'Permission denied');
      return;
    }
    this.editingField = field;
    this.error = '';
    this.showDeleteMenu = false;
  }

  toggleDeleteMenu(): void {
    this.showDeleteMenu = !this.showDeleteMenu;
  }

  closeModal(): void {
    if (this.hasChanges) {
      if (confirm('You have unsaved changes. Do you want to close without saving?')) {
        this.closed.emit();
      }
    } else {
      this.closed.emit();
    }
  }

  stopEditing(): void {
    this.editingField = null;
    this.checkForChanges();
  }

  isEditing(field: string): boolean {
    return this.editingField === field;
  }

  onInputChange(): void {
    this.checkForChanges();
  }

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

  saveChanges(): void {
    this.error = '';
    this.success = false;

    if (!this.title.trim() || this.title.trim().length < 5) {
      this.toastError('Issue title must be at least 5 characters long.');
      return;
    }
    if (!this.description.trim() || this.description.trim().length < 10) {
      this.toastError('Issue description must be at least 10 characters long.');
      return;
    }
    if (!this.estimatedTime || this.estimatedTime <= 0 || this.estimatedTime > 1000) {
      this.toastError('Estimated time must be between 1 and 1000 hours.');
      return;
    }
    if (this.completedTime == null || this.completedTime < 0 || this.completedTime > 1000) {
      this.toastError('Completed time must be between 0 and 1000 hours.');
      return;
    }
    if (!this.dueDate) {
      this.toastError('Due date is required.');
      return;
    }
    if (!this.assignedTo) {
      this.toastError('Please assign this issue to a user.');
      return;
    }

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

      this.hasChanges = false;
      this.editingField = null;
      this.toastSuccess('Issue updated successfully!');

      setTimeout(() => {
        this.loadIssue();
        this.issueUpdated.emit();
      }, 800);

    } catch (err: any) {
      this.toastError(err?.message || 'Failed to update issue. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  cancelChanges(): void {
    if (this.hasChanges) {
      if (confirm('You have unsaved changes. Do you want to discard them?')) {
        this.resetForm();
        this.editingField = null;
        this.toastInfo('Changes discarded.');
        setTimeout(() => {
          this.closed.emit();
        }, 500);
      }
    } else {
      this.editingField = null;
    }
  }

  saveAndClose(): void {
    this.error = '';
    this.success = false;

    if (!this.title.trim() || this.title.trim().length < 5) {
      this.toastError('Issue title must be at least 5 characters long.');
      return;
    }
    if (!this.description.trim() || this.description.trim().length < 10) {
      this.toastError('Issue description must be at least 10 characters long.');
      return;
    }
    if (!this.estimatedTime || this.estimatedTime <= 0 || this.estimatedTime > 1000) {
      this.toastError('Estimated time must be between 1 and 1000 hours.');
      return;
    }
    if (this.completedTime == null || this.completedTime < 0 || this.completedTime > 1000) {
      this.toastError('Completed time must be between 0 and 1000 hours.');
      return;
    }
    if (!this.dueDate) {
      this.toastError('Due date is required.');
      return;
    }
    if (!this.assignedTo) {
      this.toastError('Please assign this issue to a user.');
      return;
    }

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

      this.hasChanges = false;
      this.editingField = null;
      this.toastSuccess('Issue updated — closing…');

      
      setTimeout(() => {
        this.loading = false;
        this.issueUpdated.emit();
        this.closed.emit();
      }, 1500);

    } catch (err: any) {
      this.loading = false;  
      this.toastError(err?.message || 'Failed to update issue. Please try again.');
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

  deleteIssue(): void {
    this.showDeleteMenu = false;
    if (confirm(`Are you sure you want to delete issue ${this.issueId}?`)) {
      try {
        this.issueService.deleteIssue(this.issueId);
        this.toastSuccess(`Issue ${this.issueId} deleted.`);
        this.deleted.emit();
      } catch (err: any) {
        this.toastError(err?.message || 'Failed to delete issue.');
      }
    }
  }

  goBack(): void {
    this.closed.emit();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  getActivityActionText(action: string): string {
    switch (action) {
      case 'created':       return 'Created issue';
      case 'updated':       return 'Updated issue';
      case 'state_changed': return 'Changed state';
      case 'deleted':       return 'Deleted issue';
      default:              return action;
    }
  }

  getActivityIcon(action: string): string {
    switch (action) {
      case 'created':       return 'pi-plus-circle';
      case 'updated':       return 'pi-pencil';
      case 'state_changed': return 'pi-arrow-right';
      case 'deleted':       return 'pi-trash';
      default:              return 'pi-clock';
    }
  }

  
  private toastSuccess(detail: string, summary = 'Success') {
    this.messageService.add({ severity: 'success', summary, detail });
  }
  private toastError(detail: string, summary = 'Error') {
    this.messageService.add({ severity: 'error', summary, detail });
  }
  private toastInfo(detail: string, summary = 'Info') {
    this.messageService.add({ severity: 'info', summary, detail });
  }
}
