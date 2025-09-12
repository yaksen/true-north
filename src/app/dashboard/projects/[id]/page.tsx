
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project, Task, Finance, Lead, Category, Service, Package, ActivityRecord, Note, Report, Invoice } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { ProjectHeader } from '@/components/projects/project-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDashboard } from '@/components/projects/project-dashboard';
import { ProjectLeads } from '@/components/projects/project-leads';
import { ProjectProducts } from '@/components/projects/project-products';
import { ProjectFinance } from '@/components/projects/project-finance';
import { ProjectTasks } from '@/components/projects/project-tasks';
import { ProjectRecords } from '@/components/projects/project-records';
import { ProjectReports } from '@/components/projects/project-reports';
import { ProjectSettings } from '@/components/projects/project-settings';
import { ProjectBilling } from '@/components/projects/project-billing';

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const projectRef = doc(db, `projects`, id);
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

    const allProjectsQuery = query(collection(db, 'projects'), where('members', 'array-contains', user.uid));
    const unsubscribeAllProjects = onSnapshot(allProjectsQuery, (snapshot) => {
        setAllProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)))
    });

    const createCollectionSubscription = <T,>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        const q = query(collection(db, collectionName), where('projectId', '==', id));
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
            setter(data);
        });
    };

    const unsubscribeTasks = createCollectionSubscription<Task>('tasks', setTasks);
    const unsubscribeFinances = createCollectionSubscription<Finance>('finances', setFinances);
    const unsubscribeLeads = createCollectionSubscription<Lead>('leads', setLeads);
    const unsubscribeCategories = createCollectionSubscription<Category>('categories', setCategories);
    const unsubscribeServices = createCollectionSubscription<Service>('services', setServices);
    const unsubscribePackages = createCollectionSubscription<Package>('packages', setPackages);
    const unsubscribeRecords = createCollectionSubscription<ActivityRecord>('records', setRecords);
    const unsubscribeNotes = createCollectionSubscription<Note>('notes', setNotes);
    const unsubscribeReports = createCollectionSubscription<Report>('reports', setReports);
    const unsubscribeInvoices = createCollectionSubscription<Invoice>('invoices', setInvoices);

    return () => {
        unsubscribeProject();
        unsubscribeAllProjects();
        unsubscribeTasks();
        unsubscribeFinances();
        unsubscribeLeads();
        unsubscribeCategories();
        unsubscribeServices();
        unsubscribePackages();
        unsubscribeRecords();
        unsubscribeNotes();
        unsubscribeReports();
        unsubscribeInvoices();
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
        <ProjectHeader project={project} allProjects={allProjects} />

        <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-9">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="finance">Finance</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="records">Records</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
                <ProjectDashboard project={project} tasks={tasks} finances={finances} />
            </TabsContent>
            <TabsContent value="leads">
                <ProjectLeads project={project} leads={leads} />
            </TabsContent>
            <TabsContent value="products">
                <ProjectProducts 
                    project={project} 
                    categories={categories}
                    services={services}
                    packages={packages}
                />
            </TabsContent>
            <TabsContent value="billing">
                <ProjectBilling project={project} invoices={invoices} leads={leads} />
            </TabsContent>
            <TabsContent value="finance">
                <ProjectFinance project={project} finances={finances} />
            </TabsContent>
             <TabsContent value="tasks">
                <ProjectTasks project={project} tasks={tasks} />
            </TabsContent>
            <TabsContent value="records">
                <ProjectRecords project={project} records={records} notes={notes} />
            </TabsContent>
            <TabsContent value="reports">
                <ProjectReports project={project} reports={reports} />
            </TabsContent>
            <TabsContent value="settings">
                <ProjectSettings project={project} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
