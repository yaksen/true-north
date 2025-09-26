

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { uploadFileToDrive } from '@/app/actions/google-drive';
import { doc, getDoc } from 'firebase/firestore';
import { Project } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  file: z.instanceof(File, { message: 'A file is required.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface PortfolioItemFormProps {
  projectId: string;
  portfolioNoteId: string;
  closeForm: () => void;
}

export function PortfolioItemForm({ projectId, portfolioNoteId, closeForm }: PortfolioItemFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('file', file);
      setFileName(file.name);
    }
  };

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setIsSubmitting(true);

    try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists()) {
            throw new Error("Project not found.");
        }
        const project = projectSnap.data() as Project;

        if (!project.googleDriveAccessToken) {
            toast({ variant: 'destructive', title: 'Google Drive not connected', description: 'Please connect to Google Drive in Project Settings first.' });
            setIsSubmitting(false);
            return;
        }
        
        const itemId = uuidv4();
        const file = values.file;
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('accessToken', project.googleDriveAccessToken);
        formData.append('folderPath', ['true_north', 'portfolio', portfolioNoteId].join(','));
        formData.append('fileName', `${itemId}-${file.name}`);

        const uploadResult = await uploadFileToDrive(formData);

        if (!uploadResult.success || !uploadResult.link) {
            throw new Error(uploadResult.message || 'Failed to upload to Google Drive.');
        }

        await addDoc(collection(db, 'portfolioItems'), {
            portfolioNoteId: portfolioNoteId,
            fileName: file.name,
            fileUrl: uploadResult.link,
            fileType: file.type,
            fileSize: file.size,
            createdAt: serverTimestamp(),
        });
        
        toast({ title: 'Success', description: 'Item uploaded and added to portfolio.' });
        closeForm();

    } catch (error: any) {
        console.error("Error uploading portfolio item:", error);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <FormControl>
                <div className="relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary">
                    <div className='text-center text-muted-foreground'>
                        <UploadCloud className='mx-auto h-8 w-8' />
                        <p>{fileName || "Click to upload a file"}</p>
                    </div>
                    <Input id="file-upload" type="file" onChange={handleFileChange} className='absolute inset-0 w-full h-full opacity-0 cursor-pointer' />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload Item
          </Button>
        </div>
      </form>
    </Form>
  );
}
