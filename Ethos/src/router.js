// src/router.js
const routes = new Map();

export function registerRoute(path, renderFn) {
  routes.set(path, renderFn);
}

export function getRoute() {
  const raw = window.location.hash || "#/welcome";
  const [path, queryString] = raw.split("?");
  const query = new URLSearchParams(queryString || "");
  return { path, query, raw };
}

export function navigate(path) {
  window.location.hash = path;
}

export function startRouter(renderApp) {
  window.addEventListener("hashchange", renderApp);
}
