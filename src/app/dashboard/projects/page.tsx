
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project, Finance, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Briefcase, Users, Lock, MoreVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProjectForm } from '@/components/projects/project-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Query for projects where the current user is a member
    const projectsQuery = query(
        collection(db, 'projects'), where('members', 'array-contains', user.uid)
    );
    
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ 
            id: doc.id,
            ...doc.data(),
        } as Project)));
    });

    const financesQuery = query(collection(db, 'finances'));
    const unsubscribeFinances = onSnapshot(financesQuery, snapshot => {
        setFinances(snapshot.docs.map(doc => doc.data() as Finance));
    });
    
    const tasksQuery = query(collection(db, 'tasks'));
    const unsubscribeTasks = onSnapshot(tasksQuery, snapshot => {
        setTasks(snapshot.docs.map(doc => doc.data() as Task));
    });

    // Use Promise.all to wait for initial data load
    const initialLoad = async () => {
        await Promise.all([
            new Promise(resolve => onSnapshot(projectsQuery, () => resolve(true), () => resolve(true))),
            new Promise(resolve => onSnapshot(financesQuery, () => resolve(true), () => resolve(true))),
            new Promise(resolve => onSnapshot(tasksQuery, () => resolve(true), () => resolve(true))),
        ]);
        setLoading(false);
    };

    initialLoad();

    return () => {
        unsubscribeProjects();
        unsubscribeFinances();
        unsubscribeTasks();
    };
  }, [user]);

  const projectSummaries = useMemo(() => {
    return projects.map(project => {
        const projectFinances = finances.filter(f => f.projectId === project.id);
        const projectTasks = tasks.filter(t => t.projectId === project.id);

        const income = projectFinances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
        const expense = projectFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
        const profitLoss = income - expense;
        
        const completedTasks = projectTasks.filter(t => t.status === 'Done').length;
        const taskCompletionRate = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
        
        return {
            ...project,
            profitLoss,
            taskCompletionRate,
            totalTasks: projectTasks.length,
            completedTasks,
        }
    });
  }, [projects, finances, tasks]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact' }).format(amount);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Projects</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Fill out the details for your new project.
              </DialogDescription>
            </DialogHeader>
            <ProjectForm 
              allProjects={projects} 
              closeForm={() => setIsCreateDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
         <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-4 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 mt-4">
            {projectSummaries.map(summary => (
                <Card key={summary.id}>
                    <div className='flex items-center p-4'>
                        <div className="flex items-center gap-4 flex-1">
                            <span className="text-2xl">{summary.emoji || <Briefcase className="h-7 w-7 text-muted-foreground" />}</span>
                            <div className='flex-1'>
                                <div className='flex items-center gap-2'>
                                    <p className="font-semibold">{summary.name}</p>
                                    {summary.private && <Badge variant="secondary" className="text-xs"><Lock className='h-3 w-3 mr-1' />Private</Badge>}
                                </div>
                                <p className='text-sm text-muted-foreground line-clamp-1'>{summary.description}</p>
                            </div>
                        </div>

                        <div className='hidden md:flex items-center gap-8 mx-8'>
                             <div>
                                <p className="text-xs text-muted-foreground">Profit / Loss</p>
                                <p className={`font-semibold ${summary.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(summary.profitLoss, summary.currency)}
                                </p>
                            </div>
                            <div className='w-40'>
                                <div className='flex justify-between items-center mb-1'>
                                    <p className='text-xs text-muted-foreground'>Task Completion</p>
                                    <p className='text-xs font-medium'>{summary.completedTasks}/{summary.totalTasks}</p>
                                </div>
                                <Progress value={summary.taskCompletionRate} />
                            </div>
                        </div>

                        <div className='flex items-center gap-2'>
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/dashboard/projects/${summary.id}`}>Open</Link>
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
            {projectSummaries.length === 0 && !loading && (
                <div className="col-span-full text-center text-muted-foreground py-12 border border-dashed rounded-xl">
                    <Briefcase className="mx-auto h-12 w-12" />
                    <p className="mt-4">No projects found. Create your first project to get started.</p>
                </div>
            )}
        </div>
      )}
    </>
  );
}
