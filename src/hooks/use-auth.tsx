
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
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';

// Extend the User object to include our custom UserProfile data
export interface AuthUser extends User {
  profile?: UserProfile;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUpWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, now fetch their profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const profile = userSnap.data() as UserProfile;
          setUser({ ...firebaseUser, profile });
        } else {
            // This case handles users who signed up before the profile collection existed.
            // Or if a user signed up with Google for the first time.
            const profile: UserProfile = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                role: 'employee', // Default role
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await setDoc(userRef, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
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

  const signUpWithEmail = async (email: string, password: string): Promise<any> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Create user profile document in Firestore
    const userRef = doc(db, "users", firebaseUser.uid);
    const newUserProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
        id: firebaseUser.uid,
        email: email,
        role: 'employee' // Assign default role
    };

    await setDoc(userRef, {
        ...newUserProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    return userCredential;
  };

  const signInWithEmail = (email: string, password: string): Promise<any> => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = (): Promise<any> => {
    const provider = new GoogleAuthProvider();
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
