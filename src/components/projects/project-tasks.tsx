

'use client';

import { useMemo, useState } from "react";
import { Project, Task, Lead, TaskTemplateSlot, UserProfile, Channel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, History } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskForm } from "./task-form";
import { Row } from "@tanstack/react-table";
import { doc, writeBatch, updateDoc, serverTimestamp, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { addDays, isToday, isTomorrow } from "date-fns";
import { TasksToolbar } from "./tasks-toolbar";
import { useEffect } from "react";
import { TaskCard } from "./task-card";
import { ScrollArea } from "../ui/scroll-area";

interface ProjectTasksProps {
    project: Project;
    tasks: Task[];
    leads: Lead[];
    channels: Channel[];
}

export function ProjectTasks({ project, tasks, leads, channels }: ProjectTasksProps) {
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

    const filteredTasks = useMemo(() => {
        let filtered = tasks.filter(task => showArchived ? task.archived : !task.archived);

        if (filters.slot !== 'all') {
            filtered = filtered.filter(task => task.slot === filters.slot);
        }
        
        if (filters.assignee !== 'all') {
            filtered = filtered.filter(task => task.assigneeUid === filters.assignee);
        }
        
        if (filters.hideCompleted) {
             filtered = filtered.filter(task => !task.completed);
        }

        if (filters.search) {
            filtered = filtered.filter(task => task.title.toLowerCase().includes(filters.search.toLowerCase()));
        }

        return filtered;
    }, [tasks, filters, showArchived]);


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
                                    <TaskForm projectId={project.id} leads={leads} channels={channels} members={project.members} closeForm={() => setIsTaskFormOpen(false)} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <TasksToolbar assignees={memberProfiles} onFilterChange={setFilters} />
                    <ScrollArea className="h-[calc(100vh-30rem)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                            {filteredTasks.map(task => (
                                <TaskCard key={task.id} task={task} leads={leads} channels={channels} />
                            ))}
                        </div>
                    </ScrollArea>
                    {filteredTasks.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                            <p>No tasks found for the selected filters.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
