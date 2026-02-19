import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Milestone, Task, TaskComment, UserRole } from '@/types';

const usersCollection = collection(db, 'users');
const milestonesCollection = collection(db, 'milestones');
const tasksCollection = collection(db, 'tasks');

const ACTIVE_MILESTONE_ID = 'active';

const toMillis = (value: any): number => {
  if (!value) {
    return Date.now();
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value.toMillis) {
    return value.toMillis();
  }
  return Date.now();
};

const toTimestamp = (value: any, fallbackNow = true): Timestamp => {
  if (value && value.toMillis) {
    return value as Timestamp;
  }
  if (typeof value === 'number') {
    return Timestamp.fromMillis(value);
  }
  return fallbackNow ? Timestamp.now() : Timestamp.fromMillis(Date.now());
};

const requireField = (field: string, value: unknown) => {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${field} is required`);
  }
};

const normalizeUser = (data: any, uid: string): User => ({
  uid,
  email: data.email || '',
  displayName: data.displayName || '',
  role: data.role,
  status: data.status,
  createdAt: toMillis(data.createdAt),
});

const normalizeMilestone = (data: any, id: string): Milestone => ({
  id,
  title: data.title,
  deadline: toMillis(data.deadline),
  status: data.status || 'active',
  progress: typeof data.progress === 'number' ? data.progress : 0,
  createdBy: data.createdBy || '',
  createdByName: data.createdByName || '',
  createdAt: toMillis(data.createdAt),
  updatedAt: toMillis(data.updatedAt),
});

const normalizeTask = (data: any, id: string): Task => {
  const assignedUserIds = Array.isArray(data.assignedUserIds)
    ? data.assignedUserIds.filter(Boolean)
    : [];

  const assignedRole = data.assignedRole || null;

  return {
    id,
    title: data.title,
    description: data.description || '',
    milestoneId: data.milestoneId,
    assignedUserIds,
    assignedRole,
    assignedById: data.assignedById ?? null,
    assignedByName: data.assignedByName || '',
    assignedByRole: data.assignedByRole || 'trial_staff',
    priority: data.priority,
    status: data.status,
    blockReason: data.blockReason ?? null,
    createdBy: data.createdBy,
    createdByName: data.createdByName || '',
    createdByRole: data.createdByRole || 'trial_staff',
    createdAt: toMillis(data.createdAt),
    dueAt: toMillis(data.dueAt),
  };
};

const normalizeComment = (data: any, id: string): TaskComment => ({
  id,
  userId: data.userId,
  userName: data.userName || '',
  userRole: (data.userRole as UserRole) || 'trial_staff',
  text: data.text || '',
  timestamp: toMillis(data.timestamp),
  type: data.type || 'comment',
});

export const userService = {
  async create(user: Omit<User, 'createdAt'> & { createdAt?: number }) {
    try {
      requireField('uid', user.uid);
      requireField('email', user.email);
      requireField('role', user.role);
      requireField('status', user.status);

      const userRef = doc(usersCollection, user.uid);
      const payload = {
        ...user,
        createdAt: toTimestamp(user.createdAt),
      };
      await setDoc(userRef, payload);
      return payload;
    } catch (error: any) {
      throw new Error(`userService.create failed: ${error.message || error}`);
    }
  },

  async get(uid: string): Promise<User | null> {
    try {
      const snapshot = await getDoc(doc(usersCollection, uid));
      if (!snapshot.exists()) {
        return null;
      }
      return normalizeUser(snapshot.data(), uid);
    } catch (error: any) {
      throw new Error(`userService.get failed: ${error.message || error}`);
    }
  },

  async list(): Promise<User[]> {
    try {
      const snapshot = await getDocs(usersCollection);
      return snapshot.docs.map((docSnap) => normalizeUser(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`userService.list failed: ${error.message || error}`);
    }
  },

  async update(uid: string, data: Partial<User>) {
    try {
      const payload = { ...data } as any;
      if (payload.createdAt) {
        payload.createdAt = toTimestamp(payload.createdAt);
      }
      await updateDoc(doc(usersCollection, uid), payload);
    } catch (error: any) {
      throw new Error(`userService.update failed: ${error.message || error}`);
    }
  },

  async remove(uid: string) {
    try {
      await deleteDoc(doc(usersCollection, uid));
    } catch (error: any) {
      throw new Error(`userService.remove failed: ${error.message || error}`);
    }
  },
};

export const milestoneService = {
  async create(milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }) {
    return this.upsertActive(milestone);
  },

  async upsertActive(milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }) {
    try {
      requireField('title', milestone.title);
      requireField('deadline', milestone.deadline);
      requireField('createdBy', milestone.createdBy);
      requireField('createdByName', milestone.createdByName);

      const milestoneRef = doc(milestonesCollection, ACTIVE_MILESTONE_ID);
      const existing = await getDoc(milestoneRef);
      const createdAt = existing.exists()
        ? toMillis(existing.data().createdAt)
        : milestone.createdAt || Date.now();

      const payload = {
        ...milestone,
        id: ACTIVE_MILESTONE_ID,
        status: milestone.status || 'active',
        progress: typeof milestone.progress === 'number' ? milestone.progress : 0,
        createdAt: toTimestamp(createdAt),
        updatedAt: toTimestamp(milestone.updatedAt || Date.now()),
        deadline: toTimestamp(milestone.deadline, false),
      };

      await setDoc(milestoneRef, payload);
      return payload;
    } catch (error: any) {
      throw new Error(`milestoneService.upsertActive failed: ${error.message || error}`);
    }
  },

  async get(id: string): Promise<Milestone | null> {
    try {
      const snapshot = await getDoc(doc(milestonesCollection, id));
      if (!snapshot.exists()) {
        return null;
      }
      return normalizeMilestone(snapshot.data(), id);
    } catch (error: any) {
      throw new Error(`milestoneService.get failed: ${error.message || error}`);
    }
  },

  async getActive(): Promise<Milestone | null> {
    return this.get(ACTIVE_MILESTONE_ID);
  },

  async list(): Promise<Milestone[]> {
    try {
      const active = await this.getActive();
      return active ? [active] : [];
    } catch (error: any) {
      throw new Error(`milestoneService.list failed: ${error.message || error}`);
    }
  },

  async update(id: string, data: Partial<Milestone>) {
    try {
      const payload = { ...data, updatedAt: Date.now() } as any;
      if (payload.createdAt) {
        payload.createdAt = toTimestamp(payload.createdAt);
      }
      if (payload.updatedAt) {
        payload.updatedAt = toTimestamp(payload.updatedAt, false);
      }
      if (payload.deadline) {
        payload.deadline = toTimestamp(payload.deadline, false);
      }
      await updateDoc(doc(milestonesCollection, id), payload);
    } catch (error: any) {
      throw new Error(`milestoneService.update failed: ${error.message || error}`);
    }
  },

  async remove(id: string) {
    try {
      await deleteDoc(doc(milestonesCollection, id));
    } catch (error: any) {
      throw new Error(`milestoneService.remove failed: ${error.message || error}`);
    }
  },
};

export const taskService = {
  async create(task: Omit<Task, 'id' | 'createdAt'> & { createdAt?: number }) {
    try {
      requireField('title', task.title);
      requireField('milestoneId', task.milestoneId);
      requireField('assignedByName', task.assignedByName);
      requireField('assignedByRole', task.assignedByRole);
      requireField('priority', task.priority);
      requireField('status', task.status);
      requireField('createdBy', task.createdBy);
      requireField('createdByName', task.createdByName);
      requireField('createdByRole', task.createdByRole);
      requireField('dueAt', task.dueAt);

      const assignedUserIds = Array.isArray(task.assignedUserIds)
        ? task.assignedUserIds.filter(Boolean)
        : [];

      if (assignedUserIds.length === 0 && !task.assignedRole) {
        throw new Error('Task must be assigned to at least one user or one role');
      }

      const taskRef = doc(tasksCollection);
      const payload = {
        ...task,
        id: taskRef.id,
        assignedUserIds,
        assignedRole: task.assignedRole || null,
        createdAt: toTimestamp(task.createdAt),
        dueAt: toTimestamp(task.dueAt),
      };
      await setDoc(taskRef, payload);
      return payload;
    } catch (error: any) {
      throw new Error(`taskService.create failed: ${error.message || error}`);
    }
  },

  async get(id: string): Promise<Task | null> {
    try {
      const snapshot = await getDoc(doc(tasksCollection, id));
      if (!snapshot.exists()) {
        return null;
      }
      return normalizeTask(snapshot.data(), id);
    } catch (error: any) {
      throw new Error(`taskService.get failed: ${error.message || error}`);
    }
  },

  async list(): Promise<Task[]> {
    try {
      const snapshot = await getDocs(tasksCollection);
      return snapshot.docs.map((docSnap) => normalizeTask(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`taskService.list failed: ${error.message || error}`);
    }
  },

  async listByMilestone(milestoneId: string): Promise<Task[]> {
    try {
      requireField('milestoneId', milestoneId);
      const q = query(tasksCollection, where('milestoneId', '==', milestoneId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => normalizeTask(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`taskService.listByMilestone failed: ${error.message || error}`);
    }
  },

  async listByAssignee(assigneeId: string): Promise<Task[]> {
    try {
      requireField('assigneeId', assigneeId);
      const q = query(tasksCollection, where('assignedUserIds', 'array-contains', assigneeId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => normalizeTask(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`taskService.listByAssignee failed: ${error.message || error}`);
    }
  },

  async listByAssignedRole(role: UserRole): Promise<Task[]> {
    try {
      requireField('role', role);
      const q = query(tasksCollection, where('assignedRole', '==', role));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => normalizeTask(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`taskService.listByAssignedRole failed: ${error.message || error}`);
    }
  },

  async update(id: string, data: Partial<Task>) {
    try {
      const payload = { ...data } as any;
      if (payload.createdAt) {
        payload.createdAt = toTimestamp(payload.createdAt);
      }
      if (payload.dueAt) {
        payload.dueAt = toTimestamp(payload.dueAt, false);
      }
      if (payload.assignedUserIds && Array.isArray(payload.assignedUserIds)) {
        payload.assignedUserIds = payload.assignedUserIds.filter(Boolean);
      }
      await updateDoc(doc(tasksCollection, id), payload);
    } catch (error: any) {
      throw new Error(`taskService.update failed: ${error.message || error}`);
    }
  },

  async remove(id: string) {
    try {
      await deleteDoc(doc(tasksCollection, id));
    } catch (error: any) {
      throw new Error(`taskService.remove failed: ${error.message || error}`);
    }
  },
};

export const taskCommentService = {
  async create(taskId: string, comment: Omit<TaskComment, 'id' | 'timestamp'> & { timestamp?: number }) {
    try {
      requireField('taskId', taskId);
      requireField('userId', comment.userId);
      requireField('userName', comment.userName);
      requireField('userRole', comment.userRole);
      requireField('text', comment.text);

      const commentsCollection = collection(db, `tasks/${taskId}/comments`);
      const commentRef = doc(commentsCollection);
      const payload = {
        ...comment,
        id: commentRef.id,
        timestamp: toTimestamp(comment.timestamp),
      };
      await setDoc(commentRef, payload);
      return payload;
    } catch (error: any) {
      throw new Error(`taskCommentService.create failed: ${error.message || error}`);
    }
  },

  async list(taskId: string): Promise<TaskComment[]> {
    try {
      requireField('taskId', taskId);
      const commentsCollection = collection(db, `tasks/${taskId}/comments`);
      const snapshot = await getDocs(commentsCollection);
      return snapshot.docs.map((docSnap) => normalizeComment(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`taskCommentService.list failed: ${error.message || error}`);
    }
  },
};
