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
  const { authUser } = useAuthContext();

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

      window.location.href = `${import.meta.env.VITE_API_URL}/api/integrations/${authUrl}?integrationId=${integrationId}&userId=${authUser?._id}`;
      toast.success(`Redirecting to ${integration.name} for authentication...`);
    } catch (error) {
      toast.error("Failed to initiate connection : " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const response = await axiosConfig.delete(`/integrations/${authUser?._id}/${integrationId}`);
      toast.success(response.data.message);

      setIntegrations((prev) =>
        prev.map((integration) =>
          integration._id === integrationId ? { ...integration, isConnected: false, status: "available" } : integration,
        ),
      );
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleStat = async (integrationId: string, statId: string) => {
    setLoading(true);
    try {
      const response = await axiosConfig.patch(`/integrations/${integrationId}/stat/${statId}/toggle`);
      fetchIntegrations();
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (integrationId: string) => {
    try {
      setLoading(true);
      const response = await axiosConfig.get(`/integrations/${integrationId}/sync`);
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await axiosConfig.get("/integrations/enabled");
      setIntegrations(
        response.data.map((integration: IntegrationInterface) => ({
          ...integration,
        })),
      );
    } catch (error) {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchIntegrations();
  }, []);

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
                <p className="text-2xl font-bold">
                  {integrations.reduce((sum, i) => sum + (i.integrationUser?.activedStat?.length || 0), 0)}
                </p>
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
              .map((integration: IntegrationInterface) => (
                <IntegrationCard
                  key={integration._id}
                  integration={integration}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onToggleStat={handleToggleStat}
                  onSync={handleSync}
                  integrationUser={integration.integrationUser}
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
            .map((integration: IntegrationInterface) => (
              <IntegrationCard
                key={integration._id}
                integration={integration}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onToggleStat={handleToggleStat}
                onSync={handleSync}
                integrationUser={integration.integrationUser}
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
