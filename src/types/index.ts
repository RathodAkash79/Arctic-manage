// Type definitions for the application
export type UserRole = 'super_admin' | 'admin' | 'developer' | 'staff' | 'trial_staff';
export type UserStatus = 'active' | 'banned' | 'timeout';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: number;
}

export interface Milestone {
  id: string;
  title: string;
  deadline: number;
  status: 'active' | 'completed';
  progress: number;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  milestoneId: string;
  assignedUserIds: string[];
  assignedRole?: UserRole | null;
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
  dueAt?: number | null;
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
  updateProfileName: (displayName: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}
