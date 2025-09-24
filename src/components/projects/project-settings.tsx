

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project, ProjectMember } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { MembersList } from './members-list';
import { Loader2, Trash2, UserPlus, File, User as UserIcon, HelpCircle } from 'lucide-react';
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
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { MemberForm } from './member-form';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

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
  
  const [tokens, setTokens] = useState({
      drive: project.googleDriveAccessToken || null,
      contacts: project.googleContactsAccessToken || null,
  });

  const [isConnecting, setIsConnecting] = useState<'drive' | 'contacts' | null>(null);
  
  useEffect(() => {
    setTokens({
      drive: project.googleDriveAccessToken || null,
      contacts: project.googleContactsAccessToken || null,
    });
  }, [project]);


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
      provider.addScope('https://www.googleapis.com/auth/drive');
    } else {
      provider.addScope('https://www.googleapis.com/auth/contacts');
    }
    
    setIsConnecting(type);
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const token = credential.accessToken;
        const projectRef = doc(db, 'projects', project.id);
        const updatePayload = type === 'drive' 
            ? { googleDriveAccessToken: token } 
            : { googleContactsAccessToken: token };
            
        await updateDoc(projectRef, updatePayload);
        setTokens(prev => ({...prev, [type]: token}));
        toast({ title: 'Success', description: `Successfully connected to Google ${type === 'drive' ? 'Drive' : 'Contacts'}.` });
      } else {
        throw new Error('No access token received.');
      }
    } catch (error) {
      console.error(`Google ${type} connection error:`, error);
      toast({ variant: 'destructive', title: 'Connection Failed', description: `Could not connect to Google ${type === 'drive' ? 'Drive' : 'Contacts'}.` });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (type: 'drive' | 'contacts') => {
    const projectRef = doc(db, 'projects', project.id);
    const updatePayload = type === 'drive' 
        ? { googleDriveAccessToken: null } 
        : { googleContactsAccessToken: null };
    
    try {
        await updateDoc(projectRef, updatePayload);
        setTokens(prev => ({ ...prev, [type]: null }));
        toast({ title: 'Success', description: 'Disconnected successfully.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not disconnect.' });
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect third-party apps to streamline your workflow.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-4">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Google Drive Icon" width="24" height="24" />
                    <div>
                        <p className="font-semibold">Google Drive</p>
                        <p className="text-sm text-muted-foreground">Store reports and files.</p>
                    </div>
                </div>
                {tokens.drive ? (
                  <Button variant="outline" onClick={() => handleDisconnect('drive')}>Disconnect</Button>
                ) : (
                  <Button variant="outline" onClick={() => handleConnect('drive')} disabled={isConnecting === 'drive'}>
                      {isConnecting === 'drive' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Connect
                  </Button>
                )}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-4">
                    <GoogleContactsIcon />
                    <div>
                        <p className="font-semibold">Google Contacts</p>
                        <p className="text-sm text-muted-foreground">Save leads, vendors, and partners.</p>
                    </div>
                </div>
                {tokens.contacts ? (
                    <Button variant="outline" size="sm" onClick={() => handleDisconnect('contacts')}>Disconnect</Button>
                ) : (
                    <Button variant="outline" onClick={() => handleConnect('contacts')} disabled={isConnecting === 'contacts'}>
                        {isConnecting === 'contacts' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect
                    </Button>
                )}
            </div>
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
