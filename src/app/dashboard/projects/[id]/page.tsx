
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project, Action, Transaction, Lead } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { ProjectHeader } from '@/components/projects/project-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectTasks } from '@/components/projects/project-tasks';
import { ProjectFinance } from '@/components/projects/project-finance';
import { ProjectOverview } from '@/components/project/project-overview';

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Action[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const projectRef = doc(db, `users/${user.uid}/projects`, id);
    const unsubscribeProject = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        const projectData = { id: docSnap.id, ...docSnap.data() } as Project;
        if (projectData.private && !projectData.members.includes(user.uid)) {
            router.push('/dashboard/projects');
            return;
        }
        setProject(projectData);
      } else {
        router.push('/dashboard/projects');
      }
      setLoading(false);
    });

    // Fetch associated tasks (actions)
    const tasksQuery = query(collection(db, `users/${user.uid}/actions`), where('projectId', '==', id));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
            deadline: doc.data().deadline?.toDate(),
        } as Action));
        setTasks(data);
    });

    // Fetch associated transactions
    const transactionsQuery = query(collection(db, `users/${user.uid}/transactions`), where('projectId', '==', id));
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
        } as Transaction));
        setTransactions(data);
    });

    // Fetch all leads to link names to tasks
    const leadsQuery = query(collection(db, `users/${user.uid}/leads`));
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
    });


    return () => {
        unsubscribeProject();
        unsubscribeTasks();
        unsubscribeTransactions();
        unsubscribeLeads();
    };
  }, [user, id, router]);

  if (loading || !project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
        <ProjectHeader project={project} />

        <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="finance">Finance</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="notes">Notes & Files</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
               <ProjectOverview project={project} />
            </TabsContent>
            <TabsContent value="tasks">
                <ProjectTasks tasks={tasks} allLeads={leads} projectId={project.id} />
            </TabsContent>
            <TabsContent value="finance">
                <ProjectFinance transactions={transactions} project={project} />
            </TabsContent>
             <TabsContent value="team">
                {/* Team Component Here */}
            </TabsContent>
             <TabsContent value="notes">
                {/* Notes/Attachments Component Here */}
            </TabsContent>
        </Tabs>
    </div>
  );
}
