'use client';

import { useMemo, useState } from "react";
import { Project, Channel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { getChannelsColumns } from "./channel-columns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { ChannelForm } from "./channel-form";
import { doc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { ChannelsToolbar } from "./channels-toolbar";


interface ProjectChannelsProps {
    project: Project;
    channels: Channel[];
}

export function ProjectChannels({ project, channels }: ProjectChannelsProps) {
    const { toast } = useToast();
    const [isChannelFormOpen, setIsChannelFormOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        platform: 'all',
        search: ''
    });
    
    const handleStar = async (id: string, starred: boolean) => {
        try {
            await updateDoc(doc(db, 'channels', id), { starred });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
        }
    }

    const handleDeleteSelected = async (ids: string[]) => {
        const batch = writeBatch(db);
        ids.forEach(id => {
            batch.delete(doc(db, 'channels', id));
        });
        try {
            await batch.commit();
            toast({ title: "Success", description: `${ids.length} channel(s) deleted.`});
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete selected channels."})
        }
    }
    
    const channelsColumns = useMemo(() => getChannelsColumns(project, handleStar), [project]);

    const filteredChannels = useMemo(() => {
        return channels.filter(channel => {
            const statusMatch = filters.status === 'all' || channel.status === filters.status;
            const platformMatch = filters.platform === 'all' || channel.platform === filters.platform;
            return statusMatch && platformMatch;
        });
    }, [channels, filters]);


    return (
        <div className="grid gap-6 mt-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Channels</CardTitle>
                            <CardDescription>All channels associated with the &quot;{project.name}&quot; project.</CardDescription>
                        </div>
                        <Dialog open={isChannelFormOpen} onOpenChange={setIsChannelFormOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm"><PlusCircle className="mr-2"/> Add Channel</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>Add New Channel</DialogTitle>
                                </DialogHeader>
                                <ChannelForm projectId={project.id} channels={channels} closeForm={() => setIsChannelFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable 
                        columns={channelsColumns} 
                        data={filteredChannels} 
                        toolbar={<ChannelsToolbar onFilterChange={setFilters} />} 
                        onDeleteSelected={handleDeleteSelected}
                        globalFilter={filters.search}
                        setGlobalFilter={(value) => setFilters(prev => ({...prev, search: value}))}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
