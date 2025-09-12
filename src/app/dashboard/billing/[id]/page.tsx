
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Invoice, Project, Lead } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { InvoiceView } from '@/components/billing/invoice-view';

export default function InvoiceDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const unsubscribe = onSnapshot(doc(db, 'invoices', id), async (docSnap) => {
      if (docSnap.exists()) {
        const invoiceData = { id: docSnap.id, ...docSnap.data() } as Invoice;
        setInvoice(invoiceData);

        // Fetch related project and lead
        const projectRef = doc(db, 'projects', invoiceData.projectId);
        const leadRef = doc(db, 'leads', invoiceData.leadId);
        
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          setProject({ id: projectSnap.id, ...projectSnap.data() } as Project);
        }

        const leadSnap = await getDoc(leadRef);
        if (leadSnap.exists()) {
          setLead({ id: leadSnap.id, ...leadSnap.data() } as Lead);
        }

      } else {
        router.push('/dashboard/billing');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, id, router]);

  if (loading || !invoice || !project || !lead) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <InvoiceView invoice={invoice} project={project} lead={lead} />
  );
}
