

'use client';

import { useState } from 'react';
import type { Partner, Project, Channel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { PartnerForm } from './partner-form';
import { Edit, Trash2, Star, PlusCircle, QrCode, Contact, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activity-log';
import { QrCodeModal } from '../qr-code-modal';

interface PartnerCardDependencies {
    project: Project;
    channels: Channel[];
    onStar: (id: string, starred: boolean) => void;
}

interface PartnerCardProps {
  partner: Partner;
  dependencies: PartnerCardDependencies;
}

export function PartnerCard({ partner, dependencies }: PartnerCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const { project, channels, onStar } = dependencies;

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'partners', partner.id));
      await logActivity(partner.projectId, 'partner_deleted' as any, { name: partner.name }, user.uid);
      toast({ title: 'Success', description: 'Partner deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete partner.' });
    }
  };
  
  const handleStar = async (starred: boolean) => {
    onStar(partner.id, starred);
  }

  const channel = channels.find(c => c.id === partner.channelId);

  return (
    <>
        <Card className="flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-start">
                <CardTitle className="truncate">{partner.name}</CardTitle>
                <Badge variant="secondary" className="capitalize">{partner.roleInProject}</Badge>
            </div>
            <CardDescription className='truncate'>{partner.contactName || partner.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-2">{partner.notes || 'No notes for this partner.'}</p>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
            {channel && <Badge variant="secondary">From: {channel.name}</Badge>}
            <div className='w-full pt-2'>
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">Edit</Button>
                    </DialogTrigger>
                    <DialogContent className='max-w-4xl'>
                        <DialogHeader><DialogTitle>Edit Partner</DialogTitle></DialogHeader>
                        <PartnerForm partner={partner} projectId={project.id} channels={channels} closeForm={() => setIsEditOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>
             <div className='flex items-center w-full justify-center'>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStar(!partner.starred)}>
                    <Star className={cn("h-4 w-4", partner.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsQrOpen(true)}>
                    <QrCode className="h-4 w-4" />
                </Button>
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
        </CardFooter>
        </Card>
        <QrCodeModal
            isOpen={isQrOpen}
            setIsOpen={setIsQrOpen}
            contact={{...partner, type: 'partner'}}
            organization={project.name}
        />
    </>
  );
}
