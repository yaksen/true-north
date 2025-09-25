
'use client';

import { useState } from 'react';
import type { Channel, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { ChannelForm } from './channel-form';
import { Edit, Trash2, Link as LinkIcon, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activity-log';
import Link from 'next/link';

interface ChannelCardProps {
  channel: Channel;
  project: Project;
}

export function ChannelCard({ channel, project }: ChannelCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

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
      <CardFooter className="flex justify-between items-center">
        <div className='flex items-center gap-1'>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Edit</Button>
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
        </div>
        <div className='flex items-center'>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStar(!channel.starred)}>
                <Star className={cn("h-4 w-4", channel.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
