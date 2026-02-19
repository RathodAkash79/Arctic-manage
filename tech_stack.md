# Technical Architecture & Stack Guidelines

## 1. Core Technology Stack
We are building a Single Page Application (SPA) functionality using a modern, lightweight, and scalable stack.

* **Framework:** **Next.js 14+ (App Router)** using **TypeScript**.
    * *Why:* Strict typing prevents bugs. App Router provides easy layout management for dashboards.
* **Styling:** **Tailwind CSS**.
    * *Why:* Rapid development, minimal file size, easy to maintain consistency.
* **Backend-as-a-Service (BaaS):** **Firebase**.
    * *Auth:* Firebase Authentication (Email/Password).
    * *Database:* Cloud Firestore (NoSQL) - Critical for real-time listeners.
    * *Storage:* Firebase Storage (For profile pictures/attachments).
* **State Management:** **Zustand** (for global UI state) + **Context API** (for Auth).
    * *Why:* Redux is too complex. Zustand is minimal and fast.
* **Icons:** **Lucide React**.
    * *Why:* Clean, professional, consistent stroke width.

## 2. Database Schema (Firestore)
The database must be structured to support the strict hierarchy (Super Admin -> Team Admin -> User).

### Collection: `users`
* `uid` (string): Firebase Auth ID.
* `email` (string).
* `displayName` (string).
* `role` (string): 'super_admin' | 'team_admin' | 'member'.
* `teamId` (string | null): ID of the team they belong to (null for Super Admin).
* `status` (string): 'active' | 'banned' | 'timeout'.
* `createdAt` (timestamp).

### Collection: `teams`
* `id` (string): Auto-generated.
* `name` (string): e.g., "Development", "Marketing".
* `createdBy` (string): UID of the Super Admin/Admin.
* `members` (array of strings): List of User UIDs (for quick lookup).

### Collection: `milestones`
* `id` (string).
* `title` (string): e.g., "Q1 Launch".
* `teamId` (string): The team this milestone belongs to.
* `deadline` (timestamp).
* `status` (string): 'pending' | 'completed'.
* `progress` (number): 0-100 (calculated based on tasks).

### Collection: `tasks`
* `id` (string).
* `title` (string).
* `description` (string).
* `milestoneId` (string).
* `teamId` (string).
* `assignedTo` (string): UID of a user OR 'team' (if open for anyone in team).
* `priority` (string): 'low' | 'medium' | 'high'.
* `status` (string): 'todo' | 'in-progress' | 'review' | 'done' | 'blocked'.
* `blockReason` (string | null): Mandatory if status is 'blocked'.
* `createdBy` (string).
* `createdAt` (timestamp).
* `dueAt` (timestamp).

### Sub-collection: `tasks/{taskId}/comments`
* `id` (string).
* `userId` (string).
* `text` (string).
* `timestamp` (timestamp).
* `type` (string): 'comment' | 'system_log' (e.g., "Status changed to Done").

## 3. Security Rules (Conceptual)
Strict enforcement of data privacy via Firestore Rules.

1.  **Read Access:**
    * `super_admin`: Can read ALL documents.
    * `team_admin`: Can read documents where `resource.data.teamId == request.auth.token.teamId`.
    * `member`: Can read tasks assigned to them OR tasks within their `teamId`.
2.  **Write Access:**
    * Only `super_admin` can create/delete teams.
    * Only `admins` can ban users (update `status` field).
    * Users can only update `status` and add to `comments` for their assigned tasks.

## 4. Key Features Implementation Guide
* **Real-time Updates:** Use `onSnapshot` for the Task Dashboard. Do not use standard `getDocs` for the main board, as we need instant feedback when a status changes.
* **Role-Based Rendering:** Create a `<RoleGuard>` component (HOC) to wrap restricted pages (e.g., User Management page only accessible to Admins).
* **Status Logic:** If a user selects 'Blocked', a modal MUST pop up forcing them to enter a `blockReason`. The status update cannot proceed without it.
