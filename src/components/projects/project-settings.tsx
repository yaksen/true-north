
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
import { deleteDoc, doc, updateDoc, arrayUnion, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Combobox } from '../ui/combo-box';

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
        setAllUsers(users);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch users.' });
      }
    };
    fetchUsers();
  }, [toast]);

  const isOwner = user?.uid === project.ownerUid;

  const nonMemberUsers = allUsers
    .filter(u => !project.members.includes(u.id))
    .map(u => ({ value: u.id, label: u.email }));

  async function handleAddMember() {
    if (!isOwner) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only project owners can add members.' });
      return;
    }
    if (!selectedUser) {
        toast({ variant: 'destructive', title: 'No User Selected', description: 'Please select a user to add.' });
        return;
    }

    setIsAdding(true);
    try {
        const projectRef = doc(db, 'projects', project.id);
        await updateDoc(projectRef, { members: arrayUnion(selectedUser) });
        
        const addedUser = allUsers.find(u => u.id === selectedUser);
        if (addedUser) {
            await logActivity(project.id, 'member_added' as any, { email: addedUser.email }, user.uid);
        }

        toast({ title: 'Success', description: 'Member added to the project.' });
        setSelectedUser('');
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
                <Combobox
                    items={nonMemberUsers}
                    value={selectedUser}
                    onChange={setSelectedUser}
                    placeholder="Select user to add..."
                    searchPlaceholder="Search users..."
                    noResultsText="No users found."
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
