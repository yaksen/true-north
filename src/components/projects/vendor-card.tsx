
'use client';

import { useState } from 'react';
import type { Vendor, Project, Channel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { VendorForm } from './vendor-form';
import { Edit, Trash2, Star, PlusCircle, QrCode, Contact, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activity-log';
import { QrCodeModal } from '../qr-code-modal';
import { saveContactToGoogle } from '@/app/actions/google-contacts';

interface VendorCardDependencies {
    project: Project;
    channels: Channel[];
}

interface VendorCardProps {
  vendor: Vendor;
  dependencies: VendorCardDependencies;
}

export function VendorCard({ vendor, dependencies }: VendorCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isSavingToGoogle, setIsSavingToGoogle] = useState(false);
  const { project, channels } = dependencies;

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'vendors', vendor.id));
      await logActivity(vendor.projectId, 'vendor_deleted' as any, { name: vendor.name }, user.uid);
      toast({ title: 'Success', description: 'Vendor deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete vendor.' });
    }
  };
  
  const handleStar = async (starred: boolean) => {
    try {
        await updateDoc(doc(db, 'vendors', vendor.id), { starred });
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
    const result = await saveContactToGoogle(vendor, project.googleContactsAccessToken);
    if (result.success) {
        toast({ title: 'Success', description: result.message });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsSavingToGoogle(false);
  }

  const channel = channels.find(c => c.id === vendor.channelId);

  return (
    <>
        <Card className="flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-start">
                <CardTitle className="truncate">{vendor.name}</CardTitle>
                <Badge variant="secondary" className="capitalize">{vendor.serviceType}</Badge>
            </div>
            <CardDescription className='truncate'>{vendor.contactName || vendor.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-2">{vendor.notes || 'No notes for this vendor.'}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
            <div className='flex flex-col items-start gap-2 w-full'>
                {channel && <Badge variant="secondary">From: {channel.name}</Badge>}
                <div className='flex justify-between items-center w-full mt-2'>
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">Edit</Button>
                        </DialogTrigger>
                        <DialogContent className='max-w-4xl'>
                            <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
                            <VendorForm vendor={vendor} projectId={project.id} channels={channels} closeForm={() => setIsEditOpen(false)} />
                        </DialogContent>
                    </Dialog>
                    <div className='flex items-center'>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStar(!vendor.starred)}>
                            <Star className={cn("h-4 w-4", vendor.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsQrOpen(true)}>
                            <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveToContacts} disabled={isSavingToGoogle}>
                        {isSavingToGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Contact className="h-4 w-4" />}
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
                </div>
            </div>
        </CardFooter>
        </Card>
        <QrCodeModal
            isOpen={isQrOpen}
            setIsOpen={setIsQrOpen}
            contact={{...vendor, type: 'vendor'}}
            organization={project.name}
        />
    </>
  );
}
