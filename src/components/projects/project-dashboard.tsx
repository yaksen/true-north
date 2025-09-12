
'use client';

import { Project, Task, Finance } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { Progress } from "../ui/progress";
import { DataTable } from "../ui/data-table";
import { taskColumns } from "./task-columns";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskForm } from "./task-form";
import { FinanceForm } from "./finance-form";

interface ProjectDashboardProps {
    project: Project;
    tasks: Task[];
    finances: Finance[];
}

export function ProjectDashboard({ project, tasks, finances }: ProjectDashboardProps) {
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [isFinanceFormOpen, setIsFinanceFormOpen] = useState(false);

    const totalIncome = finances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
    const totalExpenses = finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
    const profitLoss = totalIncome - totalExpenses;

    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: project.currency }).format(amount);
    }

    const recentTasks = tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    return (
        <div className="grid gap-6 mt-4">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Profit / Loss</CardTitle>
                        <CardDescription>Total income minus expenses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(profitLoss)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Task Completion</CardTitle>
                        <CardDescription>{completedTasks} of {tasks.length} tasks completed</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Progress value={taskCompletionRate} className="mb-2" />
                        <p className="text-2xl font-bold text-right">{taskCompletionRate.toFixed(0)}%</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Active Leads</CardTitle>
                        <CardDescription>Count of active leads</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">0</p>
                        <p className="text-xs text-muted-foreground">Lead tracking coming soon</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Streamline your workflow</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                         <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline"><PlusCircle className="mr-2"/> Add Task</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Task</DialogTitle>
                                </DialogHeader>
                                <TaskForm projectId={project.id} closeForm={() => setIsTaskFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                        <Dialog open={isFinanceFormOpen} onOpenChange={setIsFinanceFormOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline"><PlusCircle className="mr-2"/> Log Finance</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Log Financial Record</DialogTitle>
                                </DialogHeader>
                                <FinanceForm project={project} closeForm={() => setIsFinanceFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </div>
            
            <DataTable columns={taskColumns} data={recentTasks} />
        </div>
    )
}
