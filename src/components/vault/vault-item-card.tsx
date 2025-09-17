
'use client';

import { useState } from 'react';
import type { VaultFolder, VaultItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { VaultItemForm } from './vault-item-form';
import { Edit, Trash2, Link, FileText, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface VaultItemCardProps {
  item: VaultItem;
  folders: VaultFolder[];
}

const typeIcons = {
    note: FileText,
    link: Link,
    prompt: Bot,
};

export function VaultItemCard({ item, folders }: VaultItemCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'vaultItems', item.id));
      toast({ title: 'Success', description: 'Item deleted from vault.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete item.' });
    }
  };
  
  const updatedAt = item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt);
  const Icon = typeIcons[item.type];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="truncate flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                {item.title}
            </CardTitle>
            <Badge variant="outline" className='capitalize'>{item.type}</Badge>
        </div>
        <CardDescription>
            Last updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3 break-all">
            {item.content}
        </p>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4">
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map(tag => (
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
                    <DialogHeader><DialogTitle>Edit Vault Item</DialogTitle></DialogHeader>
                    <VaultItemForm item={item} userId={user!.uid} folders={folders} closeForm={() => setIsEditOpen(false)} />
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
                    This will permanently delete the item. This action cannot be undone.
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
