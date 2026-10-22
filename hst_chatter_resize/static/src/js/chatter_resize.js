/** @odoo-module **/

const STORAGE_KEY = "hst_chatter_resize_width";
const COLLAPSE_KEY = "hst_chatter_resize_collapsed";
const MIN_WIDTH = 240;
const DEFAULT_WIDTH = 360;
const COLLAPSED_WIDTH = 34;
const MAX_RATIO = 0.78;
const STYLE_ID = "hst-chatter-resize-style";
const INIT_FLAG = "hstChatterResizeGlobalStarted";

const CSS = `
.o_form_view, .o_form_renderer, .hst-chatter-layout-active { --hst-chatter-width: 360px; }
.o_form_view .o_form_view_container,
.o_form_view .o_content,
.o_form_view .o_form_renderer,
.o_form_renderer.hst-chatter-layout-active { min-width: 0 !important; }
.o_form_view .o_form_renderer,
.o_form_renderer.hst-chatter-layout-active { display: flex !important; align-items: stretch !important; flex-wrap: nowrap !important; }
.o_form_renderer.hst-chatter-layout-active > .o_form_sheet_bg,
.o_form_view .o_form_renderer > .o_form_sheet_bg { flex: 1 1 auto !important; min-width: 0 !important; max-width: none !important; width: auto !important; }
.o_form_renderer.hst-chatter-layout-active .o_form_sheet,
.o_form_view .o_form_renderer .o_form_sheet { max-width: none !important; width: 100% !important; box-sizing: border-box !important; }
.o_form_renderer.hst-chatter-layout-active > .o-mail-ChatterContainer.o-mail-Form-chatter.o-aside,
.o_form_renderer.hst-chatter-layout-active > .o-mail-Form-chatter,
.o_form_renderer.hst-chatter-layout-active > .o-aside,
.hst-resizable-chatter { width: var(--hst-chatter-width) !important; min-width: 240px !important; max-width: 78vw !important; flex: 0 0 var(--hst-chatter-width) !important; flex-basis: var(--hst-chatter-width) !important; position: relative !important; box-sizing: border-box !important; }
.hst-resizable-chatter .o-mail-Chatter,
.hst-resizable-chatter .o-mail-Chatter-content,
.hst-resizable-chatter .o-mail-Thread { width: 100% !important; max-width: 100% !important; min-width: 0 !important; flex: 1 1 auto !important; }
.hst-chatter-resize-handle { position: absolute !important; left: -6px !important; top: 0 !important; width: 12px !important; height: 100% !important; cursor: col-resize !important; z-index: 300 !important; }
.hst-chatter-resize-handle::after { content: ''; position: absolute; left: 5px; top: 0; width: 3px; height: 100%; background: rgba(80,80,80,.28); }
.hst-chatter-resize-handle:hover::after,
body.hst-chatter-resizing .hst-chatter-resize-handle::after { background: rgba(80,80,80,.7); }
.hst-chatter-toggle { position: absolute !important; left: 3px !important; top: 10px !important; z-index: 310 !important; width: 22px !important; height: 22px !important; line-height: 18px !important; padding: 0 !important; border-radius: 50% !important; border: 1px solid rgba(0,0,0,.25) !important; background: #fff !important; color: #555 !important; }
.hst-resizable-chatter[data-hst-collapsed="1"] { overflow: hidden !important; }
.hst-resizable-chatter[data-hst-collapsed="1"] > :not(.hst-chatter-toggle):not(.hst-chatter-resize-handle) { opacity: 0 !important; pointer-events: none !important; }
body.hst-chatter-resizing { cursor: col-resize !important; user-select: none !important; }
@media (max-width: 992px) {
    .o_form_view .o_form_renderer, .o_form_renderer.hst-chatter-layout-active { display: block !important; }
    .o_form_renderer.hst-chatter-layout-active > .o-mail-ChatterContainer.o-mail-Form-chatter.o-aside,
    .o_form_renderer.hst-chatter-layout-active > .o-mail-Form-chatter,
    .o_form_renderer.hst-chatter-layout-active > .o-aside,
    .hst-resizable-chatter { width: 100% !important; max-width: 100% !important; flex: 1 1 100% !important; }
    .hst-chatter-resize-handle { display: none !important; }
}`;

function isNode(value) {
    return value && typeof value === "object" && typeof value.nodeType === "number";
}

