'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, getSecondaryAuth } from '@/lib/firebase';
import { User, AuthContextType, UserRole } from '@/types';

// Super Admin UID - auto-bootstraps on first login
const SUPER_ADMIN_UID = 'S9R4KSMruHb0zMv2myux2MJyagF3';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getAllowedRolesForCreator = (creatorRole?: UserRole): UserRole[] => {
    if (!creatorRole) {
      return ['trial_staff'];
    }
    if (creatorRole === 'super_admin') {
      return ['super_admin', 'admin', 'developer', 'staff', 'trial_staff'];
    }
    if (creatorRole === 'admin') {
      return ['staff', 'trial_staff'];
    }
    if (creatorRole === 'developer' || creatorRole === 'staff') {
      return ['trial_staff'];
    }
    return [];
  };

  /**
   * Fetch user data from Firestore
   * If super admin (specific UID) doesn't exist in Firestore, auto-create them
   */
  const fetchUserData = async (
    firebaseUser: FirebaseUser
  ): Promise<User | null> => {
    try {
      const userRef = doc(collection(db, 'users'), firebaseUser.uid);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        // User exists in Firestore
        const data = userSnapshot.data();
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: data.displayName,
          role: data.role,
          teamId: data.teamId || null,
          status: data.status,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
        };
      }

      // User doesn't exist - check if this is the super admin
      if (firebaseUser.uid === SUPER_ADMIN_UID) {
        console.log('🔧 Bootstrap: Creating Super Admin user...');

        // Auto-create super admin document
        const superAdminData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: 'Super Admin',
          role: 'super_admin',
          teamId: null,
          status: 'active',
          createdAt: Timestamp.now(),
        };

        await setDoc(userRef, superAdminData);
        console.log('✅ Super Admin bootstrapped successfully');

        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: superAdminData.displayName,
          role: superAdminData.role as 'super_admin',
          teamId: null,
          status: 'active',
          createdAt: Date.now(),
        };
      }

      // User doesn't exist and is not super admin
      console.warn('User not found in Firestore:', firebaseUser.uid);
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userData = await fetchUserData(firebaseUser);

          // Check if user is banned or in timeout
          if (userData && userData.status !== 'active') {
            // Sign out banned/timeout users immediately
            await signOut(auth);
            setUser(null);
            console.warn(`User ${userData.email} is ${userData.status}`);
          } else {
            setUser(userData);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);

      // Sign in with Firebase Auth
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✓ Firebase Auth successful. UID:', result.user.uid);

      // Fetch user data (will bootstrap if super admin)
      const userData = await fetchUserData(result.user);

      if (!userData) {
        console.error(
          '❌ User profile not found in Firestore. UID:',
          result.user.uid
        );
        throw new Error(
          'User profile not found in system. Please contact administrator.'
        );
      }

      // Check if user is active
      if (userData.status !== 'active') {
        await signOut(auth);
        throw new Error(`User account is ${userData.status}`);
      }

      setUser(userData);
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ): Promise<void> => {
    try {
      setLoading(true);

      const creatorRole = user?.role;
      const allowedRoles = getAllowedRolesForCreator(creatorRole);
      const requestedRole = allowedRoles.includes(role) ? role : 'trial_staff';

      if (!allowedRoles.includes(role)) {
        throw new Error('You are not allowed to assign that role');
      }

      // Create user in Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✓ User created in Firebase Auth. UID:', result.user.uid);

      // Create user document in Firestore
      const userRef = doc(collection(db, 'users'), result.user.uid);
      const userData: any = {
        uid: result.user.uid,
        email: email,
        displayName: displayName,
        role: requestedRole,
        teamId: null,
        status: 'active',
        createdAt: Timestamp.now(),
      };

      await setDoc(userRef, userData);
      console.log('✓ User document created in Firestore');

      // Fetch the created user data
      const createdUser = await fetchUserData(result.user);
      setUser(createdUser);
    } catch (error: any) {
      setUser(null);
      
      // Handle common Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createManagedUser = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ): Promise<void> => {
    try {
      setLoading(true);

      const creatorRole = user?.role;
      const allowedRoles = getAllowedRolesForCreator(creatorRole);
      if (!allowedRoles.includes(role)) {
        throw new Error('You are not allowed to assign that role');
      }

      const secondaryAuth = getSecondaryAuth();
      const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);

      const userRef = doc(collection(db, 'users'), result.user.uid);
      const userData: any = {
        uid: result.user.uid,
        email: email,
        displayName: displayName,
        role: role,
        teamId: null,
        status: 'active',
        createdAt: Timestamp.now(),
      };

      await setDoc(userRef, userData);
      await signOut(secondaryAuth);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    createManagedUser,
    logout,
    isAuthenticated: user !== null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
