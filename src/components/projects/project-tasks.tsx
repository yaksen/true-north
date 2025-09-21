
'use client';

import { useMemo, useState } from "react";
import { Project, Task, Lead, TaskTemplateSlot } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { getTaskColumns } from "./task-columns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskForm } from "./task-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Row } from "@tanstack/react-table";
import { Checkbox } from "../ui/checkbox";
import { doc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { isToday, isTomorrow, addDays } from "date-fns";

interface ProjectTasksProps {
    project: Project;
    tasks: Task[];
    leads: Lead[];
}

const slots: TaskTemplateSlot[] = ['morning', 'midday', 'night'];
type DateFilter = 'all' | 'today' | 'tomorrow' | 'day-after';


export function ProjectTasks({ project, tasks, leads }: ProjectTasksProps) {
    const { toast } = useToast();
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [slotFilter, setSlotFilter] = useState<TaskTemplateSlot | 'all'>('all');
    const [hideCompleted, setHideCompleted] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');

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
    
    const taskColumns = useMemo(() => getTaskColumns({ leads }, handleStar), [leads]);

    const filteredTasks = useMemo(() => {
        let filtered = [...tasks];

        if (slotFilter !== 'all') {
            filtered = filtered.filter(task => task.slot === slotFilter);
        }

        if (dateFilter !== 'all') {
            filtered = filtered.filter(task => {
                if (!task.dueDate) return false;
                const dueDate = new Date(task.dueDate);
                if (dateFilter === 'today') return isToday(dueDate);
                if (dateFilter === 'tomorrow') return isTomorrow(dueDate);
                if (dateFilter === 'day-after') return isToday(addDays(new Date(), -2)); // Simplified logic
                return true;
            });
        }
        
        if (hideCompleted) {
             const taskMap = new Map(filtered.map(t => [t.id, t]));
            const hasIncompleteSubtasks = (taskId: string): boolean => {
                const subtasks = filtered.filter(t => t.parentTaskId === taskId);
                if (subtasks.some(st => !st.completed)) return true;
                return subtasks.some(st => hasIncompleteSubtasks(st.id));
            };

             return filtered.filter(task => {
                if (task.parentTaskId) {
                    // Only show subtasks if their ultimate parent is not completed or has other incomplete subtasks
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
    }, [tasks, slotFilter, hideCompleted, dateFilter]);

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

    const Toolbar = () => (
        <div className="flex items-center gap-2">
            <Select value={slotFilter} onValueChange={(value) => setSlotFilter(value as any)}>
                <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue placeholder="Filter by slot..."/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Slots</SelectItem>
                    {slots.map(slot => (
                        <SelectItem key={slot} value={slot} className="capitalize">{slot}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
                <Checkbox id="hide-completed" checked={hideCompleted} onCheckedChange={(checked) => setHideCompleted(checked as boolean)} />
                <label htmlFor="hide-completed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Hide completed
                </label>
            </div>
             <div className="flex items-center gap-1 p-1 border rounded-lg">
                {(['today', 'tomorrow', 'day-after'] as DateFilter[]).map(df => (
                    <Button key={df} variant={dateFilter === df ? 'secondary' : 'ghost'} size="sm" onClick={() => setDateFilter(df)} className="capitalize h-7">
                        {df.replace('-', ' ')}
                    </Button>
                ))}
            </div>
            {(slotFilter !== 'all' || hideCompleted || dateFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => { setSlotFilter('all'); setHideCompleted(false); setDateFilter('all'); }}>
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
                                <TaskForm projectId={project.id} leads={leads} members={project.members} closeForm={() => setIsTaskFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable 
                        columns={taskColumns} 
                        data={hierarchicalTasks} 
                        toolbar={<Toolbar />} 
                        getSubRows={(row: Row<Task>) => (row.original as any)?.subRows}
                        onDeleteSelected={handleDeleteSelected}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