function injectCss() {
    if (!document.head || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
}

function clampWidth(width) {
    const maxWidth = Math.max(MIN_WIDTH, Math.floor(window.innerWidth * MAX_RATIO));
    return Math.min(Math.max(width, MIN_WIDTH), maxWidth);
}

function visible(el) {
    if (!isNode(el) || el.nodeType !== Node.ELEMENT_NODE) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 20 && rect.height > 20;
}

function findPanels() {
    return [...document.querySelectorAll(".o_form_renderer")]
        .map((renderer) => {
            const panel = renderer.querySelector(":scope > .o-mail-ChatterContainer.o-mail-Form-chatter.o-aside")
                || renderer.querySelector(":scope > .o-mail-Form-chatter")
                || renderer.querySelector(":scope > .o-aside");
            return { renderer, panel };
        })
        .filter(({ renderer, panel }) => visible(renderer) && visible(panel));
}

function forcePanelWidth(panel, width, collapsed = false) {
    const targetWidth = collapsed ? COLLAPSED_WIDTH : clampWidth(width);
    const minWidth = collapsed ? COLLAPSED_WIDTH : MIN_WIDTH;
    const maxWidth = collapsed ? COLLAPSED_WIDTH : Math.floor(window.innerWidth * MAX_RATIO);

    panel.classList.add("hst-resizable-chatter");
    panel.dataset.hstResizable = "1";
    panel.dataset.hstCollapsed = collapsed ? "1" : "0";
    panel.style.setProperty("--hst-chatter-width", `${targetWidth}px`);
    panel.style.setProperty("width", `${targetWidth}px`, "important");
    panel.style.setProperty("flex-basis", `${targetWidth}px`, "important");
    panel.style.setProperty("min-width", `${minWidth}px`, "important");
    panel.style.setProperty("max-width", `${maxWidth}px`, "important");
    panel.style.setProperty("flex", `0 0 ${targetWidth}px`, "important");
    panel.style.setProperty("box-sizing", "border-box", "important");
}

function forceFormRemainder(renderer, width, collapsed = false) {
    const panelWidth = collapsed ? COLLAPSED_WIDTH : clampWidth(width);
    renderer.style.setProperty("--hst-chatter-width", `${panelWidth}px`);
    renderer.classList.add("hst-chatter-layout-active");

    const sheetBg = renderer.querySelector(":scope > .o_form_sheet_bg");
    if (sheetBg) {
        sheetBg.style.setProperty("flex", "1 1 auto", "important");
        sheetBg.style.setProperty("min-width", "0", "important");
        sheetBg.style.setProperty("max-width", "none", "important");
        sheetBg.style.setProperty("width", "auto", "important");
    }
    for (const sheet of renderer.querySelectorAll(".o_form_sheet")) {
        sheet.style.setProperty("max-width", "none", "important");
        sheet.style.setProperty("width", "100%", "important");
        sheet.style.setProperty("box-sizing", "border-box", "important");
    }
}

function applyLayout(renderer, panel, width, collapsed = false) {
    injectCss();
    forcePanelWidth(panel, width, collapsed);
    forceFormRemainder(renderer, width, collapsed);
    if (!collapsed) window.localStorage.setItem(STORAGE_KEY, String(clampWidth(width)));
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
}

function installControls(renderer, panel) {
    const saved = parseInt(window.localStorage.getItem(STORAGE_KEY) || String(DEFAULT_WIDTH), 10);
    const currentWidth = Number.isFinite(saved) ? saved : DEFAULT_WIDTH;
    const collapsed = window.localStorage.getItem(COLLAPSE_KEY) === "1";
    applyLayout(renderer, panel, currentWidth, collapsed);

    if (!panel.querySelector(":scope > .hst-chatter-resize-handle")) {
        const handle = document.createElement("div");
        handle.className = "hst-chatter-resize-handle";
        handle.title = "Drag to resize chatter";
        handle.setAttribute("role", "separator");
        handle.setAttribute("aria-orientation", "vertical");
        panel.prepend(handle);

        let startX = 0;
        let startWidth = 0;
        const move = (ev) => {
            const dx = startX - ev.clientX;
            applyLayout(renderer, panel, startWidth + dx, false);
        };
        const up = () => {
            document.body.classList.remove("hst-chatter-resizing");
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
        };
        handle.addEventListener("mousedown", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            startX = ev.clientX;
            startWidth = panel.getBoundingClientRect().width || currentWidth || DEFAULT_WIDTH;
            document.body.classList.add("hst-chatter-resizing");
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", up);
        });
    }

    if (!panel.querySelector(":scope > .hst-chatter-toggle")) {
        const toggle = document.createElement("button");
        toggle.className = "hst-chatter-toggle";
        toggle.type = "button";
        toggle.title = "Collapse chatter";
        toggle.textContent = "›";
        panel.prepend(toggle);
        toggle.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const nowCollapsed = panel.dataset.hstCollapsed !== "1";
            const stored = parseInt(window.localStorage.getItem(STORAGE_KEY) || String(DEFAULT_WIDTH), 10);
            applyLayout(renderer, panel, Number.isFinite(stored) ? stored : DEFAULT_WIDTH, nowCollapsed);
        });
    }
}

let refreshTimer = null;
function refreshAll() {
    injectCss();
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
        for (const { renderer, panel } of findPanels()) {
            installControls(renderer, panel);
        }
    }, 75);
}

function start() {
    if (window[INIT_FLAG]) return;
    window[INIT_FLAG] = true;
    injectCss();
    refreshAll();
    const root = document.body || document.documentElement;
    if (isNode(root)) {
        const observer = new MutationObserver(refreshAll);
        observer.observe(root, { childList: true, subtree: true });
    }
    window.addEventListener("resize", refreshAll);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
    start();
}
