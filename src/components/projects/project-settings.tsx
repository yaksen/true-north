

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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [channelManagerAccess, setChannelManagerAccess] = useState(project.channelManagerGlobalAccess ?? true);
  const [fileluApiKey, setFileluApiKey] = useState(project.fileluApiKey || '');
  const [isSavingKey, setIsSavingKey] = useState(false);


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
  
  const handleChannelAccessToggle = async (checked: boolean) => {
    setChannelManagerAccess(checked);
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, { channelManagerGlobalAccess: checked });
      toast({ title: 'Success', description: 'Setting updated.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update setting.' });
      setChannelManagerAccess(!checked); // Revert on failure
    }
  };

  const handleSaveFileluKey = async () => {
    setIsSavingKey(true);
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, { fileluApiKey: fileluApiKey });
      toast({ title: 'Success', description: 'API Key saved successfully.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save API Key.' });
    } finally {
      setIsSavingKey(false);
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
          <CardDescription>Connect to external services.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
              <Label htmlFor="filelu-api-key" className="font-medium">Filelu API Key</Label>
              <p className="text-[0.8rem] text-muted-foreground mb-2">
                Enter your API key for cloud storage from filelu.com.
              </p>
              <div className="flex items-center gap-2">
                  <Input
                    id="filelu-api-key"
                    type="password"
                    value={fileluApiKey}
                    onChange={(e) => setFileluApiKey(e.target.value)}
                    placeholder="Paste your API key here"
                  />
                  <Button onClick={handleSaveFileluKey} disabled={isSavingKey}>
                      {isSavingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                  </Button>
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
