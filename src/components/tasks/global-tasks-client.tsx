

'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, Lead, TaskTemplate, UserProfile, ProjectMember } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DataTable } from '@/components/ui/data-table';
import { getTaskColumns } from '@/components/projects/task-columns';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskForm } from '@/components/projects/task-form';
import { Card, CardContent } from '@/components/ui/card';
import { collection, onSnapshot, query, where, doc, writeBatch, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect } from 'react';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { isToday, isTomorrow, addDays } from 'date-fns';
import { Checkbox } from '../ui/checkbox';

interface GlobalTasksClientProps {
  projects: Project[];
  tasks: Task[];
  templates: TaskTemplate[];
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'day-after';


export function GlobalTasksClient({ projects, tasks, templates }: GlobalTasksClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showArchived, setShowArchived] = useState(false);

  const projectMembers: ProjectMember[] = useMemo(() => {
    const allMembers: ProjectMember[] = [];
    projects.forEach(p => allMembers.push(...p.members));
    const uniqueMembers = Array.from(new Set(allMembers.map(m => m.uid)))
      .map(uid => allMembers.find(m => m.uid === uid)!);
    return uniqueMembers;
  }, [projects]);

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

  const handleArchiveSelected = async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        batch.update(doc(db, 'tasks', id), { archived: true, updatedAt: serverTimestamp() });
    });
    try {
        await batch.commit();
        toast({ title: "Success", description: `${ids.length} task(s) archived.`});
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not archive selected tasks."})
    }
  }

  const handlePostponeSelected = async (ids: string[]) => {
    const batch = writeBatch(db);
    const nextDay = addDays(new Date(), 1);
    ids.forEach(id => {
        const taskRef = doc(db, 'tasks', id);
        batch.update(taskRef, { dueDate: nextDay, updatedAt: serverTimestamp() });
    });
    try {
        await batch.commit();
        toast({ title: "Success", description: `${ids.length} task(s) postponed to tomorrow.`});
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not postpone selected tasks."})
    }
  }

  const handleGenerateTodaysTasks = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not authenticated' });
        return;
    }
    setIsGenerating(true);
    
    const today = new Date().getDay(); // Sunday - 0, Monday - 1, etc.
    const todaysTemplates = templates.filter(t => t.daysOfWeek.includes(today));
    
    if (todaysTemplates.length === 0) {
        toast({ title: 'No tasks to generate', description: 'No templates are scheduled for today.' });
        setIsGenerating(false);
        return;
    }

    const batch = writeBatch(db);
    let tasksGeneratedCount = 0;

    todaysTemplates.forEach(template => {
        // Here you might add logic to check if a task from this template has already been created today
        const newTaskData = {
            projectId: template.projectId,
            title: template.title,
            description: template.description || '',
            slot: template.slot,
            completed: false,
            assigneeUid: template.assigneeUids[0] || user.uid, // Default to first assignee or current user
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const newTaskRef = doc(collection(db, 'tasks'));
        batch.set(newTaskRef, newTaskData);
        tasksGeneratedCount++;
    });

    try {
        await batch.commit();
        toast({ title: 'Success', description: `${tasksGeneratedCount} tasks have been generated for today.` });
    } catch (error) {
        console.error('Error generating tasks:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not generate tasks.' });
    } finally {
        setIsGenerating(false);
    }
  };

  const taskColumns = useMemo(() => getTaskColumns({ leads }, handleStar), [leads]);

  useEffect(() => {
    setLoading(true);
    const leadsQuery = query(collection(db, 'leads'));
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
        setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
        setLoading(false);
    });

    return () => unsubscribeLeads();
  }, []);

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => showArchived ? task.archived : !task.archived);
    
    if (dateFilter !== 'all') {
        filtered = filtered.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            if (dateFilter === 'today') return isToday(dueDate);
            if (dateFilter === 'tomorrow') return isTomorrow(dueDate);
            if (dateFilter === 'day-after') return isToday(addDays(new Date(), -2)); // Simplified logic
            return true;
        });
    }

    if (hideCompleted) {
        const taskMap = new Map(filtered.map(t => [t.id, t]));
        const hasIncompleteSubtasks = (taskId: string): boolean => {
            const subtasks = filtered.filter(t => t.parentTaskId === taskId);
            return subtasks.some(st => !st.completed || hasIncompleteSubtasks(st.id));
        };

        return filtered.filter(task => {
             if (task.parentTaskId) {
                let current = task;
                while (current.parentTaskId) {
                    const parent = taskMap.get(current.parentTaskId);
                    if (!parent) return true; // Orphaned, show it
                    if (parent.completed && !hasIncompleteSubtasks(parent.id)) return false;
                    current = parent;
                }
            }
            return !task.completed || hasIncompleteSubtasks(task.id);
        });
    }
    
    return filtered;
  }, [tasks, hideCompleted, dateFilter, showArchived]);

  const hierarchicalTasksByProject = useMemo(() => {
    const groupedByProject: { [key: string]: Task[] } = {};
    for (const project of projects) {
        groupedByProject[project.id] = [];
    }

    const taskMap = new Map(filteredTasks.map(t => [t.id, { ...t, subRows: [] as Task[] }]));

    for (const task of filteredTasks) {
        if (groupedByProject[task.projectId]) {
            const currentTask = taskMap.get(task.id);
            if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
                taskMap.get(task.parentTaskId)!.subRows.push(currentTask!);
            } else {
                groupedByProject[task.projectId].push(currentTask!);
            }
        }
    }
    return groupedByProject;
  }, [projects, filteredTasks]);

  const defaultAccordionValues = useMemo(() => projects.filter(p => (hierarchicalTasksByProject[p.id] || []).length > 0).map(p => p.id), [projects, hierarchicalTasksByProject]);

  if (loading) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-4">
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      );
  }

  return (
    <>
      <div className="flex justify-between items-center gap-4 mb-4">
        <div className='flex items-center gap-2'>
            <div className="flex items-center space-x-2">
                <Checkbox id="hide-completed-global" checked={hideCompleted} onCheckedChange={(checked) => setHideCompleted(checked as boolean)} />
                <label htmlFor="hide-completed-global" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Hide completed
                </label>
            </div>
            <div className="flex items-center gap-1 p-1 border rounded-lg">
                {(['today', 'tomorrow', 'day-after'] as DateFilter[]).map(df => (
                    <Button key={df} variant={dateFilter === df ? 'secondary' : 'ghost'} size="sm" onClick={() => setDateFilter(df)} className="capitalize h-7">
                        {df.replace('-', ' ')}
                    </Button>
                ))}
            </div>
             {(hideCompleted || dateFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => { setHideCompleted(false); setDateFilter('all'); }}>
                    Clear Filters
                </Button>
            )}
        </div>
        <div className='flex items-center gap-2'>
            <Button size="sm" variant="outline" onClick={() => setShowArchived(!showArchived)}>
                <History className="mr-2 h-4 w-4" />
                {showArchived ? 'View Active Tasks' : 'View History'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleGenerateTodaysTasks} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Today's Tasks
            </Button>
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
                members={projectMembers}
                closeForm={() => setIsTaskFormOpen(false)} 
                />
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className='pt-6'>
            <Accordion type="multiple" defaultValue={defaultAccordionValues} className="w-full">
            {projects.map(project => {
                const projectTasks = hierarchicalTasksByProject[project.id] || [];
                if (projectTasks.length === 0) return null;

                return (
                    <AccordionItem value={project.id} key={project.id} className="border-b-0">
                    <AccordionTrigger className='hover:no-underline px-4 py-2 bg-muted/50 rounded-t-lg'>
                        <div className='flex flex-col items-start'>
                            <h3 className="font-semibold text-lg">{project.name}</h3>
                            <p className='text-sm text-muted-foreground'>
                                {tasks.filter(t => t.projectId === project.id).length} task(s)
                            </p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                        <div className="border-x border-b rounded-b-lg p-4">
                            <DataTable 
                                columns={taskColumns} 
                                data={projectTasks}
                                getSubRows={(row: Row<Task>) => (row.original as any)?.subRows}
                                onDeleteSelected={handleDeleteSelected}
                                onPostponeSelected={handlePostponeSelected}
                                onArchiveSelected={handleArchiveSelected}
                            />
                        </div>
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
