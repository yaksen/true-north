
'use client';

import { useState } from 'react';
import type { Channel, Project, Lead } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { ChannelForm } from './channel-form';
import { Edit, Trash2, Link as LinkIcon, Star, CircleDollarSign, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activity-log';
import Link from 'next/link';
import { FinanceForm } from './finance-form';
import { TaskForm } from './task-form';

interface ChannelCardProps {
  channel: Channel;
  project: Project;
  leads: Lead[];
}

export function ChannelCard({ channel, project, leads }: ChannelCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFinanceFormOpen, setIsFinanceFormOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);


  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'channels', channel.id));
      await logActivity(channel.projectId, 'channel_deleted', { name: channel.name }, user.uid);
      toast({ title: 'Success', description: 'Channel deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete channel.' });
    }
  };
  
  const handleStar = async (starred: boolean) => {
    try {
        await updateDoc(doc(db, 'channels', channel.id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const getStatusVariant = (status: Channel['status']) => {
    switch (status) {
        case 'active': return 'default';
        case 'new': return 'secondary';
        case 'inactive': return 'outline';
        case 'closed': return 'destructive';
        default: return 'outline';
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="truncate">{channel.name}</CardTitle>
          <Badge variant={getStatusVariant(channel.status)} className="capitalize">{channel.status}</Badge>
        </div>
        <CardDescription>{channel.type}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2">{channel.notes || 'No notes for this channel.'}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className='flex justify-between items-center w-full'>
            <div className='flex items-center gap-1'>
                <Dialog open={isFinanceFormOpen} onOpenChange={setIsFinanceFormOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm"><CircleDollarSign className='mr-2' /> Finance</Button>
                    </DialogTrigger>
                    <DialogContent className='max-w-4xl'>
                        <DialogHeader><DialogTitle>Log Finance for {channel.name}</DialogTitle></DialogHeader>
                        <FinanceForm project={project} channelId={channel.id} closeForm={() => setIsFinanceFormOpen(false)} />
                    </DialogContent>
                </Dialog>
                <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm"><ListChecks className='mr-2' /> Task</Button>
                    </DialogTrigger>
                    <DialogContent className='max-w-4xl'>
                        <DialogHeader><DialogTitle>Add Task for {channel.name}</DialogTitle></DialogHeader>
                        <TaskForm projectId={project.id} channelId={channel.id} leads={leads} channels={[channel]} members={project.members} closeForm={() => setIsTaskFormOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>
            <div className='flex items-center'>
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Edit className='h-4 w-4' /></Button>
                    </DialogTrigger>
                    <DialogContent className='max-w-4xl'>
                        <DialogHeader><DialogTitle>Edit Channel</DialogTitle></DialogHeader>
                        <ChannelForm channel={channel} projectId={project.id} closeForm={() => setIsEditOpen(false)} />
                    </DialogContent>
                </Dialog>
                {channel.url && (
                    <Button asChild size="icon" variant="ghost">
                        <Link href={channel.url} target='_blank' rel="noopener noreferrer"><LinkIcon className='h-4 w-4' /></Link>
                    </Button>
                )}
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
