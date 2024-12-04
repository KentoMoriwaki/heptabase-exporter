import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/accounts/:accountId", "routes/account.tsx"),
] satisfies RouteConfig;
