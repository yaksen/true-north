'use client';

import { useMemo, useState } from "react";
import { Project, Task, Lead, TaskTemplateSlot, UserProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, History } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { getTaskColumns } from "./task-columns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskForm } from "./task-form";
import { Row } from "@tanstack/react-table";
import { doc, writeBatch, updateDoc, serverTimestamp, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { addDays, isToday, isTomorrow } from "date-fns";
import { TasksToolbar } from "./tasks-toolbar";
import { useEffect } from "react";

interface ProjectTasksProps {
    project: Project;
    tasks: Task[];
    leads: Lead[];
}

export function ProjectTasks({ project, tasks, leads }: ProjectTasksProps) {
    const { toast } = useToast();
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
    
    const [filters, setFilters] = useState({
        slot: 'all',
        assignee: 'all',
        search: '',
        hideCompleted: false
    });

    useEffect(() => {
        const fetchMembers = async () => {
          if (!project.memberUids || project.memberUids.length === 0) return;
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('id', 'in', project.memberUids));
          const snapshot = await getDocs(q);
          setMemberProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
        };
        fetchMembers();
    }, [project.memberUids]);

    const handleStar = async (id: string, starred: boolean) => {
        try {
            await updateDoc(doc(db, 'tasks', id), { starred });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
        }
    }

    const handleDeleteSelected = async (ids: string[]) => {
        const batch = writeBatch(db);
        ids.forEach(id => {
            batch.delete(doc(db, 'tasks', id));
        });
        try {
            await batch.commit();
            toast({ title: "Success", description: `${ids.length} task(s) deleted.`});
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete selected tasks."})
        }
    }

    const handleArchiveSelected = async (ids: string[]) => {
        const batch = writeBatch(db);
        ids.forEach(id => {
            batch.update(doc(db, 'tasks', id), { archived: true, updatedAt: serverTimestamp() });
        });
        try {
            await batch.commit();
            toast({ title: "Success", description: `${ids.length} task(s) archived.`});
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not archive selected tasks."})
        }
    }


    const handlePostponeSelected = async (ids: string[]) => {
        const batch = writeBatch(db);
        const nextDay = addDays(new Date(), 1);
        ids.forEach(id => {
            const taskRef = doc(db, 'tasks', id);
            batch.update(taskRef, { dueDate: nextDay, updatedAt: serverTimestamp() });
        });
        try {
            await batch.commit();
            toast({ title: "Success", description: `${ids.length} task(s) postponed to tomorrow.`});
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not postpone selected tasks."})
        }
    }
    
    const taskColumns = useMemo(() => getTaskColumns({ leads }, handleStar), [leads]);

    const filteredTasks = useMemo(() => {
        let filtered = tasks.filter(task => showArchived ? task.archived : !task.archived);

        if (filters.slot !== 'all') {
            filtered = filtered.filter(task => task.slot === filters.slot);
        }
        
        if (filters.assignee !== 'all') {
            filtered = filtered.filter(task => task.assigneeUid === filters.assignee);
        }
        
        if (filters.hideCompleted) {
             const taskMap = new Map(filtered.map(t => [t.id, t]));
            const hasIncompleteSubtasks = (taskId: string): boolean => {
                const subtasks = filtered.filter(t => t.parentTaskId === taskId);
                if (subtasks.some(st => !st.completed)) return true;
                return subtasks.some(st => hasIncompleteSubtasks(st.id));
            };

             return filtered.filter(task => {
                if (task.parentTaskId) {
                    let current = task;
                    while (current.parentTaskId) {
                        const parent = taskMap.get(current.parentTaskId);
                        if (!parent) return true; // Orphaned, show it
                        if (parent.completed && !hasIncompleteSubtasks(parent.id)) return false;
                        current = parent;
                    }
                }
                return !task.completed || hasIncompleteSubtasks(task.id);
            });
        }

        return filtered;
    }, [tasks, filters, showArchived]);

    const hierarchicalTasks = useMemo(() => {
        const taskMap = new Map(filteredTasks.map(t => [t.id, { ...t, subRows: [] as Task[] }]));
        const rootTasks: Task[] = [];
        
        for (const task of filteredTasks) {
            const currentTask = taskMap.get(task.id);
            if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
                taskMap.get(task.parentTaskId)!.subRows.push(currentTask!);
            } else {
                rootTasks.push(currentTask!);
            }
        }
        return rootTasks;

    }, [filteredTasks]);


    return (
        <div className="grid gap-6 mt-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Tasks</CardTitle>
                            <CardDescription>All tasks associated with the &quot;{project.name}&quot; project.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
                                <History className="mr-2 h-4 w-4" />
                                {showArchived ? 'View Active Tasks' : 'View History'}
                            </Button>
                            <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><PlusCircle className="mr-2"/> Add Task</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                        <DialogTitle>Add New Task</DialogTitle>
                                    </DialogHeader>
                                    <TaskForm projectId={project.id} leads={leads} members={project.members} closeForm={() => setIsTaskFormOpen(false)} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable 
                        columns={taskColumns} 
                        data={hierarchicalTasks} 
                        toolbar={<TasksToolbar assignees={memberProfiles} onFilterChange={setFilters} />} 
                        getSubRows={(row: Row<Task>) => (row.original as any)?.subRows}
                        onDeleteSelected={handleDeleteSelected}
                        onPostponeSelected={handlePostponeSelected}
                        onArchiveSelected={handleArchiveSelected}
                        globalFilter={filters.search}
                        setGlobalFilter={(value) => setFilters(prev => ({...prev, search: value}))}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
