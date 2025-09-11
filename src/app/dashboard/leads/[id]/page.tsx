
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Lead, Action, Service, Package } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Mail, Phone, PlusCircle, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getColumns } from '@/components/actions/columns';
import { DataTable } from '@/components/ui/data-table';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { LogActivityDialog } from '@/components/actions/log-activity-dialog';

export default function LeadDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [stats, setStats] = useState({ totalSpent: 0, actionCount: 0 });
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    if (!user || !id) return;

    const leadRef = doc(db, `users/${user.uid}/leads`, id);
    const unsubscribeLead = onSnapshot(leadRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLead({ 
            id: docSnap.id,
             ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as Lead);
      } else {
        router.push('/dashboard/leads'); // Redirect if lead not found
      }
      setLoading(false);
    });

    const actionsQuery = query(collection(db, `users/${user.uid}/actions`), where('details.leadId', '==', id));
    const unsubscribeActions = onSnapshot(actionsQuery, (snapshot) => {
      const actionsData = snapshot.docs.map(doc => ({ 
        id: doc.id,
         ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        deadline: doc.data().deadline?.toDate(),
        date: doc.data().date?.toDate(),
      } as Action));
      
      setActions(actionsData);

      // Calculate stats
      const totalSpent = actionsData
        .filter(a => a.category === 'Sales' && a.status === 'Won' && a.details.amount)
        .reduce((sum, a) => sum + a.details.amount!, 0);

      setStats({ totalSpent, actionCount: actionsData.length });
    });
    
    const servicesQuery = query(collection(db, `users/${user.uid}/services`));
    const unsubscribeServices = onSnapshot(servicesQuery, (snapshot) => {
        setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    });

    const packagesQuery = query(collection(db, `users/${user.uid}/packages`));
    const unsubscribePackages = onSnapshot(packagesQuery, (snapshot) => {
        setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Package)));
    });

    return () => {
      unsubscribeLead();
      unsubscribeActions();
      unsubscribeServices();
      unsubscribePackages();
    };
  }, [user, id, router]);

  const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || '';
  };
  
  const columns = getColumns({ setActions });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!lead) {
    return <div>Lead not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Leads
        </Button>
        <div className='flex gap-2'>
            <Button size="sm" variant="outline">
                <Edit className='mr-2 h-4 w-4' />
                Edit Lead
            </Button>
            <LogActivityDialog
                leads={[lead]}
                services={services}
                packages={packages}
            />
        </div>
      </div>

      {/* Header Card */}
      <Card>
        <CardContent className="pt-6 flex items-start gap-6">
          <Avatar className="w-24 h-24 text-3xl">
            {/* <AvatarImage src={lead.avatarUrl} /> */}
            <AvatarFallback>{getInitials(lead.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <h1 className="text-3xl font-bold">{lead.name}</h1>
            <p className="text-muted-foreground">Lead ID: #{lead.leadId}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {lead.emails?.[0] && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {lead.emails[0]}</div>}
                {lead.phoneNumbers?.[0] && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {lead.phoneNumbers[0]}</div>}
                {lead.socials?.[0] && <div className="flex items-center gap-2"><Globe className="h-4 w-4" /> {lead.socials[0]}</div>}
            </div>
          </div>
          <div>
            <Badge variant="outline" className="capitalize text-base">{lead.state}</Badge>
          </div>
        </CardContent>
      </Card>
      
       <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <SummaryCard title="Total Spent" value={stats.totalSpent} icon={Phone} prefix="LKR" />
          <SummaryCard title="Total Actions" value={stats.actionCount} icon={Phone} />
       </div>


      {/* Actions History */}
      <Card>
        <CardHeader>
          <CardTitle>Action History</CardTitle>
        </CardHeader>
        <CardContent>
           <DataTable columns={columns} data={actions} />
        </CardContent>
      </Card>
    </div>
  );
}
