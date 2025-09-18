

'use client';

import { useState } from 'react';
import type { VaultFolder, VaultItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { VaultItemForm } from './vault-item-form';
import { Edit, Trash2, Link as LinkIcon, FileText, Bot, Copy, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface VaultItemCardProps {
  item: VaultItem;
  folders: VaultFolder[];
}

const typeIcons = {
    note: FileText,
    link: LinkIcon,
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

  const handleCopy = () => {
    let contentToCopy = item.content || '';
    if (item.type === 'prompt') {
      const sections = [
        { title: 'Role/Context', content: item.role },
        { title: 'Task', content: item.task },
        { title: 'Constraints', content: item.constraints },
        { title: 'Examples', content: item.examples },
        { title: 'Step-by-step instructions', content: item.instructions },
        { title: 'Output format', content: item.outputFormat },
    ];
    
    contentToCopy = sections
        .filter(section => section.content && section.content.trim() !== '')
        .map(section => `### ${section.title}\n${section.content}`)
        .join('\n\n');
    }

    navigator.clipboard.writeText(contentToCopy);
    toast({ title: 'Copied!', description: 'Content copied to clipboard.' });
  }
  
  const updatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
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
            {updatedAt ? `Last updated ${formatDistanceToNow(updatedAt, { addSuffix: true })}` : 'Not recently updated'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        {item.type === 'prompt' ? (
          <>
            <p className="text-sm text-muted-foreground line-clamp-1"><b>Role:</b> {item.role}</p>
            <p className="text-sm text-muted-foreground line-clamp-1"><b>Task:</b> {item.task}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground line-clamp-3 break-all">
              {item.content}
          </p>
        )}
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
            <div className='flex items-center gap-1'>
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">View / Edit</Button>
                    </DialogTrigger>
                    <DialogContent className='max-w-4xl'>
                        <DialogHeader><DialogTitle>Edit Vault Item</DialogTitle></DialogHeader>
                        <VaultItemForm item={item} userId={user!.uid} folders={folders} closeForm={() => setIsEditOpen(false)} />
                    </DialogContent>
                </Dialog>
                {item.type === 'link' && (
                    <Button asChild size="icon" variant="ghost">
                        <Link href={item.content || '#'} target='_blank' rel='noopener noreferrer'>
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </div>
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
        </div>
      </CardFooter>
    </Card>
  );
}
