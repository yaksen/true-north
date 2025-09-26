

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findPrompt, type FindPromptOutput } from '@/ai/flows/find-prompt-flow';
import { PromptType } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const promptTypes: (PromptType | 'all')[] = ["all", "Content Creation", "Marketing & Ads", "Sales Outreach", "Lead Nurturing", "Customer Support", "Task Automation", "Finance & Reporting", "Research & Insights", "Brainstorming & Idea Generation", "Personal Productivity", "Technical Help & Coding", "Training & Education", "Strategy & Planning"];

interface PromptsToolbarProps {
  onFilterChange: (filters: { searchTerm: string; type: string; }) => void;
}

export function PromptsToolbar({ onFilterChange }: PromptsToolbarProps) {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({
        searchTerm,
        type: typeFilter,
      });
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, typeFilter, onFilterChange]);
  
  const handleAiSearch = async () => {
    if (!searchTerm) {
      toast({ variant: 'destructive', title: 'No Input', description: 'Please provide a prompt.' });
      return;
    }
    setIsProcessing(true);
    try {
      const result: FindPromptOutput = await findPrompt({ prompt: searchTerm });
      setSearchTerm(result.searchTerm || '');
      setTypeFilter(result.category || 'all');
      toast({ title: 'AI Search Complete', description: 'Filters have been updated.' });
    } catch (error) {
      console.error("AI Search Error:", error);
      toast({ variant: 'destructive', title: 'AI Error', description: 'Could not process search query.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
  };

  return (
    <div className="flex flex-col gap-2 mb-4 p-4 border rounded-lg bg-card w-full">
        <div className='flex gap-2 items-center'>
            <Sparkles className='h-5 w-5 text-primary flex-shrink-0' />
            <Input
                placeholder="Search prompts or ask AI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
            />
            <Button size="sm" onClick={handleAiSearch} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                AI Search
            </Button>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t mt-2 flex-wrap">
            <span className='text-sm font-medium text-muted-foreground'>Filters:</span>
             <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 h-9 text-sm">
                    <SelectValue placeholder="Filter by type..." />
                </SelectTrigger>
                <SelectContent>
                    {promptTypes.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
            </Button>
        </div>
    </div>
  );
}
