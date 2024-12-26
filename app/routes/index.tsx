import { Home } from "@/components/home";
import { getIDBMasterHandler } from "@/lib/indexed-db";
import { redirect } from "react-router";
import type { Route } from "./+types/home";

export function meta(_meta: Route.MetaArgs) {
  return [
    { title: "Bundle My Heptabase" },
    {
      name: "description",
      content: "Safely organize exported data for AI tools.",
    },
  ];
}

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const masterDB = await getIDBMasterHandler();
  const accounts = await masterDB.getAccounts();
  if (accounts.length === 1) {
    return redirect(`/accounts/${accounts[0].id}`);
  }
  return { accounts };
}

export default function HomePage({
  loaderData: { accounts },
}: Route.ComponentProps) {
  return <Home accounts={accounts} />;
}
