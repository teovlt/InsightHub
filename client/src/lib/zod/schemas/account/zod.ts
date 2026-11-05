import { z } from "zod";

export const getUpdateAccountSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .min(2, { message: t("pages.account.errors.name_min") })
      .max(25, { message: t("pages.account.errors.name_max") }),
    forename: z
      .string()
      .min(2, { message: t("pages.account.errors.forename_min") })
      .max(25, { message: t("pages.account.errors.forename_max") }),
    username: z
      .string()
      .min(2, { message: t("pages.account.errors.username_min") })
      .max(25, { message: t("pages.account.errors.username_max") })
      .regex(/^[^A-Z\s]+$/, { message: t("pages.account.errors.username_no_spaces") }),

    email: z.string().email({ message: t("pages.account.errors.invalid_email") }),
  });

export const getUpdatePasswordSchema = (t: (key: string) => string) =>
  z
    .object({
      currentPassword: z.string().min(6, { message: t("pages.account.errors.current_password_min") }),
      newPassword: z
        .string()
        .min(6, { message: t("pages.account.errors.new_password_min") })
        .max(25, { message: t("pages.account.errors.new_password_max") }),
      newPasswordConfirm: z.string().min(6, { message: t("pages.account.errors.new_password_confirm_min") }),
    })
    .refine((data) => data.newPassword === data.newPasswordConfirm, {
      message: t("pages.account.errors.passwords_do_not_match"),
      path: ["newPasswordConfirm"],
    });

// Password accounts confirm with their password; Google accounts have none, so they type their username or email
export const getDeleteAccountSchema = (t: (key: string) => string, user: { username: string; email: string; isGoogle: boolean }) =>
  z.object({
    checkApproval: z.boolean().refine((val) => val === true, {
      message: t("pages.account.errors.check_approval"),
    }),
    password: user.isGoogle ? z.string().optional() : z.string().min(1, { message: t("pages.account.errors.password_required") }),
    confirmation: user.isGoogle
      ? z
          .string()
          .trim()
          .refine((value) => [user.username, user.email].includes(value.toLowerCase()), {
            message: t("pages.account.errors.confirmation_mismatch"),
          })
      : z.string().optional(),
  });
