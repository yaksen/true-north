
'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, TaskStatus } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DataTable } from '@/components/ui/data-table';
import { taskColumns } from '@/components/projects/task-columns';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskForm } from '@/components/projects/task-form';
import { Card, CardContent } from '../ui/card';

interface GlobalTasksClientProps {
  projects: Project[];
  tasks: Task[];
}

export function GlobalTasksClient({ projects, tasks }: GlobalTasksClientProps) {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  const tasksByProject = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    for (const project of projects) {
      grouped[project.id] = [];
    }
    for (const task of tasks) {
      if (grouped[task.projectId]) {
        grouped[task.projectId].push(task);
      }
    }
    return grouped;
  }, [projects, tasks]);

  const defaultAccordionValues = useMemo(() => projects.map(p => p.id), [projects]);

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Global Task</DialogTitle>
            </DialogHeader>
            <TaskForm 
              projects={projects} 
              closeForm={() => setIsTaskFormOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className='pt-6'>
            <Accordion type="multiple" defaultValue={defaultAccordionValues} className="w-full">
            {projects.map(project => (
                <AccordionItem value={project.id} key={project.id}>
                <AccordionTrigger className='hover:no-underline'>
                    <div className='flex flex-col items-start'>
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        <p className='text-sm text-muted-foreground'>
                            {tasksByProject[project.id]?.length || 0} task(s)
                        </p>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <DataTable columns={taskColumns} data={tasksByProject[project.id] || []} />
                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
            {projects.length === 0 && (
                 <div className="text-center text-muted-foreground py-12">
                    <p>No projects found. Create a project to start adding tasks.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}
