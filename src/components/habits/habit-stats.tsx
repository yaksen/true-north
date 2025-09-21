
'use client';

import type { Habit, HabitLog } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Flame, Target, TrendingUp } from 'lucide-react';
import { StreakCalendar } from './streak-calendar';

interface HabitStatsProps {
    habits: Habit[];
    logs: HabitLog[];
}

export function HabitStats({ habits, logs }: HabitStatsProps) {
    const stats = useMemo(() => {
        const totalPossibleCompletions = logs.reduce((sum, log) => sum + log.target, 0);
        const totalActualCompletions = logs.reduce((sum, log) => sum + log.count, 0);

        const completionRate = totalPossibleCompletions > 0 ? (totalActualCompletions / totalPossibleCompletions) * 100 : 0;
        
        // This is a simplified longest streak calculation. A more robust one would be more complex.
        // For now, let's just show total logs.
        const totalLogs = logs.length;

        return {
            completionRate,
            totalLogs,
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
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
                    <Flame className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalLogs}</div>
                </CardContent>
            </Card>
        </div>
    )

}
