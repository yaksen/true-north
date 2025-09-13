
'use client';

import type { Project } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { ProjectForm } from './project-form';

interface ProjectHeaderProps {
  project: Project;
  allProjects?: Project[];
}

export function ProjectHeader({ project, allProjects }: ProjectHeaderProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Project
                </Button>
            </DialogTrigger>
            <DialogContent className='max-w-2xl'>
                <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>Update the details of your project.</DialogDescription>
                </DialogHeader>
                <ProjectForm project={project} allProjects={allProjects} closeForm={() => setIsEditDialogOpen(false)} />
            </DialogContent>
        </Dialog>
      </div>
      <div>
        <div className='flex flex-col md:flex-row md:items-center md:gap-x-4 gap-y-2'>
            <h1 className="text-3xl font-bold tracking-tight">
                {project.name}
            </h1>
            <div className='flex items-center gap-2'>
                <Badge variant="secondary" className="capitalize">{project.type}</Badge>
                {project.private && <Badge variant="outline"><Lock className='h-3 w-3 mr-1'/>Private</Badge>}
            </div>
        </div>
        <p className="text-muted-foreground mt-2">{project.description}</p>
      </div>
    </div>
  );
}
