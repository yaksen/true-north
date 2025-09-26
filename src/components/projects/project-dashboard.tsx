
'use client';

import { Project, Task, Finance, Lead, Channel, Service, Product, Invoice } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useState, useMemo, useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrency } from "@/context/CurrencyContext";
import { FinancialChart, type MonthlyData } from "./financial-chart";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, AlertTriangle, FileText, ShoppingBag, Radio, ListChecks, Banknote, VenetianMask } from 'lucide-react';
import { formatCurrency } from "@/lib/utils";


interface ProjectDashboardProps {
    project: Project;
    tasks: Task[];
    finances: Finance[];
    channels: Channel[];
    leads: Lead[];
    services: Service[];
    products: Product[];
    invoices: Invoice[];
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};


export function ProjectDashboard({ project, tasks, finances, channels, leads, services, products, invoices }: ProjectDashboardProps) {
    const { globalCurrency } = useCurrency();
    const displayCurrency = globalCurrency || project.currency;

    const { 
        profitLoss, 
        monthlyChartData,
        monthlyNetGrowth,
        leadConversionRate,
        topRevenueSource,
        overdueTasksCount,
        cashFlowForecast,
        criticalAlerts,
    } = useMemo(() => {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const monthlyData: { [key: string]: { income: number; expense: number } } = {};
        let totalExpensesLast30Days = 0;
        
        finances.forEach(f => {
            const fDate = new Date(f.date);
            const month = format(fDate, 'MMM yyyy');
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expense: 0 };
            }
            const convertedAmount = convert(f.amount, f.currency, displayCurrency);
            if (f.type === 'income') {
                monthlyData[month].income += convertedAmount;
            } else {
                monthlyData[month].expense += convertedAmount;
                 if (fDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) {
                    totalExpensesLast30Days += convertedAmount;
                }
            }
        });
        
        const monthlyChartData: MonthlyData[] = Object.keys(monthlyData).map(month => ({
            month,
            income: monthlyData[month].income,
            expenses: monthlyData[month].expense
        })).slice(-6); // Last 6 months

        const totalIncome = Object.values(monthlyData).reduce((sum, data) => sum + data.income, 0);
        const totalExpenses = Object.values(monthlyData).reduce((sum, data) => sum + data.expense, 0);
        const profitLoss = totalIncome - totalExpenses;
        
        // Monthly Net Growth
        const thisMonthNet = (monthlyData[format(thisMonthStart, 'MMM yyyy')]?.income || 0) - (monthlyData[format(thisMonthStart, 'MMM yyyy')]?.expense || 0);
        const lastMonthNet = (monthlyData[format(lastMonthStart, 'MMM yyyy')]?.income || 0) - (monthlyData[format(lastMonthStart, 'MMM yyyy')]?.expense || 0);
        let monthlyNetGrowth = 0;
        if (lastMonthNet !== 0) {
            monthlyNetGrowth = ((thisMonthNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100;
        } else if (thisMonthNet > 0) {
            monthlyNetGrowth = 100; // Growth from 0 is positive
        }

        // Lead Conversion Rate
        const convertedLeads = leads.filter(l => l.status === 'converted').length;
        const totalRelevantLeads = leads.filter(l => ['new', 'contacted', 'qualified', 'converted'].includes(l.status)).length;
        const leadConversionRate = totalRelevantLeads > 0 ? (convertedLeads / totalRelevantLeads) * 100 : 0;

        // Top Revenue Source
        let topRevenueSource: { name: string; type: string; revenue: number } | null = null;
        const sourceRevenues: { [key: string]: { name: string; type: string; revenue: number } } = {};
        finances.filter(f => f.type === 'income').forEach(f => {
            const key = f.category || 'Unknown';
            if (!sourceRevenues[key]) {
                sourceRevenues[key] = { name: key, type: 'Category', revenue: 0 };
            }
            sourceRevenues[key].revenue += convert(f.amount, f.currency, displayCurrency);
        });

        if (Object.keys(sourceRevenues).length > 0) {
            topRevenueSource = Object.values(sourceRevenues).sort((a, b) => b.revenue - a.revenue)[0];
        }

        // Overdue Tasks
        const overdueTasksCount = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;
        
        // Cash Flow Forecast
        const dailyBurnRate = totalExpensesLast30Days / 30;
        const cashFlowForecast = dailyBurnRate > 0 ? (totalIncome - totalExpenses) / dailyBurnRate : Infinity;

        // Critical Alerts
        const overdueInvoices = invoices.filter(i => i.status === 'unpaid' && new Date(i.dueDate) < now).length;
        const stalledLeads = leads.filter(l => l.status === 'contacted' && l.updatedAt && new Date(l.updatedAt).getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000).length;
        const criticalAlerts = overdueInvoices + stalledLeads;

        return { profitLoss, monthlyChartData, monthlyNetGrowth, leadConversionRate, topRevenueSource, overdueTasksCount, cashFlowForecast, criticalAlerts };
    }, [finances, tasks, leads, invoices, displayCurrency]);


    return (
        <div className="grid gap-6 mt-4">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Net Growth</CardTitle>
                        {monthlyNetGrowth >= 0 ? <TrendingUp className="h-4 w-4 text-muted-foreground" /> : <TrendingDown className="h-4 w-4 text-muted-foreground" />}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${monthlyNetGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {monthlyNetGrowth >= 0 ? '+' : ''}{monthlyNetGrowth.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">vs. last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lead Conversion Rate</CardTitle>
                        <VenetianMask className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{leadConversionRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">from qualified leads</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${overdueTasksCount > 0 ? 'text-red-400' : ''}`}>{overdueTasksCount}</div>
                        <p className="text-xs text-muted-foreground">tasks need attention</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${criticalAlerts > 0 ? 'text-amber-400' : ''}`}>{criticalAlerts}</div>
                        <p className="text-xs text-muted-foreground">Overdue invoices, stalled leads</p>
                    </CardContent>
                </Card>
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Financial Overview</CardTitle>
                            <p className={cn("text-xl font-bold", profitLoss >= 0 ? 'text-green-400' : 'text-red-400')}>
                                {formatCurrency(profitLoss, displayCurrency)}
                            </p>
                        </div>
                        <CardDescription>Income vs. Expenses for the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <FinancialChart data={monthlyChartData} currency={displayCurrency} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Revenue Source</CardTitle>
                        {topRevenueSource?.type === 'Service' && <FileText className="h-4 w-4 text-muted-foreground" />}
                        {topRevenueSource?.type === 'Product' && <ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                        {topRevenueSource?.type === 'Channel' && <Radio className="h-4 w-4 text-muted-foreground" />}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{topRevenueSource ? topRevenueSource.name : 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">
                            {topRevenueSource ? `${formatCurrency(topRevenueSource.revenue, displayCurrency)} in revenue` : 'No income recorded yet'}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash Flow Runway</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isFinite(cashFlowForecast) ? `${Math.floor(cashFlowForecast)} days` : '∞'}
                        </div>
                        <p className="text-xs text-muted-foreground">Based on last 30 days burn rate</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
