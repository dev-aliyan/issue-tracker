import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Issue, ActivityLog, Change } from '../../models/issue';
import { UserService } from '../user/user.service';

const ISSUES_KEY = 'issues';
const LOGS_KEY = 'activityLogs';

function reviveIssue(raw: any): Issue {
  return {
    ...raw,
    createdAt: raw?.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw?.updatedAt ? new Date(raw.updatedAt) : new Date(),
    dueDate: raw?.dueDate ? new Date(raw.dueDate) : new Date()
  } as Issue;
}

function reviveLog(raw: any): ActivityLog {
  return {
    ...raw,
    timestamp: raw?.timestamp ? new Date(raw.timestamp) : new Date()
  } as ActivityLog;
}

@Injectable({ providedIn: 'root' })
export class IssueService {
  private issues: Issue[] = [];
  private activityLogs: ActivityLog[] = [];

  private issuesSubject = new BehaviorSubject<Issue[]>([]);
  issues$ = this.issuesSubject.asObservable();

  constructor(private userService: UserService) {
    this.loadIssues();
    this.loadActivityLogs(); 
  }

  private loadIssues() {
    const stored = localStorage.getItem(ISSUES_KEY);
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        this.issues = Array.isArray(arr) ? arr.map(reviveIssue) : [];
      } catch {
        this.issues = [];
        localStorage.removeItem(ISSUES_KEY);
      }
    } else {
      this.issues = [];
      localStorage.setItem(ISSUES_KEY, JSON.stringify(this.issues));
    }
    this.issuesSubject.next([...this.issues]);
  }

  private loadActivityLogs() {
    const stored = localStorage.getItem(LOGS_KEY);
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        this.activityLogs = Array.isArray(arr) ? arr.map(reviveLog) : [];
      } catch {
        this.activityLogs = [];
        localStorage.removeItem(LOGS_KEY);
      }
    } else {
      this.activityLogs = [];
      localStorage.setItem(LOGS_KEY, JSON.stringify(this.activityLogs));
    }
  }

  private saveIssues() {
    localStorage.setItem(ISSUES_KEY, JSON.stringify(this.issues));
    this.issuesSubject.next([...this.issues]);
  }

  private saveActivityLogs() {
    localStorage.setItem(LOGS_KEY, JSON.stringify(this.activityLogs));
  }

  private generateIssueId(): string {

    const maxId = this.issues.reduce((max, issue) => {
      const parts = String(issue.id || '').split('-');
      const num = parseInt(parts[1], 10);
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);
    return `ISS-${String(maxId + 1).padStart(3, '0')}`;
  }

  private generateLogId(): string {
    const maxId = this.activityLogs.reduce((max, log) => {
      const parts = String(log.id || '').split('-');
      const num = parseInt(parts[1], 10);
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);
    return `LOG-${String(maxId + 1).padStart(3, '0')}`;
  }

  private logActivity(
    issueId: string,
    action: 'created' | 'updated' | 'deleted' | 'state_changed',
    changes: Change[] = []
  ) {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return;

    const log: ActivityLog = {
      id: this.generateLogId(),
      issueId,
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      action,
      changes,
      timestamp: new Date()
    };

    this.activityLogs.push(log);
    this.saveActivityLogs();
  }

  createIssue(issueData: Omit<Issue, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'state'>): Issue {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to create an issue');

    const newIssue: Issue = {
      ...issueData,
      id: this.generateIssueId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUser.id,
      state: 'new',
      dueDate: new Date(issueData.dueDate),
      title: issueData.title,
      description: issueData.description,
      estimatedTime: issueData.estimatedTime,
      completedTime: issueData.completedTime,
      assignedTo: issueData.assignedTo
    };

    this.issues.push(newIssue);
    this.saveIssues();
    this.logActivity(newIssue.id, 'created');

    return newIssue;
  }

  getAllIssues(): Issue[] {
    return [...this.issues];
  }

  getIssueById(id: string): Issue | undefined {
    return this.issues.find(issue => issue.id === id);
  }

  getIssuesByAssignee(userId: string): Issue[] {
    return this.issues.filter(issue => issue.assignedTo === userId);
  }

  getIssuesByCreator(userId: string): Issue[] {
    return this.issues.filter(issue => issue.createdBy === userId);
  }

  updateIssue(id: string, updates: Partial<Issue>): Issue {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to update an issue');

    const index = this.issues.findIndex(issue => issue.id === id);
    if (index === -1) throw new Error('Issue not found');

    const oldIssue = this.issues[index];

    if (currentUser.role !== 'admin' && oldIssue.createdBy !== currentUser.id && this.issues[index].assignedTo !== currentUser.id) {
      throw new Error('You do not have permission to update this issue');
    }

    const changes: Change[] = [];
    Object.keys(updates).forEach(key => {
      const oldValue = (oldIssue as any)[key];
      let newValue = (updates as any)[key];
      
      if (key === 'dueDate' || key === 'createdAt' || key === 'updatedAt') {
        newValue = newValue ? new Date(newValue) : newValue;
      }

      if (oldValue !== newValue) {
        changes.push({ field: key, oldValue, newValue });
      }
    });

    const updatedIssue: Issue = reviveIssue({
      ...oldIssue,
      ...updates,
      updatedAt: new Date()
    });

    this.issues[index] = updatedIssue;
    this.saveIssues();

    if (changes.length > 0) {
      const action = changes.some(c => c.field === 'state') ? 'state_changed' : 'updated';
      this.logActivity(id, action, changes);
    }

    return updatedIssue;
  }

  deleteIssue(id: string): void {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to delete an issue');

    const issue = this.issues.find(i => i.id === id);
    if (!issue) throw new Error('Issue not found');

    if (currentUser.role !== 'admin' && issue.createdBy !== currentUser.id) {
      throw new Error('You do not have permission to delete this issue');
    }

    this.issues = this.issues.filter(i => i.id !== id);
    this.saveIssues();
    this.logActivity(id, 'deleted');
  }

  assignIssue(issueId: string, userId: string): Issue {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in');

    if (currentUser.role !== 'admin' && userId !== currentUser.id) {
      throw new Error('Only admins can assign issues to other users');
    }

    return this.updateIssue(issueId, { assignedTo: userId });
  }

  getActivityLogs(issueId: string): ActivityLog[] {
    return this.activityLogs
      .filter(log => log.issueId === issueId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  searchIssues(searchTerm: string): Issue[] {
    const term = searchTerm.toLowerCase();
    return this.issues.filter(issue => {
      const assignedUser = this.userService.getAllUsers().find(u => u.id === issue.assignedTo);
      const assignedName = assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}`.toLowerCase() : '';
      return (
        issue.title.toLowerCase().includes(term) ||
        issue.id.toLowerCase().includes(term) ||
        assignedName.includes(term)
      );
    });
  }

  calculateDelay(issue: Issue): number {
    return issue.completedTime - issue.estimatedTime;
  }

  isOverdue(issue: Issue): boolean {
    if (issue.state === 'completed') return false;
    return issue.dueDate.getTime() < Date.now();
  }
}
