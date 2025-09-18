
'use client';

import { Task } from '@/lib/types';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface TaskCalendarProps {
  tasks: Task[];
  getProjectName: (projectId: string) => string;
}

export function TaskCalendar({ tasks, getProjectName }: TaskCalendarProps) {
  const events = tasks.map(task => ({
    id: task.id,
    title: `${getProjectName(task.projectId)}: ${task.title}`,
    start: task.dueDate ? new Date(task.dueDate) : new Date(),
    end: task.dueDate ? new Date(task.dueDate) : new Date(),
    allDay: true,
  }));

  return (
    <div className="h-[70vh]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
      />
    </div>
  );
}
