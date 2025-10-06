

'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Task, Lead, Channel, Project } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Star, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { TaskForm } from './task-form';
import { useState } from 'react';

interface TaskColumnsDependencies {
    leads: Lead[];
    channels: Channel[];
    projects?: Project[];
}

const handleCheckedChange = async (checked: boolean | 'indeterminate', taskId: string) => {
    try {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, { completed: checked });
    } catch (error) {
        console.error("Error updating task", error);
    }
};

const EditTaskCell = ({ row, leads, channels, projects }: { row: any, leads: Lead[], channels: Channel[], projects?: Project[] }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const task = row.original;
  
  // This logic should be adapted based on where this is used.
  // For global view, project members might not be easily available.
  const project = projects?.find(p => p.id === task.projectId);
  const members = project?.members || [];

  return (
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
        </DialogTrigger>
        <DialogContent className='max-w-4xl'>
            <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
            <TaskForm 
              task={task}
              projectId={task.projectId} 
              leads={leads}
              channels={channels}
              members={members}
              projects={projects}
              closeForm={() => setIsEditOpen(false)} 
            />
        </DialogContent>
    </Dialog>
  );
}

export const getTaskColumns = (
    dependencies: TaskColumnsDependencies,
    onStar: (id: string, starred: boolean) => void
): ColumnDef<Task>[] => {
  const { leads, channels, projects } = dependencies;

  const columns: ColumnDef<Task>[] = [
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
          <div className="flex items-center gap-2 font-medium">
            <Checkbox 
                className='h-5 w-5'
                checked={isCompleted} 
                onCheckedChange={(checked) => handleCheckedChange(checked, task.id)}
                onClick={(e) => e.stopPropagation()}
            />
            <span className={cn(isCompleted && 'line-through text-muted-foreground')}>
                {task.title}
            </span>
          </div>
        );
      },
    },
  ];

  if (projects) {
    columns.push({
      accessorKey: 'projectId',
      header: 'Project',
      cell: ({ row }) => {
        const project = projects.find(p => p.id === row.original.projectId);
        return project ? <Badge variant="secondary">{project.name}</Badge> : null;
      }
    })
  }

  columns.push(
    {
        accessorKey: 'leadId',
        header: 'Lead',
        cell: ({ row }) => {
            const lead = leads.find(l => l.id === row.original.leadId);
            return lead ? <Badge>{lead.name}</Badge> : null;
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
        id: 'actions',
        cell: ({ row }) => {
          const task = row.original;
          return (
            <div className='flex items-center'>
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
                <EditTaskCell row={row} leads={leads} channels={channels} projects={projects} />
            </div>
          );
        },
      },
  );
  
  return columns;
};
