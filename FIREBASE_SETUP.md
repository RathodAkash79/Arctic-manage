# Arctic Manage - Firebase Firestore Setup Guide

## Architecture

**Database:** Cloud Firestore (NOT Realtime Database)  
**Authentication:** Firebase Email/Password  
**Auto-Bootstrap:** Super Admin profile auto-creates on first login

---

## Quick Start (2 Minutes)

### Step 1: Create Super Admin User in Firebase Auth

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project **arctic-manage**
3. Go to **Authentication** → **Users** tab
4. Click **+ Add User**
5. Enter:
   - **Email:** `demo@arctic.com`
   - **Password:** `Demo@123`
6. Click **Create User**

✅ **Done!** No manual Firestore setup needed.

---

### Step 2: Enable Cloud Firestore

1. In Firebase Console, go to **Firestore Database** (under Build section)
2. If it doesn't exist, click **Create Database**
3. Select:
   - **Location:** Choose your region (e.g., `asia-southeast1`)
   - **Mode:** Start in **Test Mode** (for development)
4. Click **Create**

---

### Step 3: Test Login

1. Start your app: `npm run dev`
2. Go to http://localhost:3000/login
3. Enter:
   - **Email:** `demo@arctic.com`
   - **Password:** `Demo@123`
4. Click **Sign In**

✅ **Expected:**
- Auth succeeds
- App automatically creates Super Admin document in Firestore at `/users/{UID}`
- You're redirected to `/dashboard`
- Check browser console for "✅ Super Admin bootstrapped successfully"

---

## Firestore Collections Structure

### `users` Collection

Auto-created structure when Super Admin logs in:

```
/users
  ├── {UID}
  │   ├── uid: "S9R4KSMruHb0zMv2myux2MJyagF3"
  │   ├── email: "demo@arctic.com"
  │   ├── displayName: "Super Admin"
  │   ├── role: "super_admin"
  │   ├── teamId: null
  │   ├── status: "active"
  │   └── createdAt: (Timestamp)
```

### Other Collections (Created in Phase 2)

- `teams` - Team documents
- `milestones` - Project milestones
- `tasks` - Individual tasks
- `tasks/{taskId}/comments` - Task comments (subcollection)

---

## Important Notes

- **Super Admin UID:** `S9R4KSMruHb0zMv2myux2MJyagF3` (hardcoded in `src/contexts/AuthContext.tsx`)
- **Auto-Bootstrap:** Only works for the specific Super Admin UID
- **Other Users:** Team Admins and Members must be manually created by Super Admin in Phase 3

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Can't see Firestore Database** | Create it in Firebase Console (Build → Firestore Database) |
| **Auth fails after creating user** | Wait 30 seconds for Firebase to sync |
| **"User profile not found" error** | Check console for bootstrap errors; check Firestore rules in test mode |
| **Wrong UID for super admin** | Verify the UID matches `S9R4KSMruHb0zMv2myux2MJyagF3` exactly |

---

## Security Rules (Development)

Currently using **Test Mode** which allows all reads/writes. Update before production:

```javascript
// Firestore Rules (Example - DO NOT USE IN PRODUCTION)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth.uid == uid || hasRole('super_admin');
      allow write: if hasRole('super_admin');
    }
    
    function hasRole(role) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
  }
}
```

---

## Next Steps

Once login works ✅:
1. Confirm you can login as demo@arctic.com
2. Check Firestore console - you should see `/users/{UID}` document created
3. Say **"Start Phase 2"** to proceed with Database Services & CRUD operations



