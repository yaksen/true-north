'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Task, Project, Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { TaskList } from './task-list';
import { TaskCalendar } from './task-calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskForm } from '@/components/projects/task-form';
import { Card, CardContent } from '@/components/ui/card';
import { collection, onSnapshot, query, where, doc, writeBatch, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect } from 'react';

interface GlobalTasksClientProps {
  tasks: Task[];
  projects: Project[];
  leads: Lead[];
}

export function GlobalTasksClient({ tasks: initialTasks, projects, leads }: GlobalTasksClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tasks'),
      where('assigneeUid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTasks: Task[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Task));
      setTasks(newTasks);
    });

    return () => unsubscribe();
  }, [user]);


  const handleTaskCompletion = async (taskId: string, completed: boolean) => {
    if (!user) return;
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { completed });
      
      const task = tasks.find(t => t.id === taskId);
      if (task && task.parentTaskId) {
          const parentTaskRef = doc(db, 'tasks', task.parentTaskId);
          const childTasksQuery = query(collection(db, 'tasks'), where('parentTaskId', '==', task.parentTaskId));
          
          onSnapshot(childTasksQuery, async (snapshot) => {
              const allChildTasks = snapshot.docs.map(doc => doc.data() as Task);
              const allChildrenCompleted = allChildTasks.every(t => t.completed);
              await updateDoc(parentTaskRef, { completed: allChildrenCompleted });
          });
      }

      toast({ title: 'Success', description: `Task marked as ${completed ? 'complete' : 'incomplete'}.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update task completion.' });
    }
  };

  const handleBulkDelete = async (taskIds: string[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      taskIds.forEach(id => {
        batch.delete(doc(db, 'tasks', id));
      });
      await batch.commit();
      toast({ title: 'Success', description: 'Selected tasks deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete tasks.' });
    }
  };

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'N/A';
  };

  const getLeadName = (leadId: string) => {
    return leads.find(l => l.id === leadId)?.name || 'N/A';
  }

  return (
    <Card>
      <CardContent className="p-4">
        <Tabs defaultValue="list">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="list">Task List</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> New Task</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Create a New Task</DialogTitle></DialogHeader>
                <TaskForm 
                  projects={projects}
                  leads={leads}
                  members={[]}
                  closeForm={() => setIsFormOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          <TabsContent value="list">
            <TaskList 
              tasks={tasks}
              leads={leads}
              onTaskCompletion={handleTaskCompletion}
              onBulkDelete={handleBulkDelete}
              getProjectName={getProjectName}
              getLeadName={getLeadName}
            />
          </TabsContent>
          <TabsContent value="calendar">
            <TaskCalendar 
              tasks={tasks}
              getProjectName={getProjectName}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
