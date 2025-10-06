

'use client';

import { useMemo, useState } from "react";
import { Project, Task, Lead, TaskTemplateSlot, UserProfile, Channel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, History, Archive } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskForm } from "./task-form";
import { doc, writeBatch, updateDoc, serverTimestamp, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { TasksToolbar } from "./tasks-toolbar";
import { useEffect } from "react";
import { DataTable } from "../ui/data-table";
import { getTaskColumns } from "./task-columns";

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

    const handleArchiveSelected = async (taskIds: string[]) => {
      const batch = writeBatch(db);
      taskIds.forEach(id => {
          batch.update(doc(db, 'tasks', id), { archived: true, updatedAt: serverTimestamp() });
      });
  
      try {
          await batch.commit();
          toast({ title: "Success", description: `${taskIds.length} completed task(s) archived.`});
      } catch (error) {
          toast({ variant: 'destructive', title: "Error", description: "Could not archive completed tasks."})
      }
    };
    
    const handleStar = async (id: string, starred: boolean) => {
      try {
          await updateDoc(doc(db, 'tasks', id), { starred });
      } catch (error) {
          toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
      }
    };
    
    const taskColumns = useMemo(() => getTaskColumns({ leads, channels }, handleStar), [leads, channels]);


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
                    <DataTable
                        columns={taskColumns}
                        data={filteredTasks}
                        onArchiveSelected={handleArchiveSelected}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
