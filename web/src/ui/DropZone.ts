import { t } from "../i18n";

export function renderDropZone(opts: {
  onFiles: (files: File[]) => void;
}): HTMLElement {
  const el = document.createElement("div");
  el.className = "dropzone";
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", "Drop slips or click to browse");
  el.innerHTML = `
    <div style="font-size: var(--fs-md); font-weight: 500;">${t("drop_main")}</div>
    <div class="hint">${t("drop_hint")}</div>
    <input type="file" multiple accept="image/*,application/pdf" hidden />
  `;
  const input = el.querySelector("input")!;

  el.addEventListener("click", () => input.click());
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.classList.add("dragging");
  });
  el.addEventListener("dragleave", () => el.classList.remove("dragging"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("dragging");
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) opts.onFiles(files);
  });
  input.addEventListener("change", () => {
    const files = Array.from(input.files ?? []);
    if (files.length) opts.onFiles(files);
  });

  window.addEventListener("paste", (e) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length) opts.onFiles(files);
  });
  return el;
}
