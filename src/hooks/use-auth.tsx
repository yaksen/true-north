
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
  linkWithCredential,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from './use-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUpWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  auth: typeof auth;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (unsubscribeProfile) unsubscribeProfile();
      
      if (firebaseUser) {
        setUser(firebaseUser); // Set user immediately
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            setUserProfile(userSnap.data() as UserProfile);
          } else {
            // This might happen for a brand new user. Let's create their profile.
            const profileData: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              role: 'member',
              name: firebaseUser.displayName ?? '',
              photoURL: firebaseUser.photoURL ?? '',
              projects: [],
              createdAt: serverTimestamp() as any,
              updatedAt: serverTimestamp() as any,
            };
            setDoc(userRef, profileData).catch(err => console.error("Error creating user doc", err));
            setUserProfile(profileData);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile snapshot error", error);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);


  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    
    await updateProfile(auth.currentUser, {
      displayName: updates.name,
      photoURL: updates.photoURL,
    });
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
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
        prompt: 'consent'
    });

    try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        // @ts-ignore - serverAuthCode is available on the credential object from popups
        const serverAuthCode = credential.serverAuthCode;

        if (serverAuthCode && result.user) {
            const userRef = doc(db, 'users', result.user.uid);
            await setDoc(userRef, { googleServerAuthCode: serverAuthCode }, { merge: true });
        }
        return result;
    } catch (error: any) {
        if (error.code === 'auth/account-exists-with-different-credential') {
            const email = error.customData.email;
            const methods = await fetchSignInMethodsForEmail(auth, email);

            if (methods.includes(EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD)) {
                const password = prompt(`An account already exists with the email ${email}. Please enter your password for that account to link them.`);
                if (password) {
                    try {
                        const userCredential = await signInWithEmailAndPassword(auth, email, password);
                        const googleCredential = GoogleAuthProvider.credentialFromError(error);
                        if (userCredential.user && googleCredential) {
                            await linkWithCredential(userCredential.user, googleCredential);
                            toast({ title: 'Accounts Linked!', description: 'Your Google account has been successfully linked.' });
                        }
                    } catch (linkError: any) {
                         toast({ variant: 'destructive', title: 'Linking Failed', description: linkError.message || 'Could not link accounts. Please check your password.' });
                    }
                } else {
                    toast({ variant: 'destructive', title: 'Linking Canceled', description: 'Password not provided. Accounts were not linked.' });
                }
            } else {
                toast({ variant: 'destructive', title: 'Linking Error', description: 'This Google account is associated with another sign-in method that is not supported for automatic linking.' });
            }
        } else {
            console.error("Google Sign-In Error:", error);
            toast({ variant: 'destructive', title: 'Sign-In Failed', description: error.message });
        }
        throw error;
    }
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
    auth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
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
