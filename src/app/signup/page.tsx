
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/logo';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CrmSettings } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';


const signupSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        width="24px"
        height="24px"
        {...props}
      >
        <path
          fill="#FFC107"
          d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
        />
        <path
          fill="#FF3D00"
          d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-8H6.306C9.663,35.663,16.318,44,24,44z"
        />
        <path
          fill="#1976D2"
          d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.012,35.84,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"
        />
      </svg>
    );
}

export default function SignupPage() {
  const router = useRouter();
  const { user, loading: authLoading, signUpWithEmail, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignupEnabled, setIsSignupEnabled] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchSignupStatus() {
        try {
            const settingsRef = doc(db, 'settings', 'crm');
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const settings = docSnap.data() as CrmSettings;
                setIsSignupEnabled(settings.isSignupEnabled);
            }
        } catch (error) {
            console.error("Error fetching signup status:", error);
            // Default to enabled if settings can't be fetched
            setIsSignupEnabled(true);
        } finally {
            setLoadingSettings(false);
        }
    }
    fetchSignupStatus();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onEmailSubmit = async (data: SignupFormValues) => {
    if (!isSignupEnabled) {
        toast({
            variant: 'destructive',
            title: 'Signups Disabled',
            description: 'New user registration is currently disabled by the administrator.',
        });
        return;
    }

    setIsSubmitting(true);
    try {
      await signUpWithEmail(data.email, data.password);
      toast({
        title: 'Signup Successful',
        description: 'You can now sign in.',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleSubmit = async () => {
    if (!isSignupEnabled) {
        toast({
            variant: 'destructive',
            title: 'Signups Disabled',
            description: 'New user registration is currently disabled by the administrator.',
        });
        return;
    }
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      toast({
        title: 'Signup Successful',
        description: "Welcome!",
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadingSettings || authLoading || (!authLoading && user)) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold font-headline">Create an Account</h1>
          <p className="text-muted-foreground">Start managing your business with TrueNorth</p>
        </div>

        {!isSignupEnabled ? (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Signups Disabled</AlertTitle>
                <AlertDescription>
                    New user registration is currently not available. Please contact an administrator if you believe this is an error.
                </AlertDescription>
            </Alert>
        ) : (
            <>
            <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
            <div className="space-y-1">
                <Input
                id="email"
                placeholder="Email"
                type="email"
                {...register('email')}
                disabled={isSubmitting}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="relative space-y-1">
                <Input
                id="password"
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                disabled={isSubmitting}
                />
                <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                disabled={isSubmitting}
                >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1">
                <Input
                id="confirmPassword"
                placeholder="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                disabled={isSubmitting}
                />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up with Email
            </Button>
            </form>

            <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                Or continue with
                </span>
            </div>
            </div>
            
            <Button variant="outline" className="w-full" onClick={onGoogleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <GoogleIcon className="mr-2" />
                )}
                Sign Up with Google
            </Button>
            </>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
