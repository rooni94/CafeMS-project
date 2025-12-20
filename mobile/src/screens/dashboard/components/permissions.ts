import { RolePermissions, User } from "../../../types";

export const isManager = (user: User | null | undefined) => user?.role === "manager";

export const hasAny = (
  user: User | null | undefined,
  perms: RolePermissions | null | undefined,
  keys: Array<keyof RolePermissions>
) => {
  if (isManager(user)) return true;
  return keys.some((key) => !!perms?.[key]);
};

export const has = (
  user: User | null | undefined,
  perms: RolePermissions | null | undefined,
  key: keyof RolePermissions
) => {
  if (isManager(user)) return true;
  return !!perms?.[key];
};

