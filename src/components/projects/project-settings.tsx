

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project, ProjectMember } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
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
  
  const [apiKey, setApiKey] = useState(project.googleApiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '');
  const [tokens, setTokens] = useState({
      drive: project.googleDriveAccessToken || null,
      contacts: project.googleContactsAccessToken || null,
  });

  const [isConnecting, setIsConnecting] = useState<'drive' | 'contacts' | null>(null);
  const [testResult, setTestResult] = useState<{type: 'drive' | 'contacts', items: string[]} | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setApiKey(project.googleApiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '');
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

  const handleSaveApiKey = async (key: string) => {
    const projectRef = doc(db, 'projects', project.id);
    try {
        await updateDoc(projectRef, { googleApiKey: key });
        setApiKey(key);
        toast({ title: 'Success', description: 'API Key saved.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save API Key.' });
    }
  };

  const handleConnect = async (type: 'drive' | 'contacts') => {
    const provider = new GoogleAuthProvider();
    if (type === 'drive') {
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
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
        setTestResult(null);
        toast({ title: 'Success', description: 'Disconnected successfully.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not disconnect.' });
    }
  };

  const testConnection = async (type: 'drive' | 'contacts') => {
      const token = tokens[type];
      if (!token) {
          toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to the service first.' });
          return;
      }
       if (!apiKey) {
        toast({
            variant: 'destructive',
            title: 'API Key Missing',
            description: 'Please enter your Google Cloud API Key.',
        });
        return;
      }
      setIsTesting(true);
      setTestResult(null);

      try {
          let url = '';
          if (type === 'drive') {
              url = `https://www.googleapis.com/drive/v3/files?pageSize=5&fields=files(name)&key=${apiKey}`;
          } else {
              const personFields = encodeURIComponent('names,emailAddresses');
              url = `https://people.googleapis.com/v1/people/me/connections?personFields=${personFields}&key=${apiKey}`;
          }
          
          const response = await fetch(url, {
              headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
              const errorData = await response.json();
              console.error('API Error:', errorData);
              if (response.status === 401 || response.status === 403) {
                  // Token expired or revoked, disconnect it
                  await handleDisconnect(type);
              }
              throw new Error(`API call failed with status: ${response.status}. Check console for details.`);
          }
          
          const data = await response.json();
          let items: string[] = [];
          if (type === 'drive') {
              items = data.files?.map((file: any) => file.name) || [];
          } else {
              items = data.connections?.map((person: any) => person.names?.[0]?.displayName).filter(Boolean) || [];
          }
          setTestResult({type, items});

      } catch (error: any) {
          console.error(`Test connection error for ${type}:`, error);
          toast({ variant: 'destructive', title: 'Test Failed', description: error.message || 'Could not fetch test data. Your token might have expired. Please try disconnecting and reconnecting.' });
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
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Manage API keys for third-party integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="google-api-key">Google Cloud API Key</Label>
                <div className='flex gap-2'>
                    <Input 
                        id="google-api-key" 
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Google Cloud API Key"
                    />
                    <Button onClick={() => handleSaveApiKey(apiKey)}>Save</Button>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect third-party apps to streamline your workflow.</CardDescription>
            </div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <DialogTitle>Troubleshooting API Connections</DialogTitle>
                        <AlertDialogDescription>
                            If a `403 Forbidden` or `400 Bad Request` error occurs, please verify the following in your Google Cloud Console for project <b className="text-primary">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</b>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="text-sm space-y-4">
                        <div>
                            <h4 className="font-semibold">1. APIs & Services</h4>
                            <ul className="list-disc list-inside text-muted-foreground">
                                <li>Ensure the <b className="text-foreground">Google Drive API</b> is ENABLED.</li>
                                <li>Ensure the <b className="text-foreground">Google People API</b> is ENABLED. This is required for contacts.</li>
                            </ul>
                        </div>
                          <div>
                            <h4 className="font-semibold">2. OAuth Consent Screen</h4>
                            <ul className="list-disc list-inside text-muted-foreground">
                                <li>Set Publishing status to <b className="text-foreground">In production</b>.</li>
                                <li>Under Scopes, ensure you have added `.../auth/drive.readonly` and `.../auth/contacts.readonly`.</li>
                                <li>Add your email address as a Test User if the app is not yet published.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold">3. Credentials</h4>
                            <ul className="list-disc list-inside text-muted-foreground">
                                <li>Verify you are using an <b className="text-foreground">OAuth 2.0 Client ID</b> for Web applications.</li>
                                <li>The Client ID must match: <b className='text-primary text-xs'>41964003868-3fnl6kgb6aejeju7q994erlragjfmcj4.apps.googleusercontent.com</b></li>
                                <li>Ensure your API key has no restrictions, or is correctly restricted to your application's domain.</li>
                            </ul>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
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
                {tokens.drive ? (
                  <div className='flex gap-2'>
                    <Button variant="secondary" onClick={() => testConnection('drive')} disabled={isTesting}>
                      {isTesting && isConnecting !== 'drive' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Test Connection
                    </Button>
                     <Button variant="outline" onClick={() => handleDisconnect('drive')}>Disconnect</Button>
                  </div>
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
                        <p className="text-sm text-muted-foreground">Import contacts as leads.</p>
                    </div>
                </div>
                {tokens.contacts ? (
                    <div className='flex gap-2'>
                        <Button variant="secondary" onClick={() => testConnection('contacts')} disabled={isTesting}>
                          {isTesting && isConnecting !== 'contacts' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Test Connection
                        </Button>
                        <Button variant="outline" onClick={() => handleDisconnect('contacts')}>Disconnect</Button>
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => handleConnect('contacts')} disabled={isConnecting === 'contacts'}>
                        {isConnecting === 'contacts' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect
                    </Button>
                )}
            </div>
            {testResult && (
                <div className='p-4 bg-muted rounded-lg'>
                    <h4 className='font-semibold text-sm mb-2'>Test Results:</h4>
                    {testResult.items.length > 0 ? (
                        <ul className='space-y-1 text-sm text-muted-foreground'>
                            {testResult.items.map((item, index) => (
                                <li key={index} className='flex items-center gap-2'>
                                    {testResult.type === 'drive' ? <File className='h-4 w-4' /> : <UserIcon className='h-4 w-4' />}
                                    {item}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No items found. This could be because your Google Drive or Contacts list is empty, or due to permission settings.</p>
                    )}
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
