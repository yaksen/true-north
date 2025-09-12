
'use client';

import { useState } from 'react';
import type { Note, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Loader2, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface ProjectNotesProps {
  projectId: string;
  notes: Note[];
  allUsers: UserProfile[];
}

export function ProjectNotes({ projectId, notes, allUsers }: ProjectNotesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNote = async () => {
    if (!user || !newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const noteData = {
        content: newNote,
        createdBy: user.uid,
        authorName: user.profile?.name || user.email,
        authorPhotoURL: user.profile?.photoURL,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, `users/${user.uid}/projects/${projectId}/notes`), noteData);
      setNewNote('');
      toast({ title: 'Note added' });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add note.' });
    } finally {
      setIsSubmitting(false);
    }
  };

   const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const nameParts = name.split(' ');
    if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
      {/* Notes Column */}
      <div className="md:col-span-2 space-y-4">
        <Card>
            <CardHeader>
                <CardTitle>Project Notes</CardTitle>
                <CardDescription>A log of all notes for this project.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Textarea
                        placeholder="Type your note here..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={4}
                    />
                    <Button onClick={handleAddNote} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Note
                    </Button>
                </div>
            </CardContent>
        </Card>

        {notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((note) => (
          <Card key={note.id}>
            <CardHeader className='pb-2'>
                <div className='flex items-center gap-2'>
                    <Avatar className='h-8 w-8'>
                        <AvatarImage src={note.authorPhotoURL} />
                        <AvatarFallback>{getInitials(note.authorName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className='font-semibold text-sm'>{note.authorName}</p>
                        <p className='text-xs text-muted-foreground'>
                            {formatDistanceToNow(note.createdAt, { addSuffix: true })}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attachments Column */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
            <CardDescription>Relevant files and links for this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Attachment
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">
                File attachments coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
