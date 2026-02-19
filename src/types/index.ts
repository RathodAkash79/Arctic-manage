// Type definitions for the application
export type UserRole = 'super_admin' | 'admin' | 'developer' | 'staff' | 'trial_staff';
export type UserStatus = 'active' | 'banned' | 'timeout';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  teamId?: string | null;
  status: UserStatus;
  createdAt: number;
}

export interface Team {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: number;
}

export interface Milestone {
  id: string;
  title: string;
  teamId: string;
  deadline: number;
  status: 'pending' | 'completed';
  progress: number;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  milestoneId: string;
  teamId: string;
  assignedTo: string | 'team';
  assignedById?: string | null;
  assignedByName: string;
  assignedByRole: UserRole;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
  blockReason?: string | null;
  createdBy: string;
  createdByName: string;
  createdByRole: UserRole;
  createdAt: number;
  dueAt: number;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  timestamp: number;
  type: 'comment' | 'system_log';
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  createManagedUser: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}
