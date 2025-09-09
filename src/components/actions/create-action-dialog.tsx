
'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { ActionForm } from './action-form';
import { useState } from 'react';
import { Lead } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

interface CreateActionDialogProps {
    leads: Lead[];
    defaultLeadId?: string;
}

export function CreateActionDialog({ leads, defaultLeadId }: CreateActionDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>(defaultLeadId);

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            // Reset selected lead when dialog closes, unless it was a default
            if (!defaultLeadId) {
                setSelectedLeadId(undefined);
            }
        }
        setIsOpen(open);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    New Action
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Action</DialogTitle>
                    <DialogDescription>
                        {defaultLeadId ? 'Add a new action for this lead.' : 'Select a lead to create a new action.'}
                    </DialogDescription>
                </DialogHeader>
                
                {!defaultLeadId && !selectedLeadId && (
                     <div className='space-y-2 py-4'>
                        <Label>Which lead is this action for?</Label>
                        <Select onValueChange={setSelectedLeadId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a lead..." />
                            </SelectTrigger>
                            <SelectContent>
                                {leads.map(lead => (
                                    <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                )}
                
                {(selectedLeadId || defaultLeadId) && (
                     <ActionForm 
                        leads={leads}
                        defaultLeadId={selectedLeadId || defaultLeadId}
                        closeForm={() => setIsOpen(false)} 
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
