
'use client';

import { Task, Lead } from "@/lib/types";

interface TaskListProps {
  tasks: Task[];
  leads: Lead[];
  onTaskCompletion: (taskId: string, completed: boolean) => Promise<void>;
  onBulkDelete: (taskIds: string[]) => Promise<void>;
  getProjectName: (projectId: string) => string;
  getLeadName: (leadId: string) => string;
}

export function TaskList({ 
  tasks, 
  leads,
  onTaskCompletion,
  onBulkDelete,
  getProjectName,
  getLeadName 
}: TaskListProps) {
  return (
    <div>
      <h2 className="text-lg font-bold">Task List</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            {task.title} - {getProjectName(task.projectId)} - {task.leadId && getLeadName(task.leadId)}
          </li>
        ))}
      </ul>
    </div>
  );
}
