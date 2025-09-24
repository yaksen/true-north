
'use client';

import type { Invoice, Project, Lead } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';

interface InvoiceCardProps {
  invoice: Invoice;
  project: Project;
  leads: Lead[];
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
  const fromRate = MOCK_RATES[from] || 1;
  const toRate = MOCK_RATES[to] || 1;
  return (amount / fromRate) * toRate;
};

export function InvoiceCard({ invoice, project, leads }: InvoiceCardProps) {
  const router = useRouter();
  const { globalCurrency } = useCurrency();
  const displayCurrency = globalCurrency || project.currency;

  const lead = leads.find(l => l.id === invoice.leadId);

  const totals = (() => {
    let subtotal = 0;
    
    invoice.lineItems.forEach(item => {
        subtotal += convert(item.price * item.quantity, item.currency, displayCurrency);
    });

    let totalDiscount = 0;
    invoice.discounts.forEach(discount => {
        if (discount.type === 'percentage') {
            totalDiscount += (subtotal - totalDiscount) * (discount.value / 100);
        } else {
            totalDiscount += convert(discount.value, project.currency, displayCurrency);
        }
    });

    const subtotalAfterDiscounts = subtotal - totalDiscount;
    const taxAmount = subtotalAfterDiscounts * (invoice.taxRate / 100);
    const total = subtotalAfterDiscounts + taxAmount;
    
    const totalPaid = (invoice.payments || []).reduce((acc, p) => acc + convert(p.amount, project.currency, displayCurrency), 0);

    return { total, balanceDue: total - totalPaid };
  })();

  const getStatusBadgeVariant = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partial': return 'secondary';
      case 'unpaid': case 'sent': case 'draft': return 'outline';
      case 'void': return 'destructive';
      default: return 'secondary';
    }
  };


  return (
    <Card className="flex flex-col cursor-pointer" onClick={() => router.push(`/dashboard/billing/${invoice.id}`)}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold">{invoice.invoiceNumber}</CardTitle>
          <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize">{invoice.status}</Badge>
        </div>
        <CardDescription>{lead ? `To: ${lead.name}` : 'To: Unknown Lead'}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-xs text-muted-foreground">Due: {format(new Date(invoice.dueDate), "PPP")}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-end">
        <div>
          <p className="text-xs text-muted-foreground">Balance Due</p>
          <p className="text-lg font-bold">{formatCurrency(totals.balanceDue, displayCurrency)}</p>
        </div>
        <p className="text-xs text-muted-foreground">Total: {formatCurrency(totals.total, displayCurrency)}</p>
      </CardFooter>
    </Card>
  );
}

