"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Page, PageHeader, SectionTitle } from "@/components/customs/page";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Zap, CheckCircle, Clock, Info } from "lucide-react";
import { toast } from "sonner";
import { IntegrationInterface } from "@/interfaces/Integration";
import { axiosConfig } from "@/config/axiosConfig";
import { IntegrationCard } from "./integrationCard";
import { ConnectDialog } from "./connectDialog";

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationInterface[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [connectTarget, setConnectTarget] = useState<IntegrationInterface | null>(null);

  const handleConnect = async (integrationId: string) => {
    setLoading(true);
    try {
      // Trouver l'intégration correspondante
      const integration = integrations.find((i) => i._id === integrationId);
      if (!integration) {
        toast.error("Integration not found");
        return;
      }

      // Username / API key integrations connect in a dialog instead of an OAuth redirect
      if (integration.authType && integration.authType !== "oauth") {
        setConnectTarget(integration);
        return;
      }

      // Récupérer l'URL d'auth de l'intégration
      const authUrl = integration.config?.authUrl;
      if (!authUrl) {
        toast.error("No auth URL configured for this integration");
        return;
      }

      window.location.href = `${import.meta.env.VITE_API_URL}/api/integrations/${authUrl}?integrationId=${encodeURIComponent(integrationId)}`;
      toast.success(`Redirecting to ${integration.name} for authentication...`);
    } catch (error) {
      toast.error("Failed to initiate connection : " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const response = await axiosConfig.delete(`/integrations/${integrationId}/connection`);
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
      const response = await axiosConfig.post(`/integrations/${integrationId}/sync`);
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

    // Set by the server when the OAuth callback fails
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "sync") {
      toast.error('Integration connected, but the first sync failed. Try "Sync Now" in a moment.');
      window.history.replaceState(null, "", window.location.pathname);
    } else if (params.get("error")) {
      toast.error("Failed to connect the integration, please try again.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const connectedCount = integrations.filter((i) => i.isConnected).length;
  const availableCategories = [...new Set(integrations.map((i: IntegrationInterface) => i.category))].filter(Boolean);

  const overview = [
    { label: "Connected apps", value: connectedCount, icon: CheckCircle, tone: "bg-lime/25 text-[#3f6212] dark:text-lime" },
    {
      label: "Active stats",
      value: integrations.reduce((sum, i) => sum + (i.integrationUser?.activedStat?.length || 0), 0),
      icon: Zap,
      tone: "bg-accent/10 text-accent",
    },
    { label: "Available apps", value: integrations.length - connectedCount, icon: Clock, tone: "bg-secondary text-muted-foreground" },
  ];

  const renderCards = (list: IntegrationInterface[]) =>
    list.map((integration) => (
      <IntegrationCard
        key={integration._id}
        integration={integration}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onToggleStat={handleToggleStat}
        onSync={handleSync}
        integrationUser={integration.integrationUser}
      />
    ));

  return (
    <Page>
      <PageHeader
        eyebrow="Integrations"
        title="Connect your apps"
        description="Plug in the apps you already use and your stats update on their own. No more manual entry."
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {overview.map((item) => (
          <Card key={item.label} className="flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
              <item.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-3xl font-bold leading-none">{item.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-xl pl-10"
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
        <section className="space-y-4">
          <SectionTitle count={connectedCount}>Connected</SectionTitle>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {renderCards(integrations.filter((i) => i.isConnected))}
          </div>
        </section>
      )}

      {/* Available Apps Section */}
      <section className="space-y-4">
        <SectionTitle count={filteredIntegrations.filter((i) => !i.isConnected).length}>Available</SectionTitle>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {renderCards(filteredIntegrations.filter((i) => !i.isConnected))}
        </div>
      </section>

      {/* Help Section */}
      <Card className="border-accent/20 bg-accent/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">How integrations work</h3>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              When you connect an app, we automatically create the matching stats in your dashboard. Pick which stats to track and they
              update on their own, following each app's sync schedule.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">Real-time sync</Badge>
              <Badge variant="secondary">Automatic categorization</Badge>
              <Badge variant="secondary">Historical data</Badge>
            </div>
          </div>
        </div>
      </Card>

      <ConnectDialog integration={connectTarget} onOpenChange={(open) => !open && setConnectTarget(null)} onConnected={fetchIntegrations} />
    </Page>
  );
}
