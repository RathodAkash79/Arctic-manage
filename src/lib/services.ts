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
import { User, Team, Milestone, Task, TaskComment, UserRole } from '@/types';

const usersCollection = collection(db, 'users');
const teamsCollection = collection(db, 'teams');
const milestonesCollection = collection(db, 'milestones');
const tasksCollection = collection(db, 'tasks');

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
  teamId: data.teamId ?? null,
  status: data.status,
  createdAt: toMillis(data.createdAt),
});

const normalizeTeam = (data: any, id: string): Team => ({
  id,
  name: data.name,
  createdBy: data.createdBy,
  members: Array.isArray(data.members) ? data.members : [],
  createdAt: toMillis(data.createdAt),
});

const normalizeMilestone = (data: any, id: string): Milestone => ({
  id,
  title: data.title,
  teamId: data.teamId,
  deadline: toMillis(data.deadline),
  status: data.status,
  progress: typeof data.progress === 'number' ? data.progress : 0,
  createdAt: toMillis(data.createdAt),
});

const normalizeTask = (data: any, id: string): Task => ({
  id,
  title: data.title,
  description: data.description || '',
  milestoneId: data.milestoneId,
  teamId: data.teamId,
  assignedTo: data.assignedTo,
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
});

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

  async listByTeam(teamId: string): Promise<User[]> {
    try {
      requireField('teamId', teamId);
      const q = query(usersCollection, where('teamId', '==', teamId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => normalizeUser(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`userService.listByTeam failed: ${error.message || error}`);
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

export const teamService = {
  async create(team: Omit<Team, 'id' | 'createdAt'> & { createdAt?: number }) {
    try {
      requireField('name', team.name);
      requireField('createdBy', team.createdBy);

      const teamRef = doc(teamsCollection);
      const payload = {
        ...team,
        id: teamRef.id,
        members: Array.isArray(team.members) ? team.members : [],
        createdAt: toTimestamp(team.createdAt),
      };
      await setDoc(teamRef, payload);
      return payload;
    } catch (error: any) {
      throw new Error(`teamService.create failed: ${error.message || error}`);
    }
  },

  async get(id: string): Promise<Team | null> {
    try {
      const snapshot = await getDoc(doc(teamsCollection, id));
      if (!snapshot.exists()) {
        return null;
      }
      return normalizeTeam(snapshot.data(), id);
    } catch (error: any) {
      throw new Error(`teamService.get failed: ${error.message || error}`);
    }
  },

  async list(): Promise<Team[]> {
    try {
      const snapshot = await getDocs(teamsCollection);
      return snapshot.docs.map((docSnap) => normalizeTeam(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`teamService.list failed: ${error.message || error}`);
    }
  },

  async listByMember(userId: string): Promise<Team[]> {
    try {
      requireField('userId', userId);
      const q = query(teamsCollection, where('members', 'array-contains', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => normalizeTeam(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`teamService.listByMember failed: ${error.message || error}`);
    }
  },

  async update(id: string, data: Partial<Team>) {
    try {
      const payload = { ...data } as any;
      if (payload.createdAt) {
        payload.createdAt = toTimestamp(payload.createdAt);
      }
      await updateDoc(doc(teamsCollection, id), payload);
    } catch (error: any) {
      throw new Error(`teamService.update failed: ${error.message || error}`);
    }
  },

  async remove(id: string) {
    try {
      await deleteDoc(doc(teamsCollection, id));
    } catch (error: any) {
      throw new Error(`teamService.remove failed: ${error.message || error}`);
    }
  },
};

export const milestoneService = {
  async create(milestone: Omit<Milestone, 'id' | 'createdAt'> & { createdAt?: number }) {
    try {
      requireField('title', milestone.title);
      requireField('teamId', milestone.teamId);
      requireField('deadline', milestone.deadline);

      const milestoneRef = doc(milestonesCollection);
      const payload = {
        ...milestone,
        id: milestoneRef.id,
        createdAt: toTimestamp(milestone.createdAt),
        deadline: toTimestamp(milestone.deadline),
      };
      await setDoc(milestoneRef, payload);
      return payload;
    } catch (error: any) {
      throw new Error(`milestoneService.create failed: ${error.message || error}`);
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

  async list(): Promise<Milestone[]> {
    try {
      const snapshot = await getDocs(milestonesCollection);
      return snapshot.docs.map((docSnap) => normalizeMilestone(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`milestoneService.list failed: ${error.message || error}`);
    }
  },

  async listByTeam(teamId: string): Promise<Milestone[]> {
    try {
      requireField('teamId', teamId);
      const q = query(milestonesCollection, where('teamId', '==', teamId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => normalizeMilestone(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`milestoneService.listByTeam failed: ${error.message || error}`);
    }
  },

  async update(id: string, data: Partial<Milestone>) {
    try {
      const payload = { ...data } as any;
      if (payload.createdAt) {
        payload.createdAt = toTimestamp(payload.createdAt);
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
      requireField('teamId', task.teamId);
      requireField('milestoneId', task.milestoneId);
      requireField('assignedTo', task.assignedTo);
      requireField('assignedByName', task.assignedByName);
      requireField('assignedByRole', task.assignedByRole);
      requireField('priority', task.priority);
      requireField('status', task.status);
      requireField('createdBy', task.createdBy);
      requireField('createdByName', task.createdByName);
      requireField('createdByRole', task.createdByRole);
      requireField('dueAt', task.dueAt);

      const taskRef = doc(tasksCollection);
      const payload = {
        ...task,
        id: taskRef.id,
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

  async listByTeam(teamId: string): Promise<Task[]> {
    try {
      requireField('teamId', teamId);
      const q = query(tasksCollection, where('teamId', '==', teamId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => normalizeTask(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`taskService.listByTeam failed: ${error.message || error}`);
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
      const q = query(tasksCollection, where('assignedTo', '==', assigneeId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => normalizeTask(docSnap.data(), docSnap.id));
    } catch (error: any) {
      throw new Error(`taskService.listByAssignee failed: ${error.message || error}`);
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
