
'use client';

import type { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectOverviewProps {
  project: Project;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
        <Card className="col-span-full">
            <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{project.description}</p>
            </CardContent>
        </Card>
    </div>
  );
}
