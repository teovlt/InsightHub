"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Zap, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { IntegrationInterface } from "@/interfaces/Integration";
import { axiosConfig } from "@/config/axiosConfig";
import { IntegrationCard } from "./integrationCard";
import { useAuthContext } from "@/contexts/authContext";

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationInterface[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);

  const handleConnect = async (integrationId: string) => {
    setLoading(true);
    try {
      // Trouver l'intégration correspondante
      const integration = integrations.find((i) => i._id === integrationId);
      if (!integration) {
        toast.error("Integration not found");
        return;
      }

      // Récupérer l'URL d'auth de l'intégration
      const authUrl = integration.config?.authUrl;
      if (!authUrl) {
        toast.error("No auth URL configured for this integration");
        return;
      }

      const response = await axiosConfig.get(`/integrations/${authUrl}?integrationId=${integrationId}`);
      if (response.data.redirectUrl) {
        window.location.href = response.data.redirectUrl;
        toast.success(response.data.message);
      } else {
        toast.error("Failed to initiate connection" + (response.data.error ? `: ${response.data.error}` : ""));
      }
    } catch (error) {
      toast.error("Failed to initiate connection : " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = (integrationId: string) => {
    // setIntegrations((prev) =>
    //   prev.map((integration) =>
    //     integration.id === integrationId
    //       ? {
    //           ...integration,
    //           isConnected: false,
    //           status: "available" as const,
    //           connectedAt: undefined,
    //           lastSync: undefined,
    //           enabledStats: [],
    //         }
    //       : integration,
    //   ),
    // );
  };

  const handleToggleStat = (integrationId: string, statId: string) => {
    // setIntegrations((prev) =>
    //   prev.map((integration) =>
    //     integration.id === integrationId
    //       ? {
    //           ...integration,
    //           enabledStats: integration.enabledStats.includes(statId)
    //             ? integration.enabledStats.filter((id: any) => id !== statId)
    //             : [...integration.enabledStats, statId],
    //         }
    //       : integration,
    //   ),
    // );
    // // Create or remove stat from dashboard
    // const integration = integrations.find((i) => i.id === integrationId);
    // const stat = integration?.availableStats.find((s: any) => s.id === statId);
    // if (integration && stat) {
    //   if (!integration.enabledStats.includes(statId)) {
    //     // createStatFromIntegration(integration, stat);
    //   }
    // }
  };

  const handleSync = (integrationId: string) => {
    // setIntegrations((prev) =>
    //   prev.map((integration) =>
    //     integration.id === integrationId
    //       ? {
    //           ...integration,
    //           status: "syncing" as const,
    //         }
    //       : integration,
    //   ),
    // );
    // setTimeout(() => {
    //   setIntegrations((prev) =>
    //     prev.map((integration) =>
    //       integration.id === integrationId
    //         ? {
    //             ...integration,
    //             status: "connected" as const,
    //             lastSync: new Date().toISOString(),
    //           }
    //         : integration,
    //     ),
    //   );
    // }, 1500);
  };

  useEffect(() => {
    try {
      setLoading(true);
      const fetchIntegrations = async () => {
        const response = await axiosConfig.get("/integrations/enabled");
        setIntegrations(
          response.data.map((integration: IntegrationInterface) => ({
            ...integration,
            // status: "available" as const, // Default status
          })),
        );
      };
      fetchIntegrations();
    } catch (error) {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  //   const createStatsForIntegration = (integration: any) => {
  //     // Find or create category for this integration
  //     let targetCategory = categories.find((cat) => cat.name.toLowerCase().includes(integration.category.toLowerCase()));

  //     if (!targetCategory) {
  //       // Create new category
  //       const categoryColors: Record<string, string> = {
  //         Development: "#10B981",
  //         Fitness: "#EF4444",
  //         Entertainment: "#8B5CF6",
  //         Productivity: "#F59E0B",
  //         Learning: "#06B6D4",
  //         Social: "#EC4899",
  //       };

  //       onAddCategory({
  //         name: integration.category,
  //         color: categoryColors[integration.category] || "#6B7280",
  //         icon: "Zap",
  //         description: `Stats from ${integration.category.toLowerCase()} apps`,
  //       });

  //       // Get the category that was just created (simulate)
  //       targetCategory = {
  //         id: `category-${Date.now()}`,
  //         name: integration.category,
  //         color: categoryColors[integration.category] || "#6B7280",
  //         icon: "Zap",
  //         stats: [],
  //         description: `Stats from ${integration.category.toLowerCase()} apps`,
  //       };
  //     }

  //     // Create stats for enabled integration stats
  //     // integration.enabledStats.forEach((statId) => {
  //     //   const integrationStat = integration.availableStats.find((s) => s.id === statId);
  //     //   if (integrationStat && targetCategory) {
  //     //     createStatFromIntegration(integration, integrationStat, targetCategory.id);
  //     //   }
  //     // });
  //   };

  //   const createStatFromIntegration = (integration: Integration, integrationStat: any, categoryId?: string) => {
  //     // Find appropriate category
  //     let targetCategoryId = categoryId;
  //     if (!targetCategoryId) {
  //       const targetCategory = categories.find((cat) => cat.name.toLowerCase().includes(integration.category.toLowerCase()));
  //       targetCategoryId = targetCategory?.id;
  //     }

  //     if (!targetCategoryId) return;

  //     // Generate mock data
  //     const mockData = generateMockData(integration.id, integrationStat.id);

  //     // Create stat
  //     const newStat: Omit<Stat, "id"> = {
  //       name: integrationStat.name,
  //       value: mockData.value,
  //       unit: integrationStat.unit,
  //       description: `From ${integration.name} • ${integrationStat.description}`,
  //       trend: {
  //         direction: Math.random() > 0.5 ? "up" : "down",
  //         percentage: Math.floor(Math.random() * 20) + 1,
  //         label: `${Math.random() > 0.5 ? "+" : "-"}${Math.floor(Math.random() * 20) + 1}%`,
  //       },
  //       history: [
  //         { date: "2024-06-01", value: typeof mockData.value === "number" ? mockData.value - 5 : 0 },
  //         { date: "2024-06-02", value: typeof mockData.value === "number" ? mockData.value - 3 : 0 },
  //         { date: "2024-06-03", value: typeof mockData.value === "number" ? mockData.value - 1 : 0 },
  //         { date: "2024-06-04", value: typeof mockData.value === "number" ? mockData.value : 0 },
  //       ],
  //     };

  //     onAddStat(targetCategoryId, newStat);
  //   };

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const connectedCount = integrations.filter((i) => i.isConnected).length;
  const availableCategories = [...new Set(integrations.map((i: IntegrationInterface) => i.category))];

  return (
    <div className="flex flex-col gap-8 px-4 py-10 md:px-10 lg:px-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">App Integrations</h2>
        <p className="text-muted-foreground">Connect your favorite apps to automatically track stats and insights</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{connectedCount}</p>
                <p className="text-sm text-muted-foreground">Connected Apps</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{integrations.reduce((sum, i) => sum + (i.availableStats?.length || 0), 0)}</p>
                <p className="text-sm text-muted-foreground">Active Stats</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{integrations.length - connectedCount}</p>
                <p className="text-sm text-muted-foreground">Available Apps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full md:w-auto">
          <TabsList className="flex flex-wrap">
            <TabsTrigger className="cursor-pointer" value="all">
              All
            </TabsTrigger>
            {availableCategories.map((category) => (
              <TabsTrigger className="cursor-pointer" key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Connected Apps Section */}
      {connectedCount > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="text-xl font-semibold">Connected Apps</h3>
            <Badge variant="secondary">{connectedCount}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Liste des intégrations connectées */}
            {integrations
              .filter((i) => i.isConnected)
              .map((integration) => (
                <IntegrationCard
                  key={integration._id}
                  integration={integration}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onToggleStat={handleToggleStat}
                  onSync={handleSync}
                />
              ))}
          </div>
        </div>
      )}

      {/* Available Apps Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Available Integrations</h3>
          <Badge variant="outline">{filteredIntegrations.filter((i) => !i.isConnected).length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Liste des intégrations disponibles non connectées */}
          {filteredIntegrations
            .filter((i) => !i.isConnected)
            .map((integration) => (
              <IntegrationCard
                key={integration._id}
                integration={integration}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onToggleStat={handleToggleStat}
                onSync={handleSync}
              />
            ))}
        </div>
      </div>

      {/* Help Section */}
      <Card className="bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-200">How Integrations Work</h4>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                When you connect an app, we'll automatically create relevant stats in your dashboard. You can configure which stats to track
                and they'll update automatically based on each app's sync schedule.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">Real-time sync</Badge>
                <Badge variant="secondary">Automatic categorization</Badge>
                <Badge variant="secondary">Historical data</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
