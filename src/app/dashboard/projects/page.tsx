
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Briefcase, Users, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProjectForm } from '@/components/projects/project-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Query for projects where the current user is a member
    const q = query(
        collection(db, `projects`), where('members', 'array-contains', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const projectsData: Project[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        projectsData.push({ 
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new
 Date(),
        } as Project);
      });
      
      setProjects(projectsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);


  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Projects</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Fill out the details for your new project.
              </DialogDescription>
            </DialogHeader>
            <ProjectForm 
              allProjects={projects} 
              closeForm={() => setIsCreateDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
         <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
                <Card key={project.id}>
                    <CardHeader>
                        <div className='flex items-start justify-between'>
                            <Briefcase className="h-8 w-8 text-muted-foreground mb-4" />
                            {project.private && <Badge variant="secondary"><Lock className='h-3 w-3 mr-1' />Private</Badge>}
                        </div>
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription className='line-clamp-2 h-10'>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className='text-xs text-muted-foreground flex items-center gap-2'>
                            <Users className='h-4 w-4' />
                            {project.members.length} member(s)
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" size="sm" className='w-full'>
                            <Link href={`/dashboard/projects/${project.id}`}>Open Project</Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
            {projects.length === 0 && !loading && (
                <div className="col-span-full text-center text-muted-foreground py-12">
                    <Briefcase className="mx-auto h-12 w-12" />
                    <p className="mt-4">No projects found. Create your first project to get started.</p>
                </div>
            )}
        </div>
      )}
    </>
  );
}
