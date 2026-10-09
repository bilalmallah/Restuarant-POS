import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { FiLock } from "react-icons/fi";

import { useAuth } from "../../hooks/useStore";
import type { Role } from "../../types";
import AppShell from "./AppShell";
import FocusShell from "./FocusShell";
import useFocusMode from "../../hooks/useFocusMode";
import { EmptyState } from "../ui/primitives";

/**
 * Guards every screen behind a session, and optionally behind a role.
 *
 * The role check is duplicated on the server - this one only stops a cashier
 * from stumbling into the payroll screen, it is not the security boundary.
 */
export const RouteWrapper = ({
  children,
  requireAuth = true,
  roles,
}: {
  children: ReactNode;
  requireAuth?: boolean;
  roles?: Role[];
}) => {
  const { token, user } = useAuth();
  const location = useLocation();
  const { isFocus } = useFocusMode();

  // Focus mode swaps the full app chrome for the slim till bar.
  const Shell = isFocus ? FocusShell : AppShell;

  if (!requireAuth) return <>{children}</>;

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (roles && user && !roles.includes(user.role)) {
    return (
      <Shell>
        <div className="p-6">
          <EmptyState
            icon={<FiLock />}
            title="You do not have access to this screen"
            message={`This page is for ${roles.join(" and ")} accounts. Ask your manager if you need it.`}
          />
        </div>
      </Shell>
    );
  }

  return <Shell>{children}</Shell>;
};

export default RouteWrapper;
