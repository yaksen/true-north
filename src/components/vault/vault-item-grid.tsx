

'use client';

import type { VaultFolder, VaultItem } from '@/lib/types';
import { VaultItemCard } from './vault-item-card';
import { ScrollArea } from '../ui/scroll-area';

interface VaultItemGridProps {
  items: VaultItem[];
  folders: VaultFolder[];
}

export function VaultItemGrid({ items, folders }: VaultItemGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
        <div className="text-center">
          <p className="text-muted-foreground">No items in this folder or matching your search.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className='h-full'>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-1">
        {items.map(item => (
          <VaultItemCard key={item.id} item={item} folders={folders} />
        ))}
      </div>
    </ScrollArea>
  );
}
