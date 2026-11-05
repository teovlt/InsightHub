import { Loading } from "@/components/customs/loading";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuthContext } from "@/contexts/authContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { getUpdateAccountSchema } from "@/lib/zod/schemas/account/zod";
import { useState } from "react";
import { toast } from "sonner";
import { axiosConfig } from "@/config/axiosConfig";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/components/customs/avatarStatusCell";
import { Page, PageHeader } from "@/components/customs/page";
import { Separator } from "@/components/ui/separator";
import { InputFile } from "@/components/customs/inputFile";
import { UpdatePasswordForm } from "./components/updatePasswordForm";
import { Dialog } from "@radix-ui/react-dialog";
import { LogOut, Trash } from "lucide-react";
import { DeleteAccountForm } from "./components/deleteAccountForm";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const Account = () => {
  const { authUser, setAuthUser, loading } = useAuthContext();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [updateLoading, setUpdateLoading] = useState(false);
  const [openUpdatePasswordDialog, setOpenUpdatePasswordDialog] = useState(false);
  const [openDeleteAccountDialog, setOpenDeleteAccountDialog] = useState(false);

  const updateAccountSchema = getUpdateAccountSchema(t);
  const updateForm = useForm<z.infer<typeof updateAccountSchema>>({
    resolver: zodResolver(updateAccountSchema),
    defaultValues: {
      name: authUser?.name,
      forename: authUser?.forename,
      username: authUser?.username,
      email: authUser?.email,
    },
  });

  const onUpdateSubmit: SubmitHandler<z.infer<typeof updateAccountSchema>> = async (values) => {
    try {
      setUpdateLoading(true);
      const response = await axiosConfig.put(`/users/${authUser?._id}`, values);
      toast.success(t(response.data.message));
      setAuthUser(response.data.user);
    } catch (error: any) {
      toast.error(t(error.response.data.error));
    } finally {
      setUpdateLoading(false);
    }
  };

  const logoutEverywhere = async () => {
    try {
      const response = await axiosConfig.post("/auth/logout/everywhere");
      toast.success(t(response.data.message));
      setAuthUser(null);
      navigate("/login");
    } catch (error: any) {
      toast.error(t(error.response?.data?.error ?? "server.global.errors.internal"));
    }
  };

  const updateProfilePic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpdateLoading(true);

    const file = e.target.files?.[0];

    if (!file?.type.includes("image")) {
      toast.error(t("pages.account.errors.invalid_file_type"));
      setUpdateLoading(false);
      return;
    }

    if (!file) {
      toast.error(t("pages.account.errors.no_file_selected"));
      setUpdateLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await axiosConfig.post(`/uploads/avatar/${authUser?._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(t(response.data.message));
      setAuthUser(response.data.user);
    } catch (error: any) {
      toast.error(t(error.response?.data?.error));
    } finally {
      setUpdateLoading(false);
    }
  };

  return loading ? (
    <Loading />
  ) : (
    <Page className="max-w-5xl">
      <PageHeader
        eyebrow={t("navbar.profile")}
        title={t("pages.account.account_settings_title")}
        description={t("pages.account.account_settings_description")}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
        {/* Profile card */}
        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-br from-accent to-brand-strong" />
          <div className="-mt-12 flex flex-col items-center gap-3 px-6 pb-6 text-center">
            <Avatar className="h-24 w-24 ring-4 ring-card">
              <AvatarImage src={authUser?.avatar} alt="User Avatar" className="object-cover object-center w-full h-full rounded-full" />
              <AvatarFallback className="bg-accent/15 font-display text-2xl font-bold text-accent">
                {authUser ? getInitials(authUser) : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display text-lg font-bold">
                {authUser?.forename} {authUser?.name}
              </p>
              <p className="text-sm text-muted-foreground">@{authUser?.username}</p>
            </div>
            <InputFile buttonText={t("choose_image")} id="profile-picture" disabled={loading} onChange={updateProfilePic} />
          </div>
          <Separator />
          <div className="space-y-1 p-3">
            <Button variant="ghost" className="w-full justify-start" onClick={logoutEverywhere}>
              <LogOut />
              {t("pages.account.logout_everywhere")}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setOpenDeleteAccountDialog(true)}
            >
              <Trash />
              {t("pages.account.delete_account")}
            </Button>
          </div>
        </Card>

        {/* Details form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("pages.account.details_title")}</CardTitle>
            <CardDescription>{t("pages.account.details_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row ">
                  <FormField
                    control={updateForm.control}
                    name="forename"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{t("pages.account.forename_label")}</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{t("pages.account.name_label")}</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={updateForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("pages.account.username_label")}</FormLabel>
                      <FormControl>
                        <Input placeholder="john_doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={updateForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("pages.account.email_label")}</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@gmail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Google accounts sign in with Google and have no password to change */}
                {authUser?.auth_type !== "google" && (
                  <FormItem>
                    <div className="flex flex-col w-full gap-2">
                      <FormLabel>{t("pages.account.password_label")}</FormLabel>
                      <div className="flex items-center justify-between gap-4">
                        <FormControl>
                          <Input type="password" placeholder={t("pages.account.password_placeholder")} disabled />
                        </FormControl>
                        <Button type="button" variant="outline" onClick={() => setOpenUpdatePasswordDialog(true)} disabled={updateLoading}>
                          {t("pages.account.change_password")}
                        </Button>
                      </div>
                    </div>
                  </FormItem>
                )}

                <CardFooter className="justify-end px-0">
                  <Button type="submit" disabled={updateLoading} className="w-full sm:w-auto sm:px-8">
                    {t("global.buttons.update")}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openUpdatePasswordDialog} onOpenChange={setOpenUpdatePasswordDialog}>
        <UpdatePasswordForm setOpen={setOpenUpdatePasswordDialog} />
      </Dialog>

      <Dialog open={openDeleteAccountDialog} onOpenChange={setOpenDeleteAccountDialog}>
        <DeleteAccountForm setOpen={setOpenDeleteAccountDialog} />
      </Dialog>
    </Page>
  );
};
