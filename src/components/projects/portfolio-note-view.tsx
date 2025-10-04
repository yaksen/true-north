

'use client';

import { useState } from 'react';
import type { PortfolioNote, PortfolioItem, Project } from '@/lib/types';
import { DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Download, File, Image as ImageIcon, Music, Video, Archive, Loader2, Link as LinkIcon, PlusCircle, Upload } from 'lucide-react';
import { Badge } from '../ui/badge';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';
import { PortfolioItemForm } from './portfolio-item-form';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { uploadToFilelu } from '@/app/actions/filelu';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PortfolioNoteViewProps {
    note: PortfolioNote;
    items: PortfolioItem[];
    project: Project;
}

const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (fileType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    if (fileType === 'link') return <LinkIcon className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
}

export function PortfolioNoteView({ note, items, project }: PortfolioNoteViewProps) {
    const { toast } = useToast();
    const [isItemFormOpen, setIsItemFormOpen] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleDownloadAll = async () => {
        setIsZipping(true);
        const zip = new JSZip();
        
        try {
            const filePromises = items
                .filter(item => item.fileType !== 'link')
                .map(async (item) => {
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
            toast({ variant: 'destructive', title: 'Download Error', description: 'Could not download all files.' });
        } finally {
            setIsZipping(false);
        }
    };
    
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!project.fileluApiKey) {
            toast({ variant: 'destructive', title: 'API Key Missing', description: 'Please set the Filelu API key in project settings.' });
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('apiKey', project.fileluApiKey);

            const result = await uploadToFilelu(formData);

            if (result.success && result.url) {
                await addDoc(collection(db, 'portfolioItems'), {
                    portfolioNoteId: note.id,
                    fileName: file.name,
                    fileUrl: result.url,
                    fileType: file.type,
                    fileSize: file.size,
                    createdAt: serverTimestamp(),
                });
                toast({ title: 'Success', description: 'File uploaded and added to portfolio.' });
            } else {
                throw new Error(result.message || 'Upload failed');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Upload Error', description: error.message || 'Could not upload file.' });
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div>
            <DialogHeader>
                <DialogTitle className='text-2xl'>{note.title}</DialogTitle>
                <DialogDescription>{note.description}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 my-4">
                {note.tags && note.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
            
            <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" onClick={handleDownloadAll} disabled={isZipping || items.length === 0}>
                    {isZipping ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <Archive className="mr-2 h-4 w-4" />}
                    Download All as ZIP
                </Button>
                <Button asChild variant="outline">
                    <label htmlFor="portfolio-file-upload" className='cursor-pointer'>
                         {isUploading ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <Upload className="mr-2 h-4 w-4" />}
                        Upload File
                    </label>
                </Button>
                <Input id="portfolio-file-upload" type="file" onChange={handleFileUpload} className="hidden" />
                 <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className='mr-2 h-4 w-4'/> Add Link</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add Link to &quot;{note.title}&quot;</DialogTitle></DialogHeader>
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
                                    {item.fileSize > 0 && <span className="text-xs text-muted-foreground">{(item.fileSize / 1024 / 1024).toFixed(2)} MB</span>}
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
