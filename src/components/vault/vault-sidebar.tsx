
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { VaultFolder, VaultItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Folder, FolderPlus, Inbox, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { VaultFolderForm } from './vault-folder-form';
import { useAuth } from '@/hooks/use-auth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteDoc, doc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface VaultSidebarProps {
  folders: VaultFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function VaultSidebar({ folders, selectedFolderId, onSelectFolder }: VaultSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<VaultFolder | undefined>(undefined);

  const handleEditClick = (folder: VaultFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setIsFolderFormOpen(true);
  }

  const handleAddNew = () => {
    setEditingFolder(undefined);
    setIsFolderFormOpen(true);
  }

  const handleDelete = async (folder: VaultFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
        const batch = writeBatch(db);

        // 1. Delete the folder document
        const folderRef = doc(db, 'vaultFolders', folder.id);
        batch.delete(folderRef);

        // 2. Find and delete all items within that folder
        const itemsQuery = query(collection(db, 'vaultItems'), where('folderId', '==', folder.id), where('userId', '==', user.uid));
        const itemsSnapshot = await getDocs(itemsQuery);
        itemsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        toast({ title: 'Success', description: `Folder "${folder.name}" and its ${itemsSnapshot.size} item(s) have been deleted.` });
        if (selectedFolderId === folder.id) {
            onSelectFolder('all');
        }

    } catch (error) {
        console.error("Error deleting folder and its contents:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete folder.' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Folders</CardTitle>
        <Dialog open={isFolderFormOpen} onOpenChange={setIsFolderFormOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleAddNew}>
                    <FolderPlus className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className='max-w-md'>
                <DialogHeader><DialogTitle>{editingFolder ? 'Edit' : 'Create'} Folder</DialogTitle></DialogHeader>
                <VaultFolderForm 
                    userId={user!.uid} 
                    folder={editingFolder}
                    closeForm={() => setIsFolderFormOpen(false)} 
                />
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => onSelectFolder('all')}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-muted-foreground transition-all hover:text-primary hover:bg-muted',
              selectedFolderId === 'all' && 'bg-muted text-primary font-medium'
            )}
          >
            <Inbox className="h-4 w-4" />
            All Items
          </button>
          {folders.sort((a,b) => a.name.localeCompare(b.name)).map(folder => (
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className={cn(
                'group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-muted-foreground transition-all hover:text-primary hover:bg-muted cursor-pointer',
                selectedFolderId === folder.id && 'bg-muted text-primary font-medium'
              )}
            >
              <div className='flex items-center gap-3'>
                <span className="text-lg">{folder.emoji || <Folder className="h-4 w-4" />}</span>
                {folder.name}
              </div>
              <div className='opacity-0 group-hover:opacity-100 transition-opacity flex items-center'>
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleEditClick(folder, e)}>
                    <Edit className='h-4 w-4' />
                 </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className='h-4 w-4' />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the folder &quot;{folder.name}&quot; and ALL items inside it. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => handleDelete(folder, e)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
              </div>
            </div>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
