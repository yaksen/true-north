
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/context/CurrencyContext';
import { PersonalWallet, Project } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Wallet, PlusCircle } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WalletFundingForm } from './wallet-funding-form';
import Link from 'next/link';

interface PersonalWalletCardProps {
    wallet: PersonalWallet | null;
    projects: Project[];
}

export function PersonalWalletCard({ wallet, projects }: PersonalWalletCardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const { globalCurrency } = useCurrency();
    const [isCreatingWallet, setIsCreatingWallet] = useState(false);
    const [isFundingFormOpen, setIsFundingFormOpen] = useState(false);

    const displayCurrency = wallet?.currency || globalCurrency || 'USD';

    const handleCreateWallet = async () => {
        if (!user || !globalCurrency) return;
        setIsCreatingWallet(true);
        try {
            const walletId = user.uid; // Use user's UID as wallet ID for simplicity
            const walletRef = doc(db, 'personalWallets', walletId);
            await setDoc(walletRef, {
                userId: user.uid,
                balance: 0,
                currency: globalCurrency,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Your personal wallet has been created!' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create your wallet.' });
            console.error(error);
        } finally {
            setIsCreatingWallet(false);
        }
    };
    
    if (!wallet) {
        return (
            <Card className='h-full'>
                <CardHeader>
                    <CardTitle>Personal Wallet</CardTitle>
                    <CardDescription>Create a personal wallet to manage your funds.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleCreateWallet} disabled={isCreatingWallet} className='w-full'>
                        <Wallet className='mr-2'/> Create My Wallet
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className='h-full flex flex-col'>
            <CardHeader>
                <CardTitle>Personal Wallet</CardTitle>
                <CardDescription>Your current balance.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <p className='text-4xl font-bold'>{formatCurrency(wallet.balance, displayCurrency)}</p>
            </CardContent>
            <CardFooter className='flex-col gap-2 items-stretch'>
                 <Dialog open={isFundingFormOpen} onOpenChange={setIsFundingFormOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className='mr-2'/> Add Funds</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add Funds to Wallet</DialogTitle></DialogHeader>
                        <WalletFundingForm wallet={wallet} projects={projects} closeForm={() => setIsFundingFormOpen(false)} />
                    </DialogContent>
                </Dialog>
                <Button asChild variant="outline">
                    <Link href="/dashboard/wallet">View Transactions</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
