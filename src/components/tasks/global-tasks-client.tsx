
'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, Lead, TaskTemplate, UserProfile, ProjectMember } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DataTable } from '@/components/ui/data-table';
import { getTaskColumns } from '@/components/projects/task-columns';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskForm } from '@/components/projects/task-form';
import { Card, CardContent } from '@/components/ui/card';
import { collection, onSnapshot, query, where, doc, writeBatch, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect } from 'react';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface GlobalTasksClientProps {
  projects: Project[];
  tasks: Task[];
  templates: TaskTemplate[];
}

export function GlobalTasksClient({ projects, tasks, templates }: GlobalTasksClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

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
            status: 'Project', // Or a default status from template
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
    });

    const allMemberIds = projects.reduce((acc, p) => [...acc, ...p.members.map(m => m.uid)], [] as string[]);
    const uniqueMemberIds = [...new Set(allMemberIds)];

    const fetchMemberProfiles = async () => {
        if (uniqueMemberIds.length > 0) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('id', 'in', uniqueMemberIds));
            const querySnapshot = await getDocs(q);
            setMemberProfiles(querySnapshot.docs.map(doc => doc.data() as UserProfile));
        }
        setLoading(false);
    };

    fetchMemberProfiles();

    return () => unsubscribeLeads();
  }, [projects]);

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
  const members: ProjectMember[] = useMemo(() => memberProfiles.map(p => ({ uid: p.id, displayName: p.name || '', email: p.email, photoURL: p.photoURL, role: 'viewer' })), [memberProfiles]);

  if (loading) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-4">
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      );
  }

  return (
    <>
      <div className="flex justify-end items-center gap-4 mb-4">
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
              members={members}
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
