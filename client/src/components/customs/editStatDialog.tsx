import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatInterface } from "@/interfaces/Stat";

interface EditStatDialogProps {
  stat: StatInterface | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refresh: () => void; // Optional callback to refresh stats after editing
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stat || !name.trim() || !value.trim()) return;

    const updatedStat: StatInterface = {
      ...stat,
      name: name.trim(),
      value: value.trim(),
      unit: unit.trim() || undefined,
      description: description.trim() || undefined,
    };

    //Update
    console.log(updatedStat);

    refresh();
    onOpenChange(false);
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
