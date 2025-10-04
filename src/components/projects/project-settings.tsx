

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
import { deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { MemberForm } from './member-form';
import { storeGoogleTokens, disconnectGoogle } from '@/app/actions/google-link';
import { testGoogleDriveConnection } from '@/app/actions/google-drive';
import { testGoogleContactsConnection } from '@/app/actions/google-contacts';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface AuthCodeDialogProps {
    serviceName: 'Google Drive' | 'Google Contacts';
    scopes: string[];
    onConnect: (authCode: string) => Promise<void>;
    isConnecting: boolean;
}

function AuthCodeDialog({ serviceName, scopes, onConnect, isConnecting }: AuthCodeDialogProps) {
    const [authCode, setAuthCode] = useState('');
    const OAUTH_PLAYGROUND_URL = "https://developers.google.com/oauthplayground";

    return (
        <div className='space-y-4'>
            <div className='prose prose-sm dark:prose-invert'>
                <p>Follow these steps to get your Authorization Code:</p>
                <ol>
                    <li>Open the <a href={OAUTH_PLAYGROUND_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google OAuth Playground</a> in a new tab.</li>
                    <li>In the top-right corner, click the gear icon (OAuth 2.0 configuration). Select <strong>&quot;Use your own OAuth credentials&quot;</strong> and provide the Client ID and Secret from your project's environment variables.</li>
                    <li>
                        <p>On the left (Step 1), find and authorize the following API scope:</p>
                        <ul className='text-xs'>
                            {scopes.map(scope => <li key={scope}><code>{scope}</code></li>)}
                        </ul>
                    </li>
                    <li>Click <strong>&quot;Authorize APIs&quot;</strong> and sign in with the Google account you want to connect.</li>
                    <li>After granting permission, you will be redirected. Click <strong>&quot;Exchange authorization code for tokens&quot;</strong>.</li>
                    <li>Copy the <strong>Authorization code</strong> from the request/response panel on the right.</li>
                </ol>
            </div>
            <div className='space-y-2'>
                <Label htmlFor='auth-code'>Paste Authorization Code</Label>
                <Input 
                    id='auth-code'
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder='Paste the code here'
                />
            </div>
            <Button onClick={() => onConnect(authCode)} disabled={isConnecting || !authCode} className='w-full'>
                {isConnecting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Verify and Connect
            </Button>
        </div>
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
  const [isConnecting, setIsConnecting] = useState<'drive' | 'contacts' | null>(null);
  const [isTesting, setIsTesting] = useState<'drive' | 'contacts' | null>(null);
  const [channelManagerAccess, setChannelManagerAccess] = useState(project.channelManagerGlobalAccess ?? true);


  const isOwner = user?.uid === project.ownerUid;

  const handleConnect = async (scope: 'drive.file' | 'contacts', authCode: string) => {
    if (!user) return;
    setIsConnecting(scope === 'drive.file' ? 'drive' : 'contacts');

    try {
        const storeResult = await storeGoogleTokens(project.id, authCode, scope);

        if (storeResult.success) {
            toast({ title: 'Success!', description: 'Your Google account has been connected.' });
            router.refresh();
        } else {
            throw new Error(storeResult.error || 'Failed to store tokens on the server.');
        }

    } catch (error: any) {
      if (error.message?.includes('auth/credential-already-in-use')) {
        toast({
          variant: 'destructive',
          title: 'Account Already In Use',
          description: "This Google account is already linked to another user. Please sign out and sign back in with your Google account to merge them.",
          duration: 10000,
        });
      } else {
        toast({
            variant: 'destructive',
            title: 'Connection Failed',
            description: error.message || 'An unknown error occurred during authentication.'
        });
      }
    } finally {
        setIsConnecting(null);
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
  };
  
  const handleChannelAccessToggle = async (checked: boolean) => {
    setChannelManagerAccess(checked);
    try {
      const projectRef = doc(db, 'projects', project.id);
      await setDoc(projectRef, { channelManagerGlobalAccess: checked }, { merge: true });
      toast({ title: 'Success', description: 'Setting updated.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update setting.' });
      setChannelManagerAccess(!checked); // Revert on failure
    }
  };

  return (
    <div className="grid gap-6 mt-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Global settings for this project.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <p className='font-medium'>Accessible on Channel Manager</p>
                <p className="text-[0.8rem] text-muted-foreground">
                  Allow this project's channels to be viewed in the global manager.
                </p>
              </div>
              <Switch
                checked={channelManagerAccess}
                onCheckedChange={handleChannelAccessToggle}
              />
            </div>
        </CardContent>
      </Card>
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
                        <Dialog>
                            <DialogTrigger asChild><Button>Connect</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Connect to Google Contacts</DialogTitle>
                                </DialogHeader>
                                <AuthCodeDialog
                                    serviceName='Google Contacts'
                                    scopes={['https://www.googleapis.com/auth/contacts']}
                                    onConnect={(code) => handleConnect('contacts', code)}
                                    isConnecting={isConnecting === 'contacts'}
                                />
                            </DialogContent>
                        </Dialog>
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
                        <Dialog>
                            <DialogTrigger asChild><Button>Connect</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Connect to Google Drive</DialogTitle>
                                </DialogHeader>
                                <AuthCodeDialog
                                    serviceName='Google Drive'
                                    scopes={['https://www.googleapis.com/auth/drive.file']}
                                    onConnect={(code) => handleConnect('drive.file', code)}
                                    isConnecting={isConnecting === 'drive'}
                                />
                            </DialogContent>
                        </Dialog>
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
