import { axiosConfig } from "@/config/axiosConfig";
import { useState } from "react";
import { toast } from "sonner";
import { getColumns } from "./columns";
import { DataTable } from "@/components/customs/dataTable";

export const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logCount, setLogCount] = useState(0);

  async function fetchAllLogs(page: number = 0, size: number = 10) {
    setLoading(true);
    try {
      const response = await axiosConfig.get("/logs?page=" + page + "&size=" + size);
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
    <div>
      <div className="container px-4 mx-auto">
        <DataTable
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
