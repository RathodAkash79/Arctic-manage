/**
 * Demo Data Initialization Script
 * Run this ONCE to set up demo users and initial data in Firebase Realtime Database
 * 
 * Usage: npm run init-demo
 * 
 * Requirements:
 * 1. User must be created in Firebase Authentication first
 * 2. Update USER_UIDS with actual Firebase Auth UIDs from your Firebase Console
 */

import { getDatabase, ref, set } from 'firebase/database';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/**
 * IMPORTANT: Replace these UIDs with actual Firebase Auth User IDs
 * Go to Firebase Console > Authentication > Users > Copy the UID
 */
const USER_UIDS = {
  super_admin: 'YOUR_SUPER_ADMIN_UID_HERE', // Replace with actual UID
  team_admin: 'YOUR_TEAM_ADMIN_UID_HERE',   // Replace with actual UID
  member: 'YOUR_MEMBER_UID_HERE',           // Replace with actual UID
};

const DEMO_DATA = {
  // Super Admin User
  users: {
    [USER_UIDS.super_admin]: {
      uid: USER_UIDS.super_admin,
      email: 'demo@arctic.com',
      displayName: 'Super Admin',
      role: 'super_admin',
      teamId: null,
      status: 'active',
      createdAt: Date.now(),
    },
    [USER_UIDS.team_admin]: {
      uid: USER_UIDS.team_admin,
      email: 'admin@team.com',
      displayName: 'Team Admin',
      role: 'team_admin',
      teamId: 'team-001',
      status: 'active',
      createdAt: Date.now(),
    },
    [USER_UIDS.member]: {
      uid: USER_UIDS.member,
      email: 'member@team.com',
      displayName: 'Team Member',
      role: 'member',
      teamId: 'team-001',
      status: 'active',
      createdAt: Date.now(),
    },
  },
  // Sample Team
  teams: {
    'team-001': {
      id: 'team-001',
      name: 'Development Team',
      createdBy: USER_UIDS.super_admin,
      members: [USER_UIDS.team_admin, USER_UIDS.member],
      createdAt: Date.now(),
    },
  },
};

async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  try {
    // Set users
    for (const [uid, userData] of Object.entries(DEMO_DATA.users)) {
      const userRef = ref(db, `users/${uid}`);
      await set(userRef, userData);
      console.log(`✓ Created user: ${userData.email} (${userData.role})`);
    }

    // Set teams
    for (const [teamId, teamData] of Object.entries(DEMO_DATA.teams)) {
      const teamRef = ref(db, `teams/${teamId}`);
      await set(teamRef, teamData);
      console.log(`✓ Created team: ${teamData.name}`);
    }

    console.log('\n✅ Database initialization complete!');
    console.log('You can now login with:');
    console.log('  Email: demo@arctic.com');
    console.log('  Password: Demo@123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
