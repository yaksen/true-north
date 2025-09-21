

'use client';

import { useMemo, useState } from 'react';
import type { Habit, HabitLog } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, deleteDoc, doc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, subDays, isToday, isYesterday, parseISO } from 'date-fns';
import { HabitCard } from './habit-card';
import { Button } from '../ui/button';
import { PlusCircle, RotateCcw } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { HabitForm } from './habit-form';
import { HabitStats } from './habit-stats';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';


// Helper to get today's date as a YYYY-MM-DD string
const getTodayDateString = () => format(new Date(), 'yyyy-MM-dd');

export function HabitDashboard({ habits, logs }: { habits: Habit[], logs: HabitLog[] }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // Group logs by habitId for quick lookup
    const logsByHabit = useMemo(() => {
        const grouped: { [habitId: string]: HabitLog[] } = {};
        for (const log of logs) {
            if (!grouped[log.habitId]) {
                grouped[log.habitId] = [];
            }
            grouped[log.habitId].push(log);
        }
        return grouped;
    }, [logs]);

    const calculateStreak = (habitId: string) => {
        const habitLogs = (logsByHabit[habitId] || [])
            .map(log => ({...log, parsedDate: parseISO(log.date)}))
            .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());
    
        if (habitLogs.length === 0) return 0;
        
        let streak = 0;
        let currentDate: Date;
    
        const mostRecentLogDate = habitLogs[0].parsedDate;
    
        if (isToday(mostRecentLogDate)) {
            streak = 1;
            currentDate = mostRecentLogDate;
        } else if (isYesterday(mostRecentLogDate)) {
            streak = 1;
            currentDate = mostRecentLogDate;
        } else {
            // No log today or yesterday, so streak is 0
            return 0;
        }
    
        for (let i = 1; i < habitLogs.length; i++) {
            const prevLogDate = habitLogs[i].parsedDate;
            const expectedPrevDate = subDays(currentDate, 1);
            
            if (format(prevLogDate, 'yyyy-MM-dd') === format(expectedPrevDate, 'yyyy-MM-dd')) {
                streak++;
                currentDate = prevLogDate;
            } else {
                // Streak is broken if there's a gap
                break;
            }
        }
        
        return streak;
    };
    

    const handleLogHabit = async (habit: Habit, todayLog: HabitLog | undefined) => {
        if (!user) return;

        const date = getTodayDateString();

        try {
            if (todayLog) {
                // Update existing log
                const logRef = doc(db, 'habitLogs', todayLog.id);
                await updateDoc(logRef, { count: increment(1) });
            } else {
                // Create new log
                await addDoc(collection(db, 'habitLogs'), {
                    habitId: habit.id,
                    userId: user.uid,
                    date: date,
                    count: 1,
                    target: habit.target,
                });
            }

            if (habit.type === 'good') {
                toast({ title: 'Great job!', description: `You've logged "${habit.name}".` });
            } else {
                toast({
                    title: 'Slip-up Recorded',
                    description: `Logged a fallback for "${habit.name}".`,
                });
            }

        } catch (error) {
            console.error("Error logging habit:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not log habit progress.' });
        }
    };
    
    const handleDeleteHabit = async (habitId: string) => {
        if (!user) return;

        try {
            const batch = writeBatch(db);

            // 1. Delete the habit document itself
            const habitRef = doc(db, 'habits', habitId);
            batch.delete(habitRef);

            // 2. Query for all logs associated with this habit and delete them
            const logsQuery = query(collection(db, 'habitLogs'), where('habitId', '==', habitId));
            const logsSnapshot = await getDocs(logsQuery);
            logsSnapshot.forEach(logDoc => {
                batch.delete(logDoc.ref);
            });
            
            await batch.commit();
            
            toast({ title: 'Habit Deleted', description: 'The habit and all its logs have been removed.'});
        } catch (error) {
            console.error("Error deleting habit:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the habit.' });
        }
    };

    const handleResetStats = async () => {
        if (!user) return;
        
        try {
            const batch = writeBatch(db);
            const logsQuery = query(collection(db, 'habitLogs'), where('userId', '==', user.uid));
            const logsSnapshot = await getDocs(logsQuery);
            
            if (logsSnapshot.empty) {
                toast({ description: 'No logs to reset.' });
                return;
            }

            logsSnapshot.forEach(logDoc => {
                batch.delete(logDoc.ref);
            });
            
            await batch.commit();

            toast({ title: 'Stats Reset', description: 'Your habit tracking history has been cleared.' });
        } catch (error) {
            console.error("Error resetting stats:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not reset habit stats.' });
        }
    };

    return (
        <div className='space-y-6'>
            <div className="flex justify-between items-center">
                <HabitStats habits={habits} logs={logs} />
                <div className='flex gap-2'>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm"><RotateCcw className="mr-2 h-4 w-4" /> Reset All</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will permanently delete all your habit logs, resetting your streaks and stats. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetStats}>Reset Stats</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> New Habit</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Create New Habit</DialogTitle></DialogHeader>
                            <HabitForm closeForm={() => setIsFormOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {habits.map(habit => {
                    const todayLog = logsByHabit[habit.id]?.find(log => log.date === getTodayDateString());
                    const streak = calculateStreak(habit.id);
                    return (
                        <HabitCard 
                            key={habit.id} 
                            habit={habit}
                            log={todayLog}
                            allLogs={logsByHabit[habit.id] || []}
                            streak={streak}
                            onLog={handleLogHabit}
                            onDelete={handleDeleteHabit}
                        />
                    )
                })}
            </div>
            {habits.length === 0 && (
                 <div className="text-center text-muted-foreground py-12 border border-dashed rounded-xl">
                    <p className='text-lg'>No habits yet!</p>
                    <p>Click "New Habit" to start building a better you.</p>
                </div>
            )}
        </div>
    );
}
