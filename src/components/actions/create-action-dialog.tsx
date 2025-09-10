
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
import { Lead, Action } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

interface CreateActionDialogProps {
    leads: Lead[];
    defaultLeadId?: string;
    buttonText?: string;
    dialogTitle?: string;
    dialogDescription?: string;
    defaultAction?: Partial<Action>;
}

export function CreateActionDialog({ leads, defaultLeadId, buttonText, dialogTitle, dialogDescription, defaultAction }: CreateActionDialogProps) {
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
                <Button size="sm" className="gap-1 w-full justify-center">
                    <PlusCircle className="h-4 w-4" />
                    {buttonText || 'New Action'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dialogTitle || 'Create New Action'}</DialogTitle>
                    <DialogDescription>
                        {dialogDescription || (defaultLeadId ? 'Add a new action for this lead.' : 'Select a lead to create a new action.')}
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
                        action={defaultAction as Action}
                        leads={leads}
                        defaultLeadId={selectedLeadId || defaultLeadId}
                        closeForm={() => setIsOpen(false)} 
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
