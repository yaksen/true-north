
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload } from 'lucide-react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phoneNumber: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, updateUserProfile, loading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.profile?.name ?? '',
      phoneNumber: user?.profile?.phoneNumber ?? '',
    },
  });

  const getInitials = (nameOrEmail: string | null | undefined) => {
    if (!nameOrEmail) return 'U';
    const nameParts = nameOrEmail.split(' ');
    if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return nameOrEmail[0].toUpperCase();
  };

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !user) return;
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profile-pictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      
      await updateUserProfile({ photoURL });

      toast({ title: 'Success', description: 'Profile picture updated.' });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your profile picture.' });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      await updateUserProfile(data);
      toast({ title: 'Success', description: 'Your profile has been updated.' });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update your profile.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">My Profile</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.profile?.photoURL} />
                <AvatarFallback>{getInitials(user.profile?.name ?? user.email)}</AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="picture-upload" className="font-bold">Profile Picture</Label>
                <div className="relative mt-2">
                  <Button asChild variant="outline" size="sm">
                    <label htmlFor="picture-upload" className="cursor-pointer">
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Change Picture
                    </label>
                  </Button>
                  <Input 
                    id="picture-upload" 
                    type="file" 
                    className="sr-only" 
                    accept="image/*"
                    onChange={handlePictureUpload}
                    disabled={isUploading}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <Input id="name" {...field} />
                        )}
                    />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Controller
                        name="phoneNumber"
                        control={control}
                        render={({ field }) => (
                            <Input id="phoneNumber" placeholder="+1 234 567 890" {...field} />
                        )}
                    />
                    {errors.phoneNumber && <p className="text-sm text-destructive mt-1">{errors.phoneNumber.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user.email ?? ''} readOnly disabled />
                </div>
                 <div>
                    <Label>Role</Label>
                    <div>
                        <Badge variant="secondary" className="capitalize mt-2">{user.profile?.role}</Badge>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
