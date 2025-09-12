
'use client';

import type { Invoice, Project, Lead } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, Download, Send, CheckCircle, FileX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { logActivity } from '@/lib/activity-log';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';

interface InvoiceViewProps {
  invoice: Invoice;
  project: Project;
  lead: Lead;
}

export function InvoiceView({ invoice, project, lead }: InvoiceViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { globalCurrency } = useCurrency();

  // Mock conversion rates - replace with a real API call in a real app
  const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

  const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
  };
  
  const displayCurrency = globalCurrency || project.currency;

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
            // Assuming flat discount is in the project's main currency.
            // A more robust system would store currency for flat discounts.
            totalDiscount += convert(discount.value, project.currency, displayCurrency);
        }
    });

    const subtotalAfterDiscounts = subtotal - totalDiscount;
    const taxAmount = subtotalAfterDiscounts * (invoice.taxRate / 100);
    const total = subtotalAfterDiscounts + taxAmount;

    return { subtotal, totalDiscount, taxAmount, total };
  })();


  const handleUpdateStatus = async (status: 'sent' | 'paid' | 'void') => {
    if (!user) return;
    try {
        const invoiceRef = doc(db, 'invoices', invoice.id);
        await updateDoc(invoiceRef, { status, updatedAt: serverTimestamp() });
        await logActivity(invoice.projectId, 'invoice_updated' as any, { invoiceNumber: invoice.invoiceNumber, status }, user.uid);
        toast({ title: 'Success', description: `Invoice marked as ${status}.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update invoice status.' });
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("Invoice", 14, 22);
    doc.setFontSize(12);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 14, 30);
    doc.text(`Project: ${project.name}`, 14, 36);

    doc.setFontSize(12);
    doc.text("Bill To:", 14, 50);
    doc.text(lead.name, 14, 56);
    doc.text(lead.email || '', 14, 62);

    doc.text(`Issue Date: ${format(new Date(invoice.issueDate), "PPP")}`, 150, 50);
    doc.text(`Due Date: ${format(new Date(invoice.dueDate), "PPP")}`, 150, 56);

    const tableData = invoice.lineItems.map(item => [
        item.description,
        item.quantity,
        formatCurrency(item.price, item.currency),
        formatCurrency(item.price * item.quantity, item.currency),
    ]);

    autoTable(doc, {
        startY: 75,
        head: [['Description', 'Quantity', 'Unit Price', 'Total']],
        body: tableData,
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    let currentY = finalY + 10;
    doc.setFontSize(10);
    doc.text("Subtotal:", 150, currentY);
    doc.text(formatCurrency(totals.subtotal, displayCurrency), 190, currentY, { align: 'right' });

    if (totals.totalDiscount > 0) {
        currentY += 6;
        doc.text("Discount:", 150, currentY);
        doc.text(`-${formatCurrency(totals.totalDiscount, displayCurrency)}`, 190, currentY, { align: 'right' });
    }
    
    if (totals.taxAmount > 0) {
        currentY += 6;
        doc.text(`Tax (${invoice.taxRate}%):`, 150, currentY);
        doc.text(formatCurrency(totals.taxAmount, displayCurrency), 190, currentY, { align: 'right' });
    }

    currentY += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Total:", 150, currentY);
    doc.text(formatCurrency(totals.total, displayCurrency), 190, currentY, { align: 'right' });

    if (invoice.notes) {
        currentY += 15;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text("Notes:", 14, currentY);
        doc.text(invoice.notes, 14, currentY + 6, { maxWidth: 180 });
    }

    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
            <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={generatePDF}><Download /> Download PDF</Button>
                {invoice.status === 'draft' && <Button size="sm" onClick={() => handleUpdateStatus('sent')}><Send /> Mark as Sent</Button>}
                {invoice.status === 'sent' && <Button size="sm" onClick={() => handleUpdateStatus('paid')}><CheckCircle /> Mark as Paid</Button>}
                {invoice.status !== 'void' && invoice.status !== 'paid' && <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus('void')}><FileX /> Void Invoice</Button>}
            </div>
        </div>
        <Card className="max-w-4xl mx-auto w-full">
            <CardHeader className="p-8">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-3xl">Invoice</CardTitle>
                        <CardDescription>#{invoice.invoiceNumber}</CardDescription>
                    </div>
                    <div className='text-right'>
                        <h3 className='font-bold text-lg'>{project.name}</h3>
                        <p className='text-sm text-muted-foreground'>Project</p>
                    </div>
                </div>
                <Separator className='my-4' />
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold mb-1">Bill To</h4>
                        <p>{lead.name}</p>
                        <p className="text-muted-foreground">{lead.email}</p>
                    </div>
                    <div className="text-right">
                        <p><span className="font-semibold">Issue Date:</span> {format(new Date(invoice.issueDate), "PPP")}</p>
                        <p><span className="font-semibold">Due Date:</span> {format(new Date(invoice.dueDate), "PPP")}</p>
                        <Badge className='mt-2 capitalize' variant={invoice.status === 'paid' ? 'default' : 'secondary'}>{invoice.status}</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 pt-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoice.lineItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.description}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price, item.currency)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price * item.quantity, item.currency)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Separator className='my-6' />
                <div className="flex justify-end">
                    <div className="w-full max-w-sm space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{formatCurrency(totals.subtotal, displayCurrency)}</span>
                        </div>
                        {invoice.discounts.map(d => (
                            <div key={d.id} className="flex justify-between text-sm">
                                <span>Discount ({d.name})</span>
                                <span>- {d.type === 'percentage' ? `${d.value}%` : formatCurrency(d.value, project.currency)}</span>
                            </div>
                        ))}
                        {invoice.taxRate > 0 && (
                             <div className="flex justify-between">
                                <span>Tax ({invoice.taxRate}%)</span>
                                <span>{formatCurrency(totals.taxAmount, displayCurrency)}</span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{formatCurrency(totals.total, displayCurrency)}</span>
                        </div>
                    </div>
                </div>
                {invoice.notes && (
                    <>
                        <Separator className='my-6' />
                        <div>
                            <h4 className='font-semibold mb-2'>Notes</h4>
                            <p className='text-sm text-muted-foreground'>{invoice.notes}</p>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
