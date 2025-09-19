
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project, Task, Finance, Lead, Category, Service, Package, ActivityRecord, Note, AIPrompt, Report, Invoice, Product, Channel, TaskTemplate, Vendor } from '@/lib/types';
import { Loader2, BookText } from 'lucide-react';
import { ProjectHeader } from '@/components/projects/project-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDashboard } from '@/components/projects/project-dashboard';
import { ProjectLeads } from '@/components/projects/project-leads';
import { ProjectChannels } from '@/components/projects/project-channels';
import { ProjectProducts } from '@/components/projects/project-products';
import { ProjectFinance } from '@/components/projects/project-finance';
import { ProjectTasks } from '@/components/projects/project-tasks';
import { ProjectTemplates } from '@/components/projects/project-templates';
import { ProjectRecords } from '@/components/projects/project-records';
import { ProjectSettings } from '@/components/projects/project-settings';
import { ProjectBilling } from '@/components/projects/project-billing';
import { ProjectReports } from '@/components/projects/project-reports';
import { ProjectWorkspace } from '@/components/projects/project-workspace';
import { ProjectVendors } from '@/components/projects/project-vendors';

function toDate(timestamp: any): Date | undefined {
    if (!timestamp) return undefined;
    if (timestamp.toDate) return timestamp.toDate();
    if (typeof timestamp === 'string' || typeof timestamp === 'number') return new Date(timestamp);
    return timestamp; // Already a Date object
}


export default function ProjectDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [aiPrompts, setAIPrompts] = useState<AIPrompt[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const projectRef = doc(db, `projects`, id);
    const unsubscribeProject = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        const projectData = { id: docSnap.id, ...docSnap.data() } as Project;
        // Check if user is a member using the new members array structure
        if (projectData.private && !projectData.memberUids.includes(user.uid)) {
            router.push('/dashboard/projects');
            return;
        }
        setProject(projectData);
      } else {
        router.push('/dashboard/projects');
      }
      setLoading(false);
    });

    const allProjectsQuery = query(collection(db, 'projects'), where('memberUids', 'array-contains', user.uid));
    const unsubscribeAllProjects = onSnapshot(allProjectsQuery, (snapshot) => {
        setAllProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)))
    });

    const createCollectionSubscription = <T extends {}>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        const q = query(collection(db, collectionName), where('projectId', '==', id));
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const docData: any = doc.data();
                
                // Convert all possible date fields
                for (const key of ['date', 'createdAt', 'updatedAt', 'timestamp', 'issueDate', 'dueDate', 'uploadedAt', 'lastLogin']) {
                    if (docData[key]) {
                        docData[key] = toDate(docData[key]);
                    }
                }

                // Handle nested date fields like in payments
                if (docData.payments && Array.isArray(docData.payments)) {
                  docData.payments = docData.payments.map((p: any) => ({
                    ...p,
                    date: toDate(p.date),
                  }));
                }

                return { id: doc.id, ...docData } as T;
            });
            setter(data);
        });
    };

    const unsubscribeTasks = createCollectionSubscription<Task>('tasks', setTasks);
    const unsubscribeTaskTemplates = createCollectionSubscription<TaskTemplate>('taskTemplates', setTaskTemplates);
    const unsubscribeFinances = createCollectionSubscription<Finance>('finances', setFinances);
    const unsubscribeLeads = createCollectionSubscription<Lead>('leads', setLeads);
    const unsubscribeChannels = createCollectionSubscription<Channel>('channels', setChannels);
    const unsubscribeVendors = createCollectionSubscription<Vendor>('vendors', setVendors);
    const unsubscribeCategories = createCollectionSubscription<Category>('categories', setCategories);
    const unsubscribeServices = createCollectionSubscription<Service>('services', setServices);
    const unsubscribeProducts = createCollectionSubscription<Product>('products', setProducts);
    const unsubscribePackages = createCollectionSubscription<Package>('packages', setPackages);
    const unsubscribeRecords = createCollectionSubscription<ActivityRecord>('records', setRecords);
    const unsubscribeNotes = createCollectionSubscription<Note>('notes', setNotes);
    const unsubscribeAIPrompts = createCollectionSubscription<AIPrompt>('aiPrompts', setAIPrompts);
    const unsubscribeInvoices = createCollectionSubscription<Invoice>('invoices', setInvoices);
    const unsubscribeReports = createCollectionSubscription<Report>('reports', setReports);

    return () => {
        unsubscribeProject();
        unsubscribeAllProjects();
        unsubscribeTasks();
        unsubscribeTaskTemplates();
        unsubscribeFinances();
        unsubscribeLeads();
        unsubscribeChannels();
        unsubscribeVendors();
        unsubscribeCategories();
        unsubscribeServices();
        unsubscribeProducts();
        unsubscribePackages();
        unsubscribeRecords();
        unsubscribeNotes();
        unsubscribeAIPrompts();
        unsubscribeInvoices();
        unsubscribeReports();
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
            <div className='overflow-x-auto'>
                <TabsList className="min-w-max">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="leads">Leads</TabsTrigger>
                    <TabsTrigger value="channels">Channels</TabsTrigger>
                    <TabsTrigger value="vendors">Vendors</TabsTrigger>
                    <TabsTrigger value="products">P&S</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                    <TabsTrigger value="finance">Finance</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="workspace">
                        Workspace
                    </TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="dashboard">
                <ProjectDashboard project={project} tasks={tasks} finances={finances} channels={channels} />
            </TabsContent>
            <TabsContent value="leads">
                <ProjectLeads project={project} leads={leads} packages={packages} services={services} />
            </TabsContent>
            <TabsContent value="channels">
                <ProjectChannels project={project} channels={channels} />
            </TabsContent>
             <TabsContent value="vendors">
                <ProjectVendors project={project} vendors={vendors} />
            </TabsContent>
            <TabsContent value="products">
                <ProjectProducts 
                    project={project} 
                    categories={categories}
                    services={services}
                    products={products}
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
                <ProjectTasks project={project} tasks={tasks} leads={leads} />
            </TabsContent>
            <TabsContent value="templates">
                <ProjectTemplates project={project} templates={taskTemplates} tasks={tasks} />
            </TabsContent>
            <TabsContent value="workspace">
                <ProjectWorkspace project={project} notes={notes} aiPrompts={aiPrompts} />
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
