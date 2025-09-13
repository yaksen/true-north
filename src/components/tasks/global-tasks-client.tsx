
'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, Lead } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DataTable } from '@/components/ui/data-table';
import { getTaskColumns } from '@/components/projects/task-columns';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskForm } from '@/components/projects/task-form';
import { Card, CardContent } from '../ui/card';
import { collection, onSnapshot, query, where, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect } from 'react';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/hooks/use-toast';

interface GlobalTasksClientProps {
  projects: Project[];
  tasks: Task[];
}

export function GlobalTasksClient({ projects, tasks }: GlobalTasksClientProps) {
  const { toast } = useToast();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const handleStar = async (id: string, starred: boolean) => {
    try {
        await updateDoc(doc(db, 'tasks', id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const handleDeleteSelected = async (ids: string[]) => {
      const batch = writeBatch(db);
      ids.forEach(id => {
          batch.delete(doc(db, 'tasks', id));
      });
      try {
          await batch.commit();
          toast({ title: "Success", description: `${ids.length} task(s) deleted.`});
      } catch (error) {
          toast({ variant: 'destructive', title: "Error", description: "Could not delete selected tasks."})
      }
  }

  const taskColumns = useMemo(() => getTaskColumns({ leads }, handleStar), [leads]);

  useEffect(() => {
    setLoadingLeads(true);
    const leadsQuery = query(collection(db, 'leads'));
    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
        setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
        setLoadingLeads(false);
    });
    return () => unsubscribe();
  }, []);

  const hierarchicalTasksByProject = useMemo(() => {
    const groupedByProject: { [key: string]: Task[] } = {};
    for (const project of projects) {
        groupedByProject[project.id] = [];
    }

    const taskMap = new Map(tasks.map(t => [t.id, { ...t, subRows: [] as Task[] }]));

    for (const task of tasks) {
        if (groupedByProject[task.projectId]) {
            if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
                const parent = taskMap.get(task.parentTaskId);
                if(parent) {
                    parent.subRows.push(taskMap.get(task.id)!);
                }
            } else {
                groupedByProject[task.projectId].push(taskMap.get(task.id)!);
            }
        }
    }
    return groupedByProject;
  }, [projects, tasks]);

  const defaultAccordionValues = useMemo(() => projects.filter(p => (hierarchicalTasksByProject[p.id] || []).length > 0).map(p => p.id), [projects, hierarchicalTasksByProject]);

  if (loadingLeads) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-4">
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      );
  }

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
              leads={leads}
              closeForm={() => setIsTaskFormOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className='pt-6'>
            <Accordion type="multiple" defaultValue={defaultAccordionValues} className="w-full">
            {projects.map(project => {
                const projectTasks = hierarchicalTasksByProject[project.id] || [];
                if (projectTasks.length === 0) return null;

                return (
                    <AccordionItem value={project.id} key={project.id}>
                    <AccordionTrigger className='hover:no-underline px-4'>
                        <div className='flex flex-col items-start'>
                            <h3 className="font-semibold text-lg">{project.name}</h3>
                            <p className='text-sm text-muted-foreground'>
                                {tasks.filter(t => t.projectId === project.id).length} task(s)
                            </p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <DataTable 
                            columns={taskColumns} 
                            data={projectTasks}
                            getSubRows={(row: Row<Task>) => (row.original as any).subRows}
                            onDeleteSelected={handleDeleteSelected}
                        />
                    </AccordionContent>
                    </AccordionItem>
                )
            })}
            </Accordion>
            {tasks.length === 0 && (
                 <div className="text-center text-muted-foreground py-12">
                    <p>No tasks found. Create a task to get started.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}
