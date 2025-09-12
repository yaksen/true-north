
'use client';

import type { Project, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import { Input } from '../ui/input';
import { PlusCircle } from 'lucide-react';

interface ProjectTeamProps {
  project: Project;
  allUsers: UserProfile[];
}

export function ProjectTeam({ project, allUsers }: ProjectTeamProps) {
    const { user } = useAuth();

    const teamMembers = useMemo(() => {
        return allUsers.filter(u => project.members.includes(u.id));
    }, [allUsers, project.members]);

    const isOwner = user?.uid === project.ownerUid;

    const getInitials = (name: string | undefined) => {
        if (!name) return 'U';
        const nameParts = name.split(' ');
        if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
        }
        return name[0].toUpperCase();
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>
                            {teamMembers.length} member(s) assigned to this project.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {teamMembers.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={member.photoURL} />
                                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{member.name}</p>
                                        <p className="text-sm text-muted-foreground">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={project.ownerUid === member.id ? "default" : "secondary"} className="capitalize">
                                        {project.ownerUid === member.id ? 'Owner' : member.role}
                                    </Badge>
                                    {isOwner && user?.uid !== member.id && (
                                        <Button variant="ghost" size="icon" disabled>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
            {isOwner && (
                 <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Member</CardTitle>
                             <CardDescription>
                                Add a new member to this project.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className='space-y-2'>
                                <Input placeholder="Search user by email..." disabled />
                                <Button className='w-full' disabled>
                                    <PlusCircle className='mr-2' />
                                    Add to Project
                                </Button>
                            </div>
                             <p className="text-xs text-center text-muted-foreground">
                                Full user management coming soon.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

