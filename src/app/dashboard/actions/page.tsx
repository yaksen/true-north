
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Action, ActionPriority, ActionStatus, Lead } from '@/lib/types';
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
import { CreateActionDialog } from '@/components/actions/create-action-dialog';

export default function ActionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [actions, setActions] = useState<Action[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ActionStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ActionPriority | 'all'>('all');

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const actionsQuery = query(collection(db, `users/${user.uid}/actions`));
    const unsubscribeActions = onSnapshot(actionsQuery, (querySnapshot) => {
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

    const leadsQuery = query(collection(db, `users/${user.uid}/leads`));
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
        setLeads(leadsData);
    });

    return () => {
        unsubscribeActions();
        unsubscribeLeads();
    }
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
           <CreateActionDialog leads={leads} />
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
