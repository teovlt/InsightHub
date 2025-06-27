import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Copy, EllipsisVertical, Trash } from "lucide-react";
import { toast } from "sonner";
import { CategoryInterface } from "@/interfaces/Category";
import * as LucideIcons from "lucide-react";
import { LucideProps } from "lucide-react";

export const getColumns = (callback: (action: string, data: any) => void): ColumnDef<CategoryInterface>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" className="font-bold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name
        <ArrowUpDown className="w-4 h-4 ml-2" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <Button variant="ghost" className="font-bold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Description
        <ArrowUpDown className="w-4 h-4 ml-2" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("description")}</div>,
  },
  {
    accessorKey: "color",
    header: ({ column }) => (
      <Button variant="ghost" className="font-bold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Color
        <ArrowUpDown className="w-4 h-4 ml-2" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("color");
      return (
        <div className="flex items-center gap-2 justify-start">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: value as string }}></span>
          <span>{value as string}</span>
        </div>
      );
    },
    meta: { label: "Color" },
  },
  {
    accessorKey: "icon",
    header: ({ column }) => (
      <Button variant="ghost" className="font-bold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Icon
        <ArrowUpDown className="w-4 h-4 ml-2" />
      </Button>
    ),
    cell: ({ row }) => {
      const iconName = row.getValue("icon") as string;

      const LucideIcon = LucideIcons[iconName as keyof typeof LucideIcons];

      const IconComponent = LucideIcon as React.ElementType<LucideProps>;

      return (
        <div className="flex items-center gap-2">
          <IconComponent className="w-4 h-4" />
          <span>{iconName}</span>
        </div>
      );
    },
    meta: { label: "Icon" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button variant="ghost" className="font-bold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Date
        <ArrowUpDown className="w-4 h-4 ml-2" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("createdAt");
      const formatted = format(new Date(value as Date), "dd/MM/yyyy HH:mm");
      return <div>{formatted}</div>;
    },
    meta: { label: "Date" },
  },
  {
    id: "actions",
    enableHiding: false,
    header: "Actions",
    cell: ({ row }) => {
      const category = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-8 h-8 p-0">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              className="flex gap-4"
              onClick={() => {
                navigator.clipboard.writeText(category._id);
                toast.success("Category ID copied to clipboard");
              }}
            >
              <Copy className="w-4 h-4" /> Copy category ID
            </DropdownMenuItem>
            <DropdownMenuItem className="flex gap-4" onClick={() => callback("update", category._id)}>
              <LucideIcons.Pencil className="w-4 h-4" /> Update this category
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex gap-4 text-destructive hover:text-destructive!"
              onClick={() => callback("delete", category._id)}
            >
              <Trash className="w-4 h-4" /> Delete this category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
