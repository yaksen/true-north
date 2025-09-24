'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findTask, type FindTaskOutput } from '@/ai/flows/find-task-flow';
import type { TaskTemplateSlot, UserProfile } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';

interface TasksToolbarProps {
  assignees: UserProfile[];
  onFilterChange: (filters: { slot: string; assignee: string; search: string, hideCompleted: boolean }) => void;
}

const slots: (TaskTemplateSlot | 'all')[] = ['all', 'morning', 'midday', 'night'];

export function TasksToolbar({ assignees, onFilterChange }: TasksToolbarProps) {
  const { toast } = useToast();
  const [slotFilter, setSlotFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({
        slot: slotFilter,
        assignee: assigneeFilter,
        search: searchTerm,
        hideCompleted,
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, slotFilter, assigneeFilter, hideCompleted, onFilterChange]);
  
  const handleAiSearch = async () => {
    if (!searchTerm) {
        toast({ variant: 'destructive', title: 'No Input', description: 'Please provide a prompt.' });
        return;
    }
    setIsProcessing(true);
    
    try {
        const availableAssignees = assignees.map(a => ({ uid: a.id, name: a.name || a.email }));
        const result: FindTaskOutput = await findTask({ prompt: searchTerm, availableAssignees });
        
        setSlotFilter(result.slot || 'all');
        setAssigneeFilter(result.assigneeUid || 'all');
        setHideCompleted(result.hideCompleted || false);
        setSearchTerm(result.searchTerm || '');

        toast({ title: 'AI Search Complete', description: 'Filters have been updated.' });

    } catch (error) {
        console.error("AI Search Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not process the search query.' });
    } finally {
        setIsProcessing(false);
    }
  }

  const clearFilters = () => {
    setSlotFilter('all');
    setAssigneeFilter('all');
    setSearchTerm('');
    setHideCompleted(false);
  };

  return (
    <div className="flex flex-col gap-2 mb-4 p-4 border rounded-lg bg-card">
        <div className='flex gap-2 items-center'>
            <Sparkles className='h-5 w-5 text-primary flex-shrink-0' />
            <Input
                placeholder="Search titles or ask AI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
            />
            <Button size="sm" onClick={handleAiSearch} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                AI Search
            </Button>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t mt-2">
            <span className='text-sm font-medium text-muted-foreground'>Filters:</span>
            <Select value={slotFilter} onValueChange={(value) => setSlotFilter(value)}>
                <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {slots.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={(value) => setAssigneeFilter(value)}>
                <SelectTrigger className="w-48 h-9 text-sm"><SelectValue placeholder="Filter by assignee..."/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {assignees.map(a => <SelectItem key={a.id} value={a.id}>{a.name || a.email}</SelectItem>)}
                </SelectContent>
            </Select>
             <div className="flex items-center space-x-2">
                <Checkbox id="hide-completed" checked={hideCompleted} onCheckedChange={(checked) => setHideCompleted(checked as boolean)} />
                <label htmlFor="hide-completed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Hide completed
                </label>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
            </Button>
        </div>
    </div>
  );
}
