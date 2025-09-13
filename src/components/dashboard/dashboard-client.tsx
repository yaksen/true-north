
'use client';

import type { Project, Task, Finance, CrmSettings } from '@/lib/types';
import { useMemo } from 'react';
import { SummaryCards, type GlobalSummary } from './summary-cards';
import { ProjectCard, type ProjectSummary } from './project-card';
import { TopProjects } from './top-projects';
import { ForecastWidget } from './forecast-widget';
import { GoalTracker } from './goal-tracker';
import { useCurrency } from '@/context/CurrencyContext';

interface DashboardClientProps {
  projects: Project[];
  tasks: Task[];
  finances: Finance[];
  settings: CrmSettings | null;
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};

export function DashboardClient({ projects, tasks, finances, settings }: DashboardClientProps) {
  const { globalCurrency, loading: currencyLoading } = useCurrency();
  const displayCurrency = globalCurrency || 'USD';

  const projectSummaries = useMemo<ProjectSummary[]>(() => {
    return projects.map(project => {
      const projectFinances = finances.filter(f => f.projectId === project.id);
      const projectTasks = tasks.filter(t => t.projectId === project.id);

      const totalIncome = projectFinances.filter(f => f.type === 'income').reduce((sum, f) => sum + convert(f.amount, f.currency, displayCurrency), 0);
      const totalExpense = projectFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + convert(f.amount, f.currency, displayCurrency), 0);
      const profitLoss = totalIncome - totalExpense;

      const completedTasks = projectTasks.filter(t => t.completed).length;
      const taskCompletionRate = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
      
      const monthlyPL = Array(6).fill(0).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        const monthFinances = projectFinances.filter(f => {
            if (!f.date || !(f.date instanceof Date)) return false;
            return f.date.toISOString().startsWith(monthKey);
        });

        const income = monthFinances.filter(f => f.type === 'income').reduce((s, f) => s + convert(f.amount, f.currency, displayCurrency), 0);
        const expense = monthFinances.filter(f => f.type === 'expense').reduce((s, f) => s + convert(f.amount, f.currency, displayCurrency), 0);
        return { name: d.toLocaleString('default', { month: 'short' }), pl: income - expense };
      }).reverse();

      return {
        project,
        totalIncome,
        profitLoss,
        taskCompletionRate,
        monthlyPL,
      };
    });
  }, [projects, tasks, finances, displayCurrency]);

  const globalSummary = useMemo<GlobalSummary>(() => {
    const totalPL = projectSummaries.reduce((sum, s) => sum + s.profitLoss, 0);
    const totalRevenue = projectSummaries.reduce((sum, s) => sum + s.totalIncome, 0);

    const avgTaskCompletion = projectSummaries.length > 0
        ? projectSummaries.reduce((sum, s) => sum + s.taskCompletionRate, 0) / projectSummaries.length
        : 0;

    return {
      totalPL,
      totalRevenue,
      avgTaskCompletion,
      activeProjects: projects.length,
      currency: displayCurrency
    };
  }, [projectSummaries, projects.length, displayCurrency]);

  return (
    <div className="flex-1 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <TopProjects summaries={projectSummaries} currency={displayCurrency} />
        </div>
        <div className="lg:col-span-1">
            <ForecastWidget summaries={projectSummaries} currency={globalSummary.currency} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GoalTracker 
            currentRevenue={globalSummary.totalRevenue} 
            goal={settings?.revenueGoal} 
            goalCurrency={settings?.goalCurrency}
            currency={globalSummary.currency} 
        />
        <SummaryCards summary={globalSummary} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projectSummaries.map(summary => (
              <ProjectCard key={summary.project.id} summary={summary} currency={displayCurrency} />
          ))}
      </div>
    </div>
  );
}
