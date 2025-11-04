export interface Issue {
  id: string; 
  title: string;
  description: string;
  state: 'new' | 'in-progress' | 'completed' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date;
  estimatedTime: number; 
  completedTime: number; 
  assignedTo: string; 
  createdBy: string; 
}

export interface ActivityLog {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'deleted' | 'state_changed';
  changes: Change[];
  timestamp: Date;
}

export interface Change {
  field: string;
  oldValue: any;
  newValue: any;
}