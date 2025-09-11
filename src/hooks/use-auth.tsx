

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';

// Extend the User object to include our custom UserProfile data
export interface User extends FirebaseUser {
  profile?: UserProfile;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUpWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // User is signed in, now fetch their profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const profile = userSnap.data() as UserProfile;
          // Update last login timestamp
          await updateDoc(userRef, { lastLogin: serverTimestamp() });
          setUser({ ...firebaseUser, profile: {...profile, lastLogin: new Date()} });
        } else {
            // This case handles users who signed up before the profile collection existed.
            // Or if a user signed up with Google for the first time.
            const profile: UserProfile = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                role: 'manager', // Default role for new signups
                name: firebaseUser.displayName ?? firebaseUser.email,
                photoURL: firebaseUser.photoURL,
                lastLogin: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await setDoc(userRef, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastLogin: serverTimestamp() });
            setUser({ ...firebaseUser, profile });
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error("Not authenticated");

    const authUpdates: { displayName?: string, photoURL?: string } = {};
    if (updates.name) authUpdates.displayName = updates.name;
    if (updates.photoURL) authUpdates.photoURL = updates.photoURL;

    // Update Firebase Auth profile
    if (Object.keys(authUpdates).length > 0) {
      await updateProfile(user, authUpdates);
    }

    // Update Firestore profile
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
    
    // Refresh user state
    const updatedUserDoc = await getDoc(userRef);
    const updatedProfile = updatedUserDoc.data() as UserProfile;
    setUser(prevUser => prevUser ? ({ ...prevUser, profile: updatedProfile }) : null);
  };

  const signUpWithEmail = async (email: string, password: string): Promise<any> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Create user profile document in Firestore
    const userRef = doc(db, "users", firebaseUser.uid);
    const newUserProfile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'> = {
        email: email,
        name: email, // Default name to email
        role: 'manager' // Assign default role
    };

    await setDoc(userRef, {
        ...newUserProfile,
        id: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
    });

    return userCredential;
  };

  const signInWithEmail = (email: string, password: string): Promise<any> => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async (): Promise<any> => {
    const provider = new GoogleAuthProvider();
    await setPersistence(auth, browserSessionPersistence);
    return signInWithPopup(auth, provider);
  };

  const signOut = (): Promise<void> => {
    return firebaseSignOut(auth);
  };

  const value = {
    user,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
