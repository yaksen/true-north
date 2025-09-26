
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
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';

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
      if (firebaseUser) {
        // Just set the basic user for now to speed up login
        setUser(firebaseUser);
        
        // Fetch profile in the background
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser({ ...firebaseUser, profile: userSnap.data() as UserProfile });
        } else {
          // Create a new profile if it doesn't exist
          const profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'> = {
            email: firebaseUser.email!,
            role: 'member',
            name: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            projects: [],
          };
          await setDoc(userRef, { 
            ...profile, 
            id: firebaseUser.uid,
            createdAt: serverTimestamp(), 
            updatedAt: serverTimestamp(),
            lastLogin: serverTimestamp() 
          });
          setUser({ ...firebaseUser, profile: profile as UserProfile });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !auth.currentUser) throw new Error("Not authenticated");
    
    // Update Firebase Auth profile
    await updateProfile(auth.currentUser, {
      displayName: updates.name,
      photoURL: updates.photoURL,
    });
    
    // Update Firestore profile
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });

    // Refresh local user state
    const updatedUserDoc = await getDoc(userRef);
    setUser(prev => prev ? ({ ...prev, profile: updatedUserDoc.data() as UserProfile }) : null);
  };

  const signUpWithEmail = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithEmail = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    // Do not add any custom scopes or parameters
    return signInWithPopup(auth, provider);
  };

  const signOut = () => {
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
      {loading && !user ? (
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
