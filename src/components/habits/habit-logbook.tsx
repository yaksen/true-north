

'use client';

import { useMemo } from 'react';
import type { Habit, HabitLog } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface HabitLogbookProps {
  habits: Habit[];
  logs: HabitLog[];
}

export function HabitLogbook({ habits, logs }: HabitLogbookProps) {

  const logsByDate = useMemo(() => {
    const grouped: { [date: string]: HabitLog[] } = {};
    for (const log of logs) {
        if (!grouped[log.date]) {
            grouped[log.date] = [];
        }
        grouped[log.date].push(log);
    }
    // Sort dates descending
    return Object.entries(grouped).sort(([dateA], [dateB]) => {
        return parseISO(dateB).getTime() - parseISO(dateA).getTime();
    });
  }, [logs]);

  const getHabitById = (habitId: string) => habits.find(h => h.id === habitId);

  const handleDownloadCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Date', 'Habit Name', 'Habit Type', 'Count'];
    const csvRows = [headers.join(',')];

    for (const log of logs) {
        const habit = getHabitById(log.habitId);
        if (!habit) continue;
        const row = [
            log.date,
            `"${habit.name.replace(/"/g, '""')}"`, // Escape double quotes
            habit.type,
            log.count,
        ];
        csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `habit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (logs.length === 0) {
    return (
        <div className="text-center text-muted-foreground py-12">
            <p>No records found. Start logging your habits!</p>
        </div>
    );
  }

  return (
    <div>
        <div className='flex justify-end mb-4'>
            <Button size="sm" variant="outline" onClick={handleDownloadCSV} disabled={logs.length === 0}>
                <Download className='mr-2 h-4 w-4' />
                Download CSV
            </Button>
        </div>
        <ScrollArea className="h-96">
        <Accordion type="multiple" defaultValue={[logsByDate[0]?.[0]]} className="w-full">
            {logsByDate.map(([date, dateLogs]) => (
                <AccordionItem value={date} key={date}>
                    <AccordionTrigger>
                        {format(parseISO(date), 'PPP')} ({dateLogs.length} records)
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2">
                            {dateLogs.map(log => {
                                const habit = getHabitById(log.habitId);
                                if (!habit) return null;
                                return (
                                    <div key={log.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{habit.emoji}</span>
                                            <span className="font-medium">{habit.name}</span>
                                            <Badge variant={habit.type === 'good' ? 'default' : 'destructive'} className={cn('capitalize', habit.type === 'good' && 'bg-green-500/80')}>{habit.type}</Badge>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            Logged {log.count} time(s)
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
        </ScrollArea>
    </div>
  );
}



