
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DiaryEntry } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/use-debounce';

interface DiaryEditorProps {
  entry: DiaryEntry;
}

export function DiaryEditor({ entry }: DiaryEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [isSaving, setIsSaving] = useState(false);
  
  const debouncedTitle = useDebounce(title, 1000);
  const debouncedContent = useDebounce(content, 1000);

  // Reset local state when a different entry is selected
  useEffect(() => {
    setTitle(entry.title);
    setContent(entry.content);
  }, [entry.id]);

  const handleSave = useCallback(async (newTitle: string, newContent: string) => {
    if (!user) return;
    
    // Don't save if it's a placeholder with no content
    if (!entry.userId && !newTitle && !newContent) {
        return;
    }

    setIsSaving(true);
    try {
        const entryRef = doc(db, 'diaryEntries', entry.id);
        const data = {
            userId: user.uid,
            date: entry.date,
            title: newTitle,
            content: newContent,
            updatedAt: serverTimestamp(),
        };

        if (entry.userId) { // Existing entry
            await updateDoc(entryRef, data);
        } else { // New entry
            await setDoc(entryRef, { ...data, createdAt: serverTimestamp() });
        }
        
    } catch (error) {
      console.error('Error saving diary entry:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save entry.' });
    } finally {
      setIsSaving(false);
    }
  }, [user, entry, toast]);

  useEffect(() => {
    // Check if initial content is different from debounced to avoid saving on load
    if (debouncedTitle !== entry.title || debouncedContent !== entry.content) {
        handleSave(debouncedTitle, debouncedContent);
    }
  }, [debouncedTitle, debouncedContent, entry.title, entry.content, handleSave]);


  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{format(new Date(entry.date), 'EEEE, MMMM do, yyyy')}</CardTitle>
        <CardDescription>
          {isSaving ? 'Saving...' : 'Your changes are saved automatically.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Title for today..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold border-0 shadow-none px-0 focus-visible:ring-0"
        />
        <Textarea
          placeholder="What's on your mind?..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border-0 shadow-none px-0 h-[calc(100vh-25rem)] resize-none focus-visible:ring-0"
        />
      </CardContent>
    </Card>
  );
}
