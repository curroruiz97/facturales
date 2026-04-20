import type { RouteMeta } from "../routing/route-metadata";

interface PageHeaderProps {
  route: RouteMeta;
}

export function PageHeader({ route }: PageHeaderProps): import("react").JSX.Element {
  return (
    <div>
      <h1 className="pilot-header__title">{route.title}</h1>
      <div className="pilot-breadcrumbs">
        {route.breadcrumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`}>
            {index > 0 ? " / " : ""}
            {crumb}
          </span>
        ))}
      </div>
    </div>
  );
}
