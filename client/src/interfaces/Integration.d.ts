export interface IntegrationInterface {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  status: "available" | "disabled" | "deprecated";
  availableStats?: IntegrationStat[];
  config?: {
    authUrl?: string;
    docsUrl?: string;
  };
  createdAt: string;
  updatedAt: string;

  // Nouveau champ ajouté pour savoir si l'utilisateur est connecté à cette intégration
  isConnected?: boolean;
}

export interface IntegrationStat {
  _id: string;
  name: string;
  description?: string;
  unit?: string;
  category?: string;
  updateFrequency: "real-time" | "hourly" | "daily" | "weekly";
  dataType: "number" | "string" | "boolean";
  icon?: string;
}
