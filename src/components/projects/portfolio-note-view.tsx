

'use client';

import { useState } from 'react';
import type { PortfolioNote, PortfolioItem } from '@/lib/types';
import { DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Download, File, Image as ImageIcon, Music, Video, Archive, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';
import { PortfolioItemForm } from './portfolio-item-form';

interface PortfolioNoteViewProps {
    note: PortfolioNote;
    items: PortfolioItem[];
}

const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (fileType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
}

export function PortfolioNoteView({ note, items }: PortfolioNoteViewProps) {
    const [isItemFormOpen, setIsItemFormOpen] = useState(false);
    const [isZipping, setIsZipping] = useState(false);

    const handleDownloadAll = async () => {
        setIsZipping(true);
        const zip = new JSZip();
        
        try {
            const filePromises = items.map(async (item) => {
                const response = await fetch(item.fileUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${item.fileName}`);
                }
                const blob = await response.blob();
                zip.file(item.fileName, blob);
            });

            await Promise.all(filePromises);
            
            zip.generateAsync({ type: "blob" }).then((content) => {
                saveAs(content, `${note.title.replace(/\s/g, '_')}.zip`);
            });

        } catch (error) {
            console.error("Error creating zip file:", error);
            // Consider showing a toast message
        } finally {
            setIsZipping(false);
        }
    };


    return (
        <div>
            <DialogHeader>
                <DialogTitle className='text-2xl'>{note.title}</DialogTitle>
                <DialogDescription>{note.description}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 my-4">
                {note.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
            
            <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" onClick={handleDownloadAll} disabled={isZipping || items.length === 0}>
                    {isZipping ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <Archive className="mr-2 h-4 w-4" />}
                    Download All as ZIP
                </Button>
                 <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Item</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add Item to &quot;{note.title}&quot;</DialogTitle></DialogHeader>
                        <PortfolioItemForm 
                            projectId={note.projectId}
                            portfolioNoteId={note.id}
                            closeForm={() => setIsItemFormOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>
            
            <ScrollArea className='h-96 pr-4'>
                <div className='space-y-2'>
                    {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                                {getFileIcon(item.fileType)}
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm truncate">{item.fileName}</span>
                                    <span className="text-xs text-muted-foreground">{(item.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                            </div>
                             <a href={item.fileUrl} download={item.fileName} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </a>
                        </div>
                    ))}
                     {items.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-16">No items uploaded to this note yet.</p>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
