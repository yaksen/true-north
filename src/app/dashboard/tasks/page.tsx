
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project, Task } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { GlobalTasksClient } from '@/components/tasks/global-tasks-client';

export default function GlobalTasksPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const projectsQuery = query(collection(db, 'projects'), where('members', 'array-contains', user.uid));
    
    const unsubscribeProjects = onSnapshot(projectsQuery, (projectsSnapshot) => {
      const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projectsData);
      
      if (projectsData.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // Fetch tasks for all projects the user is a member of.
      // Firestore 'in' query is limited to 30 values, so we might need to batch this in the future if a user has many projects.
      const projectIds = projectsData.map(p => p.id);
      const tasksQuery = query(collection(db, 'tasks'), where('projectId', 'in', projectIds));
      
      const unsubscribeTasks = onSnapshot(tasksQuery, (tasksSnapshot) => {
        const tasksData = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(tasksData);
        setLoading(false);
      });

      return () => unsubscribeTasks();
    });

    return () => unsubscribeProjects();
  }, [user]);

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Global Tasks</h1>
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-4">
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : (
        <GlobalTasksClient projects={projects} tasks={tasks} />
      )}
    </>
  );
}
