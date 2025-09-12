
'use client';

import type { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { FileDown, PlusCircle } from 'lucide-react';

interface ProjectReportsProps {
  project: Project;
}

export function ProjectReports({ project }: ProjectReportsProps) {
  // Placeholder for report generation logic and listing
  const generatedReports: any[] = [];

  return (
    <div className="mt-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Reports</CardTitle>
              <CardDescription>Generate and download reports for this project.</CardDescription>
            </div>
            <Button disabled>
              <PlusCircle className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {generatedReports.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No reports generated yet.</p>
              <p className="text-sm text-muted-foreground">Report generation feature coming soon.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {generatedReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-2 rounded-md border">
                  <span>{report.name}</span>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-muted-foreground'>{new Date(report.createdAt).toLocaleDateString()}</span>
                    <Button variant="outline" size="sm">
                      <FileDown className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
