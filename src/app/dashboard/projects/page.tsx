
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project, Finance, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Briefcase, Users, Lock } from 'lucide-react';
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {projectSummaries.map(summary => (
                <Card key={summary.id}>
                    <CardHeader>
                        <div className='flex items-start justify-between'>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{summary.emoji || <Briefcase className="h-7 w-7 text-muted-foreground" />}</span>
                                <CardTitle className="leading-tight">{summary.name}</CardTitle>
                            </div>
                            {summary.private && <Badge variant="secondary" className="text-xs"><Lock className='h-3 w-3 mr-1' />Private</Badge>}
                        </div>
                        <CardDescription className='line-clamp-2 h-10 pt-1'>{summary.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Profit / Loss</p>
                            <p className={`font-semibold ${summary.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(summary.profitLoss, summary.currency)}
                            </p>
                        </div>
                         <div>
                            <p className='text-xs text-muted-foreground mb-1'>Task Completion</p>
                            <Progress value={summary.taskCompletionRate} />
                            <p className='text-xs text-muted-foreground text-right mt-1'>{summary.taskCompletionRate.toFixed(0)}%</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" size="sm" className='w-full'>
                            <Link href={`/dashboard/projects/${summary.id}`}>Open Project</Link>
                        </Button>
                    </CardFooter>
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
