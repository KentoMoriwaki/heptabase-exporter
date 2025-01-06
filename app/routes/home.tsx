import { Home } from "@/components/home";
import { getIDBMasterHandler } from "@/lib/indexed-db";
import type { Route } from "./+types/home";
import { getGeneralMeta } from "@/lib/meta";

export const meta: Route.MetaFunction = () => getGeneralMeta();

export function links() {
  return [
    {
      rel: "canonical",
      href: "https://bundle-my-heptabase.vercel.app/home",
    },
  ];
}

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const masterDB = await getIDBMasterHandler();
  const accounts = await masterDB.getAccounts();
  return { accounts };
}

export default function HomePage({
  loaderData: { accounts },
}: Route.ComponentProps) {
  return <Home accounts={accounts} />;
}
