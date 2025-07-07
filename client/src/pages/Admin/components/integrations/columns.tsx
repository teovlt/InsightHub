import { ColumnDef } from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, EllipsisVertical } from "lucide-react";
import { toast } from "sonner";
import { IntegrationInterface } from "@/interfaces/Integration";
import * as LucideIcons from "lucide-react";
import { LucideProps } from "lucide-react";

export const getColumns = (callback: (action: string, data: any) => void): ColumnDef<IntegrationInterface>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const integration = row.original;
      const iconName = integration.icon;

      const LucideIcon = LucideIcons[iconName as keyof typeof LucideIcons] as React.ElementType<LucideProps>;

      return (
        <div className="flex items-center gap-2">
          {LucideIcon ? <LucideIcon className="w-4 h-4 " /> : <span className="w-4 h-4 bg-gray-200 rounded-full" />}
          <span className="text-sm">{integration.name}</span>
        </div>
      );
    },
  },

  {
    accessorKey: "key",
    header: "Key",
    cell: ({ row }) => <code className="text-xs bg-muted px-2 py-0.5 rounded">{row.getValue("key")}</code>,
  },
  {
    accessorKey: "color",
    header: "Color",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: row.getValue("color") }} />
        <span className="text-xs">{row.getValue("color")}</span>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <span className="text-xs">{row.getValue("category")}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as "available" | "disabled" | "deprecated";
      const color = status === "available" ? "green" : status === "disabled" ? "red" : "yellow";
      return (
        <Badge variant="outline" className={`border-${color}-500 text-${color}-600`}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: "Actions",
    cell: ({ row }) => {
      const integration = row.original;

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
                navigator.clipboard.writeText(integration._id);
                toast.success("Integration ID copied to clipboard");
              }}
            >
              <Copy className="w-4 h-4" /> Copy integration ID
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex gap-4 text-destructive hover:text-destructive!"
              onClick={() => callback("delete", integration._id)}
            >
              <LucideIcons.Trash className="w-4 h-4" /> Delete this integration
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
