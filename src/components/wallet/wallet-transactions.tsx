
'use client';

import type { WalletTransaction, PersonalWallet } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Badge } from '../ui/badge';

interface WalletTransactionsProps {
  transactions: WalletTransaction[];
  wallet: PersonalWallet | null;
}

export function WalletTransactions({ transactions, wallet }: WalletTransactionsProps) {
    if (!wallet) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className='text-center text-muted-foreground py-8'>Create a wallet to see transactions.</p>
                </CardContent>
            </Card>
        );
    }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>A complete log of your wallet activity.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
            {transactions.length > 0 ? (
                <div className='space-y-4'>
                    {transactions.map(tx => (
                        <div key={tx.id} className='flex items-center gap-4 p-2'>
                           <div className={`p-2 rounded-full ${tx.type === 'add' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                {tx.type === 'add' ? <ArrowDownLeft className='h-5 w-5' /> : <ArrowUpRight className='h-5 w-5'/>}
                           </div>
                           <div className='flex-1'>
                                <p className='font-medium capitalize'>{tx.note || tx.type}</p>
                                <p className='text-sm text-muted-foreground'>{format(new Date(tx.timestamp), 'PPP p')}</p>
                           </div>
                           <div className={`font-semibold text-lg ${tx.type === 'add' ? 'text-green-400' : 'text-red-400'}`}>
                                {tx.type === 'add' ? '+' : '-'}
                                {formatCurrency(tx.amount, wallet.currency)}
                           </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className='text-center text-muted-foreground py-8'>No transactions yet.</p>
            )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
