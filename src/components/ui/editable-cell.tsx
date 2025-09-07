
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  initialValue: any;
  onSave: (value: any) => Promise<{ collection: string, docId: string, field: string, value: any }>;
  type?: 'text' | 'number';
  className?: string;
}

export function EditableCell({ initialValue, onSave, type = 'text', className }: EditableCellProps) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      setIsEditing(false);
      setValue(initialValue); // Revert
      return;
    }
    
    if (value === initialValue) {
        setIsEditing(false);
        return;
    }

    try {
      const { collection, docId, field, value: updatedValue } = await onSave(value);
      const docRef = doc(db, `users/${user.uid}/${collection}`, docId);
      await updateDoc(docRef, { [field]: updatedValue });
      toast({ title: 'Success', description: `${field} updated.` });
    } catch (error) {
      console.error('Failed to update document:', error);
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save changes.' });
      setValue(initialValue); // Revert on failure
    } finally {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className={cn("h-8", className)}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn("min-h-[32px] cursor-pointer rounded-md px-3 py-2 hover:bg-muted/50", className)}
    >
      {type === 'number' && (value === undefined || value === null) ? '0' : String(value)}
    </div>
  );
}
