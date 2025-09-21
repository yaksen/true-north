

'use client';

import { useState } from 'react';
import type { Habit, HabitLog } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Flame, Edit, Trash2, Trophy, ShieldAlert } from 'lucide-react';
import { Progress } from '../ui/progress';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { HabitForm } from './habit-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';


interface HabitCardProps {
  habit: Habit;
  log: HabitLog | undefined;
  streak: number;
  onLog: (habit: Habit, log: HabitLog | undefined) => void;
  onDelete: (habitId: string) => void;
}

export function HabitCard({ habit, log, streak, onLog, onDelete }: HabitCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const progress = habit.target > 0 ? ((log?.count || 0) / habit.target) * 100 : 0;
  
  const isComplete = habit.type === 'good' && habit.target > 0 && progress >= 100;

  const cardColorClass = habit.type === 'good' ? 'border-green-500/20 hover:border-green-500/50' : 'border-red-500/20 hover:border-red-500/50';
  const buttonColorClass = habit.type === 'good' ? 'bg-green-500/80 hover:bg-green-500/90' : 'bg-red-500/80 hover:bg-red-500/90';
  
  const buttonText = habit.type === 'good'
    ? (isComplete ? "Target Reached" : "Log Completion")
    : "Logged a Slip-up";


  return (
    <Card className={cn("flex flex-col justify-between", cardColorClass)}>
      <CardHeader>
        <div className='flex justify-between items-start'>
            <div className='flex items-center gap-2'>
                <span className="text-3xl">{habit.emoji}</span>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className='flex items-center gap-1 text-orange-400'>
                                <Flame className='h-5 w-5'/>
                                <span className='font-bold text-lg'>{log?.count || 0}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{streak > 0 ? `${streak}-day streak!` : 'No streak yet. Keep going!'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <div className="flex items-center">
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Edit Habit</DialogTitle></DialogHeader>
                        <HabitForm habit={habit} closeForm={() => setIsEditOpen(false)} />
                    </DialogContent>
                </Dialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete the habit and all its logs. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(habit.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        <CardTitle>{habit.name}</CardTitle>
        <CardDescription>
            {isComplete && habit.reward ? (
                 <span className='text-primary font-semibold flex items-center gap-1'><Trophy className='h-4 w-4' /> {habit.reward}</span>
            ) : habit.type === 'bad' && habit.punishment ? (
                <span className='text-muted-foreground flex items-center gap-1'><ShieldAlert className='h-4 w-4' /> {habit.punishment}</span>
            ) : (
                habit.target > 0 ? `Target: ${habit.target} times ${habit.frequency}`: `Track as you go`
            )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {habit.target > 0 && (
            <div>
                <Progress value={progress} />
                <p className='text-xs text-muted-foreground text-right mt-1'>{log?.count || 0} / {habit.target}</p>
            </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={() => onLog(habit, log)} className={cn("w-full", buttonColorClass)} disabled={isComplete}>
            {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
}
