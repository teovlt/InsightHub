import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosConfig } from "@/config/axiosConfig";
import { GoalDirection, StatInterface } from "@/interfaces/Stat";
import { formatNumeric, inferGoalDirection, parseNumericInput } from "@/lib/stats";
import { cn } from "@/lib/utils";

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
  // null until the user picks one: follows the target (below the current value → "decrease")
  const [direction, setDirection] = useState<GoalDirection | null>(null);

  useEffect(() => {
    if (open) {
      setTarget(stat.goal?.target !== undefined ? formatNumeric(stat.goal.target, stat.type).replace(/\s/g, "") : "");
      setDeadline(stat.goal?.deadline ? stat.goal.deadline.slice(0, 10) : "");
      setDirection(stat.goal?.direction ?? null);
    }
  }, [open, stat]);

  const parsedTarget = parseNumericInput(target);
  const shownDirection = direction ?? (parsedTarget !== null ? inferGoalDirection(stat.numericValue, parsedTarget) : "increase");

  const save = async (body: { target: number | null; deadline?: string | null; direction?: GoalDirection }) => {
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
    if (parsedTarget === null) {
      toast.error(t("pages.statistics.goal.invalid"));
      return;
    }
    save({ target: parsedTarget, deadline: deadline || null, direction: shownDirection });
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
              <Label>{t("pages.statistics.goal.direction")}</Label>
              <div className="inline-flex w-fit rounded-xl bg-secondary p-1" role="radiogroup">
                {(["increase", "decrease"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={shownDirection === option}
                    onClick={() => setDirection(option)}
                    className={cn(
                      "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                      shownDirection === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option === "increase" ? "↑" : "↓"} {t(`pages.statistics.goal.${option}`)}
                  </button>
                ))}
              </div>
              {direction === null && <p className="text-xs text-muted-foreground">{t("pages.statistics.goal.direction_auto")}</p>}
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
