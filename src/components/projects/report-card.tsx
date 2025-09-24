
'use client';

import { useState } from 'react';
import type { Report } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { File, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { logActivity } from '@/lib/activity-log';

interface ReportCardProps {
  report: Report;
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


export function ReportCard({ report }: ReportCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!user) return;
    try {
      // First, delete the file from Firebase Storage
      const fileRef = ref(storage, report.storagePath);
      await deleteObject(fileRef);

      // Then, delete the document from Firestore
      await deleteDoc(doc(db, 'reports', report.id));

      await logActivity(report.projectId, 'report_deleted', { name: report.name }, user.uid);
      toast({ title: 'Success', description: 'Report deleted.' });
    } catch (error) {
        console.error("Error deleting report: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete report.' });
    }
  };

  const handleDownload = async () => {
    try {
        const url = await getDownloadURL(ref(storage, report.storagePath));
        // Create a temporary link to trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = report.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error("Error downloading file: ", error);
        toast({ variant: 'destructive', title: 'Download Error', description: 'Could not download the file.' });
    }
  }

  const uploadedAt = report.createdAt ? new Date((report.createdAt as any).seconds * 1000) : null;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className='flex justify-between items-start'>
            <div className='flex items-start gap-3'>
                <File className="h-6 w-6 text-muted-foreground mt-1" />
                <div>
                    <CardTitle className="line-clamp-2 leading-tight">{report.name}</CardTitle>
                    {uploadedAt && (
                        <CardDescription>
                            Uploaded {formatDistanceToNow(uploadedAt, { addSuffix: true })}
                        </CardDescription>
                    )}
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
         <p className="text-xs text-muted-foreground">{formatBytes(report.sizeBytes)}</p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}><Download className='mr-2' /> Download</Button>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className='mr-2' /> Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the report file. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
