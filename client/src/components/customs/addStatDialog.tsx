import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { axiosConfig } from "@/config/axiosConfig";

interface AddStatDialogProps {
  categoryId: string;
  refrechStats: () => void; // Optional callback to refresh stats after adding
}

export function AddStatDialog({ categoryId, refrechStats }: AddStatDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value.trim()) return;

    const values = {
      name,
      value,
      unit: unit.trim() || undefined,
      description: description.trim() || undefined,
      categoryId,
      createdAt: new Date(),
    };

    try {
      setLoading(true);
      const response = await axiosConfig.post("/stats", values);
      toast.success(response.data.message);
      setOpen(false);
      refrechStats();
    } catch (error: any) {
      toast.error(error.response.data.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            setName("");
            setValue("");
            setUnit("");
            setDescription("");
          }}
        >
          <Plus className="h-3 w-3" />
          Add Stat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Stat</DialogTitle>
            <DialogDescription>Add a new metric to track in this category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stat-name">Stat Name</Label>
              <Input
                id="stat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weight, Net Worth, Books Read"
                required
              />
              <span className="text-red-400 text-sm">
                Please note that renaming a stat is not allowed. Therefore this name should be unique and descriptive. You will not be able
                to change it later.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="stat-value">Current Value</Label>
                <Input
                  id="stat-value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g., 75, 50000, 12"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stat-unit">Unit (Optional)</Label>
                <Input id="stat-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g., kg, $, books" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stat-description">Description (Optional)</Label>
              <Input
                id="stat-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional context or notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Stat</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
