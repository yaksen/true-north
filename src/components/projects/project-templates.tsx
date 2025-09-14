
'use client';

import { useMemo, useState } from "react";
import { Project, Task, TaskTemplate } from "@/lib/types";
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
    
    const templateColumns = useMemo(() => getTaskTemplatesColumns(project), [project]);

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
                    <DataTable columns={templateColumns} data={templates} />
                </CardContent>
            </Card>
        </div>
    )
}
