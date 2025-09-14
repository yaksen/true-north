
'use client';

import React, { useState, useEffect } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { WidgetItem, Project, Task, Finance, CrmSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Layout, Lock, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DashboardClient } from './dashboard-client';

const GridLayout = WidthProvider(RGL);

interface DraggableDashboardProps {
    projects: Project[];
    tasks: Task[];
    finances: Finance[];
    settings: CrmSettings | null;
}

const defaultLayout: WidgetItem[] = [
    { id: 'mainDashboard', i: 'mainDashboard', x: 0, y: 0, w: 12, h: 10, minW: 8, minH: 8, type: 'dashboardClient' },
];

export function DraggableDashboard(props: DraggableDashboardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [layout, setLayout] = useState<WidgetItem[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const layoutDocRef = doc(db, 'dashboardLayouts', user.uid);
        
        getDoc(layoutDocRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Filter out old/removed widgets
                const currentWidgetTypes = defaultLayout.map(l => l.type);
                const filteredWidgets = data.widgets.filter((w: WidgetItem) => currentWidgetTypes.includes(w.type));
                setLayout(filteredWidgets);
            } else {
                setLayout(defaultLayout);
                // Save the default layout for the user
                setDoc(layoutDocRef, { 
                    id: user.uid, 
                    widgets: defaultLayout, 
                    updatedAt: serverTimestamp(),
                    version: 1,
                });
            }
            setIsLoading(false);
        }).catch(error => {
            console.error("Error fetching dashboard layout:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load dashboard layout." });
            setLayout(defaultLayout); // Fallback to default
            setIsLoading(false);
        });
    }, [user, toast]);

    const handleLayoutChange = (newLayout: RGL.Layout[]) => {
        // Only update state if in edit mode to prevent unwanted changes
        if (isEditMode) {
             const updatedWidgets = layout.map(widget => {
                const layoutItem = newLayout.find(l => l.i === widget.i);
                if (layoutItem) {
                    return { ...widget, ...layoutItem };
                }
                return widget;
            });
            setLayout(updatedWidgets);
        }
    };

    const saveLayout = async () => {
        if (!user) return;
        const layoutDocRef = doc(db, 'dashboardLayouts', user.uid);
        try {
            await setDoc(layoutDocRef, {
                id: user.uid,
                widgets: layout,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            toast({ title: "Success", description: "Dashboard layout saved!" });
            setIsEditMode(false);
        } catch (error) {
            console.error("Error saving layout:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save layout.' });
        }
    };

    const renderWidget = (widget: WidgetItem) => {
        switch (widget.type) {
            case 'dashboardClient':
                return <DashboardClient projects={props.projects} tasks={props.tasks} finances={props.finances} settings={props.settings} />;
            default:
                return <div>Unknown widget type</div>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-96 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className='mt-4'>
            <div className='flex justify-end mb-4 gap-2'>
                <Button size="sm" variant={isEditMode ? "default" : "outline"} onClick={() => setIsEditMode(!isEditMode)}>
                    {isEditMode ? <Lock className="mr-2 h-4 w-4"/> : <Layout className="mr-2 h-4 w-4" />}
                    {isEditMode ? 'Lock Layout' : 'Edit Layout'}
                </Button>
                {isEditMode && (
                    <Button size="sm" onClick={saveLayout}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Layout
                    </Button>
                )}
            </div>
            
            <GridLayout
                layout={layout}
                cols={12}
                rowHeight={60}
                onLayoutChange={handleLayoutChange}
                isDraggable={isEditMode}
                isResizable={isEditMode}
                draggableHandle=".drag-handle"
                className={cn(isEditMode && "rounded-lg border border-dashed")}
            >
                {layout.map(widget => (
                    <div key={widget.i} className={cn("bg-card rounded-2xl overflow-hidden", isEditMode && "border border-primary")}>
                         {isEditMode && <div className="drag-handle cursor-move w-full h-6 bg-muted/50 flex items-center justify-center">
                            <div className="w-8 h-1 bg-primary/50 rounded-full" />
                         </div>}
                         <div className={cn("p-2 h-full w-full")}>
                           {renderWidget(widget)}
                         </div>
                    </div>
                ))}
            </GridLayout>
        </div>
    );
}
