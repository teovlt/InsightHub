import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EllipsisVertical, Plus, RefreshCw, Trash, UserPlus } from "lucide-react";
import { Input } from "../ui/input";
import { DialogHeader, DialogFooter, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  dataCount: number;
  fetchData: (pageIndex: number, pageSize: number) => void;
  isLoading: boolean;
  callback: (action: string, data: any) => void;
  searchElement: string;
  searchPlaceholder: string;
  actions?: string[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  dataCount,
  fetchData,
  isLoading,
  callback,
  searchElement,
  searchPlaceholder,
  actions = [],
}: DataTableProps<TData, TValue>) {
  const [openModal, setOpenModal] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    fetchData(pagination.pageIndex, pagination.pageSize);
  }, [pagination.pageIndex, pagination.pageSize]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    manualPagination: true,
    pageCount: Math.ceil(dataCount / pagination.pageSize),
  });

  return (
    <div className="overflow-hidden border rounded-md">
      <div className="flex flex-col items-center justify-between gap-4 p-4 text-2xl md:flex-row">
        <div className="flex flex-col w-full gap-4 md:flex-row">
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchElement)?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn(searchElement)?.setFilterValue(event.target.value)}
            className="w-full md:w-auto"
          />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {(column.columnDef.meta as any)?.label ?? column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => fetchData(pagination.pageIndex, pagination.pageSize)} disabled={isLoading}>
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {actions.length !== 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.includes("create") && (
                <DropdownMenuItem className="flex gap-4" onClick={() => callback("create", null)}>
                  <Plus className="w-4 h-4" />
                  <span>Create a new entity</span>
                </DropdownMenuItem>
              )}
              {actions.includes("deleteAll") && (
                <DropdownMenuItem className="flex gap-4" onClick={() => setOpenModal(true)}>
                  <Trash className="w-4 h-4" />
                  <span>Delete all entities</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <Separator />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-extrabold text-left">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <tr className="absolute top-0 left-0 z-10 w-full h-0.5 overflow-hidden">
                  <td colSpan={columns.length}>
                    <div className="w-full h-full bg-linear-to-r from-primary animate-loading" />
                  </td>
                </tr>
                {Array.from({ length: table.getState().pagination.pageSize }).map((_, idx) => (
                  <TableRow key={`loading-row-${idx}`} className="animate-pulse">
                    {table.getAllLeafColumns().map((column) => (
                      <TableCell key={column.id}>
                        <div className="w-3/4 h-10 rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Separator />
      <div className="flex flex-col items-center justify-between gap-4 p-4 md:flex-row">
        <div className="text-sm">
          Page <strong>{table.getState().pagination.pageIndex + 1}</strong> of <strong>{table.getPageCount()}</strong> • {dataCount} total
          entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, pageIndex: 0 }))}
            disabled={pagination.pageIndex === 0}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
            disabled={pagination.pageIndex === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
            disabled={(pagination.pageIndex + 1) * pagination.pageSize >= dataCount}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                pageIndex: Math.floor((dataCount - 1) / pagination.pageSize),
              }))
            }
            disabled={(pagination.pageIndex + 1) * pagination.pageSize >= dataCount}
          >
            Last
          </Button>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => {
              if (value === "all") {
                setPagination((prev) => ({
                  ...prev,
                  pageSize: dataCount,
                  pageIndex: 0,
                }));
              } else {
                setPagination((prev) => ({
                  ...prev,
                  pageSize: Number(value),
                  pageIndex: 0,
                }));
              }
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Rows">
                {table.getState().pagination.pageSize === dataCount ? "All" : `${table.getState().pagination.pageSize} per page`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} per page
                </SelectItem>
              ))}
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {openModal && (
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Delete all entities</DialogTitle>
              <DialogDescription>Are you sure you want to delete all entities of this table? There is no going back</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  callback("deleteAll", null);
                  setOpenModal(false);
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
