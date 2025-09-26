

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project, ProjectMember } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { MembersList } from './members-list';
import { Loader2, Trash2, UserPlus, File, User as UserIcon, Contact, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
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
import { GoogleAuthProvider, linkWithPopup, signInWithPopup } from 'firebase/auth';
import { storeGoogleTokens, disconnectGoogle } from '@/app/actions/google-link';
import { testGoogleDriveConnection } from '@/app/actions/google-drive';
import { testGoogleContactsConnection } from '@/app/actions/google-contacts';

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const { user, auth, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isTesting, setIsTesting] = useState<'drive' | 'contacts' | null>(null);
  
  const isOwner = user?.uid === project.ownerUid;

  // This effect will run on component mount to sync tokens if needed
  useEffect(() => {
    const syncTokens = async () => {
        // Check if user is logged in via Google and has a server auth code
        if (userProfile?.googleServerAuthCode) {
            // Check if either of the tokens are missing for this project
            if (!project.googleDriveRefreshToken || !project.googleContactsRefreshToken) {
                console.log("Found auth code, attempting to store tokens for project...");
                const result = await storeGoogleTokens(project.id, userProfile.googleServerAuthCode, 'drive.file contacts');
                if (result.success) {
                    toast({ title: 'Success!', description: 'Google account linked to this project.' });
                    router.refresh(); // Refresh to get the updated project props
                } else {
                    toast({ variant: 'destructive', title: 'Auto-link failed', description: result.error || 'Could not link Google account.'});
                }
            }
        }
    };
    syncTokens();
  }, [project, userProfile, router, toast]);

  const handleConnect = async (scope: 'drive.file' | 'contacts') => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }
    
    const provider = new GoogleAuthProvider();
    provider.addScope(`https://www.googleapis.com/auth/${scope}`);
    
    provider.setCustomParameters({
        access_type: 'offline',
        prompt: 'consent'
    });

    try {
        if (!auth.currentUser) throw new Error("Current user not found in auth object.");

        const result = await linkWithPopup(auth.currentUser, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);

        if (!credential) {
            throw new Error('Could not get credential from result.');
        }
        
        // @ts-ignore - serverAuthCode is available on the credential object from popups
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
        
        if (error.code === 'auth/credential-already-in-use') {
             toast({
                variant: 'destructive',
                duration: 10000,
                title: 'Account Already in Use',
                description: "This Google account is already linked to another user in this app. Please sign out and sign back in with that Google account to use it, or disconnect it from the other user.",
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Connection Failed',
                description: error.message || 'An unknown error occurred during authentication.'
            });
        }
    }
  };

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

  const handleDisconnect = async (service: 'drive' | 'contacts') => {
    if (!user) return;
    try {
        await disconnectGoogle(project.id, service);
        toast({ title: 'Success', description: `Your Google account has been disconnected from ${service}.`});
        router.refresh();
    } catch (error: any) {
        console.error("Google Disconnect Error:", error);
        toast({ variant: 'destructive', title: 'Disconnection Failed', description: error.message });
    }
  };
  
  const handleTestConnection = async (service: 'drive' | 'contacts') => {
    setIsTesting(service);
    try {
        let result;
        if (service === 'drive') {
            if (!project.googleDriveAccessToken) throw new Error("Not connected to Google Drive");
            result = await testGoogleDriveConnection(project.googleDriveAccessToken);
        } else {
            if (!project.googleContactsAccessToken) throw new Error("Not connected to Google Contacts");
            result = await testGoogleContactsConnection(project.googleContactsAccessToken);
        }

        if (result.success) {
            toast({
                title: 'Connection Successful',
                description: result.message,
                action: <CheckCircle className="text-green-500" />,
            });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Connection Test Failed',
            description: error.message,
            action: <AlertCircle className="text-white" />,
        });
    } finally {
        setIsTesting(null);
    }
  }


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
                 <div className='flex items-center gap-2'>
                    {project.googleContactsRefreshToken ? (
                        <>
                            <Button variant="outline" onClick={() => handleTestConnection('contacts')} disabled={isTesting === 'contacts'}>
                                {isTesting === 'contacts' ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                                Test Connection
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline"><LogOut className='mr-2' />Disconnect</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will disconnect your Google Contacts integration.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDisconnect('contacts')}>Disconnect</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    ) : (
                        <Button onClick={() => handleConnect('contacts')}>Connect</Button>
                    )}
                 </div>
            </div>
             <div className='flex items-center justify-between p-4 border rounded-lg'>
                <div className='flex items-center gap-3'>
                    <File />
                    <div>
                        <h4 className='font-semibold'>Google Drive</h4>
                        <p className='text-sm text-muted-foreground'>Upload & manage project files.</p>
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    {project.googleDriveRefreshToken ? (
                        <>
                            <Button variant="outline" onClick={() => handleTestConnection('drive')} disabled={isTesting === 'drive'}>
                               {isTesting === 'drive' ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                                Test Connection
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline"><LogOut className='mr-2' />Disconnect</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will disconnect your Google Drive integration.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDisconnect('drive')}>Disconnect</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    ) : (
                        <Button onClick={() => handleConnect('drive.file')}>Connect</Button>
                    )}
                 </div>
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
