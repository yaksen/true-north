
'use client';

import { useMemo, useState } from "react";
import { Project, Task, TaskStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { taskColumns } from "./task-columns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskForm } from "./task-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface ProjectTasksProps {
    project: Project;
    tasks: Task[];
}

const taskStatuses: TaskStatus[] = ['To-Do', 'In-Progress', 'Done'];

export function ProjectTasks({ project, tasks }: ProjectTasksProps) {
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

    const filteredTasks = useMemo(() => {
        if (statusFilter === 'all') return tasks;
        return tasks.filter(task => task.status === statusFilter);
    }, [tasks, statusFilter]);

    const Toolbar = () => (
        <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {taskStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {statusFilter !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
                    Clear Filter
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
                                <TaskForm projectId={project.id} closeForm={() => setIsTaskFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable columns={taskColumns} data={filteredTasks} toolbar={<Toolbar />} />
                </CardContent>
            </Card>
        </div>
    )
}
