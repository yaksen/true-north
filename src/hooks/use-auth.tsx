
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
  linkWithPopup,
  unlink,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUpWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  unlinkProvider: () => Promise<void>;
  auth: typeof auth;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // If user logs out
      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
        setLoading(false);
        return;
      }

      // If user logs in
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      // Set the raw firebase user immediately for SDK functions
      setUser(firebaseUser);

      // Subscribe to profile changes
      unsubscribeProfile = onSnapshot(userRef, async (userSnap) => {
        if (userSnap.exists()) {
          setUserProfile(userSnap.data() as UserProfile);
        } else {
          // Profile doesn't exist, create it
          const profileData: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            role: 'member',
            name: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            projects: [],
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
          };
          try {
            await setDoc(userRef, profileData);
            setUserProfile(profileData);
          } catch (error) {
            console.error("Error creating user profile:", error);
            await firebaseSignOut(auth);
          }
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        firebaseSignOut(auth);
        setLoading(false);
      });
      
    }, (error) => {
        console.error("Auth state change error:", error);
        setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
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
  };
  
  const unlinkProvider = async () => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    
    const googleProvider = auth.currentUser.providerData.find(p => p.providerId === 'google.com');
    if (googleProvider) {
        await unlink(auth.currentUser, googleProvider.providerId);
    } else {
        throw new Error("No Google account is linked to this user.");
    }
  };

  const signUpWithEmail = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithEmail = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/contacts');
    provider.setCustomParameters({
        access_type: 'offline',
        prompt: 'consent' // Forces the consent screen and refresh token
    });
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    // @ts-ignore
    const serverAuthCode = credential.serverAuthCode;

    if (serverAuthCode && result.user) {
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, {
            googleServerAuthCode: serverAuthCode
        }, { merge: true });
    }
    
    return result;
  };

  const signOut = () => {
    return firebaseSignOut(auth);
  };

  const value = {
    user,
    userProfile,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    updateUserProfile,
    unlinkProvider,
    auth,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
          <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      ) : children}
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
