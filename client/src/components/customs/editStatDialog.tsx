import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatInterface } from "@/interfaces/Stat";
import { toast } from "sonner";
import { axiosConfig } from "@/config/axiosConfig";
import { FormDescription } from "../ui/form";

interface EditStatDialogProps {
  stat: StatInterface | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refresh: () => void;
}

export function EditStatDialog({ stat, open, onOpenChange, refresh }: EditStatDialogProps) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (stat) {
      setName(stat.name);
      setValue(stat.value.toString());
      setUnit(stat.unit || "");
      setDescription(stat.description || "");
    }
  }, [stat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stat || !name.trim() || !value.trim()) return;

    const updatedStat = {
      ...stat,
      value: value.trim(),
      unit: unit.trim() || undefined,
      description: description.trim() || undefined,
      categoryId: stat.categoryId,
    };

    try {
      const response = await axiosConfig.put(`/stats/${stat._id}`, updatedStat);
      toast.success(response.data.message);
      onOpenChange(false);
      refresh();
    } catch (error: any) {
      toast.error(error.response.data.error);
    }
  };

  if (!stat) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Stat</DialogTitle>
            <DialogDescription>Update the details of this statistic.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-stat-name">Stat Name</Label>
              <Input
                id="edit-stat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weight, Net Worth, Books Read"
                required
                disabled={true}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-stat-value">Current Value</Label>
                <Input
                  id="edit-stat-value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g., 75, 50000, 12"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-stat-unit">Unit (Optional)</Label>
                <Input id="edit-stat-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g., kg, $, books" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-stat-description">Description (Optional)</Label>
              <Input
                id="edit-stat-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional context or notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
