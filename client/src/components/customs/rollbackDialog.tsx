import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { axiosConfig } from "@/config/axiosConfig";
import { StatInterface } from "@/interfaces/Stat";
import { toast } from "sonner";

interface RollbackDialogProps {
  stat: StatInterface | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refresh: () => void;
}

export function RollbackStatDialog({ open, onOpenChange, stat, refresh }: RollbackDialogProps) {
  const rollback = async () => {
    if (!stat) return;

    try {
      const response = await axiosConfig.post(`/stats/rollback/${stat._id}`);
      toast.success(response.data.message);
      onOpenChange(false);
      refresh();
    } catch (error: any) {
      toast.error(error.response.data.error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure, you wanna go back</AlertDialogTitle>
          <AlertDialogDescription>
            This statistic will go back to it most recent value. The actual value will be lost forever
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={rollback} className="bg-red-600 hover:bg-red-700">
            Rollback
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
