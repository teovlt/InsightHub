import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, RotateCcw, EllipsisVertical } from "lucide-react";
import { StatInterface } from "@/interfaces/Stat";
import { EditStatDialog } from "./editStatDialog";
import { DeleteConfirmationDialog } from "./deleteConfirmationDialog";
import { axiosConfig } from "@/config/axiosConfig";
import { toast } from "sonner";
import { RollbackStatDialog } from "./rollbackDialog";

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
        className="relative overflow-hidden group border transition-colors dark:border-neutral-700 dark:bg-neutral-900"
        style={{
          background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`,
          borderColor: `${color}40`,
          ...colorVars,
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium pr-2">{stat.name}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full opacity-60" style={{ backgroundColor: color }} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 ">
                  <EllipsisVertical className="h-3 w-3" />
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline max-w-full overflow-hidden">
            <span className="text-2xl font-bold truncate max-w-full mr-2">
              {stat.hided ? <span className="text-muted-foreground">************</span> : stat.value}
            </span>
            {stat.unit && <span className="text-lg ml-1 whitespace-nowrap text-muted-foreground">{stat.unit}</span>}
          </div>
          {stat.description && <p className="text-xs text-muted-foreground mt-1 break-words">{stat.description}</p>}
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
