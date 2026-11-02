import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, RotateCcw, EllipsisVertical, Zap } from "lucide-react";
import { StatInterface } from "@/interfaces/Stat";
import { EditStatDialog } from "./editStatDialog";
import { DeleteConfirmationDialog } from "./deleteConfirmationDialog";
import { axiosConfig } from "@/config/axiosConfig";
import { toast } from "sonner";
import { RollbackStatDialog } from "./rollbackDialog";
import { Badge } from "../ui/badge";

interface StatCardProps {
  stat: StatInterface;
  color: string;
  colorVars: Record<string, string>;
  refresh: () => void;
}

export function StatCard({ stat, color, colorVars, refresh }: StatCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rollbackDialog, setRollbackDialog] = useState(false);

  const handleDelete = async () => {
    try {
      const response = await axiosConfig.delete(`/stats/${stat._id}`);
      toast.success(response.data.message);
      setDeleteDialogOpen(false);
      refresh();
    } catch (error: any) {
      toast.error(error.response.data.error);
    }
  };

  return (
    <>
      <Card
        className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
        style={colorVars}
      >
        {/* Colored top edge in the category tone */}
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: `${color}26` }}
        />

        <CardHeader className="relative flex flex-row items-start justify-between space-y-0 p-5 pb-2">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate">{stat.name}</span>
          </CardTitle>
          {stat.integrationId ? (
            <Badge className="border-transparent bg-lime text-[#0f172a]">
              <Zap />
              Auto
            </Badge>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="-mr-2 -mt-1 h-7 w-7 p-0 opacity-60 group-hover:opacity-100">
                  <EllipsisVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRollbackDialog(true)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Rollback
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="relative p-5 pt-1">
          <div className="flex max-w-full items-baseline gap-1.5 overflow-hidden">
            <span className="truncate font-display text-3xl font-bold tracking-tight">
              {stat.hided ? <span className="text-muted-foreground">••••••</span> : stat.value}
            </span>
            {stat.unit && <span className="whitespace-nowrap text-base font-medium text-muted-foreground">{stat.unit}</span>}
          </div>
          {stat.description && <p className="mt-2 break-words text-xs text-muted-foreground">{stat.description}</p>}
        </CardContent>
      </Card>

      <EditStatDialog stat={stat} open={editDialogOpen} onOpenChange={setEditDialogOpen} refresh={refresh} />
      <RollbackStatDialog stat={stat} open={rollbackDialog} onOpenChange={setRollbackDialog} refresh={refresh} />
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Statistic"
        description={`Are you sure you want to delete "${stat.name}"? This action cannot be undone.`}
      />
    </>
  );
}
