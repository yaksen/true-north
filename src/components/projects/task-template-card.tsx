
'use client';

import { useState, useEffect } from 'react';
import type { TaskTemplate, Project, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { TaskTemplateForm } from './task-template-form';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface TaskTemplateCardProps {
  template: TaskTemplate;
  project: Project;
}

const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1 && parts[0] && parts[1]) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() ?? 'U';
}

export function TaskTemplateCard({ template, project }: TaskTemplateCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  
  useEffect(() => {
    const fetchMembers = async () => {
      if (template.assigneeUids.length === 0) return;
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', 'in', template.assigneeUids));
      const snapshot = await getDocs(q);
      setMemberProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
    };
    fetchMembers();
  }, [template.assigneeUids]);


  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'taskTemplates', template.id));
      toast({ title: 'Success', description: 'Template deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete template.' });
    }
  };
  
  return (
    <Card className="flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-start">
                <CardTitle className="truncate">{template.title}</CardTitle>
                <div className='flex items-center -mr-2'>
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className='max-w-2xl'>
                            <DialogHeader><DialogTitle>Edit Task Template</DialogTitle></DialogHeader>
                            <TaskTemplateForm template={template} projectId={project.id} members={project.memberUids} closeForm={() => setIsEditOpen(false)} />
                        </DialogContent>
                    </Dialog>
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
            </div>
            <CardDescription className='truncate'>{template.description || 'No description'}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
            <div className='flex items-center gap-2'>
                {dayLabels.map((day, index) => (
                    <Badge key={index} variant={template.daysOfWeek.includes(index) ? 'default' : 'outline'}>
                        {day}
                    </Badge>
                ))}
            </div>
             <Badge variant="secondary" className="capitalize">{template.slot}</Badge>
        </CardContent>
        <CardFooter>
            <div className="flex -space-x-2 overflow-hidden">
                <TooltipProvider>
                {memberProfiles.map(member => (
                    <Tooltip key={member.id}>
                        <TooltipTrigger asChild>
                            <Avatar className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={member.photoURL} />
                                <AvatarFallback>{getInitials(member.name || member.email)}</AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>{member.name || member.email}</TooltipContent>
                    </Tooltip>
                ))}
                 </TooltipProvider>
            </div>
        </CardFooter>
    </Card>
  );
}

