

'use client';

import { useState } from 'react';
import type { Category, Service, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { ServiceForm } from './service-form';
import { Edit, Trash2, Star, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn, formatCurrency } from '@/lib/utils';
import { logActivity } from '@/lib/activity-log';
import { Badge } from '../ui/badge';

interface ServiceCardProps {
  service: Service;
  project: Project;
  categories: Category[];
  onStar: (id: string, starred: boolean) => void;
  displayCurrency: string;
}

const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};

export function ServiceCard({ service, project, categories, onStar, displayCurrency }: ServiceCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'services', service.id));
        await logActivity(service.projectId, 'service_deleted', { name: service.name }, user.uid);
        toast({ title: 'Success', description: 'Service deleted.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete service.' });
    }
  };

  const category = categories.find(c => c.id === service.categoryId);
  const convertedAmount = convert(service.price, service.currency, displayCurrency);

  return (
    <Card className="flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-start">
                <CardTitle className="truncate flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    {service.name}
                </CardTitle>
                 <div className='flex items-center -mr-2'>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStar(service.id, !service.starred)}>
                        <Star className={cn("h-4 w-4", service.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                    </Button>
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className='max-w-4xl'>
                            <DialogHeader><DialogTitle>Edit Service</DialogTitle></DialogHeader>
                            <ServiceForm service={service} project={project} categories={categories} closeForm={() => setIsEditOpen(false)} />
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
            <CardDescription>{category?.name || 'Uncategorized'}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-2">{service.notes || 'No notes for this service.'}</p>
        </CardContent>
        <CardFooter className="flex justify-between items-end">
            <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="text-lg font-bold">{formatCurrency(convertedAmount, displayCurrency)}</p>
            </div>
            <Badge variant="secondary">{service.finishTime}</Badge>
        </CardFooter>
    </Card>
  );
}
