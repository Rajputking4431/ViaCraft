import {
  NavLink as RouterLink,
  useNavigate as useRouterNavigate,
  useLocation as useRouterLocation,
  useParams as useRouterParams,
  useSearchParams,
  Outlet as RouterOutlet,
} from "react-router-dom";

// 1. Shimming createFileRoute
export function createFileRoute(path: string) {
  return function (options: { component: React.ComponentType<any>; [key: string]: any }) {
    const routeObj = {
      options,
      component: options.component,
      useParams: () => {
        const params = useRouterParams();
        return params as any;
      },
      useSearch: () => {
        const [searchParams] = useSearchParams();
        return Object.fromEntries(searchParams.entries());
      },
    };
    return routeObj;
  };
}

// 2. Shimming Link component
export function Link({ to, params, search, activeProps, activeOptions, className, ...props }: any) {
  let resolvedTo = to || "";

  // Convert TanStack Router dynamic segments (e.g. /products/$slug or /preservation/$id)
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, val]) => {
      resolvedTo = resolvedTo
        .replace(`:${key}`, String(val))
        .replace(`$${key}`, String(val));
    });
  }

  // Handle TanStack Router object-based search queries
  if (search) {
    const searchObj = typeof search === "function" ? search({}) : search;
    if (searchObj && typeof searchObj === "object") {
      const query = new URLSearchParams();
      Object.entries(searchObj).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          query.set(k, String(v));
        }
      });
      const queryString = query.toString();
      if (queryString) {
        resolvedTo += (resolvedTo.includes("?") ? "&" : "?") + queryString;
      }
    }
  }

  const getClassName = (navLinkProps: any) => {
    let baseClass = typeof className === "function" ? className(navLinkProps) : (className || "");
    if (navLinkProps.isActive && activeProps?.className) {
      baseClass += " " + activeProps.className;
    }
    return baseClass;
  };

  const getStyle = (navLinkProps: any) => {
    let baseStyle = typeof props.style === "function" ? props.style(navLinkProps) : (props.style || {});
    if (navLinkProps.isActive && activeProps?.style) {
      baseStyle = { ...baseStyle, ...activeProps.style };
    }
    return baseStyle;
  };

  const end = activeOptions?.exact ?? false;

  return (
    <RouterLink
      to={resolvedTo}
      className={getClassName}
      style={getStyle}
      end={end}
      {...props}
    />
  );
}

// 3. Shimming useNavigate hook
export function useNavigate() {
  const navigate = useRouterNavigate();

  return (options: any) => {
    if (typeof options === "string") {
      navigate(options);
      return;
    }

    if (typeof options === "number") {
      navigate(options);
      return;
    }

    let resolvedTo = options.to || "";

    if (options.params && typeof options.params === "object") {
      Object.entries(options.params).forEach(([key, val]) => {
        resolvedTo = resolvedTo
          .replace(`:${key}`, String(val))
          .replace(`$${key}`, String(val));
      });
    }

    if (options.search) {
      const searchObj = typeof options.search === "function" ? options.search({}) : options.search;
      if (searchObj && typeof searchObj === "object") {
        const query = new URLSearchParams();
        Object.entries(searchObj).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            query.set(k, String(v));
          }
        });
        const queryString = query.toString();
        if (queryString) {
          resolvedTo += (resolvedTo.includes("?") ? "&" : "?") + queryString;
        }
      }
    }

    navigate(resolvedTo, { replace: options.replace });
  };
}

// 4. Shimming other hooks and elements directly
export function useLocation() {
  const location = useRouterLocation();
  return {
    ...location,
    href: window.location.href,
  };
}

export function useParams() {
  return useRouterParams() as any;
}

export function useSearch() {
  const [searchParams] = useSearchParams();
  return Object.fromEntries(searchParams.entries());
}

export const Outlet = RouterOutlet;
export const createRootRouteWithContext = () => {
  return () => ({
    // Placeholder so it compiles if imported
    component: () => <Outlet />,
  });
};
