import { axiosConfig } from "@/config/axiosConfig";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const LEVELS = ["all", "error", "warn", "info", "debug"] as const;
import { toast } from "sonner";
import { getColumns } from "./columns";
import { DataTable } from "@/components/customs/dataTable";

export const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");
  const { t } = useTranslation();

  async function fetchAllLogs(page: number = 0, size: number = 10) {
    setLoading(true);
    try {
      const response = await axiosConfig.get("/logs", { params: { page, size, ...(level !== "all" && { level }) } });
      setLogs(response.data.logs);
      setLogCount(response.data.count);
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteLog(logId: string) {
    try {
      const response = await axiosConfig.delete(`/logs/${logId}`);
      toast.success(response.data.message);
      fetchAllLogs();
    } catch (error: any) {
      toast.error(error.response);
    }
  }

  async function deleteAllLogs() {
    try {
      const response = await axiosConfig.delete(`/logs`);
      toast.success(response.data.message);
      fetchAllLogs();
    } catch (error: any) {
      toast.error(error.response);
    }
  }

  function callback(action: string, data: any) {
    switch (action) {
      case "deleteAll":
        deleteAllLogs();
      default:
        break;
    }
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-secondary p-1" role="tablist" aria-label={t("pages.admin.logs.level")}>
        {LEVELS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={level === key}
            onClick={() => setLevel(key)}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              level === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`pages.admin.logs.levels.${key}`)}
          </button>
        ))}
      </div>
      <div>
        {/* Remounted per level: back to the first page, fetched with the new filter */}
        <DataTable
          key={level}
          columns={getColumns(deleteLog)}
          data={logs}
          dataCount={logCount}
          fetchData={fetchAllLogs}
          isLoading={loading}
          callback={callback}
          searchElement="message"
          searchPlaceholder="Filter by message"
          actions={["deleteAll"]}
        />
      </div>
    </div>
  );
};
