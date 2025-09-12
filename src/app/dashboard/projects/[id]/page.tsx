
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { ProjectHeader } from '@/components/projects/project-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const projectRef = doc(db, `projects`, id);
    const unsubscribeProject = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        const projectData = { id: docSnap.id, ...docSnap.data() } as Project;
        // Permission check
        if (projectData.private && !projectData.members.includes(user.uid)) {
            router.push('/dashboard/projects');
            return;
        }
        setProject(projectData);
      } else {
        // Project not found
        router.push('/dashboard/projects');
      }
      setLoading(false);
    });

    return () => {
        unsubscribeProject();
    };
  }, [user, id, router]);

  if (loading || !project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const PlaceholderContent = ({ title }: { title: string }) => (
    <Card className='mt-4'>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>This section is under construction.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className='text-muted-foreground'>
                The UI and functionality for the {title.toLowerCase()} section will be implemented soon.
            </p>
        </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
        <ProjectHeader project={project} />

        <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="finance">Finance</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="records">Records</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
                <PlaceholderContent title="Dashboard" />
            </TabsContent>
            <TabsContent value="leads">
                <PlaceholderContent title="Leads" />
            </TabsContent>
            <TabsContent value="products">
                <PlaceholderContent title="Products" />
            </TabsContent>
            <TabsContent value="finance">
                <PlaceholderContent title="Finance" />
            </TabsContent>
             <TabsContent value="tasks">
                <PlaceholderContent title="Tasks" />
            </TabsContent>
            <TabsContent value="records">
                <PlaceholderContent title="Records" />
            </TabsContent>
            <TabsContent value="reports">
                <PlaceholderContent title="Reports" />
            </TabsContent>
        </Tabs>
    </div>
  );
}
