
'use client';

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
import { Flame, Repeat } from 'lucide-react';
import { Progress } from '../ui/progress';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"


interface HabitCardProps {
  habit: Habit;
  log: HabitLog | undefined;
  streak: number;
  onLog: (habit: Habit, log: HabitLog | undefined) => void;
}

export function HabitCard({ habit, log, streak, onLog }: HabitCardProps) {

  const progress = habit.target > 0 ? ((log?.count || 0) / habit.target) * 100 : 0;
  const isComplete = habit.target > 0 && progress >= 100;

  const cardColorClass = habit.type === 'good' ? 'border-green-500/20 hover:border-green-500/50' : 'border-red-500/20 hover:border-red-500/50';
  const buttonColorClass = habit.type === 'good' ? 'bg-green-500/80 hover:bg-green-500/90' : 'bg-red-500/80 hover:bg-red-500/90';

  return (
    <Card className={cn("flex flex-col justify-between", cardColorClass)}>
      <CardHeader>
        <div className='flex justify-between items-start'>
            <span className="text-3xl">{habit.emoji}</span>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <div className='flex items-center gap-1 text-orange-400'>
                            <Flame className='h-5 w-5'/>
                            <span className='font-bold text-lg'>{streak}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{streak > 0 ? `${streak}-day streak!` : 'No streak yet. Keep going!'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

        </div>
        <CardTitle>{habit.name}</CardTitle>
        <CardDescription>
            {habit.target > 0 ? `Target: ${habit.target} times ${habit.frequency}`: `Track as you go`}
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
            {isComplete ? "Target Reached" : "Log Completion"}
        </Button>
      </CardFooter>
    </Card>
  );
}
