import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosConfig } from "@/config/axiosConfig";
import { StatInterface } from "@/interfaces/Stat";
import { formatNumeric, parseNumericInput } from "@/lib/stats";

interface GoalDialogProps {
  stat: StatInterface;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function GoalDialog({ stat, open, onOpenChange, onSaved }: GoalDialogProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (open) {
      setTarget(stat.goal?.target !== undefined ? formatNumeric(stat.goal.target, stat.type).replace(/\s/g, "") : "");
      setDeadline(stat.goal?.deadline ? stat.goal.deadline.slice(0, 10) : "");
    }
  }, [open, stat]);

  const save = async (body: { target: number | null; deadline?: string | null }) => {
    try {
      const response = await axiosConfig.patch(`/stats/${stat._id}/goal`, body);
      toast.success(response.data.message);
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseNumericInput(target);
    if (value === null) {
      toast.error(t("pages.statistics.goal.invalid"));
      return;
    }
    save({ target: value, deadline: deadline || null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("pages.statistics.goal.title")}</DialogTitle>
            <DialogDescription>{t("pages.statistics.goal.description", { name: stat.name })}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="goal-target">{t("pages.statistics.goal.target")}</Label>
              <div className="flex items-center gap-2">
                <Input id="goal-target" value={target} onChange={(e) => setTarget(e.target.value)} required />
                {stat.unit && <span className="whitespace-nowrap text-sm text-muted-foreground">{stat.unit}</span>}
              </div>
              {stat.type === "duration" && <p className="text-xs text-muted-foreground">{t("pages.statistics.goal.duration_hint")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-deadline">{t("pages.statistics.goal.deadline")}</Label>
              <Input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {stat.goal?.target !== undefined && (
              <Button type="button" variant="ghost" onClick={() => save({ target: null })}>
                {t("pages.statistics.goal.remove")}
              </Button>
            )}
            <Button type="submit">{t("pages.statistics.goal.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
