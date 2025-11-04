import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { IssueService } from '../../../services/issue/issue.service';
import { UserService } from '../../../services/user/user.service';
import { Issue } from '../../../models/issue';
import { User } from '../../../models/user';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-view-issue',
  templateUrl: './view-issue.component.html',
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
    MessagesModule,
    ToastModule,
    ProgressSpinnerModule
  ]
})
export class ViewIssueComponent implements OnInit, OnChanges {
  @Input() issueId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<string>();

  issue: Issue | null = null;
  allUsers: User[] = [];
  currentUser: User | null = null;
  loading = false;
  notFound = false;
  activityLogs: any[] = [];

  constructor(
    private issueService: IssueService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.userService.getCurrentUser();
    this.allUsers = this.userService.getAllUsers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issueId'] && this.issueId) {
      this.loadIssue();
    }
  }

  loadIssue(): void {
    this.loading = true;
    this.notFound = false;

    const foundIssue = this.issueService.getIssueById(this.issueId);

    if (!foundIssue) {
      this.notFound = true;
      this.loading = false;
      return;
    }

    this.issue = foundIssue;
    this.activityLogs = this.issueService.getActivityLogs(this.issueId);
    this.loading = false;
  }

  getUserName(userId: string): string {
    const user = this.allUsers.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  }

  getStateClass(state: string): string {
    switch (state) {
      case 'new':         return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'completed':   return 'bg-green-100 text-green-700 border-green-300';
      case 'blocked':     return 'bg-red-100 text-red-700 border-red-300';
      default:            return 'bg-gray-100 text-gray-700 border-gray-300';
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

  editIssue(): void {
    this.editRequested.emit(this.issueId);
  }

  deleteIssue(): void {
    if (confirm(`Are you sure you want to delete issue ${this.issueId}?`)) {
      try {
        this.issueService.deleteIssue(this.issueId);
        this.deleted.emit();
      } catch (err: any) {
        alert(err.message);
      }
    }
  }

  goBack(): void {
    this.closed.emit();
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
}