"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle, Clock, AlertCircle, Settings, Unplug, RefreshCw, MoreHorizontal, Zap } from "lucide-react";
import { IntegrationInterface } from "@/interfaces/Integration";

interface IntegrationCardProps {
  integration: IntegrationInterface;
  onConnect: (integrationId: string) => void;
  onDisconnect: (integrationId: string) => void;
  onToggleStat: (integrationId: string, statId: string) => void;
  onSync: (integrationId: string) => void;
}

export function IntegrationCard({ integration, onConnect, onDisconnect, onToggleStat, onSync }: IntegrationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  //   const getStatusIcon = () => {
  //     switch (integration.status) {
  //       case "connected":
  //         return <CheckCircle className="h-4 w-4 text-green-600" />;
  //       case "syncing":
  //         return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
  //       case "error":
  //         return <AlertCircle className="h-4 w-4 text-red-600" />;
  //       default:
  //         return <Clock className="h-4 w-4 text-gray-400" />;
  //     }
  //   };

  //   const getStatusText = () => {
  //     switch (integration.status) {
  //       case "connected":
  //         return `Connected ${integration.lastSync ? `• Last sync: ${new Date(integration.lastSync).toLocaleTimeString()}` : ""}`;
  //       case "syncing":
  //         return "Syncing data...";
  //       case "error":
  //         return integration.errorMessage || "Connection error";
  //       default:
  //         return "Not connected";
  //     }
  //   };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="text-2xl w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: integration.color }}
            >
              {integration.icon}
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {integration.name}
                {/* {getStatusIcon()} */}
                <Zap />
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{integration.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{integration.category}</Badge>
                <span className="text-xs text-muted-foreground">
                  {/* {getStatusText()} */}
                  zap
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* {integration.isConnected && (
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
            )} */}

            {/* {!integration.isConnected ? (
              <Button onClick={() => onConnect(integration.id)}>Connect</Button>
            ) : (
              <Button variant="outline" onClick={() => setIsExpanded(!isExpanded)}>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            )} */}
          </div>
        </div>
      </CardHeader>
      {/* 
      {integration.isConnected && isExpanded && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Available Statistics</h4>
              <div className="space-y-3">
                {integration.availableStats?.map((stat) => (
                  <div key={stat.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                      checked={integration.availableStats.includes(stat._id)}
                      onCheckedChange={() => onToggleStat(integration.id, stat.id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {integration.availableStats.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ <strong>{integration.enabledStats.length}</strong> stats enabled and syncing to your dashboard
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}

      {integration.status === "error" && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-50 border-t border-red-200 p-2">
          <p className="text-xs text-red-600 text-center">{integration.errorMessage || "Connection failed. Please try reconnecting."}</p>
        </div>
      )} */}
    </Card>
  );
}
