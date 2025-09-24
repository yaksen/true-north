'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findPackage, type FindPackageOutput } from '@/ai/flows/find-package-flow';

interface PackagesToolbarProps {
  onFilterChange: (filters: { type: 'all' | 'custom' | 'fixed'; search: string }) => void;
}

type PackageTypeFilter = 'all' | 'custom' | 'fixed';

export function PackagesToolbar({ onFilterChange }: PackagesToolbarProps) {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<PackageTypeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({
        type: typeFilter,
        search: searchTerm,
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
        const result: FindPackageOutput = await findPackage({ prompt: searchTerm });
        
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

  return (
    <div className="flex flex-col gap-2 mb-4 p-4 border rounded-lg bg-card">
        <div className='flex gap-2 items-center'>
            <Sparkles className='h-5 w-5 text-primary flex-shrink-0' />
            <Input
                placeholder="Search packages or ask AI..."
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
            <div className='flex items-center gap-1 p-1 bg-muted rounded-lg'>
                {(['all', 'custom', 'fixed'] as const).map(filter => (
                    <Button 
                        key={filter} 
                        size='sm' 
                        variant={typeFilter === filter ? 'secondary' : 'ghost'}
                        onClick={() => setTypeFilter(filter)}
                        className='capitalize'
                    >
                        {filter}
                    </Button>
                ))}
            </div>
             <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setTypeFilter('all'); }}>
                Clear All
            </Button>
        </div>
    </div>
  );
}
