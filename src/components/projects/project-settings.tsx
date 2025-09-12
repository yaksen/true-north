
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activity-log';
import { MembersList } from './members-list';
import { Loader2, Mail, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const inviteSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
  });

  const isOwner = user?.uid === project.ownerUid;

  async function onInviteSubmit(values: InviteFormValues) {
    if (!isOwner) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only project owners can invite members.' });
      return;
    }
    // This is where you would call a Cloud Function to send an email.
    // For now, we'll log it and show a toast.
    await logActivity(project.id, 'member_invited', { email: values.email }, user.uid);
    toast({
      title: 'Invitation Sent (Simulated)',
      description: `${values.email} has been invited to the project.`,
    });
    reset();
  }

  async function handleDeleteProject() {
    if (!isOwner) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only the project owner can delete the project.' });
      return;
    }
    setIsDeleting(true);
    try {
      // Note: This is a simple delete. For production, you'd want a Cloud Function
      // to recursively delete all sub-collections (tasks, finances, etc.).
      await deleteDoc(doc(db, 'projects', project.id));
      await logActivity(project.id, 'project_deleted', { name: project.name }, user!.uid);
      
      toast({ title: 'Success', description: 'Project has been permanently deleted.' });
      router.push('/dashboard/projects');
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the project.' });
      setIsDeleting(false);
    }
  }

  return (
    <div className="grid gap-6 mt-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Manage Members</CardTitle>
          <CardDescription>Invite new members and manage existing ones.</CardDescription>
        </CardHeader>
        <CardContent>
          <MembersList project={project} />
        </CardContent>
        {isOwner && (
          <CardFooter className="border-t pt-6">
            <form onSubmit={handleSubmit(onInviteSubmit)} className="flex w-full items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="email-invite" className="sr-only">Email</Label>
                <Input
                  id="email-invite"
                  placeholder="new.member@example.com"
                  {...register('email')}
                />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Mail className="mr-2" />}
                Send Invite
              </Button>
            </form>
          </CardFooter>
        )}
      </Card>
      
      {isOwner && (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
                <p className="font-semibold">Delete this project</p>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 animate-spin" /> : <Trash2 className="mr-2"/>}
                             Delete Project
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the project and all its associated data, including tasks, finances, and reports. This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProject}>
                            Yes, delete this project
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
