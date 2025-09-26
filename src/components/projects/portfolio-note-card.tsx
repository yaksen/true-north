

'use client';

import { useState } from 'react';
import type { PortfolioNote, PortfolioItem, Category, Service } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { PortfolioNoteForm } from './portfolio-note-form';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '../ui/badge';
import { PortfolioNoteView } from './portfolio-note-view';
import Image from 'next/image';

interface PortfolioNoteCardProps {
  note: PortfolioNote;
  items: PortfolioItem[];
  categories: Category[];
  services: Service[];
}

export function PortfolioNoteCard({ note, items, categories, services }: PortfolioNoteCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const category = categories.find(c => c.id === note.categoryId);
  const service = services.find(s => s.id === note.serviceId);

  const handleDelete = async () => {
    if (!user) return;
    try {
        const batch = writeBatch(db);
        
        // Delete the note
        const noteRef = doc(db, 'portfolioNotes', note.id);
        batch.delete(noteRef);

        // Delete all associated items
        items.forEach(item => {
            const itemRef = doc(db, 'portfolioItems', item.id);
            batch.delete(itemRef);
        });

        await batch.commit();

        toast({ title: 'Success', description: 'Portfolio note and its items have been deleted.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete portfolio note.' });
        console.error("Error deleting portfolio note:", error);
    }
  };
  
  const firstImageItem = items.find(item => item.fileType.startsWith('image/'));

  return (
    <>
        <Card className="flex flex-col cursor-pointer" onClick={() => setIsViewOpen(true)}>
            {firstImageItem && (
                <div className="relative aspect-video w-full">
                    <Image 
                        src={firstImageItem.fileUrl} 
                        alt={note.title} 
                        layout="fill" 
                        objectFit="cover"
                        className="rounded-t-lg"
                    />
                </div>
            )}
            <CardHeader>
                <CardTitle className="truncate">{note.title}</CardTitle>
                <CardDescription className='line-clamp-2'>{note.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 {(category || service) && (
                    <div className="flex flex-wrap gap-1">
                        {category && <Badge variant="secondary">{category.name}</Badge>}
                        {service && <Badge variant="outline">{service.name}</Badge>}
                    </div>
                )}
            </CardContent>
            <CardFooter className='flex justify-between items-center'>
                <p className='text-sm text-muted-foreground'>{items.length} item(s)</p>
                <div className='flex items-center'>
                    <Dialog open={isEditOpen} onOpenChange={(open) => { if (isViewOpen) return; setIsEditOpen(open); }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setIsEditOpen(true);}}><Edit className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className='max-w-xl'>
                            <DialogHeader><DialogTitle>Edit Portfolio Note</DialogTitle></DialogHeader>
                            <PortfolioNoteForm 
                                note={note}
                                projectId={note.projectId}
                                categories={categories}
                                services={services}
                                closeForm={() => setIsEditOpen(false)} 
                            />
                        </DialogContent>
                    </Dialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the note and all its items. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDelete(); }}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardFooter>
        </Card>
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="max-w-4xl">
                <PortfolioNoteView note={note} items={items} />
            </DialogContent>
        </Dialog>
    </>
  );
}
