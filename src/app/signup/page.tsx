
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

export default function SignupPage() {
  const router = useRouter();
  const { user, loading: authLoading, signUpWithEmail } = useAuth();
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

  const onSubmit = async (data: SignupFormValues) => {
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
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-muted-foreground">Start managing your business with Yaksen Hub</p>
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                Sign Up
            </Button>
            </form>
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
