import { axiosConfig } from "@/config/axiosConfig";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogHeader, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DataTable } from "@/components/customs/dataTable";
import { getColumns } from "./columns";
import { IntegrationInterface } from "@/interfaces/Integration";
import { IntegrationForm } from "./integrationForm";

export const Integrations = () => {
  const [integrations, setIntegrations] = useState<IntegrationInterface[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [action, setAction] = useState("");
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationInterface>();
  const [integrationCount, setIntegrationCount] = useState(0);

  async function fetchIntegrations(page: number = 0, size: number = 10) {
    setLoading(true);
    try {
      const response = await axiosConfig.get(`/integrations?page=${page}&size=${size}`);
      setIntegrations(response.data.integrations);
      setIntegrationCount(response.data.count);
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  }

  function callback(action: string, data: any) {
    setSelectedIntegration(undefined);
    switch (action) {
      case "create":
        setAction("create");
        setOpenDialog(true);
        break;
      case "update":
        setSelectedIntegration(integrations.find((int) => int._id === data));
        setAction("update");
        setOpenDialog(true);
        break;
      case "delete":
        setSelectedIntegration(integrations.find((int) => int._id === data));
        setAction("delete");
        setOpenDialog(true);
      default:
        break;
    }
  }

  return (
    <div>
      <div className="container px-4 mx-auto">
        <DataTable
          columns={getColumns(callback)}
          data={integrations}
          dataCount={integrationCount}
          fetchData={fetchIntegrations}
          isLoading={loading}
          callback={callback}
          searchElement="name"
          searchPlaceholder="Filter by name"
          actions={["create"]}
        />
      </div>
      {openDialog && (
        <Dialog open={openDialog} onOpenChange={() => setOpenDialog(false)}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{action.charAt(0).toUpperCase() + action.slice(1)} an integration</DialogTitle>
            </DialogHeader>
            <IntegrationForm dialog={setOpenDialog} refresh={fetchIntegrations} action={action} integration={selectedIntegration} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
