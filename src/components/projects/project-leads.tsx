

'use client';

import { useMemo, useState } from "react";
import { Project, Lead, LeadStatus, Package, Service, Channel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, Contact, Loader2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { LeadForm } from "./lead-form";
import { doc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { LeadsToolbar } from "./leads-toolbar";
import { LeadCard } from "./lead-card";
import { ScrollArea } from "../ui/scroll-area";
import { exportToGoogleContactsCSV } from "@/lib/utils";

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

    const filteredLeads = useMemo(() => {
        const sortedLeads = [...leads].sort((a, b) => {
            if (a.starred && !b.starred) return -1;
            if (!a.starred && b.starred) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return sortedLeads.filter(lead => {
            const statusMatch = filters.status === 'all' || lead.status === filters.status;
            const channelMatch = filters.channel === 'all' || lead.channelId === filters.channel;
            const searchMatch = !filters.search || 
                lead.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                (lead.email && lead.email.toLowerCase().includes(filters.search.toLowerCase()));

            return statusMatch && channelMatch && searchMatch;
        });
    }, [leads, filters]);

    const handleExport = () => {
        if (filteredLeads.length === 0) {
            toast({ description: "No leads to export."});
            return;
        }
        exportToGoogleContactsCSV(filteredLeads, 'leads');
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
                            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredLeads.length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Contacts
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
                    <LeadsToolbar channels={channels} onFilterChange={setFilters} />
                    <ScrollArea className="h-[calc(100vh-30rem)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                            {filteredLeads.map(lead => (
                                <LeadCard 
                                    key={lead.id}
                                    lead={lead}
                                    dependencies={{ project, packages, services, channels, onStar: handleStar }}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    {filteredLeads.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                            <p>No leads found for the selected filters.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
