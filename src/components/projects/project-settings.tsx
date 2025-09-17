
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, ProjectMember } from '@/lib/types';
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { MemberForm } from './member-form';

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const isOwner = user?.uid === project.ownerUid;

  async function handleDeleteProject() {
    if (!isOwner) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only the project owner can delete the project.' });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'projects', project.id));
      // Note: logging activity for a deleted project might fail or be orphaned.
      // Consider a different logging strategy for deletions.
      
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
        <CardHeader className='flex-row items-center justify-between'>
          <div>
            <CardTitle>Manage Members</CardTitle>
            <CardDescription>Add new members from registered users and manage existing ones.</CardDescription>
          </div>
           {isOwner && (
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className='mr-2' /> Add Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                </DialogHeader>
                <MemberForm project={project} closeForm={() => setIsAddMemberOpen(false)} />
              </DialogContent>
            </Dialog>
           )}
        </CardHeader>
        <CardContent>
          <MembersList project={project} />
        </CardContent>
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
