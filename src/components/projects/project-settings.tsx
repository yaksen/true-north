
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project, ProjectMember } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { MembersList } from './members-list';
import { Loader2, Trash2, UserPlus, File, User as UserIcon, Contact } from 'lucide-react';
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
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { MemberForm } from './member-form';
import { GoogleAuthProvider, linkWithPopup } from 'firebase/auth';
import { storeGoogleTokens } from '@/app/actions/google-link';

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
      toast({ title: 'Success', description: 'Project has been permanently deleted.' });
      router.push('/dashboard/projects');
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the project.' });
      setIsDeleting(false);
    }
  }

  const handleConnect = async (scope: 'drive.file' | 'contacts') => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }
    
    const provider = new GoogleAuthProvider();
    provider.addScope(`https://www.googleapis.com/auth/${scope}`);
    
    // This configuration forces Google to issue a refresh token every time.
    provider.setCustomParameters({
        access_type: 'offline',
        prompt: 'consent'
    });

    try {
        const result = await linkWithPopup(user, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);

        if (!credential) {
            throw new Error('Could not get credential from result.');
        }
        
        // This is a temporary server-side auth code.
        // @ts-ignore - 'serverAuthCode' is not in the type def but exists
        const serverAuthCode = credential.serverAuthCode;

        if (!serverAuthCode) {
            throw new Error('Server auth code not found. Please try connecting again.');
        }

        const storeResult = await storeGoogleTokens(project.id, serverAuthCode, scope);

        if (storeResult.success) {
            toast({ title: 'Success!', description: 'Your Google account has been connected.' });
            router.refresh();
        } else {
            throw new Error(storeResult.error || 'Failed to store tokens on the server.');
        }

    } catch (error: any) {
        console.error("Google Link Error:", error);
        toast({
            variant: 'destructive',
            title: 'Connection Failed',
            description: error.code === 'auth/credential-already-in-use'
                ? 'This Google account is already linked to another user.'
                : error.message || 'An unknown error occurred during authentication.'
        });
    }
  };

  return (
    <div className="grid gap-6 mt-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
            <CardTitle>API Integrations</CardTitle>
            <CardDescription>Connect to external services to unlock more features.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
            <div className='flex items-center justify-between p-4 border rounded-lg'>
                <div className='flex items-center gap-3'>
                    <Contact />
                    <div>
                        <h4 className='font-semibold'>Google Contacts</h4>
                        <p className='text-sm text-muted-foreground'>Sync leads, vendors, and partners.</p>
                    </div>
                </div>
                 <Button onClick={() => handleConnect('contacts')} disabled={!!project.googleContactsRefreshToken}>
                    {project.googleContactsRefreshToken ? 'Connected' : 'Connect'}
                </Button>
            </div>
             <div className='flex items-center justify-between p-4 border rounded-lg'>
                <div className='flex items-center gap-3'>
                    <File />
                    <div>
                        <h4 className='font-semibold'>Google Drive</h4>
                        <p className='text-sm text-muted-foreground'>Upload & manage project files.</p>
                    </div>
                </div>
                 <Button onClick={() => handleConnect('drive.file')} disabled={!!project.googleDriveRefreshToken}>
                    {project.googleDriveRefreshToken ? 'Connected' : 'Connect'}
                </Button>
            </div>
        </CardContent>
      </Card>
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
