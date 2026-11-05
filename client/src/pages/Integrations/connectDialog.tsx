import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { ExternalLink, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosConfig } from "@/config/axiosConfig";
import { IntegrationInterface } from "@/interfaces/Integration";

interface ConnectDialogProps {
  integration: IntegrationInterface | null;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

// Server replies carry a translation key ("server.*") with optional params; other texts (provider errors) are shown as-is
export function serverText(
  t: TFunction,
  data: { message?: string; error?: string; params?: Record<string, string> } | undefined,
  field: "message" | "error" = "message",
) {
  const text = data?.[field];
  if (!text) return field === "error" ? t("server.global.errors.internal") : "";
  return text.startsWith("server.") ? t(text, data?.params) : text;
}

// Connection for integrations that only need a username or a personal API key (no OAuth redirect)
export function ConnectDialog({ integration, onOpenChange, onConnected }: ConnectDialogProps) {
  const { t } = useTranslation();
  const [credential, setCredential] = useState("");
  const [loading, setLoading] = useState(false);
  const isKey = integration?.authType === "apiKey";

  useEffect(() => {
    setCredential("");
  }, [integration?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integration || !credential.trim()) return;

    try {
      setLoading(true);
      const response = await axiosConfig.post(`/integrations/${integration._id}/connection`, { credential: credential.trim() });
      toast.success(serverText(t, response.data));
      onOpenChange(false);
      onConnected();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ? serverText(t, error.response.data, "error") : t("pages.integrations.toasts.connect_failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={integration !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("pages.integrations.dialog.title", { name: integration?.name })}</DialogTitle>
            <DialogDescription>
              {isKey
                ? t("pages.integrations.dialog.key_description")
                : integration?.credentialSteps?.length
                  ? t("pages.integrations.dialog.public_description")
                  : t("pages.integrations.dialog.username_description")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-5">
            {integration?.credentialSteps && integration.credentialSteps.length > 0 && (
              <ol className="mb-3 space-y-2 rounded-xl bg-secondary/60 p-4 text-sm">
                {integration.credentialSteps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            )}
            <Label htmlFor="integration-credential">
              {integration?.credentialLabel ?? (isKey ? t("pages.integrations.dialog.api_key") : t("pages.integrations.dialog.username"))}
            </Label>
            <div className="relative">
              {isKey && <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
              <Input
                id="integration-credential"
                type={isKey ? "password" : "text"}
                autoComplete="off"
                value={credential}
                placeholder={integration?.credentialPlaceholder}
                onChange={(e) => setCredential(e.target.value)}
                className={isKey ? "pl-9" : undefined}
                required
                autoFocus
              />
            </div>
            {integration?.credentialHelp && (
              <a
                href={integration.credentialHelp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                {t("pages.integrations.dialog.where")}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !credential.trim()}>
              {loading && <Loader2 className="animate-spin" />}
              {t("pages.integrations.dialog.connect")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
