'use client';

import { useState, useMemo } from 'react';
import type { Project, Report } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '@/lib/activity-log';
import { FileUp, Loader2 } from 'lucide-react';
import { ReportCard } from './report-card';
import { ScrollArea } from '../ui/scroll-area';

interface ProjectReportsProps {
  project: Project;
  reports: Report[];
}

export function ProjectReports({ project, reports }: ProjectReportsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    const storagePath = `projects/${project.id}/reports/${selectedFile.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your file.' });
        setIsUploading(false);
      },
      async () => {
        const fileMetadata = uploadTask.snapshot.metadata;
        
        await addDoc(collection(db, 'reports'), {
            projectId: project.id,
            name: fileMetadata.name,
            storagePath: fileMetadata.fullPath,
            uploadedByUid: user.uid,
            uploadedAt: serverTimestamp(),
            sizeBytes: fileMetadata.size,
            mimeType: fileMetadata.contentType,
        });

        await logActivity(project.id, 'report_uploaded', { name: fileMetadata.name }, user.uid);
        
        toast({ title: 'Success', description: 'File uploaded successfully.' });
        setIsUploading(false);
        setSelectedFile(null);
      }
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Reports</CardTitle>
            <CardDescription>View and manage all uploaded reports for this project.</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-22rem)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                        {reports.map(report => (
                            <ReportCard key={report.id} report={report} />
                        ))}
                    </div>
                </ScrollArea>
            ) : (
                <div className="text-center text-muted-foreground py-12">
                    <p>No reports uploaded yet.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Report</CardTitle>
            <CardDescription>Select a file to upload to the project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            {selectedFile && !isUploading && (
              <div className="text-sm text-muted-foreground">
                Selected: {selectedFile.name}
              </div>
            )}
            {isUploading && (
              <div className='space-y-2'>
                <Progress value={uploadProgress} />
                <p className='text-sm text-muted-foreground'>{Math.round(uploadProgress)}% uploaded...</p>
              </div>
            )}
            <Button onClick={handleUpload} disabled={!selectedFile || isUploading} className='w-full'>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Upload File
            </Button>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Generate Export</CardTitle>
                <CardDescription>Bundle project data into a downloadable archive.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="secondary" className='w-full' disabled>
                    Generate ZIP (Coming Soon)
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
