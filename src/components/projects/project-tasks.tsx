
'use client';

import { useMemo, useState } from "react";
import { Project, Task, TaskStatus, Lead } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { getTaskColumns } from "./task-columns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskForm } from "./task-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { getCoreRowModel, useReactTable, getExpandedRowModel, Row } from "@tanstack/react-table";
import { Checkbox } from "../ui/checkbox";

interface ProjectTasksProps {
    project: Project;
    tasks: Task[];
    leads: Lead[];
}

const taskStatuses: TaskStatus[] = ['Call', 'Meeting', 'Project'];

export function ProjectTasks({ project, tasks, leads }: ProjectTasksProps) {
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
    const [hideCompleted, setHideCompleted] = useState(false);

    const taskColumns = useMemo(() => getTaskColumns({ leads }), [leads]);

    const filteredTasks = useMemo(() => {
        let filtered = tasks;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(task => task.status === statusFilter);
        }
        if (hideCompleted) {
            // This is tricky with hierarchy. We'll filter out top-level completed tasks if they have no incomplete subtasks.
            const taskMap = new Map(filtered.map(t => [t.id, t]));
            const hasIncompleteSubtasks = (taskId: string): boolean => {
                const subtasks = filtered.filter(t => t.parentTaskId === taskId);
                if (subtasks.some(st => !st.completed)) return true;
                return subtasks.some(st => hasIncompleteSubtasks(st.id));
            };

            filtered = filtered.filter(task => {
                // Always show incomplete tasks
                if (!task.completed) return true;
                // Hide completed tasks if they don't have any incomplete subtasks
                return hasIncompleteSubtasks(task.id);
            });
        }
        return filtered;
    }, [tasks, statusFilter, hideCompleted]);

    const hierarchicalTasks = useMemo(() => {
        const taskMap = new Map(filteredTasks.map(t => [t.id, { ...t, subRows: [] as Task[] }]));
        const rootTasks: Task[] = [];
        
        for (const task of filteredTasks) {
            if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
                taskMap.get(task.parentTaskId)!.subRows.push(taskMap.get(task.id)!);
            } else {
                rootTasks.push(taskMap.get(task.id)!);
            }
        }
        return rootTasks;

    }, [filteredTasks]);

    const Toolbar = () => (
        <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {taskStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
                <Checkbox id="hide-completed" checked={hideCompleted} onCheckedChange={(checked) => setHideCompleted(checked as boolean)} />
                <label htmlFor="hide-completed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Hide completed
                </label>
            </div>
            {(statusFilter !== 'all' || hideCompleted) && (
                <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setHideCompleted(false); }}>
                    Clear Filters
                </Button>
            )}
        </div>
    );

    return (
        <div className="grid gap-6 mt-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Tasks</CardTitle>
                            <CardDescription>All tasks associated with the &quot;{project.name}&quot; project.</CardDescription>
                        </div>
                        <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm"><PlusCircle className="mr-2"/> Add Task</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Task</DialogTitle>
                                </DialogHeader>
                                <TaskForm projectId={project.id} leads={leads} closeForm={() => setIsTaskFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable 
                        columns={taskColumns} 
                        data={hierarchicalTasks} 
                        toolbar={<Toolbar />} 
                        getSubRows={(row: Row<Task>) => (row.original as any).subRows}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
