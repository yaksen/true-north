

'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  getExpandedRowModel,
  Row,
  ExpandedState,
} from '@tanstack/react-table';
import { useState, useMemo, useEffect } from 'react';

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from './button';
import { Input } from './input';
import { ChevronDown, FileDown, Star, Trash2, ArrowRight, Archive } from 'lucide-react';
import { ScrollArea } from './scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './alert-dialog';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  toolbar?: React.ReactNode;
  getSubRows?: (row: Row<TData>) => TData[] | undefined;
  onDeleteSelected?: (selectedIds: string[]) => Promise<void>;
  onPostponeSelected?: (selectedIds: string[]) => Promise<void>;
  onArchiveSelected?: (selectedIds: string[]) => Promise<void>;
  globalFilter?: string;
  setGlobalFilter?: (value: string) => void;
}

export function DataTable<TData extends {id: string, starred?: boolean, completed?: boolean} , TValue>({
  columns,
  data,
  toolbar,
  getSubRows,
  onDeleteSelected,
  onPostponeSelected,
  onArchiveSelected,
  globalFilter: externalGlobalFilter,
  setGlobalFilter: setExternalGlobalFilter,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [showStarred, setShowStarred] = useState(false);

  const isGlobalFilterControlled = externalGlobalFilter !== undefined && setExternalGlobalFilter !== undefined;
  const globalFilter = isGlobalFilterControlled ? externalGlobalFilter : internalGlobalFilter;
  const setGlobalFilter = isGlobalFilterControlled ? setExternalGlobalFilter : setInternalGlobalFilter;

  const filteredData = useMemo(() => {
    if (showStarred) {
        return data.filter(item => item.starred);
    }
    return data;
  }, [data, showStarred]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
    getSubRows: getSubRows as any, // Type assertion might be needed depending on strictness
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      expanded,
    },
    meta: {
      toggleStar: (rowId: string) => {
        // This is a placeholder, actual implementation will be on the page
        console.log("Toggling star for", rowId);
      }
    }
  });
  
   // Sync external filter changes
   useEffect(() => {
    if (isGlobalFilterControlled) {
        table.setGlobalFilter(externalGlobalFilter);
    }
  }, [externalGlobalFilter, table, isGlobalFilterControlled]);


  const handleExport = () => {
    const rowsToExport = table.getFilteredSelectedRowModel().rows.length > 0
      ? table.getFilteredSelectedRowModel().rows
      : table.getFilteredRowModel().rows;

    if (rowsToExport.length === 0) {
        alert("No data to export.");
        return;
    }

    const headers = columns
      .map(col => (col as any).accessorKey || col.id)
      .filter(key => key && key !== 'select' && key !== 'actions' && key !== 'star')
      .join(',');

    const csvContent = [
        headers,
        ...rowsToExport.map(row => 
            columns
                .map(col => {
                    const key = (col as any).accessorKey || col.id;
                    if (!key || key === 'select' || key === 'actions' || key === 'star') return null;

                    let value = (row.original as any)[key];

                    if (typeof (col as any).cell === 'function') {
                        const cellValue = (col as any).cell({ row });
                        if (typeof cellValue === 'string' || typeof cellValue === 'number') {
                            value = cellValue;
                        } else {
                            // Attempt to get a primitive value from rendered component
                            value = (cellValue as React.ReactElement)?.props?.children ?? (row.original as any)[key];
                        }
                    }

                    if (value === null || value === undefined) value = '';
                    if (value instanceof Date) value = value.toISOString();
                    
                    if (Array.isArray(value)) {
                        return `"${value.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(', ')}"`;
                    }
                    if (typeof value === 'object') {
                        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                    }
                    
                    return `"${String(value).replace(/"/g, '""')}"`;
                })
                .filter(val => val !== null)
                .join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `export-${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  const handleDelete = () => {
    if (!onDeleteSelected) return;
    const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
    onDeleteSelected(selectedIds).then(() => {
        table.resetRowSelection();
    });
  }

  const handlePostpone = () => {
    if (!onPostponeSelected) return;
    const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
    onPostponeSelected(selectedIds).then(() => {
        table.resetRowSelection();
    });
  }

  const handleArchive = () => {
    if (!onArchiveSelected) return;
    const selectedIds = table.getFilteredSelectedRowModel().rows.filter(row => row.original.completed).map(row => row.original.id);
    if (selectedIds.length === 0) {
        alert("No completed tasks selected to archive.");
        return;
    }
    onArchiveSelected(selectedIds).then(() => {
        table.resetRowSelection();
    });
  }

  const isRowSelected = table.getFilteredSelectedRowModel().rows.length > 0;
  const hasData = table.getFilteredRowModel().rows.length > 0;

  if (!table) {
    return null; // or a loading indicator
  }

  return (
    <>
        <div className="flex items-center justify-between pb-6 gap-2">
            <div className='flex items-center gap-2 flex-wrap'>
                {!isGlobalFilterControlled && (
                    <Input
                        placeholder="Search all columns..."
                        value={globalFilter ?? ''}
                        onChange={(event) =>
                            setGlobalFilter(String(event.target.value))
                        }
                        className="max-w-sm h-9"
                    />
                )}
                {toolbar}
            </div>
            <div className='flex items-center gap-2'>
                <Button variant={showStarred ? "secondary" : "outline"} size="icon" onClick={() => setShowStarred(!showStarred)} className='h-9 w-9'>
                    <Star className="h-4 w-4" />
                </Button>
                {onArchiveSelected && (
                     <Button variant="outline" size="sm" disabled={!isRowSelected} onClick={handleArchive} className='h-9'>
                        <Archive className='mr-2 h-4 w-4' />
                        Archive ({table.getFilteredSelectedRowModel().rows.filter(r => r.original.completed).length})
                    </Button>
                )}
                 {onPostponeSelected && (
                     <Button variant="outline" size="sm" disabled={!isRowSelected} onClick={handlePostpone} className='h-9'>
                        <ArrowRight className='mr-2 h-4 w-4' />
                        Postpone ({table.getFilteredSelectedRowModel().rows.length})
                    </Button>
                )}
                {onDeleteSelected && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={!isRowSelected} className='h-9'>
                                <Trash2 className='mr-2 h-4 w-4' />
                                Delete ({table.getFilteredSelectedRowModel().rows.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the selected {table.getFilteredSelectedRowModel().rows.length} record(s). This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <Button variant="outline" size="sm" onClick={handleExport} disabled={!hasData} className='h-9'>
                    <FileDown className='mr-2 h-4 w-4' />
                    Export
                </Button>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className='h-9'>
                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                        // Create a more readable name for the column toggle
                        const displayName = column.id.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        return (
                        <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                            }
                        >
                            {displayName}
                        </DropdownMenuCheckboxItem>
                        );
                    })}
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <ScrollArea className="whitespace-nowrap">
          <div className="rounded-xl border">
            <Table>
              <TableHeader className='bg-muted/50'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="p-2 align-top">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between pt-4">
            <div className="flex-1 text-sm text-muted-foreground">
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>
        </div>
    </>
  );
}
