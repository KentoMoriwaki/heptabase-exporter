import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/locals/:directoryId", "routes/locals.tsx"),
] satisfies RouteConfig;
