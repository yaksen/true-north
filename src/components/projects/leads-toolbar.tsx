
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paperclip, Mic, Camera, Loader2, Sparkles, X, UploadCloud, AudioLines } from 'lucide-react';
import type { Channel, LeadStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { findLead, type FindLeadOutput } from '@/ai/flows/find-lead-flow';
import Image from 'next/image';

interface LeadsToolbarProps {
  channels: Channel[];
  onFilterChange: (filters: { status: string; channel: string; search: string }) => void;
}

const leadStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'lost', 'converted'];

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
};

export function LeadsToolbar({ channels, onFilterChange }: LeadsToolbarProps) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textFile, setTextFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to handle live search
  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({
        status: statusFilter,
        channel: channelFilter,
        search: searchTerm,
      });
    }, 300); // Debounce by 300ms

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, statusFilter, channelFilter, onFilterChange]);


  const handleFilterChange = (key: 'status' | 'channel' | 'search', value: string) => {
    if (key === 'status') setStatusFilter(value);
    if (key === 'channel') setChannelFilter(value);
    if (key === 'search') setSearchTerm(value);
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.type.startsWith('image/')) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result as string);
            reader.readAsDataURL(file);
            setTextFile(null); // Clear other file type
        } else if (file.type.startsWith('text/')) {
            setTextFile(file);
            setImageFile(null);
            setImagePreview(null);
        } else {
            toast({ variant: 'destructive', title: 'Unsupported File', description: 'Please upload an image or a text file.' });
        }
    }
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = event => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioBlob(blob);
            audioChunksRef.current = []; // Clear chunks for next recording
            stream.getTracks().forEach(track => track.stop()); // Stop mic access
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setAudioBlob(null); // Clear previous recording
    } catch (error) {
        toast({ variant: 'destructive', title: 'Microphone Error', description: 'Could not access the microphone.' });
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };
  
  const clearMedia = () => {
    setImageFile(null);
    setImagePreview(null);
    setTextFile(null);
    setAudioBlob(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  const handleAiSearch = async () => {
    if (!searchTerm && !imageFile && !textFile && !audioBlob) {
        toast({ variant: 'destructive', title: 'No Input', description: 'Please provide a prompt or a file.' });
        return;
    }
    setIsProcessing(true);
    
    try {
        const imageDataUri = imageFile ? await fileToDataUri(imageFile) : undefined;
        const textDataUri = textFile ? await fileToDataUri(textFile) : undefined;
        const audioFile = audioBlob ? new File([audioBlob], "recording.webm", { type: audioBlob.type }) : undefined;
        const audioDataUri = audioFile ? await fileToDataUri(audioFile) : undefined;

        const availableChannels = channels.map(({ id, name }) => ({ id, name }));

        const result: FindLeadOutput = await findLead({
            prompt: searchTerm,
            imageDataUri,
            fileDataUri: textDataUri,
            audioDataUri,
            availableChannels,
        });

        const newFilters = {
            status: result.status || 'all',
            channel: result.channelId || 'all',
            search: result.searchTerm || '',
        };
        
        // This will trigger the useEffect to update the table
        setStatusFilter(newFilters.status);
        setChannelFilter(newFilters.channel);
        setSearchTerm(newFilters.search);
        
        toast({ title: 'AI Search Complete', description: 'Filters have been updated.' });

    } catch (error) {
        console.error("AI Search Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not process the search query.' });
    } finally {
        setIsProcessing(false);
    }
  }

  const clearAllFilters = () => {
    setStatusFilter('all');
    setChannelFilter('all');
    setSearchTerm('');
  }

  return (
    <div className="flex flex-col gap-2 mb-4 p-4 border rounded-lg bg-card">
        <div className='flex gap-2 items-center'>
            <Sparkles className='h-5 w-5 text-primary flex-shrink-0' />
            <Input
                placeholder="Search leads or ask AI..."
                value={searchTerm}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="h-9"
            />
             <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,text/plain" />

            <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? <AudioLines className="h-4 w-4 text-red-500 animate-pulse" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={handleAiSearch} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                AI Search
            </Button>
        </div>
        {(imagePreview || textFile || audioBlob) && (
            <div className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                {imagePreview && <Image src={imagePreview} alt="Preview" width={32} height={32} className="rounded" />}
                {textFile && <span>{textFile.name}</span>}
                {audioBlob && <audio src={URL.createObjectURL(audioBlob)} controls className='h-8'/>}
                <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={clearMedia}><X className="h-4 w-4" /></Button>
            </div>
        )}
        <div className="flex items-center gap-2 pt-2 border-t mt-2">
            <span className='text-sm font-medium text-muted-foreground'>Manual Filters:</span>
            <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {leadStatuses.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
             <Select value={channelFilter} onValueChange={(value) => handleFilterChange('channel', value)}>
                <SelectTrigger className="w-48 h-9 text-sm">
                    <SelectValue placeholder="Filter by channel..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {channels.map(channel => (
                        <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
            </Button>
        </div>
    </div>
  );
}
