import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { Issue } from '../../../models/issue';
import { User } from '../../../models/user';
import { IssueService } from '../../../services/issue/issue.service';
import { UserService } from '../../../services/user/user.service';
import { DialogModule } from 'primeng/dialog';
import { EditIssueComponent } from '../../issue/edit-issue/edit-issue.component';
import { ViewIssueComponent } from '../../issue/view-issue/view-issue.component';

type StateKey = Issue['state'];

@Component({
  selector: 'app-all-issues',
  templateUrl: './all-issues.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TitleCasePipe,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TagModule,
    CardModule,
    ChipModule,
    TableModule,
    RippleModule,
    TooltipModule,
    InputTextareaModule,
    DialogModule,
    EditIssueComponent,
    ViewIssueComponent
  ],
  styleUrls: ['./all-issues.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class AllIssuesComponent {
  private allIssues = signal<Issue[]>([]);
  private users = signal<User[]>([]);

  search = signal<string>('');
  stateFilter = signal<StateKey | 'all'>('all');
  myOnly = signal<boolean>(false);
  currentUser = signal<User | null>(null);

  selectedIssueId = signal<string>('');
  showViewModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);


  

  constructor(
    private issueSvc: IssueService,
    private userSvc: UserService
  ) {
    this.allIssues.set(this.issueSvc.getAllIssues());
    this.users.set(this.userSvc.getAllUsers());
    this.currentUser.set(this.userSvc.getCurrentUser());
    this.issueSvc.issues$.subscribe((list) => this.allIssues.set(list));
  }

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const state = this.stateFilter();
    const meOnly = this.myOnly();
    const currentUser = this.currentUser();
    const meId = currentUser?.id;
    const isAdmin = currentUser?.role === 'admin';

    return this.allIssues().filter((i) => {
      if (!isAdmin && meId && i.assignedTo !== meId) return false;

      if (state !== 'all' && i.state !== state) return false;

      if (meOnly && meId && i.assignedTo !== meId) return false;

      if (!q) return true;

      const assignee = this.users().find((u) => u.id === i.assignedTo);
      const assigneeName = assignee
        ? `${assignee.firstName} ${assignee.lastName}`.toLowerCase()
        : '';

      return (
        i.id.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        assigneeName.includes(q)
      );
    });
  });

  assigneeName(id: string): string {
    const u = this.users().find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : '—';
  }

  stateSeverity(s: StateKey): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    switch (s) {
      case 'new':
        return 'info';
      case 'in-progress':
        return 'warning';
      case 'completed':
        return 'success';
      case 'blocked':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  openViewModal(issueId: string) {
    this.selectedIssueId.set(issueId);
    this.showViewModal.set(true);
  }

  openEditModal(issueId: string) {
    this.selectedIssueId.set(issueId);
    this.showEditModal.set(true);
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.selectedIssueId.set('');
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.selectedIssueId.set('');
  }

  onIssueUpdated() {
    this.closeEditModal();
    this.allIssues.set([...this.issueSvc.getAllIssues()]);
  }

  onIssueDeleted() {
    this.closeViewModal();
    this.allIssues.set([...this.issueSvc.getAllIssues()]);
  }

  onEditFromView(issueId: string) {
    this.closeViewModal();
    this.openEditModal(issueId);
  }

  

  clearFilters() {
    this.search.set('');
    this.stateFilter.set('all');
    this.myOnly.set(false);
  }
}
