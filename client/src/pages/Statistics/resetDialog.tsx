import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosConfig } from "@/config/axiosConfig";
import { StatInterface } from "@/interfaces/Stat";

interface ResetStatDialogProps {
  stat: StatInterface;
  entries: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}

/* Erases the whole history of a stat and restarts it from a new value */
export const ResetStatDialog = ({ stat, entries, open, onOpenChange, onReset }: ResetStatDialogProps) => {
  const { t } = useTranslation();
  const [value, setValue] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue("0");
  }, [open]);

  const reset = async () => {
    setSaving(true);
    try {
      const response = await axiosConfig.post(`/stats/${stat._id}/reset`, { value: value.trim() });
      toast.success(response.data.message);
      onOpenChange(false);
      onReset();
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("pages.statistics.reset.title", { name: stat.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("pages.statistics.reset.description")}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("pages.statistics.reset.warning", { count: entries })}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-value">{t("pages.statistics.reset.value")}</Label>
          <Input
            id="reset-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && value.trim() && !saving && reset()}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>{t("pages.statistics.reset.cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={reset} disabled={!value.trim() || saving}>
            {t("pages.statistics.reset.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
