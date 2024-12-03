import type { Route } from "./+types/home";
import { HomePage } from "../home/HomePage";
import { ClientLoaderFunctionArgs } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

// export async function clientLoader({ location }: ClientLoaderFunctionArgs) {
//   // call the server loader

//   const serverData = await serverLoader();
//   // And/or fetch data on the client
//   const data = getDataFromClient();
//   // Return the data to expose through useLoaderData()
//   return data;
// }

export default function Home() {
  return <HomePage />;
}
