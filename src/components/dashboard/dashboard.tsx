
'use client';

import type { Project, Task, Finance, CrmSettings } from '@/lib/types';
import { DashboardClient } from './dashboard-client';

interface DashboardProps {
    projects: Project[];
    tasks: Task[];
    finances: Finance[];
    settings: CrmSettings | null;
}

export function Dashboard(props: DashboardProps) {
    return (
        <div className="space-y-6">
            <DashboardClient 
                projects={props.projects} 
                tasks={props.tasks} 
                finances={props.finances} 
                settings={props.settings} 
            />
        </div>
    );
}
