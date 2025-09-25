
'use client';

import { useState } from 'react';
import type { Lead, Project, Package, Service, Channel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { LeadForm } from './lead-form';
import { Edit, Trash2, Star, PlusCircle, QrCode, Contact, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activity-log';
import { FinanceForm } from './finance-form';
import { QrCodeModal } from '../qr-code-modal';
import { saveContactToGoogle } from '@/app/actions/google-contacts';

interface LeadCardDependencies {
    project: Project;
    packages: Package[];
    services: Service[];
    channels: Channel[];
}

interface LeadCardProps {
  lead: Lead;
  dependencies: LeadCardDependencies;
}

export function LeadCard({ lead, dependencies }: LeadCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isSavingToGoogle, setIsSavingToGoogle] = useState(false);
  const { project, packages, services, channels } = dependencies;

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'leads', lead.id));
      await logActivity(lead.projectId, 'lead_deleted', { name: lead.name }, user.uid);
      toast({ title: 'Success', description: 'Lead deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete lead.' });
    }
  };
  
  const handleStar = async (starred: boolean) => {
    try {
        await updateDoc(doc(db, 'leads', lead.id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const handleSaveToContacts = async () => {
    if (!project.googleContactsAccessToken) {
        toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to Google Contacts in Project Settings first.'});
        return;
    }
    setIsSavingToGoogle(true);
    const result = await saveContactToGoogle(lead, project.googleContactsAccessToken);
    if (result.success) {
        toast({ title: 'Success', description: result.message });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsSavingToGoogle(false);
  }
  
  const getStatusVariant = (status: Lead['status']) => {
    switch(status) {
        case 'new': return 'secondary';
        case 'contacted': return 'outline';
        case 'qualified': return 'default';
        case 'converted': return 'default';
        case 'lost': return 'destructive';
        default: return 'outline';
    }
  };

  const channel = channels.find(c => c.id === lead.channelId);

  return (
    <>
        <Card className="flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-start">
                <CardTitle className="truncate">{lead.name}</CardTitle>
                <Badge variant={getStatusVariant(lead.status)} className={cn("capitalize", lead.status === 'converted' && 'bg-green-500')}>{lead.status}</Badge>
            </div>
            <CardDescription className='truncate'>{lead.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-2">{lead.notes || 'No notes for this lead.'}</p>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
            {channel && <Badge variant="secondary">From: {channel.name}</Badge>}
            <div className='flex justify-between items-center w-full mt-2'>
                <Dialog open={isSaleOpen} onOpenChange={setIsSaleOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><PlusCircle className='mr-2' /> Add Sale</Button>
                    </DialogTrigger>
                    <DialogContent className='max-w-4xl'>
                        <DialogHeader><DialogTitle>Add Sale for {lead.name}</DialogTitle></DialogHeader>
                        <FinanceForm 
                            project={project}
                            packages={packages}
                            services={services}
                            leadId={lead.id}
                            closeForm={() => setIsSaleOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
                <div className='flex items-center'>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStar(!lead.starred)}>
                        <Star className={cn("h-4 w-4", lead.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsQrOpen(true)}>
                        <QrCode className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveToContacts} disabled={isSavingToGoogle}>
                       {isSavingToGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Contact className="h-4 w-4" />}
                    </Button>
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className='max-w-4xl'>
                            <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
                            <LeadForm lead={lead} projectId={project.id} channels={channels} closeForm={() => setIsEditOpen(false)} />
                        </DialogContent>
                    </Dialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </CardFooter>
        </Card>
        <QrCodeModal
            isOpen={isQrOpen}
            setIsOpen={setIsQrOpen}
            contact={{...lead, type: 'lead'}}
            organization={project.name}
        />
    </>
  );
}
