

'use client';

import { useState } from 'react';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface CustomizeTabsDialogProps {
  project: Project;
  closeDialog: () => void;
}

const allProjectTabs = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'workspace', label: 'Workspace' },
    { value: 'leads', label: 'Leads' },
    { value: 'channels', label: 'Channels' },
    { value: 'vendors', label: 'Vendors' },
    { value: 'partners', label: 'Partners' },
    { value: 'products', label: 'P&S' },
    { value: 'billing', label: 'Billing' },
    { value: 'finance', label: 'Finance' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'templates', label: 'Templates' },
    { value: 'settings', label: 'Settings' },
];

export function CustomizeTabsDialog({ project, closeDialog }: CustomizeTabsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hiddenTabs, setHiddenTabs] = useState<string[]>(project.hiddenTabs || []);

  const handleCheckedChange = (tabValue: string, checked: boolean) => {
    setHiddenTabs(prev => {
      if (checked) {
        // If checked, it means it's visible, so remove from hiddenTabs
        return prev.filter(t => t !== tabValue);
      } else {
        // If unchecked, it means it's hidden, so add to hiddenTabs
        return [...prev, tabValue];
      }
    });
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, { hiddenTabs });
      toast({ title: 'Success', description: 'Your view preferences have been saved.' });
      closeDialog();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save your preferences.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
        <ScrollArea className="h-72">
            <div className="grid grid-cols-2 gap-4 p-1">
                {allProjectTabs.map(tab => (
                    <div key={tab.value} className="flex items-center space-x-2">
                        <Checkbox
                            id={tab.value}
                            checked={!hiddenTabs.includes(tab.value)}
                            onCheckedChange={(checked) => handleCheckedChange(tab.value, !!checked)}
                            disabled={tab.value === 'dashboard' || tab.value === 'settings'}
                        />
                        <Label htmlFor={tab.value} className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                            {tab.label}
                        </Label>
                    </div>
                ))}
            </div>
      </ScrollArea>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
