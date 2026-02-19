# Project Vision: Internal Team Management System

## 1. Core Philosophy & Objective
**Goal:** To build a strictly internal, self-hosted team management web application focused on hierarchical control, task tracking, and data privacy between teams.
**Purpose:** This is NOT a SaaS product for sale. It is a proprietary tool for internal organizational management where the Super Admin retains absolute control.
**Key Vibe:** Serious, distraction-free, high-accountability, and minimalist.

## 2. The Problem We Are Solving
* **Existing Tools:** Are too bloated, expensive, or lack the specific "Super Admin vs. Team Admin" strict moderation we need.
* **The Need:** A system where:
    * Work is tracked in real-time.
    * Teams are isolated (Team A cannot see Team B's data).
    * Delays must be justified with comments/reasons.
    * Moderation is absolute (Ban/Timeout capabilities).

## 3. User Hierarchy & Permissions (RBAC)
The system relies on a strict 3-tier Role-Based Access Control (RBAC):

### A. Super Admin (The Owner)
* **Access:** Global. Can see ALL teams, ALL tasks, ALL users.
* **Capabilities:**
    * Create/Delete Admins.
    * Create/Delete Teams.
    * Ban/Timeout Users (revoke access but preserve history).
    * View Global Dashboard (Project health, delays).
    * Manage System Settings.

### B. Team Admin (The Manager)
* **Access:** Limited to their assigned Team(s) only.
* **Capabilities:**
    * Add/Remove Members within their team.
    * Create Tasks and Milestones for their team.
    * Assign tasks to specific Users or the whole Team.
    * View progress reports for their team.
    * *Constraint:* Cannot see other teams' data.

### C. User (The Executor)
* **Access:** Limited to assigned tasks and team-relevant info.
* **Capabilities:**
    * View assigned Tasks & To-Dos.
    * Update Task Status (Pending -> In Progress -> Done).
    * Comment on tasks (Updates, blockers).
    * View Milestones relevant to them.
    * *Constraint:* Read-only access to team data; cannot delete tasks; cannot see other teams.

## 4. Core Functional Logic

### A. Task & Milestone Tracking
* **Milestones:** Large goals containing multiple tasks (e.g., "Phase 1 Launch"). Tracked via progress bars.
* **Tasks:** Granular work items linked to Milestones.
* **Granular Assignment:** Tasks can be assigned to a specific `User_ID` OR a `Team_ID`.
* **Accountability:**
    * If a task is delayed or blocked, the user MUST provide a comment/reason.
    * Audit logs for every status change (who changed what and when).

### B. Privacy & Moderation
* **Isolation:** Strict database-level or API-level filtering to ensure users never access data outside their scope.
* **Moderation:** Super Admin can "Shadow Ban" or "Timeout" users instantly, stopping them from logging in or making edits.

## 5. Success Metrics for this Project
1.  **Zero Data Leak:** A standard user should never know details of a team they don't belong to.
2.  **Real-Time Clarity:** Admin should know the exact status of a project at a glance.
3.  **Minimal Friction:** The UI must be simple enough that users don't need training.
