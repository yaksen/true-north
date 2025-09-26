
'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, Lead, TaskTemplate, UserProfile, ProjectMember, Channel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, History, Archive } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskForm } from '@/components/projects/task-form';
import { Card, CardContent } from '@/components/ui/card';
import { collection, onSnapshot, query, where, doc, writeBatch, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { isToday, isTomorrow, addDays } from 'date-fns';
import { TasksToolbar } from '../projects/tasks-toolbar';
import { TaskCard } from '../projects/task-card';
import { ScrollArea } from '../ui/scroll-area';

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
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [filters, setFilters] = useState({
    slot: 'all',
    assignee: 'all',
    search: '',
    hideCompleted: false
  });

  const projectMembers: ProjectMember[] = useMemo(() => {
    const allMembers: ProjectMember[] = [];
    projects.forEach(p => allMembers.push(...p.members));
    const uniqueMembers = Array.from(new Set(allMembers.map(m => m.uid)))
      .map(uid => allMembers.find(m => m.uid === uid)!);
    return uniqueMembers;
  }, [projects]);
  
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      const uids = projectMembers.map(m => m.uid);
      if (uids.length === 0) return;
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', 'in', uids));
      const snapshot = await getDocs(q);
      setMemberProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
    };
    fetchMembers();
  }, [projectMembers]);


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
            title: template.name,
            description: template.description || '',
            slot: 'morning',
            completed: false,
            assigneeUid: user.uid, // Default to current user
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

  const handleArchiveAllCompleted = async () => {
    const completedTaskIds = tasks.filter(t => t.completed && !t.archived).map(t => t.id);
    if (completedTaskIds.length === 0) {
        toast({ description: "No completed tasks to archive." });
        return;
    }
    
    setIsArchiving(true);
    const batch = writeBatch(db);
    completedTaskIds.forEach(id => {
        batch.update(doc(db, 'tasks', id), { archived: true, updatedAt: serverTimestamp() });
    });

    try {
        await batch.commit();
        toast({ title: "Success", description: `${completedTaskIds.length} completed task(s) archived.`});
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not archive completed tasks."})
    } finally {
        setIsArchiving(false);
    }
  }


  useEffect(() => {
    setLoading(true);
    const leadsQuery = query(collection(db, 'leads'));
    const channelsQuery = query(collection(db, 'channels'));
    
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
        setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
    });

    const unsubscribeChannels = onSnapshot(channelsQuery, (snapshot) => {
        setChannels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel)));
    });

    setLoading(false);

    return () => {
        unsubscribeLeads();
        unsubscribeChannels();
    }
  }, []);

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => showArchived ? task.archived : !task.archived);
    
    if (filters.slot !== 'all') {
        filtered = filtered.filter(task => task.slot === filters.slot);
    }
    
    if (filters.assignee !== 'all') {
        filtered = filtered.filter(task => task.assigneeUid === filters.assignee);
    }

    if (filters.search) {
      filtered = filtered.filter(task => task.title.toLowerCase().includes(filters.search.toLowerCase()));
    }
    
    if (filters.hideCompleted) {
        filtered = filtered.filter(task => !task.completed);
    }
    
    return filtered;
  }, [tasks, filters, showArchived]);


  if (loading) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-4">
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      );
  }

  return (
    <>
      <div className="flex flex-col gap-4 mb-4">
        <TasksToolbar assignees={memberProfiles} onFilterChange={setFilters} />
        <div className='flex items-center gap-2 self-end'>
            <Button size="sm" variant="outline" onClick={() => setShowArchived(!showArchived)}>
                <History className="mr-2 h-4 w-4" />
                {showArchived ? 'View Active Tasks' : 'View History'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleGenerateTodaysTasks} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Today's Tasks
            </Button>
             <Button size="sm" variant="outline" onClick={handleArchiveAllCompleted} disabled={isArchiving}>
                {isArchiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                Archive All Completed
            </Button>
            <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> New Task
                </Button>
            </DialogTrigger>
            <DialogContent className='max-w-4xl'>
                <DialogHeader>
                <DialogTitle>Create New Global Task</DialogTitle>
                </DialogHeader>
                <TaskForm 
                projects={projects} 
                leads={leads}
                channels={channels}
                members={projectMembers}
                closeForm={() => setIsTaskFormOpen(false)} 
                />
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className='pt-6'>
            <ScrollArea className="h-[calc(100vh-30rem)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                    {filteredTasks.map(task => (
                        <TaskCard 
                            key={task.id}
                            task={task}
                            leads={leads}
                            channels={channels}
                        />
                    ))}
                </div>
            </ScrollArea>
            {filteredTasks.length === 0 && (
                 <div className="text-center text-muted-foreground py-12">
                    <p>No tasks found for the selected filters.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}
