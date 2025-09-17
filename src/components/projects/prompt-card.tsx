
'use client';

import { useState } from 'react';
import type { AIPrompt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { PromptForm } from './prompt-form';
import { Copy, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';

interface PromptCardProps {
  prompt: AIPrompt;
}

export function PromptCard({ prompt }: PromptCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'aiPrompts', prompt.id));
      toast({ title: 'Success', description: 'Prompt deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete prompt.' });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.body);
    toast({ title: 'Copied!', description: 'Prompt body copied to clipboard.' });
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="truncate">{prompt.title}</CardTitle>
        <CardDescription>
          {prompt.description || 'No description'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm bg-muted/50 p-3 rounded-md font-mono line-clamp-4">{prompt.body}</p>
      </CardContent>
      <CardFooter className="flex w-full justify-between items-center">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">View / Edit</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Edit AI Prompt</DialogTitle></DialogHeader>
                <PromptForm prompt={prompt} projectId={prompt.projectId} closeForm={() => setIsEditOpen(false)} />
            </DialogContent>
        </Dialog>
        <div className='flex items-center'>
            <Button size="icon" variant="ghost" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This will permanently delete the prompt. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
