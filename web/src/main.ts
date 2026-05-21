import { renderApp } from "./ui/App";

const root = document.getElementById("app");
if (!root) throw new Error("#app not found");
renderApp(root);
