import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../app/store";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const useAuth = () => useAppSelector((state) => state.auth);

/** Role gate used by the sidebar and by the guarded routes. */
export const useCan = () => {
  const { user } = useAuth();

  return {
    role: user?.role ?? null,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "admin" || user?.role === "manager",
    allows: (...roles: string[]) => Boolean(user && roles.includes(user.role)),
  };
};
