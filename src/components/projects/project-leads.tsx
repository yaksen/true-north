
'use client';

import { useMemo, useState } from "react";
import { Project, Lead, LeadStatus, Package, Service } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, SlidersHorizontal } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { getLeadsColumns } from "./leads-columns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { LeadForm } from "./lead-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface ProjectLeadsProps {
    project: Project;
    leads: Lead[];
    packages: Package[];
    services: Service[];
}

const leadStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'lost', 'converted'];

export function ProjectLeads({ project, leads, packages, services }: ProjectLeadsProps) {
    const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
    
    const leadsColumns = useMemo(() => getLeadsColumns(project, packages, services), [project, packages, services]);

    const filteredLeads = useMemo(() => {
        if (statusFilter === 'all') return leads;
        return leads.filter(lead => lead.status === statusFilter);
    }, [leads, statusFilter]);

    const Toolbar = () => (
        <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {leadStatuses.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
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
                            <CardTitle>Leads</CardTitle>
                            <CardDescription>All leads associated with the &quot;{project.name}&quot; project.</CardDescription>
                        </div>
                        <Dialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm"><PlusCircle className="mr-2"/> Add Lead</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Lead</DialogTitle>
                                </DialogHeader>
                                <LeadForm projectId={project.id} closeForm={() => setIsLeadFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable columns={leadsColumns} data={filteredLeads} toolbar={<Toolbar />} />
                </CardContent>
            </Card>
        </div>
    )
}
