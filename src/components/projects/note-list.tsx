
'use client';

import { Note } from '@/lib/types';
import { NoteCard } from './note-card';

interface NoteListProps {
  notes: Note[];
}

export function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12 border border-dashed rounded-xl">
        <p>No notes found. Create your first note to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map(note => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
