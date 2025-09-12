
'use client';

import { useState } from 'react';
import type { Action, Lead } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/actions/columns';
import { TaskForm } from '@/components/actions/task-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';

interface ProjectTasksProps {
  tasks: Action[];
  allLeads: Lead[];
  projectId: string;
}

export function ProjectTasks({ tasks, allLeads, projectId }: ProjectTasksProps) {
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  // We are re-using the global action columns, but they need the setter which we don't have here.
  // In a real scenario, you might refactor columns to not require the setter directly.
  const columns = getColumns({ setActions: () => {} });

  return (
    <>
      <div className="flex items-center justify-end mb-4">
         <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Task
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                    <DialogDescription>Fill out the details for the new task for this project.</DialogDescription>
                </DialogHeader>
                <TaskForm
                    leads={allLeads}
                    allTasks={tasks}
                    closeDialog={() => setIsTaskDialogOpen(false)}
                    // Pre-fill project ID if we enhance the form
                />
            </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={tasks} />
    </>
  );
}
