
'use client';

import { useMemo, useState } from "react";
import { Project, Task, TaskTemplate, UserProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, Zap } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { getTaskTemplatesColumns } from "./task-template-columns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskTemplateForm } from "./task-template-form";
import { collection, where, query, getDocs, writeBatch, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useEffect } from "react";

interface ProjectTemplatesProps {
    project: Project;
    templates: TaskTemplate[];
    tasks: Task[];
}

export function ProjectTemplates({ project, templates, tasks }: ProjectTemplatesProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [slotFilter, setSlotFilter] = useState<'all' | 'morning' | 'midday' | 'night'>('all');
    const [dayFilter, setDayFilter] = useState<'all' | string>('all');
    const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all');
    const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
    
    useEffect(() => {
        const fetchMembers = async () => {
          if (project.members.length === 0) return;
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('id', 'in', project.members));
          const snapshot = await getDocs(q);
          setMemberProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
        };
        fetchMembers();
    }, [project.members]);

    const templateColumns = useMemo(() => getTaskTemplatesColumns(project), [project]);
    
    const filteredTemplates = useMemo(() => {
        return templates.filter(template => {
            const slotMatch = slotFilter === 'all' || template.slot === slotFilter;
            const dayMatch = dayFilter === 'all' || template.daysOfWeek.includes(Number(dayFilter));
            const assigneeMatch = assigneeFilter === 'all' || template.assigneeUids.includes(assigneeFilter);
            return slotMatch && dayMatch && assigneeMatch;
        });
    }, [templates, slotFilter, dayFilter, assigneeFilter]);

    const handleGenerateTodaysTasks = async () => {
        if (!user) return;
        setIsGenerating(true);

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to start of day in local time
            const dayOfWeek = today.getDay();

            // Fetch tasks already generated for today for this project to prevent duplicates
            const generatedTasksQuery = query(
                collection(db, 'tasks'),
                where('projectId', '==', project.id),
                where('isGenerated', '==', true),
                where('generatedForDate', '==', today)
            );
            const generatedTasksSnapshot = await getDocs(generatedTasksQuery);
            const existingTemplateIds = new Set(generatedTasksSnapshot.docs.map(doc => doc.data().templateId));

            const batch = writeBatch(db);
            let tasksCreatedCount = 0;

            templates.forEach(template => {
                if (
                    template.active && 
                    template.daysOfWeek.includes(dayOfWeek) && 
                    !existingTemplateIds.has(template.id)
                ) {
                    const newTaskRef = doc(collection(db, 'tasks'));
                    batch.set(newTaskRef, {
                        projectId: project.id,
                        title: template.title,
                        description: template.description || '',
                        status: 'Project',
                        completed: false,
                        assigneeUid: template.assigneeUids[0] || user.uid,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        isGenerated: true,
                        templateId: template.id,
                        generatedForDate: today,
                        slot: template.slot,
                    });
                    tasksCreatedCount++;
                }
            });
            
            if (tasksCreatedCount > 0) {
                await batch.commit();
                toast({ title: "Success", description: `${tasksCreatedCount} task(s) generated for today.` });
            } else {
                toast({ title: "No new tasks", description: "All scheduled tasks for today have already been generated." });
            }

        } catch (error) {
            console.error("Error generating tasks:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not generate tasks." });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const Toolbar = () => (
        <div className="flex items-center gap-2">
            <Select value={slotFilter} onValueChange={(value) => setSlotFilter(value as any)}>
                <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Slots</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="midday">Midday</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                </SelectContent>
            </Select>
            <Select value={dayFilter} onValueChange={(value) => setDayFilter(value)}>
                <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Days</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                    <SelectItem value="0">Sunday</SelectItem>
                </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={(value) => setAssigneeFilter(value as any)}>
                <SelectTrigger className="w-48 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {memberProfiles.map(member => (
                        <SelectItem key={member.id} value={member.id}>{member.name || member.email}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {(slotFilter !== 'all' || dayFilter !== 'all' || assigneeFilter !== 'all') && (
                 <Button variant="ghost" size="sm" onClick={() => { setSlotFilter('all'); setDayFilter('all'); setAssigneeFilter('all'); }}>
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
                            <CardTitle>Task Templates</CardTitle>
                            <CardDescription>Manage recurring tasks for &quot;{project.name}&quot;.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={handleGenerateTodaysTasks} disabled={isGenerating}>
                                <Zap className="mr-2 h-4 w-4" />
                                {isGenerating ? "Generating..." : "Generate Today's Tasks"}
                            </Button>
                            <Dialog open={isTemplateFormOpen} onOpenChange={setIsTemplateFormOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><PlusCircle className="mr-2"/> New Template</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Create New Task Template</DialogTitle>
                                    </DialogHeader>
                                    <TaskTemplateForm projectId={project.id} members={project.members} closeForm={() => setIsTemplateFormOpen(false)} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable columns={templateColumns} data={filteredTemplates} toolbar={<Toolbar />} />
                </CardContent>
            </Card>
        </div>
    )
}
