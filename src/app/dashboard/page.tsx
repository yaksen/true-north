import { getDashboardInsights } from "@/ai/flows/dashboard-summary-insights";
import { AiInsights } from "@/components/dashboard/ai-insights";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { auth } from "@/lib/firebase";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BarChart, Box, Contact, Shapes, ShoppingBag } from "lucide-react";

async function getSummaryCounts(userId: string) {
    const leadsCol = collection(db, `users/${userId}/leads`);
    const servicesCol = collection(db, `users/${userId}/services`);
    const categoriesCol = collection(db, `users/${userId}/categories`);
    const packagesCol = collection(db, `users/${userId}/packages`);

    const [leadsSnapshot, servicesSnapshot, categoriesSnapshot, packagesSnapshot] = await Promise.all([
        getCountFromServer(leadsCol),
        getCountFromServer(servicesCol),
        getCountFromServer(categoriesCol),
        getCountFromServer(packagesCol),
    ]);

    return {
        leadCount: leadsSnapshot.data().count,
        serviceCount: servicesSnapshot.data().count,
        categoryCount: categoriesSnapshot.data().count,
        packageCount: packagesSnapshot.data().count,
    };
}


export default async function DashboardPage() {
    // In a real app, you'd get the user from the session.
    // For this example, we'll assume a hardcoded user or handle auth differently.
    const user = auth.currentUser;

    if (!user) {
        // This should be handled by the layout's auth guard, but as a fallback:
        return <div className="p-4">Please sign in to view the dashboard.</div>
    }

    const counts = await getSummaryCounts(user.uid);
    const insights = await getDashboardInsights(counts);
  
  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <SummaryCard title="Total Leads" value={counts.leadCount} icon={Contact} />
        <SummaryCard title="Total Services" value={counts.serviceCount} icon={ShoppingBag} />
        <SummaryCard title="Total Categories" value={counts.categoryCount} icon={Shapes} />
        <SummaryCard title="Total Packages" value={counts.packageCount} icon={Box} />
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <AiInsights insights={insights.insights} />
      </div>
    </>
  );
}
