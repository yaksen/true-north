
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/tasks/columns';
import { Button } from '@/components/ui/button';
import { PlusCircle, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TaskForm } from '@/components/tasks/task-form';
import { AiPlanner } from '@/components/tasks/ai-planner';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAiPlannerOpen, setIsAiPlannerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, `users/${user.uid}/tasks`));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData: Task[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tasksData.push({ 
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            dueDate: data.dueDate?.toDate(),
        } as Task);
      });
      setTasks(tasksData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveAiTasks = async (plannedTasks: Omit<Task, 'id' | 'userId' | 'createdAt'>[]) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not authenticated' });
        return;
    }
    
    try {
        for (const taskData of plannedTasks) {
            await addDoc(collection(db, `users/${user.uid}/tasks`), {
                ...taskData,
                userId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
        toast({ title: 'Success', description: 'AI-planned tasks have been saved.' });
        setIsAiPlannerOpen(false);
    } catch (error) {
        console.error("Error saving AI tasks: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save AI-planned tasks.' });
    }
  };


  const filteredTasks = tasks.filter(task => {
      const statusMatch = statusFilter === 'all' || task.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
      return statusMatch && priorityMatch;
  })

  const columns = getColumns({ tasks, setTasks });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Tasks</h1>
        <div className="flex items-center gap-2">
            <Dialog open={isAiPlannerOpen} onOpenChange={setIsAiPlannerOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                        <Wand2 className="h-4 w-4" />
                        Generate with AI
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Generate Daily Plan with AI</DialogTitle>
                        <DialogDescription>
                            Paste your raw task list below and let AI structure it for you.
                        </DialogDescription>
                    </DialogHeader>
                    <AiPlanner onSaveTasks={handleSaveAiTasks} />
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    New Task
                </Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>
                    Add the details of your new task below.
                    </DialogDescription>
                </DialogHeader>
                <TaskForm closeForm={() => setIsCreateDialogOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
      </div>
      <DataTable 
        columns={columns} 
        data={filteredTasks} 
        filterColumn="title" 
        filterColumnName="Title"
        toolbar={
            <div className='flex gap-2'>
                 <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as TaskPriority | 'all')}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        }
       />
    </>
  );
}
