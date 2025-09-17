
'use client';

import { useState } from 'react';
import type { Note } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { NoteForm } from './note-form';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'notes', note.id));
      toast({ title: 'Success', description: 'Note deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete note.' });
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="truncate">{note.title}</CardTitle>
        <CardDescription>
          Last updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-4">{note.content}</p>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4">
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}
        <div className="flex w-full justify-between items-center">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">View / Edit</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Note</DialogTitle></DialogHeader>
                    <NoteForm note={note} projectId={note.projectId} closeForm={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
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
                    This will permanently delete the note. This action cannot be undone.
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
