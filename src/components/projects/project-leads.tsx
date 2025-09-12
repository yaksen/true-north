
'use client';

import type { Lead } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getProjectLeadsColumns } from './project-leads-columns';

interface ProjectLeadsTabProps {
  leads: Lead[];
}

export function ProjectLeadsTab({ leads }: ProjectLeadsTabProps) {
  const columns = getProjectLeadsColumns();

  return (
    <div className="mt-4">
      <DataTable columns={columns} data={leads} />
    </div>
  );
}
