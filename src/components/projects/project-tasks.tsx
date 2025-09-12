
'use client';

import { useMemo, useState } from "react";
import { Project, Task } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { taskColumns } from "./task-columns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskForm } from "./task-form";

interface ProjectTasksProps {
    project: Project;
    tasks: Task[];
}

export function ProjectTasks({ project, tasks }: ProjectTasksProps) {
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

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
                    <DataTable columns={taskColumns} data={tasks} />
                </CardContent>
            </Card>
        </div>
    )
}
