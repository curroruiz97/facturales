import { UserMenu } from "./UserMenu";
import type { RouteMeta } from "../routing/route-metadata";

interface TopActionsProps {
  route: RouteMeta;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export function TopActions({ route, darkMode, onToggleTheme }: TopActionsProps): import("react").JSX.Element {
  return (
    <div className="pilot-actions">
      <button type="button" className="pilot-btn" onClick={onToggleTheme}>
        {darkMode ? "Tema claro" : "Tema oscuro"}
      </button>
      <UserMenu />
    </div>
  );
}
