
'use client';

import { Project, Task, Finance, Lead } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { Progress } from "../ui/progress";
import { DataTable } from "../ui/data-table";
import { getTaskColumns } from "../projects/task-columns";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskForm } from "../projects/task-form";
import { FinanceForm } from "../projects/finance-form";
import { Row } from "@tanstack/react-table";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ProjectDashboardProps {
    project: Project;
    tasks: Task[];
    finances: Finance[];
}

export function ProjectDashboard({ project, tasks, finances }: ProjectDashboardProps) {
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [isFinanceFormOpen, setIsFinanceFormOpen] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'leads'), where('projectId', '==', project.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
        });
        return () => unsubscribe();
    }, [project.id]);

    const handleStar = async (id: string, starred: boolean) => {
        try {
            const taskRef = doc(db, 'tasks', id);
            await updateDoc(taskRef, { starred });
        } catch (error) {
            console.error("Failed to update star status", error);
            // Optionally, show a toast notification
        }
    };

    const taskColumns = useMemo(() => getTaskColumns({ leads }, handleStar), [leads]);

    const totalIncome = finances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
    const totalExpenses = finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
    const profitLoss = totalIncome - totalExpenses;

    const completedTasks = tasks.filter(t => t.completed).length;
    const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: project.currency }).format(amount);
    }

    const hierarchicalTasks = useMemo(() => {
        const taskMap = new Map(tasks.map(t => [t.id, { ...t, subRows: [] as Task[] }]));
        const rootTasks: Task[] = [];
        
        for (const task of tasks) {
            if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
                taskMap.get(task.parentTaskId)!.subRows.push(taskMap.get(task.id)!);
            } else {
                rootTasks.push(taskMap.get(task.id)!);
            }
        }
        return rootTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    }, [tasks]);


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
                        <p className="text-2xl font-bold">{leads.length}</p>
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
                                <TaskForm projectId={project.id} leads={leads} closeForm={() => setIsTaskFormOpen(false)} />
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
            
            <DataTable 
                columns={taskColumns} 
                data={hierarchicalTasks} 
                getSubRows={(row: Row<Task>) => (row.original as any).subRows}
            />
        </div>
    )
}
