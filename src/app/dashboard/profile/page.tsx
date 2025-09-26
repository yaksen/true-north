
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  photoURL: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, userProfile, updateUserProfile, unlinkProvider } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userProfile?.name || '',
      photoURL: userProfile?.photoURL || '',
    },
  });

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const nameParts = name.split(' ');
    if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };
  
  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
        await updateUserProfile(data);
        toast({ title: 'Success', description: 'Your profile has been updated.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update your profile.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    setIsUnlinking(true);
    try {
      await unlinkProvider();
      toast({ title: 'Success', description: 'Your Google Account has been disconnected.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not disconnect your Google Account.'});
    } finally {
      setIsUnlinking(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">User Profile</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Update your personal information here.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-6 mb-8">
                 <Avatar className="h-24 w-24">
                    <AvatarImage src={userProfile?.photoURL} alt={userProfile?.name} />
                    <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
                </Avatar>
                <div className='space-y-1'>
                    <h2 className='text-2xl font-bold'>{userProfile?.name}</h2>
                    <p className='text-muted-foreground'>{user?.email}</p>
                </div>
            </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="photoURL">Photo URL</Label>
              <Input id="photoURL" {...register('photoURL')} />
               {errors.photoURL && <p className="text-sm text-destructive">{errors.photoURL.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor='email'>Email</Label>
                <Input id='email' type='email' value={user?.email || ''} disabled />
                <p className='text-xs text-muted-foreground'>Email address cannot be changed.</p>
            </div>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Profile
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card className="border-destructive">
          <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>This action can resolve authentication conflicts.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
              <div>
                  <p className="font-semibold">Disconnect Google Account</p>
                  <p className="text-sm text-muted-foreground">This will remove the link to your Google Account from this user profile.</p>
              </div>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isUnlinking}>
                          {isUnlinking ? <Loader2 className="mr-2 animate-spin" /> : <Trash2 className="mr-2"/>}
                           Disconnect
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will disconnect your Google account from your TrueNorth profile. You will need to re-authenticate to use Google integrations.
                      </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnlink}>
                          Yes, disconnect my account
                      </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
          </CardContent>
      </Card>
    </div>
  );
}
