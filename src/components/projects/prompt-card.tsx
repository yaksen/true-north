
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
import { Badge } from '../ui/badge';

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
    const sections = [
        { title: 'Role/Context', content: prompt.role },
        { title: 'Task', content: prompt.task },
        { title: 'Constraints', content: prompt.constraints },
        { title: 'Examples', content: prompt.examples },
        { title: 'Step-by-step instructions', content: prompt.instructions },
        { title: 'Output format', content: prompt.outputFormat },
    ];
    
    const finalPrompt = sections
        .filter(section => section.content && section.content.trim() !== '')
        .map(section => `### ${section.title}\n${section.content}`)
        .join('\n\n');

    navigator.clipboard.writeText(finalPrompt);
    toast({ title: 'Copied!', description: 'Prompt body copied to clipboard.' });
  }

  const sectionsForDisplay = [
    { label: 'Role/Context', value: prompt.role },
    { label: 'Task', value: prompt.task },
    { label: 'Constraints', value: prompt.constraints },
    { label: 'Output Format', value: prompt.outputFormat },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="truncate">{prompt.title}</CardTitle>
        <CardDescription>
          {prompt.description || 'No description'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        {sectionsForDisplay.map(sec => (
            sec.value && <div key={sec.label}>
                <h4 className='font-semibold text-xs uppercase text-muted-foreground'>{sec.label}</h4>
                <p className="text-sm line-clamp-2">{sec.value}</p>
            </div>
        ))}
      </CardContent>
      <CardFooter className="flex-col items-start gap-4">
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {prompt.tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}
        <div className="flex w-full justify-between items-center">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">View / Edit</Button>
                </DialogTrigger>
                <DialogContent className='max-w-4xl'>
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
        </div>
      </CardFooter>
    </Card>
  );
}
