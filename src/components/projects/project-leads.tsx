
'use client';

import { useMemo, useState } from "react";
import { Project, Lead, LeadStatus, Package, Service, Channel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, Contact, Loader2 } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { getLeadsColumns } from "./leads-columns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { LeadForm } from "./lead-form";
import { doc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { saveContactToGoogle } from "@/app/actions/google-contacts";
import { LeadsToolbar } from "./leads-toolbar";

interface ProjectLeadsProps {
    project: Project;
    leads: Lead[];
    packages: Package[];
    services: Service[];
    channels: Channel[];
}

export function ProjectLeads({ project, leads, packages, services, channels }: ProjectLeadsProps) {
    const { toast } = useToast();
    const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        channel: 'all',
        search: ''
    });

    const handleStar = async (id: string, starred: boolean) => {
        try {
            await updateDoc(doc(db, 'leads', id), { starred });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
        }
    }

    const handleDeleteSelected = async (ids: string[]) => {
        const batch = writeBatch(db);
        ids.forEach(id => {
            batch.delete(doc(db, 'leads', id));
        });
        try {
            await batch.commit();
            toast({ title: "Success", description: `${ids.length} lead(s) deleted.`});
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete selected leads."})
        }
    }
    
    const leadsColumns = useMemo(() => getLeadsColumns({ project, packages, services, channels, onStar: handleStar }), [project, packages, services, channels]);

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const statusMatch = filters.status === 'all' || lead.status === filters.status;
            const channelMatch = filters.channel === 'all' || lead.channelId === filters.channel;
            // The global search is now handled by the DataTable itself via the `globalFilter` prop
            return statusMatch && channelMatch;
        });
    }, [leads, filters.status, filters.channel]);

    const handleBulkSaveToContacts = async () => {
        if (!project.googleContactsAccessToken) {
            toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to Google Contacts in Project Settings first.'});
            return;
        }
        setIsBulkSaving(true);
        let successCount = 0;
        let existCount = 0;
        let failCount = 0;

        for (const lead of filteredLeads) {
            const result = await saveContactToGoogle(lead, project.googleContactsAccessToken);
            if (result.success) {
                successCount++;
            } else if (result.message.includes('already exists')) {
                existCount++;
            } else {
                failCount++;
            }
        }

        setIsBulkSaving(false);
        toast({
            title: 'Bulk Save Complete',
            description: `${successCount} new contacts saved, ${existCount} already existed, and ${failCount} failed.`,
        });
    }

    return (
        <div className="grid gap-6 mt-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Leads</CardTitle>
                            <CardDescription>All leads associated with the &quot;{project.name}&quot; project.</CardDescription>
                        </div>
                        <div className='flex items-center gap-2'>
                            <Button size="sm" variant="outline" onClick={handleBulkSaveToContacts} disabled={isBulkSaving || !project.googleContactsAccessToken}>
                                {isBulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Contact className="mr-2 h-4 w-4" />}
                                Save All to Contacts
                            </Button>
                            <Dialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><PlusCircle className="mr-2"/> Add Lead</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                        <DialogTitle>Add New Lead</DialogTitle>
                                    </DialogHeader>
                                    <LeadForm projectId={project.id} channels={channels} closeForm={() => setIsLeadFormOpen(false)} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable 
                        columns={leadsColumns} 
                        data={filteredLeads} 
                        toolbar={<LeadsToolbar channels={channels} onFilterChange={setFilters} />} 
                        onDeleteSelected={handleDeleteSelected}
                        globalFilter={filters.search}
                        setGlobalFilter={(value) => setFilters(prev => ({...prev, search: value}))}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
