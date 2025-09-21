
'use client';

import { useState, useMemo, useEffect } from 'react';
import { DiaryEntry } from '@/lib/types';
import { Calendar } from '../ui/calendar';
import { Card } from '../ui/card';
import { format } from 'date-fns';
import { DiaryEditor } from './diary-editor';
import { DiaryTimeline } from './diary-timeline';

interface DiaryClientProps {
  entries: DiaryEntry[];
}

export function DiaryClient({ entries }: DiaryClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const selectedDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  const selectedEntry = useMemo(() => {
    return entries.find(entry => entry.date === selectedDateString);
  }, [entries, selectedDateString]);

  // When selected date changes, if there's no entry, create a placeholder
  const entryForEditor = useMemo(() => {
    if (selectedEntry) return selectedEntry;
    if (!selectedDateString) return null;
    return {
        id: selectedDateString, // Use date as a temporary ID for new entries
        userId: '', // Will be set on save
        date: selectedDateString,
        title: '',
        content: '',
        createdAt: new Date(),
        updatedAt: new Date(),
    }
  }, [selectedEntry, selectedDateString]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {entryForEditor && (
            <DiaryEditor key={entryForEditor.id} entry={entryForEditor} />
        )}
      </div>
      <div className="space-y-6">
        <Card>
            <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="p-3"
            />
        </Card>
        <DiaryTimeline entries={entries} onSelectDate={setSelectedDate} />
      </div>
    </div>
  );
}
