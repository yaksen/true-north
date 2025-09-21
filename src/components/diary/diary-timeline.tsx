
'use client';

import { DiaryEntry } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface DiaryTimelineProps {
  entries: DiaryEntry[];
  onSelectDate: (date: Date) => void;
}

export function DiaryTimeline({ entries, onSelectDate }: DiaryTimelineProps) {
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Entries</CardTitle>
        <CardDescription>A look at your most recent thoughts.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          {sortedEntries.length > 0 ? (
            <div className="space-y-4">
              {sortedEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onSelectDate(parseISO(entry.date))}
                  className="block w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <p className="font-semibold text-sm truncate">{entry.title || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(entry.date), 'MMMM d, yyyy')}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">No entries yet. Start writing!</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
