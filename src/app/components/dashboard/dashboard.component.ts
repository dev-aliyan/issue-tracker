import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

import { IssueService } from '../../services/issue/issue.service';
import { UserService } from '../../services/user/user.service';
import { Issue } from '../../models/issue';
import { User } from '../../models/user';

import { CardModule } from 'primeng/card';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { TabViewModule } from 'primeng/tabview';
import { TableModule } from 'primeng/table';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';

import { CreateIssueComponent } from '../issue/create-issue/create-issue.component';
import { EditIssueComponent } from '../issue/edit-issue/edit-issue.component';
import { ViewIssueComponent } from '../issue/view-issue/view-issue.component';

type StateKey = Issue['state'];

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [
    CommonModule, RouterLink, FormsModule, TitleCasePipe,
    InputTextModule, InputTextareaModule, ButtonModule, TagModule, CardModule,
    ChipModule, TabViewModule, TableModule, RippleModule, TooltipModule,
    DragDropModule, DialogModule, CheckboxModule, MultiSelectModule,
    CreateIssueComponent, EditIssueComponent, ViewIssueComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DashboardComponent {

  // Data
  private allIssues = signal<Issue[]>([]);
  private users = signal<User[]>([]);
  currentUser = signal<User | null>(null);

  // UI state
  search = signal<string>('');
  myOnly = signal<boolean>(false);
  showFilterToolbar = signal<boolean>(false);
  activeTab = signal<'board' | 'table'>('board');

  showCreateModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  showViewModal = signal<boolean>(false);
  selectedIssueId = signal<string>('');

  // Filters (signals!)
  selectedStates = signal<string[]>([]);
  selectedAssignees = signal<string[]>([]);

  stateOptions = [
    { label: 'New', value: 'new' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Blocked', value: 'blocked' },
  ];

  assigneeOptions: { label: string; value: string }[] = [];

  constructor(
    private issueSvc: IssueService,
    private userSvc: UserService
  ) {
    // seed data
    this.allIssues.set(this.issueSvc.getAllIssues());
    this.users.set(this.userSvc.getAllUsers());
    this.currentUser.set(this.userSvc.getCurrentUser());

    // live updates
    this.issueSvc.issues$.subscribe(list => this.allIssues.set(list));

    // build assignee options (prepend "Me")
    const meId = this.currentUser()?.id ?? null;
    const base = this.users().map(u => ({ label: `${u.firstName} ${u.lastName}`, value: u.id }));
    this.assigneeOptions = meId ? [{ label: 'Me', value: meId }, ...base] : base;
  }

  // Filtering
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const me = this.myOnly();
    const meId = this.currentUser()?.id;
    const states = this.selectedStates();
    const assignees = this.selectedAssignees();

    return this.allIssues().filter(i => {
      if (states.length > 0 && !states.includes(i.state)) return false;
      if (assignees.length > 0 && !assignees.includes(i.assignedTo)) return false;
      if (me && meId && i.assignedTo !== meId) return false;

      if (!q) return true;

      const assignee = this.users().find(u => u.id === i.assignedTo);
      const assigneeName = assignee ? `${assignee.firstName} ${assignee.lastName}`.toLowerCase() : '';
      return (
        i.id.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        assigneeName.includes(q)
      );
    });
  });

  // Board columns
  colBacklog = computed(() => this.filtered().filter(i => i.state === 'new'));
  colProgress = computed(() => this.filtered().filter(i => i.state === 'in-progress'));
  colBlocked = computed(() => this.filtered().filter(i => i.state === 'blocked'));
  colDone = computed(() => this.filtered().filter(i => i.state === 'completed'));

  // KPI
  kpiTotal = computed(() => this.filtered().length);
  kpiProgress = computed(() => this.filtered().filter(i => i.state === 'in-progress').length);
  kpiCompleted = computed(() => this.filtered().filter(i => i.state === 'completed').length);
  kpiBlocked = computed(() => this.filtered().filter(i => i.state === 'blocked').length);

  // helpers
  trackById(index: number, item: Issue): string {
    return item.id;
  }

  assigneeName(id: string): string {
    const u = this.users().find(x => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : '—';
  }

  createdByName(id: string): string {
    const u = this.users().find(x => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : '—';
  }

  stateSeverity(s: StateKey): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    switch (s) {
      case 'new': return 'info';
      case 'in-progress': return 'warning';
      case 'completed': return 'success';
      case 'blocked': return 'danger';
      default: return 'secondary';
    }
  }

  // DnD move
  drop(event: CdkDragDrop<Issue[]>, newState: StateKey) {
    if (event.previousContainer === event.container) return;
    const item = event.previousContainer.data[event.previousIndex];
    this.issueSvc.updateIssue(item.id, { state: newState });
    this.allIssues.set([...this.issueSvc.getAllIssues()]);
  }

  // toolbar
  toggleFilterToolbar() {
    this.showFilterToolbar.set(!this.showFilterToolbar());
  }

  applyFilters() {
    // reactive already; keep for telemetry / future hooks
    console.log('Filters applied:', {
      states: this.selectedStates(),
      assignees: this.selectedAssignees(),
      myOnly: this.myOnly()
    });
  }

  clearFilters() {
    this.search.set('');
    this.selectedStates.set([]);
    this.selectedAssignees.set([]);
    this.myOnly.set(false);
  }

  // modals
  openCreateModal() { this.showCreateModal.set(true); }
  openViewModal(issueId: string) { this.selectedIssueId.set(issueId); this.showViewModal.set(true); }
  openEditModal(issueId: string) { this.selectedIssueId.set(issueId); this.showEditModal.set(true); }

  closeCreateModal() { this.showCreateModal.set(false); }
  closeViewModal() { this.showViewModal.set(false); this.selectedIssueId.set(''); }
  closeEditModal() { this.showEditModal.set(false); this.selectedIssueId.set(''); }

  onIssueCreated() {
    this.closeCreateModal();
    this.allIssues.set([...this.issueSvc.getAllIssues()]);
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
}
