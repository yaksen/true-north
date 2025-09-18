'use client';

import { ActivityRecord, Note } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Briefcase,
  CircleDollarSign,
  Contact,
  FileText,
  ListChecks,
  MessageSquare,
  Package,
  FileUp,
  Tag,
  ReceiptText,
  UserPlus,
  UserX,
  Trash2,
  Hash
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type FeedItem = (Omit<ActivityRecord, 'createdAt' | 'updatedAt'> & { feedType: 'record', timestamp: Date }) | (Omit<Note, 'createdAt' | 'updatedAt'> & { feedType: 'note'; timestamp: Date });

interface RecordsTimelineProps {
  items: FeedItem[];
}

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length > 1 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name[0]?.toUpperCase() ?? 'U';
};

const recordDetails: Record<
  ActivityRecord['type'],
  { icon: React.ElementType; message: (payload: any) => string }
> = {
  project_created: { icon: Briefcase, message: (p) => `Project "${p.name}" was created.` },
  project_updated: { icon: Briefcase, message: (p) => `Project "${p.name}" was updated.` },
  project_deleted: { icon: Trash2, message: (p) => `Project "${p.name}" was deleted.` },
  task_created: { icon: ListChecks, message: (p) => `Task "${p.title}" was created.` },
  task_updated: { icon: ListChecks, message: (p) => `Task "${p.title}" was updated.` },
  task_deleted: { icon: ListChecks, message: (p) => `Task "${p.title}" was deleted.` },
  finance_created: { icon: CircleDollarSign, message: (p) => `A financial record for "${p.description}" was created.` },
  finance_updated: { icon: CircleDollarSign, message: (p) => `A financial record for "${p.description}" was updated.` },
  finance_deleted: { icon: CircleDollarSign, message: (p) => `A financial record for "${p.description}" was deleted.` },
  lead_created: { icon: Contact, message: (p) => `Lead "${p.name}" was created.` },
  lead_updated: { icon: Contact, message: (p) => `Lead "${p.name}" was updated.` },
  lead_deleted: { icon: Contact, message: (p) => `Lead "${p.name}" was deleted.` },
  channel_created: { icon: Hash, message: (p) => `Channel "${p.name}" was created.` },
  channel_updated: { icon: Hash, message: (p) => `Channel "${p.name}" was updated.` },
  channel_deleted: { icon: Hash, message: (p) => `Channel "${p.name}" was deleted.` },
  category_created: { icon: Tag, message: (p) => `Category "${p.name}" was created.` },
  category_updated: { icon: Tag, message: (p) => `Category "${p.name}" was updated.` },
  category_deleted: { icon: Tag, message: (p) => `Category "${p.name}" was deleted.` },
  service_created: { icon: FileText, message: (p) => `Service "${p.name}" was created.` },
  service_updated: { icon: FileText, message: (p) => `Service "${p.name}" was updated.` },
  service_deleted: { icon: FileText, message: (p) => `Service "${p.name}" was deleted.` },
  product_created: { icon: Package, message: (p) => `Product "${p.name}" was created.` },
  product_updated: { icon: Package, message: (p) => `Product "${p.name}" was updated.` },
  product_deleted: { icon: Package, message: (p) => `Product "${p.name}" was deleted.` },
  package_created: { icon: Package, message: (p) => `Package "${p.name}" was created.` },
  package_updated: { icon: Package, message: (p) => `Package "${p.name}" was updated.` },
  package_deleted: { icon: Package, message: (p) => `Package "${p.name}" was deleted.` },
  note_added: { icon: MessageSquare, message: (p) => `Added a new note.` },
  report_uploaded: { icon: FileUp, message: (p) => `File "${p.name}" was uploaded.` },
  report_deleted: { icon: FileUp, message: (p) => `File "${p.name}" was deleted.` },
  invoice_created: { icon: ReceiptText, message: (p) => `Invoice "${p.invoiceNumber}" was created.` },
  invoice_updated: { icon: ReceiptText, message: (p) => `Invoice "${p.invoiceNumber}" was updated to status: ${p.status}.` },
  invoice_deleted: { icon: ReceiptText, message: (p) => `Invoice "${p.invoiceNumber}" was deleted.` },
  member_invited: { icon: UserPlus, message: (p) => `Invited ${p.email} to the project.` },
  member_added: { icon: UserPlus, message: (p) => `Added ${p.email} to the project.` },
  member_removed: { icon: UserX, message: (p) => `Removed ${p.email} from the project.` },
  payment_added: { icon: CircleDollarSign, message: (p) => `Payment of ${p.amount} was added.` },
};

export function RecordsTimeline({ items }: RecordsTimelineProps) {
  const filteredItems = items.filter(item => {
    const timestamp = item.timestamp ? new Date(item.timestamp) : null;
    const isValidDate = timestamp && !isNaN(timestamp.getTime());
    if (!isValidDate) return false;

    if (item.feedType === 'record') {
      return item.type !== 'report_uploaded' && item.type !== 'report_deleted';
    }
    return true;
  });

  return (
    <ScrollArea className="h-[calc(100vh-22rem)]">
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 h-full w-px bg-border" />

        {filteredItems.map((item, index) => {
          const isNote = item.feedType === 'note';
          const Icon = isNote ? MessageSquare : recordDetails[item.type as keyof typeof recordDetails]?.icon || FileText;
          const userIdentifier = isNote ? item.authorUid : item.actorUid;
          const timestamp = new Date(item.timestamp);
          
          return (
            <div key={item.id} className="relative mb-6 flex gap-4">
              <div className="absolute left-0 top-1.5 z-10 -translate-x-1/2">
                <Avatar className="h-7 w-7 border-2 border-background bg-secondary text-secondary-foreground">
                  <AvatarFallback>
                    <Icon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {userIdentifier.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(timestamp, { addSuffix: true })}
                  </p>
                </div>
                {isNote ? (
                  <div className="rounded-md border bg-muted/50 p-3 text-sm">
                    <p className="whitespace-pre-wrap">{item.content}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {(recordDetails[item.type as keyof typeof recordDetails]?.message(item.payload) || 'An unknown action occurred.')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
