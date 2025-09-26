
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Task, Lead } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface TaskColumnsDependencies {
    leads: Lead[];
}

const handleCheckedChange = async (checked: boolean | 'indeterminate', taskId: string) => {
    try {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, { completed: checked });
    } catch (error) {
        console.error("Error updating task", error);
    }
};

export const getTaskColumns = (
    dependencies: TaskColumnsDependencies,
    onStar: (id: string, starred: boolean) => void
): ColumnDef<Task>[] => {
  const { leads } = dependencies;

  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const task = row.original;
        const isCompleted = task.completed;
        const canExpand = row.getCanExpand();
        return (
          <div className="flex items-center gap-2">
            <Checkbox 
                className='h-5 w-5'
                checked={isCompleted} 
                onCheckedChange={(checked) => handleCheckedChange(checked, task.id)}
                onClick={(e) => e.stopPropagation()}
            />
            <Button
                variant="ghost"
                onClick={() => row.toggleExpanded()}
                disabled={!canExpand}
                className='p-1 h-auto justify-start text-left'
            >
                <span className={cn(isCompleted && 'line-through text-muted-foreground')}>
                    {task.title}
                </span>
            </Button>
          </div>
        );
      },
    },
    {
        accessorKey: 'leadId',
        header: 'Lead',
        cell: ({ row }) => {
            const lead = leads.find(l => l.id === row.original.leadId);
            return lead ? <Badge variant="secondary">{lead.name}</Badge> : null;
        }
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => {
        const date = row.getValue('dueDate');
        return date ? format(new Date(date as string), 'PPP') : 'No due date';
      },
    },
    {
        id: 'star',
        cell: ({ row }) => {
          const task = row.original;
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onStar(task.id, !task.starred);
              }}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  task.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
                )}
              />
            </Button>
          );
        },
      },
  ];
};
