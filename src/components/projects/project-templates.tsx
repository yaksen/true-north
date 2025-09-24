'use client';

import { useMemo, useState } from "react";
import { Project, Task, TaskTemplate, UserProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskTemplateForm } from "./task-template-form";
import { collection, where, query, getDocs, doc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { TaskTemplateCard } from "./task-template-card";
import { ScrollArea } from "../ui/scroll-area";

interface ProjectTemplatesProps {
    project: Project;
    templates: TaskTemplate[];
    tasks: Task[];
}

export function ProjectTemplates({ project, templates, tasks }: ProjectTemplatesProps) {
    const { toast } = useToast();
    const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
    const [slotFilter, setSlotFilter] = useState<'all' | 'morning' | 'midday' | 'night'>('all');
    const [dayFilter, setDayFilter] = useState<'all' | string>('all');
    const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all');
    const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
    
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
    
    const filteredTemplates = useMemo(() => {
        return templates.filter(template => {
            const slotMatch = slotFilter === 'all' || template.slot === slotFilter;
            const dayMatch = dayFilter === 'all' || template.daysOfWeek.includes(Number(dayFilter));
            const assigneeMatch = assigneeFilter === 'all' || template.assigneeUids.includes(assigneeFilter);
            return slotMatch && dayMatch && assigneeMatch;
        });
    }, [templates, slotFilter, dayFilter, assigneeFilter]);

    const Toolbar = () => (
        <div className="flex items-center gap-2 mb-4">
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
                            <Dialog open={isTemplateFormOpen} onOpenChange={setIsTemplateFormOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><PlusCircle className="mr-2"/> New Template</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Create New Task Template</DialogTitle>
                                    </DialogHeader>
                                    <TaskTemplateForm projectId={project.id} members={project.memberUids} closeForm={() => setIsTemplateFormOpen(false)} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Toolbar />
                     <ScrollArea className="h-[calc(100vh-30rem)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                            {filteredTemplates.map(template => (
                                <TaskTemplateCard
                                    key={template.id}
                                    template={template}
                                    project={project}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    {filteredTemplates.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                            <p>No templates found for the selected filters.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
