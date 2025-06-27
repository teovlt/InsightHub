import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { CategoryInterface } from "@/interfaces/Category";
import { generateGradientColors, getColorVariables } from "@/utils/colors";
import { AddStatDialog } from "./addStatDialog";
import { StatCard } from "./statCard";

interface CategorySectionProps {
  category: CategoryInterface;
  refresh: () => void; // Optional callback to refresh stats
}

export function CategorySection({ category, refresh }: CategorySectionProps) {
  const IconComponent = (LucideIcons as any)[category.icon] || LucideIcons.Circle;
  const gradientColors = generateGradientColors(category.color, Math.max(4, category.stats.length));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <IconComponent className="h-6 w-6" style={{ color: category.color }} />
          {category.name}
        </h2>
        <AddStatDialog categoryId={category._id} refrechStats={refresh} />
      </div>

      {category.description && <p className="text-muted-foreground">{category.description}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {category.stats.map((stat, index) => {
          const statColor = gradientColors[index % gradientColors.length];
          const colorVars = getColorVariables(statColor, index);

          return <StatCard key={stat._id} stat={stat} color={statColor} colorVars={colorVars} refresh={refresh} />;
        })}

        {category.stats.length === 0 && (
          <Card className="border-dashed border-2 flex items-center justify-center p-8 col-span-full">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No stats in this category yet.</p>
              <p className="text-xs mt-1">Click "Add Stat" to get started!</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
