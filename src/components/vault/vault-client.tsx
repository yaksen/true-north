
'use client';

import { useState } from 'react';
import type { VaultFolder, VaultItem } from '@/lib/types';
import { VaultSidebar } from './vault-sidebar';
import { VaultItemGrid } from './vault-item-grid';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { VaultItemForm } from './vault-item-form';
import { useAuth } from '@/hooks/use-auth';

interface VaultClientProps {
  folders: VaultFolder[];
  items: VaultItem[];
}

export function VaultClient({ folders, items }: VaultClientProps) {
  const { user } = useAuth();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);

  const filteredItems = items.filter(item => {
    const folderMatch = selectedFolderId === 'all' || item.folderId === selectedFolderId;
    const searchMatch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return folderMatch && searchMatch;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 mt-4">
      <VaultSidebar 
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <Input
                placeholder="Search vault..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
             <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> New Item</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create New Vault Item</DialogTitle></DialogHeader>
                    <VaultItemForm 
                        userId={user!.uid} 
                        folders={folders} 
                        closeForm={() => setIsItemFormOpen(false)} 
                    />
                </DialogContent>
            </Dialog>
        </div>
        <VaultItemGrid items={filteredItems} folders={folders} />
      </div>
    </div>
  );
}
