import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { axiosConfig } from "@/config/axiosConfig";
import { CategoryInterface } from "@/interfaces/Category";

interface QuickUpdateDialogProps {
  categories: CategoryInterface[];
  onUpdated: () => void;
  trigger: React.ReactNode;
}

// Logs a new value for an existing manual stat in two clicks; synced stats update on their own.
export function QuickUpdateDialog({ categories, onUpdated, trigger }: QuickUpdateDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [statId, setStatId] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const groups = categories
    .map((category) => ({ ...category, stats: category.stats.filter((stat) => !stat.integrationId) }))
    .filter((category) => category.stats.length > 0);
  const selected = groups.flatMap((category) => category.stats).find((stat) => stat._id === statId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statId || !value.trim()) return;

    try {
      setLoading(true);
      const response = await axiosConfig.put(`/stats/${statId}`, { value: value.trim() });
      toast.success(response.data.message);
      setOpen(false);
      onUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        asChild
        onClick={() => {
          setStatId("");
          setValue("");
        }}
      >
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("pages.dashboard.quick_update.title")}</DialogTitle>
            <DialogDescription>{t("pages.dashboard.quick_update.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("pages.dashboard.quick_update.stat")}</Label>
              <Select value={statId} onValueChange={setStatId}>
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue placeholder={t("pages.dashboard.quick_update.choose")} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((category) => (
                    <SelectGroup key={category._id}>
                      <SelectLabel>{category.name}</SelectLabel>
                      {category.stats.map((stat) => (
                        <SelectItem key={stat._id} value={stat._id}>
                          {stat.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-value">{t("pages.dashboard.quick_update.value")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="quick-value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={selected ? selected.value : "42"}
                  required
                />
                {selected?.unit && <span className="whitespace-nowrap text-sm text-muted-foreground">{selected.unit}</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !statId}>
              {t("pages.dashboard.quick_update.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
