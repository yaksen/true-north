
'use client';

import type { Project, Task, Finance } from '@/lib/types';
import { useMemo } from 'react';
import { SummaryCards, type GlobalSummary } from './summary-cards';
import { ProjectCard, type ProjectSummary } from './project-card';
import { TopProjects } from './top-projects';
import { ForecastWidget } from './forecast-widget';

interface DashboardClientProps {
  projects: Project[];
  tasks: Task[];
  finances: Finance[];
}

export function DashboardClient({ projects, tasks, finances }: DashboardClientProps) {

  const projectSummaries = useMemo<ProjectSummary[]>(() => {
    return projects.map(project => {
      const projectFinances = finances.filter(f => f.projectId === project.id);
      const projectTasks = tasks.filter(t => t.projectId === project.id);

      const totalIncome = projectFinances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
      const totalExpense = projectFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
      const profitLoss = totalIncome - totalExpense;

      const completedTasks = projectTasks.filter(t => t.status === 'Done').length;
      const taskCompletionRate = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
      
      const monthlyPL = Array(6).fill(0).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthFinances = projectFinances.filter(f => {
            if (!f.date) return false;
            return new Date(f.date).toISOString().startsWith(monthKey)
        });
        const income = monthFinances.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0);
        const expense = monthFinances.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0);
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
  }, [projects, tasks, finances]);

  const globalSummary = useMemo<GlobalSummary>(() => {
    const totalPL = projectSummaries.reduce((sum, s) => {
        // Simple currency conversion assumption for global summary
        const rate = s.project.currency === 'LKR' ? 1/300 : 1;
        return sum + (s.profitLoss * rate);
    }, 0);
    const totalCompletionRate = projectSummaries.length > 0
        ? projectSummaries.reduce((sum, s) => sum + s.taskCompletionRate, 0) / projectSummaries.length
        : 0;
    const totalRevenue = projectSummaries.reduce((sum, s) => {
        const rate = s.project.currency === 'LKR' ? 1/300 : 1;
        return sum + (s.totalIncome * rate);
    }, 0)

    return {
      totalPL,
      totalRevenue,
      avgTaskCompletion: totalCompletionRate,
      activeProjects: projects.length,
    };
  }, [projectSummaries, projects.length]);

  return (
    <div className="flex-1 space-y-6 p-4 lg:p-6">
      <SummaryCards summary={globalSummary} />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projectSummaries.map(summary => (
                    <ProjectCard key={summary.project.id} summary={summary} />
                ))}
            </div>
        </div>
        <div className="lg:col-span-1 space-y-6">
            <TopProjects summaries={projectSummaries} />
            <ForecastWidget summaries={projectSummaries} />
        </div>
      </div>
    </div>
  );
}
