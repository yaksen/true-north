
'use client';

import { Project, Lead } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { leadsColumns } from "./leads-columns";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
// import { LeadForm } from "./lead-form"; // To be created

interface ProjectLeadsProps {
    project: Project;
    leads: Lead[];
}

export function ProjectLeads({ project, leads }: ProjectLeadsProps) {
    const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);

    return (
        <div className="grid gap-6 mt-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Leads</CardTitle>
                            <CardDescription>All leads associated with the &quot;{project.name}&quot; project.</CardDescription>
                        </div>
                        {/* <Dialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm"><PlusCircle className="mr-2"/> Add Lead</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Lead</DialogTitle>
                                </DialogHeader>
                                <LeadForm projectId={project.id} closeForm={() => setIsLeadFormOpen(false)} />
                            </DialogContent>
                        </Dialog> */}
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable columns={leadsColumns} data={leads} />
                </CardContent>
            </Card>
        </div>
    )
}
