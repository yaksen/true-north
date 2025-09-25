
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findChannel, type FindChannelOutput } from '@/ai/flows/find-channel-flow';
import { ChannelStatus, ChannelType } from '@/lib/types';

interface ChannelsToolbarProps {
  onFilterChange: (filters: { status: string; type: string; search: string }) => void;
}

const channelStatuses: (ChannelStatus | 'all')[] = ['all', 'new', 'active', 'inactive', 'closed'];
const channelTypes: (ChannelType | 'all')[] = ['all', 'Social', 'Communication', 'Community', 'Money / Business', 'Learning', 'Entertainment', 'Tech / Tools', 'Inspirations', 'Other'];


export function ChannelsToolbar({ onFilterChange }: ChannelsToolbarProps) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({
        status: statusFilter,
        type: typeFilter,
        search: searchTerm,
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, statusFilter, typeFilter, onFilterChange]);
  
  const handleAiSearch = async () => {
    if (!searchTerm) {
        toast({ variant: 'destructive', title: 'No Input', description: 'Please provide a prompt.' });
        return;
    }
    setIsProcessing(true);
    
    try {
        const result: FindChannelOutput = await findChannel({ prompt: searchTerm });
        
        setStatusFilter(result.status || 'all');
        setTypeFilter(result.type || 'all');
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
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="flex flex-col gap-2 mb-4 p-4 border rounded-lg bg-card">
        <div className='flex gap-2 items-center'>
            <Sparkles className='h-5 w-5 text-primary flex-shrink-0' />
            <Input
                placeholder="Search names or ask AI..."
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
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {channelStatuses.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
                <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {channelTypes.map(type => (
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
