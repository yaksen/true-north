
'use client';

import type { Habit, HabitLog } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface HabitStatsProps {
    habits: Habit[];
    logs: HabitLog[];
}

export function HabitStats({ habits, logs }: HabitStatsProps) {
    const stats = useMemo(() => {
        const goodHabits = habits.filter(h => h.type === 'good');
        const badHabits = habits.filter(h => h.type === 'bad');

        const goodLogs = logs.filter(log => goodHabits.some(h => h.id === log.habitId));
        const badLogs = logs.filter(log => badHabits.some(h => h.id === log.habitId));

        const goodHabitPossible = goodLogs.reduce((sum, log) => sum + log.target, 0);
        const goodHabitActual = goodLogs.reduce((sum, log) => sum + log.count, 0);
        const successRate = goodHabitPossible > 0 ? (goodHabitActual / goodHabitPossible) * 100 : 0;
        
        const badHabitSlips = badLogs.reduce((sum, log) => sum + log.count, 0);
        // Failure rate could be defined in many ways. Here, we'll just show total slip-ups.
        
        return {
            successRate,
            totalSlips: badHabitSlips,
            activeHabits: habits.length,
        };
    }, [habits, logs]);

    return (
        <div className='grid grid-cols-3 gap-4'>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Habits</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.activeHabits}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-400">{stats.successRate.toFixed(1)}%</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Slip-ups</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-400">{stats.totalSlips}</div>
                </CardContent>
            </Card>
        </div>
    )
}
