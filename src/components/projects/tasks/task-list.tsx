
'use client';

import { useMemo, useState } from 'react';
import { Lead, Task } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getTaskColumns } from '../task-columns';

interface TaskListProps {
  tasks: Task[];
  leads: Lead[];
  onTaskCompletion: (taskId: string, completed: boolean) => void;
  onBulkDelete: (taskIds: string[]) => Promise<void>;
  getProjectName: (projectId: string) => string;
  getLeadName: (leadId: string) => string;
}

export function TaskList({ tasks, leads, onTaskCompletion, onBulkDelete, getProjectName, getLeadName }: TaskListProps) {
  const columns = useMemo(() => getTaskColumns({ leads }, () => {}), [leads]);

  return (
    <DataTable
      columns={columns}
      data={tasks}
      onDeleteSelected={onBulkDelete}
    />
  );
}
