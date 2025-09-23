
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { MembersList } from './members-list';
import { Loader2, Trash2, UserPlus, File, User as UserIcon } from 'lucide-react';
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
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function GoogleDriveIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="24" height="24" {...props}>
            <path fill="#4285F4" d="M336 448H176l-64-112h320z"/>
            <path fill="#34A853" d="M112 336l-64-112 152-272 64 112z"/>
            <path fill="#FBBC05" d="M152 48l152 272H400l64-112z"/>
        </svg>
    )
}

function GoogleContactsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="24" height="24" {...props}>
            <path fill="#4285F4" d="M368 96a96 96 0 1 0-192 0 96 96 0 0 0 192 0zm-96 32c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z"/>
            <path fill="#4285F4" d="M272 256h-32c-61.9 0-112 50.1-112 112v64h368v-64c0-61.9-50.1-112-112-112h-32v-32h32c79.5 0 144 64.5 144 144v80H96v-80c0-79.5 64.5-144 144-144h32v32z"/>
        </svg>
    )
}

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const [isDriveConnecting, setIsDriveConnecting] = useState(false);
  const [isContactsConnecting, setIsContactsConnecting] = useState(false);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [contactsAccessToken, setContactsAccessToken] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string[] | null>(null);
  const [isTesting, setIsTesting] = useState(false);

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

  const handleConnect = async (type: 'drive' | 'contacts') => {
    const provider = new GoogleAuthProvider();
    if (type === 'drive') {
      setIsDriveConnecting(true);
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
    } else {
      setIsContactsConnecting(true);
      provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        if (type === 'drive') {
          setDriveAccessToken(credential.accessToken);
        } else {
          setContactsAccessToken(credential.accessToken);
        }
        toast({ title: 'Success', description: `Successfully connected to Google ${type === 'drive' ? 'Drive' : 'Contacts'}.` });
      } else {
        throw new Error('No access token received.');
      }
    } catch (error) {
      console.error(`Google ${type} connection error:`, error);
      toast({ variant: 'destructive', title: 'Connection Failed', description: `Could not connect to Google ${type === 'drive' ? 'Drive' : 'Contacts'}.` });
    } finally {
      setIsDriveConnecting(false);
      setIsContactsConnecting(false);
    }
  };

  const testConnection = async (type: 'drive' | 'contacts') => {
      const token = type === 'drive' ? driveAccessToken : contactsAccessToken;
      if (!token) {
          toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to the service first.' });
          return;
      }
      setIsTesting(true);
      setTestResult(null);

      try {
          let url = '';
          if (type === 'drive') {
              url = 'https://www.googleapis.com/drive/v3/files?pageSize=5&fields=files(name)';
          } else {
              url = 'https://people.googleapis.com/v1/people/me/connections?personFields=names&pageSize=5';
          }
          
          const response = await fetch(url, {
              headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
              throw new Error(`API call failed with status: ${response.status}`);
          }
          
          const data = await response.json();

          if (type === 'drive') {
              setTestResult(data.files.map((file: any) => file.name));
          } else {
              setTestResult(data.connections.map((person: any) => person.names[0].displayName));
          }

      } catch (error) {
          console.error(`Test connection error for ${type}:`, error);
          toast({ variant: 'destructive', title: 'Test Failed', description: 'Could not fetch test data.' });
          // If token is expired, clear it to force re-login
          if ((error as Error).message.includes('401') || (error as Error).message.includes('403')) {
            if (type === 'drive') setDriveAccessToken(null);
            else setContactsAccessToken(null);
          }
      } finally {
          setIsTesting(false);
      }
  };

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

      <Card>
        <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Connect third-party apps to streamline your workflow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-4">
                    <GoogleDriveIcon />
                    <div>
                        <p className="font-semibold">Google Drive</p>
                        <p className="text-sm text-muted-foreground">Sync reports and files.</p>
                    </div>
                </div>
                {driveAccessToken ? (
                  <div className='flex gap-2'>
                    <Button variant="secondary" onClick={() => testConnection('drive')} disabled={isTesting}>
                      {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Test Connection
                    </Button>
                     <Button variant="outline" onClick={() => setDriveAccessToken(null)}>Disconnect</Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => handleConnect('drive')} disabled={isDriveConnecting}>
                      {isDriveConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Connect
                  </Button>
                )}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-4">
                    <GoogleContactsIcon />
                    <div>
                        <p className="font-semibold">Google Contacts</p>
                        <p className="text-sm text-muted-foreground">Import contacts as leads.</p>
                    </div>
                </div>
                {contactsAccessToken ? (
                    <div className='flex gap-2'>
                        <Button variant="secondary" onClick={() => testConnection('contacts')} disabled={isTesting}>
                          {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Test Connection
                        </Button>
                        <Button variant="outline" onClick={() => setContactsAccessToken(null)}>Disconnect</Button>
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => handleConnect('contacts')} disabled={isContactsConnecting}>
                        {isContactsConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect
                    </Button>
                )}
            </div>
            {testResult && (
                <div className='p-4 bg-muted rounded-lg'>
                    <h4 className='font-semibold text-sm mb-2'>Test Results:</h4>
                    <ul className='space-y-1 text-sm text-muted-foreground'>
                        {testResult.map((item, index) => (
                            <li key={index} className='flex items-center gap-2'>
                                {driveAccessToken && !contactsAccessToken ? <File className='h-4 w-4' /> : <UserIcon className='h-4 w-4' />}
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
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
