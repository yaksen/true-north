
'use client';

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Habit, HabitLog } from '@/lib/types';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';

interface StreakCalendarProps {
    habit: Habit;
    logs: HabitLog[];
}

export function StreakCalendar({ habit, logs }: StreakCalendarProps) {
    const completedDays = useMemo(() => {
        return logs
            .filter(log => log.habitId === habit.id && log.count >= (log.target || 1))
            .map(log => parseISO(log.date));
    }, [habit, logs]);
    
    return (
        <DayPicker
            mode="multiple"
            selected={completedDays}
            modifiers={{
                completed: completedDays,
            }}
            modifiersStyles={{
                completed: { 
                    backgroundColor: habit.color,
                    color: 'white',
                },
            }}
            className="p-0"
        />
    );
}
