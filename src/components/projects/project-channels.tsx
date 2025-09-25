

'use client';

import { useMemo, useState } from "react";
import { Project, Channel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { ChannelForm } from "./channel-form";
import { useToast } from "@/hooks/use-toast";
import { ChannelsToolbar } from "./channels-toolbar";
import { ChannelCard } from "./channel-card";
import { ScrollArea } from "../ui/scroll-area";


interface ProjectChannelsProps {
    project: Project;
    channels: Channel[];
}

export function ProjectChannels({ project, channels }: ProjectChannelsProps) {
    const { toast } = useToast();
    const [isChannelFormOpen, setIsChannelFormOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        type: 'all',
        search: ''
    });

    const filteredChannels = useMemo(() => {
        return channels.filter(channel => {
            const statusMatch = filters.status === 'all' || channel.status === filters.status;
            const typeMatch = filters.type === 'all' || channel.type === filters.type;
            const searchMatch = !filters.search || channel.name.toLowerCase().includes(filters.search.toLowerCase());

            return statusMatch && typeMatch && searchMatch;
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
                                <ChannelForm projectId={project.id} closeForm={() => setIsChannelFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <ChannelsToolbar onFilterChange={setFilters} />
                    <ScrollArea className="h-[calc(100vh-30rem)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                            {filteredChannels.map(channel => (
                                <ChannelCard 
                                    key={channel.id}
                                    channel={channel}
                                    project={project}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    {filteredChannels.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                            <p>No channels found for the selected filters.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
