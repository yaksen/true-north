
'use client';

import type { Project, Action, Transaction } from '@/lib/types';
import { useMemo } from 'react';
import { SummaryCard } from '../dashboard/summary-card';
import { DollarSign, ListChecks, Activity, PlusCircle, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { DataTable } from '../ui/data-table';
import { getColumns } from '../actions/columns';
import { LogActivityDialog } from '../actions/log-activity-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { TaskForm } from '../actions/task-form';
import { useState } from 'react';

interface ProjectDashboardProps {
  project: Project;
  tasks: Action[];
  transactions: Transaction[];
}

export function ProjectDashboard({ project, tasks, transactions }: ProjectDashboardProps) {
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const profitLoss = income - expenses;

    const projectTasks = tasks.filter(t => t.category === 'Tasks');
    const completedTasks = projectTasks.filter(t => t.status === 'Done' || t.status === 'Won').length;
    const totalTasks = projectTasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    const recentTasks = [...projectTasks].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)).slice(0, 5);

    return { profitLoss, completionRate, totalTasks, recentTasks };
  }, [tasks, transactions]);

  // Dummy columns for recent activity table
  const columns = getColumns({ setActions: () => {} });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
      {/* Main column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
            <SummaryCard title="Project Profit/Loss" value={summary.profitLoss} icon={DollarSign} prefix="LKR" />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.completionRate.toFixed(0)}%</div>
                    <Progress value={summary.completionRate} className="mt-2 h-2" />
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>The last 5 tasks created for this project.</CardDescription>
            </CardHeader>
            <CardContent>
                <DataTable columns={columns} data={summary.recentTasks} />
            </CardContent>
        </Card>
      </div>

      {/* Right sidebar */}
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2" /> Add Task</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Task</DialogTitle>
                            <DialogDescription>Fill out the details for the new task for this project.</DialogDescription>
                        </DialogHeader>
                        <TaskForm
                            leads={[]} // Leads aren't strictly needed here for project tasks
                            allTasks={tasks}
                            closeDialog={() => setIsTaskDialogOpen(false)}
                            projectId={project.id}
                        />
                    </DialogContent>
                </Dialog>
                <LogActivityDialog leads={[]} services={[]} packages={[]} allTasks={tasks} />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
