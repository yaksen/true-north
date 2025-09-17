
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { VaultFolder } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Folder, FolderPlus, Inbox } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { VaultFolderForm } from './vault-folder-form';
import { useAuth } from '@/hooks/use-auth';

interface VaultSidebarProps {
  folders: VaultFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function VaultSidebar({ folders, selectedFolderId, onSelectFolder }: VaultSidebarProps) {
  const { user } = useAuth();
  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Folders</CardTitle>
        <Dialog open={isFolderFormOpen} onOpenChange={setIsFolderFormOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <FolderPlus className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className='max-w-md'>
                <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
                <VaultFolderForm userId={user!.uid} closeForm={() => setIsFolderFormOpen(false)} />
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
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-muted-foreground transition-all hover:text-primary hover:bg-muted',
                selectedFolderId === folder.id && 'bg-muted text-primary font-medium'
              )}
            >
              <span className="text-lg">{folder.emoji || <Folder className="h-4 w-4" />}</span>
              {folder.name}
            </button>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
