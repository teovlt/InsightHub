"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle, Settings, Unplug, RefreshCw, MoreHorizontal } from "lucide-react";
import { IntegrationInterface, IntegrationStat } from "@/interfaces/Integration";
import * as LucideIcons from "lucide-react";
import { LucideProps } from "lucide-react";

interface IntegrationCardProps {
  integration: IntegrationInterface & {
    enabledStats?: string[];
  };
  onConnect: (integrationId: string) => void;
  onDisconnect: (integrationId: string) => void;
  onToggleStat: (integrationId: string, statId: string) => void;
  onSync: (integrationId: string) => void;
}

export function IntegrationCard({ integration, onConnect, onDisconnect, onToggleStat, onSync }: IntegrationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const iconName = integration.icon;
  const LucideIcon = LucideIcons[iconName as keyof typeof LucideIcons];
  const IconComponent = LucideIcon as React.ElementType<LucideProps>;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="text-2xl w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: integration.color }}
            >
              <IconComponent />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">{integration.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{integration.description}</p>
              <div className="flex items-center gap-2 mt-2">
                {integration.isConnected && <CheckCircle className="text-green-500 h-4 w-4" />}
                <Badge variant="outline">{integration.category}</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {integration.isConnected && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSync(integration._id)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Stats
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDisconnect(integration._id)} className="text-red-600">
                    <Unplug className="mr-2 h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!integration.isConnected ? (
              <Button onClick={() => onConnect(integration._id)}>Connect</Button>
            ) : (
              <Button variant="outline" onClick={() => setIsExpanded(!isExpanded)}>
                <Settings className="h-4 w-4 mr-2" />
                Configure
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
              <h4 className="font-medium mb-3">Available Statistics</h4>
              <div className="space-y-3">
                {integration.availableStats?.map((stat: IntegrationStat & { _id: string }) => (
                  <div key={stat._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{stat.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{stat.name}</p>
                        <p className="text-xs text-muted-foreground">{stat.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {stat.updateFrequency}
                          </Badge>
                          {stat.unit && <span className="text-xs text-muted-foreground">Unit: {stat.unit}</span>}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={integration.enabledStats ? integration.enabledStats.includes(stat._id) : false}
                      onCheckedChange={() => onToggleStat(integration._id, stat._id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Affichage conditionnel si au moins une stat est activée */}
            {integration.enabledStats && integration.enabledStats.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ <strong>{integration.enabledStats.length}</strong> stats enabled and syncing to your dashboard
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
