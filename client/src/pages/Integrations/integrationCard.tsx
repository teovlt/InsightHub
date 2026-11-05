"use client";

import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle, Settings, Settings2, Unplug, RefreshCw, MoreHorizontal } from "lucide-react";
import { IntegrationInterface, IntegrationStat } from "@/interfaces/Integration";
import { getIcon } from "@/lib/icons";
import { dateLocale } from "@/lib/stats";

interface IntegrationCardProps {
  onConnect: (integrationId: string) => void;
  onDisconnect: (integrationId: string) => void;
  onToggleStat: (integrationId: string, statId: string) => void;
  onSync: (integrationId: string) => void;
  integration: IntegrationInterface;
  integrationUser?: {
    activedStat: string[];
  };
}

export function IntegrationCard({ integration, onConnect, onDisconnect, onToggleStat, onSync, integrationUser }: IntegrationCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const lastSyncedAt = integration.integrationUser?.lastSyncedAt;

  const IconComponent = getIcon(integration.icon);

  return (
    <Card
      className={`relative flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${
        isExpanded ? "md:col-span-2 xl:col-span-3" : ""
      }`}
    >
      {integration.isConnected && <div className="absolute inset-x-0 top-0 h-1 bg-lime" />}
      <CardHeader className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm [&_svg]:size-6"
              style={{ backgroundColor: integration.color || "var(--accent)" }}
            >
              <IconComponent />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{integration.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {integration.isConnected && (
                  <Badge className="border-transparent bg-lime text-[#0f172a]">
                    <CheckCircle />
                    {integration.integrationUser?.config?.account && integration.authType === "username"
                      ? integration.integrationUser.config.account
                      : t("pages.integrations.card.connected")}
                  </Badge>
                )}
                {!integration.isConnected && integration.authType && integration.authType !== "oauth" && (
                  <Badge variant="outline">
                    {integration.authType === "apiKey" ? t("pages.integrations.card.api_key") : t("pages.integrations.card.username_only")}
                  </Badge>
                )}
                {integration.category && <Badge variant="secondary">{integration.category}</Badge>}
              </div>
              {integration.isConnected && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground" title={t("pages.integrations.auto_sync")}>
                  <RefreshCw className="h-3 w-3" />
                  {lastSyncedAt
                    ? t("pages.integrations.synced_ago", {
                        when: formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true, locale: dateLocale() }),
                      })
                    : t("pages.integrations.never_synced")}
                </p>
              )}
            </div>
          </div>

          {/* Bloc actions */}
          <div className="flex items-center gap-2 self-start">
            {integration.isConnected && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSync(integration._id)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("pages.integrations.card.sync_now")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t("pages.integrations.card.configure")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDisconnect(integration._id)} className="text-red-600">
                    <Unplug className="mr-2 h-4 w-4" />
                    {t("pages.integrations.card.disconnect")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!integration.isConnected && (
              <Button size="sm" className="rounded-full px-4" onClick={() => onConnect(integration._id)}>
                {t("pages.integrations.card.connect")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {integration.isConnected && isExpanded && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">{t("pages.integrations.card.available_stats")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integration.availableStats?.map((stat: IntegrationStat) => (
                  <div
                    key={stat._id}
                    className="flex flex-col justify-between gap-4 rounded-xl border bg-background/60 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex flex-1 items-start gap-3">
                      <span className="text-xl">{stat.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{stat.name}</p>
                        <p className="text-xs text-muted-foreground">{stat.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {stat.updateFrequency}
                          </Badge>
                          {stat.unit && (
                            <span className="text-xs text-muted-foreground">{t("pages.integrations.card.unit", { unit: stat.unit })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Switch
                        checked={integration.integrationUser?.activedStat?.some((id) => id.toString() === stat._id.toString()) ?? false}
                        onCheckedChange={() => onToggleStat(integration._id, stat._id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {integration.integrationUser?.activedStat?.length > 0 && (
              <div className="rounded-xl border border-lime/60 bg-lime/15 p-3">
                <p className="text-sm">
                  ✅{" "}
                  <Trans
                    i18nKey="pages.integrations.card.enabled_stats"
                    count={integration.integrationUser.activedStat.length}
                    components={{ strong: <strong /> }}
                  />
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
