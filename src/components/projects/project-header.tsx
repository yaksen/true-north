
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
        <div className="flex gap-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Project
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>Update the details of your project.</DialogDescription>
                    </DialogHeader>
                    <ProjectForm project={project} allProjects={allProjects} closeForm={() => setIsEditDialogOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-4">
          {project.name}
          <Badge variant="secondary" className="capitalize text-base">{project.status}</Badge>
          {project.private && <Badge variant="outline"><Lock className='h-3 w-3 mr-1'/>Private</Badge>}
        </h1>
        <p className="text-muted-foreground mt-1">{project.description}</p>
      </div>
    </div>
  );
}
