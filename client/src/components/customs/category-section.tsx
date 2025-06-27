import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { CategoryInterface } from "@/interfaces/Category";
import { generateGradientColors, getColorVariables } from "@/utils/colors";
import { AddStatDialog } from "./addStatDialog";

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

          return (
            <Card
              key={stat._id}
              className="relative overflow-hidden"
              style={
                {
                  background: `linear-gradient(135deg, ${statColor}15 0%, ${statColor}05 100%)`,
                  borderColor: `${statColor}40`,
                  ...colorVars,
                } as React.CSSProperties
              }
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                <div className="h-4 w-4 rounded-full opacity-60" style={{ backgroundColor: statColor }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: `hsl(var(--category-color-dark))` }}>
                  {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                  {stat.unit && <span className="text-lg ml-1">{stat.unit}</span>}
                </div>

                {stat.trend && (
                  <div className="flex items-center text-xs mt-1">
                    {stat.trend.direction === "up" && <TrendingUp className="h-3 w-3 mr-1 text-green-600" />}
                    {stat.trend.direction === "down" && <TrendingDown className="h-3 w-3 mr-1 text-red-600" />}
                    {stat.trend.direction === "neutral" && <Minus className="h-3 w-3 mr-1 text-gray-600" />}
                    <span
                      className={
                        stat.trend.direction === "up"
                          ? "text-green-600"
                          : stat.trend.direction === "down"
                            ? "text-red-600"
                            : "text-gray-600"
                      }
                    >
                      {stat.trend.label || `${stat.trend.percentage}%`}
                    </span>
                  </div>
                )}

                {stat.description && <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>}
              </CardContent>
            </Card>
          );
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
