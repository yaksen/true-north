
'use client';

import type { Project, Task, Finance, CrmSettings, PersonalWallet, PersonalExpense, PersonalExpenseCategory } from '@/lib/types';
import { DashboardClient } from './dashboard-client';
import { PersonalWalletCard } from '../wallet/personal-wallet-card';
import { PersonalExpenseCard } from '../expenses/personal-expense-card';

interface DashboardProps {
    projects: Project[];
    tasks: Task[];
    finances: Finance[];
    settings: CrmSettings | null;
    wallet: PersonalWallet | null;
    expenses: PersonalExpense[];
    categories: PersonalExpenseCategory[];
}

export function Dashboard(props: DashboardProps) {
    return (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <DashboardClient 
                    projects={props.projects} 
                    tasks={props.tasks} 
                    finances={props.finances} 
                    settings={props.settings} 
                />
            </div>
            <div className="space-y-6 lg:space-y-8">
                <PersonalWalletCard wallet={props.wallet} projects={props.projects} />
                <PersonalExpenseCard expenses={props.expenses} wallet={props.wallet} categories={props.categories} />
            </div>
        </div>
    );
}
