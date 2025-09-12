
'use client';

import { useState } from 'react';
import type { Project, ActivityRecord, Note } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { NoteForm } from './note-form';
import { RecordsTimeline } from './records-timeline';

interface ProjectRecordsProps {
  project: Project;
  records: ActivityRecord[];
  notes: Note[];
}

export function ProjectRecords({ project, records, notes }: ProjectRecordsProps) {
    const combinedFeed = [
        ...records.map(r => ({ ...r, feedType: 'record' as const })),
        ...notes.map(n => ({ ...n, feedType: 'note' as const, timestamp: n.createdAt })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>A log of all activities and notes for this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecordsTimeline items={combinedFeed} />
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card>
            <CardHeader>
                <CardTitle>Add a Note</CardTitle>
                <CardDescription>Leave a note or update for the team.</CardDescription>
            </CardHeader>
            <CardContent>
                <NoteForm projectId={project.id} />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
