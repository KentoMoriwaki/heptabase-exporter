import { useCallback, useLayoutEffect, useState } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { Analytics } from "@vercel/analytics/react";
import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";
import {
  getOverriddenThemeMode,
  getThemeMode,
  saveThemeMode,
  ThemeMode,
  ThemeModeProvider,
  useSystemThemeMode,
} from "./lib/theme";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

export function clientLoader() {
  const initialMode = getThemeMode();
  return { initialMode };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<{ initialMode: ThemeMode }>("root");
  return (
    <html lang="en" className={data?.initialMode === "dark" ? "dark" : ""}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Analytics />
      </body>
    </html>
  );
}

export default function App() {
  const [overriddenMode, setOverriddenMode] = useState<ThemeMode | null>(
    getOverriddenThemeMode,
  );
  const systemMode = useSystemThemeMode();

  const setMode = useCallback((newThemeMode: ThemeMode | null) => {
    saveThemeMode(newThemeMode);
    setOverriddenMode(newThemeMode);
  }, []);

  useLayoutEffect(() => {
    const newMode = overriddenMode ?? systemMode;
    console.log("Setting theme mode to", newMode);
    document.documentElement.classList.toggle("dark", newMode === "dark");
  }, [overriddenMode, systemMode]);

  return (
    <ThemeModeProvider
      overriddenMode={overriddenMode}
      systemMode={systemMode}
      setMode={setMode}
    >
      <Outlet />
    </ThemeModeProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
