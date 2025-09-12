
'use client';

import type { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectOverviewProps {
  project: Project;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent>
                <p>{project.description}</p>
            </CardContent>
        </Card>
    </div>
  );
}
