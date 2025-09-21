

'use client';

import { useMemo } from 'react';
import type { Habit, HabitLog } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

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

  if (logs.length === 0) {
    return (
        <div className="text-center text-muted-foreground py-12">
            <p>No records found. Start logging your habits!</p>
        </div>
    );
  }

  return (
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
  );
}

