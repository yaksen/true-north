
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activity-log';
import { MembersList } from './members-list';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
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
import { deleteDoc, doc, updateDoc, arrayUnion, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '../ui/input';

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailToAdd, setEmailToAdd] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const isOwner = user?.uid === project.ownerUid;

  async function handleAddMember() {
    if (!isOwner) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only project owners can add members.' });
      return;
    }
    if (!emailToAdd) {
        toast({ variant: 'destructive', title: 'No Email Entered', description: 'Please enter the email of the user to add.' });
        return;
    }

    setIsAdding(true);
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", emailToAdd));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ variant: 'destructive', title: 'User Not Found', description: 'No user exists with that email address.' });
            setIsAdding(false);
            return;
        }

        const userToAdd = querySnapshot.docs[0].data() as UserProfile;

        if (project.members.includes(userToAdd.id)) {
            toast({ variant: 'destructive', title: 'Already a Member', description: 'This user is already a member of the project.' });
            setIsAdding(false);
            return;
        }

        const projectRef = doc(db, 'projects', project.id);
        await updateDoc(projectRef, { members: arrayUnion(userToAdd.id) });
        
        await logActivity(project.id, 'member_added' as any, { email: userToAdd.email }, user!.uid);

        toast({ title: 'Success', description: 'Member added to the project.' });
        setEmailToAdd('');
    } catch (error) {
        console.error("Error adding member: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add member.' });
    } finally {
        setIsAdding(false);
    }
  }

  async function handleDeleteProject() {
    if (!isOwner) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only the project owner can delete the project.' });
      return;
    }
    setIsDeleting(true);
    try {
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
          <CardDescription>Add new members from registered users and manage existing ones.</CardDescription>
        </CardHeader>
        <CardContent>
          <MembersList project={project} />
        </CardContent>
        {isOwner && (
          <CardFooter className="border-t pt-6">
            <div className="flex w-full items-center gap-2">
                <Input
                    type="email"
                    placeholder="Enter user's email to add..."
                    value={emailToAdd}
                    onChange={(e) => setEmailToAdd(e.target.value)}
                    className="flex-1"
                />
              <Button onClick={handleAddMember} disabled={isAdding}>
                {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Add Member
              </Button>
            </div>
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
