

'use client';

import Link from 'next/link';
import {
  Home,
  Package2,
  Users,
  Briefcase,
  ListChecks,
  CircleDollarSign,
  User,
  ReceiptText,
  Wallet,
  BookText,
  Vault,
  DatabaseZap,
  Link2,
  Flame,
  CreditCard,
  Bot,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Loader2, Menu } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { writeBatch, doc, collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VaultFolder, VaultItem, Task, Habit, HabitLog, DiaryEntry, PersonalWallet, WalletTransaction, PersonalExpense } from '@/lib/types';
import { VaultClient } from '@/components/vault/vault-client';
import { PersonalChatbot } from '@/components/dashboard/personal-chatbot';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { globalCurrency, setGlobalCurrency } = useCurrency();

  // --- Data Fetching for Sheets ---
  const [vaultFolders, setVaultFolders] = useState<VaultFolder[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  
  // Personal Chatbot Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [personalWallet, setPersonalWallet] = useState<PersonalWallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);

  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);

    const unsubs: (()=>void)[] = [];

    // Vault (Quick Links)
    unsubs.push(onSnapshot(query(collection(db, 'vaultFolders'), where('userId', '==', user.uid)), (snapshot) => {
      setVaultFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaultFolder)));
    }));
    unsubs.push(onSnapshot(query(collection(db, 'vaultItems'), where('userId', '==', user.uid)), (snapshot) => {
        setVaultItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaultItem)));
    }));

    // Personal Chatbot Data
    unsubs.push(onSnapshot(query(collection(db, 'tasks'), where('assigneeUid', '==', user.uid)), (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'habits'), where('userId', '==', user.uid)), (snapshot) => {
        setHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'habitLogs'), where('userId', '==', user.uid)), (snapshot) => {
        setHabitLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitLog)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'diaryEntries'), where('userId', '==', user.uid)), (snapshot) => {
        setDiaryEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaryEntry)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'personalExpenses'), where('userId', '==', user.uid)), (snapshot) => {
        setPersonalExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonalExpense)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'personalWallets'), where('userId', '==', user.uid)), (snapshot) => {
        if (!snapshot.empty) {
            const walletData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PersonalWallet;
            setPersonalWallet(walletData);
            const transactionsQuery = query(collection(db, 'walletTransactions'), where('walletId', '==', walletData.id));
            unsubs.push(onSnapshot(transactionsQuery, (transSnapshot) => {
                setWalletTransactions(transSnapshot.docs.map(d => ({id: d.id, ...d.data() } as WalletTransaction)));
            }));
        } else {
            setPersonalWallet(null);
        }
    }));
    
    // Check when initial data has loaded
    const initialLoad = Promise.all([
        getDocs(query(collection(db, 'vaultFolders'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'tasks'), where('assigneeUid', '==', user.uid))),
    ]);
    initialLoad.then(() => setDataLoading(false));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);


  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/dashboard/projects', icon: Briefcase, label: 'Projects' },
    { href: '/dashboard/billing', icon: ReceiptText, label: 'Billing' },
    { href: '/dashboard/tasks', icon: ListChecks, label: 'Tasks' },
    { href: '/dashboard/finance', icon: CircleDollarSign, label: 'Finance' },
    { href: '/dashboard/expenses', icon: CreditCard, label: 'Expenses' },
    { href: '/dashboard/habits', icon: Flame, label: 'Habits' },
    { href: '/dashboard/diary', icon: BookText, label: 'Diary' },
    { href: '/dashboard/wallet', icon: Wallet, label: 'Wallet' },
    { href: '/dashboard/vault', icon: Vault, label: 'Vault' },
  ];
  
  const linkItems = vaultItems.filter(item => item.type === 'link');

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center border-b px-6">
            <Logo />
          </div>
          <div className="flex-1">
            <nav className="grid items-start gap-1 px-4 py-4 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted',
                    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                      ? 'bg-muted text-primary'
                      : ''
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <div className="mb-4 flex h-16 items-center border-b px-2">
                  <Logo />
                </div>
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground',
                      pathname.startsWith(item.href) ? 'bg-muted text-foreground' : ''
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Can add a global search here if needed */}
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Bot className="h-4 w-4" />
                <span className="sr-only">Personal AI Assistant</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="max-w-full w-full sm:max-w-md p-0">
                <div className='p-0 h-full'>
                    {dataLoading ? (
                        <div className="flex h-full flex-1 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <PersonalChatbot 
                            tasks={tasks}
                            habits={habits}
                            habitLogs={habitLogs}
                            diaryEntries={diaryEntries}
                            wallet={personalWallet}
                            walletTransactions={walletTransactions}
                            vaultItems={vaultItems}
                            personalExpenses={personalExpenses}
                        />
                    )}
                </div>
            </SheetContent>
          </Sheet>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Link2 className="h-4 w-4" />
                <span className="sr-only">Quick Links</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full max-w-full sm:max-w-4xl p-0">
                <div className='p-6 h-full'>
                    {dataLoading ? (
                        <div className="flex h-full flex-1 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <VaultClient folders={vaultFolders} items={linkItems} itemType='link' />
                    )}
                </div>
            </SheetContent>
          </Sheet>

          <div className="p-1 border rounded-lg bg-card flex items-center gap-1">
              {["USD", "LKR", "EUR", "GBP"].map((c) => (
              <Button
                  key={c}
                  onClick={() => setGlobalCurrency(c)}
                  size="sm"
                  variant={globalCurrency === c ? "secondary" : "ghost"}
                  className='text-xs'
              >
                  {c}
              </Button>
              ))}
          </div>
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col bg-background">
          <div className="flex-1 animate-fade-in-up space-y-6 p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
