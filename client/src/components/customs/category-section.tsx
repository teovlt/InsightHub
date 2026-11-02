import { getIcon } from "@/lib/icons";
import { CategoryInterface } from "@/interfaces/Category";
import { generateGradientColors, getColorVariables } from "@/utils/colors";
import { useTranslation } from "react-i18next";
import { AddStatDialog } from "./addStatDialog";
import { StatCard } from "./statCard";

interface CategorySectionProps {
  category: CategoryInterface;
  refresh: () => void; // Optional callback to refresh stats
}

export function CategorySection({ category, refresh }: CategorySectionProps) {
  const { t } = useTranslation();
  const IconComponent = getIcon(category.icon);
  const gradientColors = generateGradientColors(category.color, Math.max(4, category.stats.length)).reverse();

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${category.color}1f`, color: category.color }}
          >
            <IconComponent className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-2xl font-bold tracking-tight">{category.name}</h2>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {category.stats.length}
              </span>
            </div>
            {category.description && <p className="truncate text-sm text-muted-foreground">{category.description}</p>}
          </div>
        </div>
        <AddStatDialog categoryId={category._id} refrechStats={refresh} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {category.stats.map((stat, index) => {
          const statColor = gradientColors[index % gradientColors.length];
          const colorVars = getColorVariables(statColor, index);

          return <StatCard key={stat._id} stat={stat} color={statColor} colorVars={colorVars} refresh={refresh} />;
        })}

        {category.stats.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm font-medium">{t("pages.home.category_empty_title")}</p>
            <p className="text-xs text-muted-foreground">{t("pages.home.category_empty_description")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
