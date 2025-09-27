'use client';

import { useState } from 'react';
import { Task, Lead } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  leads: Lead[];
  onTaskCompletion: (taskId: string, completed: boolean) => void;
  onBulkDelete: (taskIds: string[]) => void;
  getProjectName: (projectId: string) => string;
  getLeadName: (leadId: string) => string;
}

export function TaskList({ tasks, onTaskCompletion, onBulkDelete, getProjectName, getLeadName }: TaskListProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(tasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Task List</h2>
        {selectedTasks.length > 0 && (
          <Button variant="destructive" onClick={() => onBulkDelete(selectedTasks)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox 
                onCheckedChange={handleSelectAll}
                checked={selectedTasks.length === tasks.length && tasks.length > 0}
              />
            </TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell>
                <Checkbox 
                  onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
                  checked={selectedTasks.includes(task.id)}
                />
              </TableCell>
              <TableCell>{task.title}</TableCell>
              <TableCell>{getProjectName(task.projectId)}</TableCell>
              <TableCell>{task.leadId ? getLeadName(task.leadId) : 'N/A'}</TableCell>
              <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
              <TableCell>
                <Button 
                  variant={task.completed ? 'secondary' : 'default'}
                  onClick={() => onTaskCompletion(task.id, !task.completed)}
                >
                  {task.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
