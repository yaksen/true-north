
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project, Action, Transaction, Lead, UserProfile, Note } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { ProjectHeader } from '@/components/projects/project-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectTasks } from '@/components/projects/project-tasks';
import { ProjectFinance } from '@/components/projects/project-finance';
import { ProjectTeam } from '@/components/projects/project-team';
import { ProjectNotes } from '@/components/projects/project-notes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectDashboard } from '@/components/projects/project-dashboard';

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Action[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
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

    // Fetch all users for team management
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeAllUsers = onSnapshot(usersQuery, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as UserProfile)));
    });
    
    // Fetch notes
    const notesQuery = query(collection(db, `users/${user.uid}/projects/${id}/notes`));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
        } as Note));
        setNotes(data);
    });


    return () => {
        unsubscribeProject();
        unsubscribeTasks();
        unsubscribeTransactions();
        unsubscribeLeads();
        unsubscribeAllUsers();
        unsubscribeNotes();
    };
  }, [user, id, router]);

  if (loading || !project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const PlaceholderContent = ({ title }: { title: string }) => (
    <Card className='mt-4'>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>This section is under construction.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className='text-muted-foreground'>
                The UI and functionality for the {title.toLowerCase()} section will be implemented soon.
            </p>
        </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
        <ProjectHeader project={project} />

        <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="leads">Leads/Channels</TabsTrigger>
                <TabsTrigger value="packages">Products/Packages</TabsTrigger>
                <TabsTrigger value="finance">Finance</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="notes">Notes & Files</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
                <ProjectDashboard project={project} tasks={tasks} transactions={transactions} />
            </TabsContent>
            <TabsContent value="leads">
                <PlaceholderContent title="Leads/Channels" />
            </TabsContent>
            <TabsContent value="packages">
                <PlaceholderContent title="Products/Packages" />
            </TabsContent>
            <TabsContent value="finance">
                <ProjectFinance transactions={transactions} project={project} />
            </TabsContent>
             <TabsContent value="tasks">
                <ProjectTasks tasks={tasks} allLeads={leads} projectId={project.id} />
            </TabsContent>
             <TabsContent value="team">
                <ProjectTeam project={project} allUsers={allUsers} />
            </TabsContent>
             <TabsContent value="notes">
                <ProjectNotes projectId={project.id} notes={notes} allUsers={allUsers} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
