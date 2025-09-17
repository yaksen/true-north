
'use client';

import { useMemo, useState } from "react";
import { Project, Task, TaskTemplate, UserProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { getTaskTemplatesColumns } from "./task-template-columns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { TaskTemplateForm } from "./task-template-form";
import { collection, where, query, getDocs, doc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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
            if (project.members.length === 0) return;
            const memberUids = project.members.map(m => m.uid);
            if (memberUids.length === 0) return;
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('id', 'in', memberUids));
            const snapshot = await getDocs(q);
            setMemberProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
        };
        fetchMembers();
    }, [project.members]);

    const handleStar = async (id: string, starred: boolean) => {
        try {
            await updateDoc(doc(db, 'taskTemplates', id), { starred });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
        }
    }

    const handleDeleteSelected = async (ids: string[]) => {
        const batch = writeBatch(db);
        ids.forEach(id => {
            batch.delete(doc(db, 'taskTemplates', id));
        });
        try {
            await batch.commit();
            toast({ title: "Success", description: `${ids.length} template(s) a deleted.`});
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete selected templates."})
        }
    }

    const templateColumns = useMemo(() => getTaskTemplatesColumns(project, handleStar), [project]);
    
    const filteredTemplates = useMemo(() => {
        return templates.filter(template => {
            const slotMatch = slotFilter === 'all' || template.slot === slotFilter;
            const dayMatch = dayFilter === 'all' || template.daysOfWeek.includes(Number(dayFilter));
            const assigneeMatch = assigneeFilter === 'all' || template.assigneeUids.includes(assigneeFilter);
            return slotMatch && dayMatch && assigneeMatch;
        });
    }, [templates, slotFilter, dayFilter, assigneeFilter]);

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
                            <Dialog open={isTemplateFormOpen} onOpenChange={setIsTemplateFormOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><PlusCircle className="mr-2"/> New Template</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Create New Task Template</DialogTitle>
                                    </DialogHeader>
                                    <TaskTemplateForm projectId={project.id} members={project.members.map(m => m.uid)} closeForm={() => setIsTemplateFormOpen(false)} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable 
                        columns={templateColumns} 
                        data={filteredTemplates} 
                        toolbar={<Toolbar />}
                        onDeleteSelected={handleDeleteSelected}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
