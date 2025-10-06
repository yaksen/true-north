
'use client';

import { useState } from 'react';
import type { Task, Lead, Channel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { TaskForm } from './task-form';
import { Edit, Trash2, Star, PlusCircle, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { logActivity } from '@/lib/activity-log';

interface TaskCardProps {
  task: Task;
  leads: Lead[];
  channels: Channel[];
}

export function TaskCard({ task, leads, channels }: TaskCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      await logActivity(task.projectId, 'task_deleted', { title: task.title }, user.uid);
      toast({ title: 'Success', description: 'Task deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete task.' });
    }
  };
  
  const handleCheckedChange = async (checked: boolean) => {
      try {
          const taskRef = doc(db, 'tasks', task.id);
          await updateDoc(taskRef, { completed: checked });
          // No toast for this to avoid being noisy
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not update task.' });
      }
  };
  
  const handleStar = async (starred: boolean) => {
    try {
        await updateDoc(doc(db, 'tasks', task.id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const updatedAtTimestamp = task.updatedAt as any;
  const updatedAt = updatedAtTimestamp?.toDate ? updatedAtTimestamp.toDate() : (updatedAtTimestamp ? new Date(updatedAtTimestamp) : null);
  const lead = leads.find(l => l.id === task.leadId);
  const channel = channels.find(c => c.id === task.channelId);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className={cn("truncate flex items-center gap-2", task.completed && "line-through text-muted-foreground")}>
                <Checkbox
                    checked={task.completed}
                    onCheckedChange={handleCheckedChange}
                    aria-label="Mark task as done"
                    className='h-5 w-5'
                />
                {task.title}
            </CardTitle>
            <div className='flex items-center -mr-2'>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStar(!task.starred)}>
                    <Star className={cn("h-4 w-4", task.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                </Button>
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
                        <TaskForm task={task} projectId={task.projectId} leads={leads} channels={channels} closeForm={() => setIsEditOpen(false)} />
                    </DialogContent>
                </Dialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        {updatedAt && (
             <CardDescription>
                Last updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-3">{task.description}</p>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        <div className='flex items-center gap-2 flex-wrap'>
            {task.dueDate && <Badge variant="outline">{format(new Date(task.dueDate), 'PPP')}</Badge>}
            {lead && <Badge variant="secondary">{lead.name}</Badge>}
            {channel && <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">{channel.name}</Badge>}
        </div>
        <div className='w-full flex justify-end items-center pt-2'>
            <Badge 
                variant="outline" 
                className={cn(
                    "capitalize",
                    task.slot === 'morning' && "bg-amber-500/20 text-amber-500 border-amber-500/30",
                    task.slot === 'midday' && "bg-sky-500/20 text-sky-500 border-sky-500/30",
                    task.slot === 'night' && "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                )}
            >
                {task.slot}
            </Badge>
        </div>
      </CardFooter>
    </Card>
  );
}
