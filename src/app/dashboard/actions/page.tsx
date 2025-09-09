
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Action, ActionPriority, ActionStatus } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/actions/columns';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ActionForm } from '@/components/actions/action-form';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ActionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ActionStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ActionPriority | 'all'>('all');

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, `users/${user.uid}/actions`));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const actionsData: Action[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        actionsData.push({ 
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            dueDate: data.dueDate?.toDate(),
        } as Action);
      });
      setActions(actionsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredActions = actions.filter(action => {
      const statusMatch = statusFilter === 'all' || action.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || action.priority === priorityFilter;
      return statusMatch && priorityMatch;
  })

  const columns = getColumns({ actions, setActions });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Actions</h1>
        <div className="flex items-center gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    New Action
                </Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Action</DialogTitle>
                    <DialogDescription>
                    Add the details of your new action below.
                    </DialogDescription>
                </DialogHeader>
                <ActionForm closeForm={() => setIsCreateDialogOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
      </div>
      <DataTable 
        columns={columns} 
        data={filteredActions} 
        toolbar={
            <div className='flex gap-2'>
                 <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ActionStatus | 'all')}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as ActionPriority | 'all')}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        }
       />
    </>
  );
}
