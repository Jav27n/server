/** @odoo-module **/

import { Component, useState, useRef, onMounted, onWillUnmount, onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { loadBundle } from "@web/core/assets";
import { standardActionServiceProps } from "@web/webclient/actions/action_service";
import { rpc } from "@web/core/network/rpc";
import { browser } from "@web/core/browser/browser";

const LAYOUT_KEY = 'hst_access_audit_layout';
const GRID_COLS = 12;
const ROW_HEIGHT = 150;

const DEFAULT_ORDER = [
    'users_by_app', 'top_groups',
    'admin_users', 'recent_users',
    'user_table',
];

const DEFAULT_LAYOUTS = {
    users_by_app:  { cols: 6, rows: 2 },
    top_groups:    { cols: 6, rows: 2 },
    admin_users:   { cols: 4, rows: 2 },
    recent_users:  { cols: 8, rows: 2 },
    user_table:    { cols: 12, rows: 3 },
};

const PANEL_TITLES = {
    users_by_app: 'Users by Application',
    top_groups: 'Top Groups by Members',
    admin_users: 'Administrator Users',
    recent_users: 'Recently Created Users (30 days)',
    user_table: 'User Access Overview',
};

const COLORS = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
    '#2980b9', '#27ae60', '#d35400', '#8e44ad', '#7f8c8d',
];

export class HSTAccessAudit extends Component {
    static template = "hst_access_audit.Dashboard";
    static props = { ...standardActionServiceProps };

    setup() {
        this.actionService = useService("action");
        const saved = this._loadLayout();

        this.state = useState({
            data: null,
            loading: true,
            search: '',
            expandedUsers: {},
            panelOrder: saved.order,
            layouts: saved.layouts,
        });

        this._draggedPanel = null;
        this._resizing = null;
        this.appChartRef = useRef("appChartCanvas");
        this.groupChartRef = useRef("groupChartCanvas");
        this.panelsGridRef = useRef("panelsGrid");
        this._charts = [];
        this._boundMouseMove = this._onResizeMove.bind(this);
        this._boundMouseUp = this._onResizeEnd.bind(this);
        this._searchTimer = null;

        onWillStart(async () => { await loadBundle("web.chartjs_lib"); });
        onMounted(() => { this._loadData(); });
        onWillUnmount(() => {
            this._destroyCharts();
            document.removeEventListener('mousemove', this._boundMouseMove);
            document.removeEventListener('mouseup', this._boundMouseUp);
        });
    }

    // ---- Layout ----
    _loadLayout() {
        try {
            const raw = browser.localStorage.getItem(LAYOUT_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                const allPanels = Object.keys(DEFAULT_LAYOUTS);
                const validOrder = (data.order || []).filter(p => allPanels.includes(p));
                for (const p of allPanels) { if (!validOrder.includes(p)) validOrder.push(p); }
                const layouts = {};
                for (const p of allPanels) {
                    layouts[p] = data.layouts && data.layouts[p]
                        ? { cols: Math.max(2, Math.min(12, data.layouts[p].cols || 6)),
                            rows: Math.max(1, Math.min(6, data.layouts[p].rows || 2)) }
                        : { ...DEFAULT_LAYOUTS[p] };
                }
                return { order: validOrder, layouts };
            }
        } catch { /* ignore */ }
        return { order: [...DEFAULT_ORDER], layouts: JSON.parse(JSON.stringify(DEFAULT_LAYOUTS)) };
    }
    _saveLayout() {
        browser.localStorage.setItem(LAYOUT_KEY, JSON.stringify({
            order: this.state.panelOrder, layouts: this.state.layouts,
        }));
    }
    onResetLayout() {
        this.state.panelOrder = [...DEFAULT_ORDER];
        this.state.layouts = JSON.parse(JSON.stringify(DEFAULT_LAYOUTS));
        browser.localStorage.removeItem(LAYOUT_KEY);
        setTimeout(() => this._renderCharts(), 100);
    }

    // ---- Drag ----
    onDragStart(ev, pid) { this._draggedPanel = pid; ev.dataTransfer.effectAllowed = 'move'; ev.target.classList.add('hst_aa_dragging'); }
    onDragOver(ev) { ev.preventDefault(); const p = ev.target.closest('.hst_aa_drag_panel'); if (p) { document.querySelectorAll('.hst_aa_drag_over').forEach(el => el.classList.remove('hst_aa_drag_over')); p.classList.add('hst_aa_drag_over'); } }
    onDragLeave(ev) { const p = ev.target.closest('.hst_aa_drag_panel'); if (p) p.classList.remove('hst_aa_drag_over'); }
    onDrop(ev, targetId) {
        ev.preventDefault();
        document.querySelectorAll('.hst_aa_drag_over').forEach(el => el.classList.remove('hst_aa_drag_over'));
        if (!this._draggedPanel || this._draggedPanel === targetId) { this._draggedPanel = null; document.querySelectorAll('.hst_aa_dragging').forEach(el => el.classList.remove('hst_aa_dragging')); return; }
        const order = [...this.state.panelOrder]; const fi = order.indexOf(this._draggedPanel); const ti = order.indexOf(targetId);
        if (fi !== -1 && ti !== -1) { order.splice(fi, 1); order.splice(ti, 0, this._draggedPanel); this.state.panelOrder = order; this._saveLayout(); }
        this._draggedPanel = null; document.querySelectorAll('.hst_aa_dragging').forEach(el => el.classList.remove('hst_aa_dragging'));
        setTimeout(() => this._renderCharts(), 100);
    }

    // ---- Resize ----
    onResizeStart(ev, pid) {
        ev.preventDefault(); ev.stopPropagation();
        const grid = this.panelsGridRef.el; if (!grid) return;
        const panel = ev.target.closest('.hst_aa_drag_panel'); if (!panel) return;
        const gr = grid.getBoundingClientRect();
        this._resizing = { panelId: pid, startX: ev.clientX, startY: ev.clientY, startCols: this.state.layouts[pid].cols, startRows: this.state.layouts[pid].rows, colWidth: gr.width / GRID_COLS, rowHeight: ROW_HEIGHT };
        panel.classList.add('hst_aa_resizing'); document.body.style.cursor = 'nwse-resize'; document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', this._boundMouseMove); document.addEventListener('mouseup', this._boundMouseUp);
    }
    _onResizeMove(ev) {
        if (!this._resizing) return; const r = this._resizing;
        const nc = Math.max(2, Math.min(12, r.startCols + Math.round((ev.clientX - r.startX) / r.colWidth)));
        const nr = Math.max(1, Math.min(6, r.startRows + Math.round((ev.clientY - r.startY) / r.rowHeight)));
        if (nc !== this.state.layouts[r.panelId].cols || nr !== this.state.layouts[r.panelId].rows) this.state.layouts[r.panelId] = { cols: nc, rows: nr };
    }
    _onResizeEnd() {
        if (!this._resizing) return;
        document.querySelectorAll('.hst_aa_resizing').forEach(el => el.classList.remove('hst_aa_resizing'));
        document.body.style.cursor = ''; document.body.style.userSelect = '';
        document.removeEventListener('mousemove', this._boundMouseMove); document.removeEventListener('mouseup', this._boundMouseUp);
        this._saveLayout(); this._resizing = null; setTimeout(() => this._renderCharts(), 100);
    }

    getPanelTitle(pid) { return PANEL_TITLES[pid] || pid; }

    // ---- Data ----
    async _loadData() {
        this.state.loading = true;
        try {
            const data = await rpc('/hst_access_audit/data', { search: this.state.search });
            this.state.data = data;
            this.state.loading = false;
            await new Promise(r => setTimeout(r, 80));
            this._renderCharts();
        } catch (e) { console.error("Access Audit failed", e); this.state.loading = false; }
    }

    onSearchInput(ev) {
        this.state.search = ev.target.value;
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => this._loadData(), 400);
    }
    onRefresh() { this._loadData(); }

    // ---- Charts ----
    _destroyCharts() { for (const c of this._charts) c.destroy(); this._charts = []; }

    _renderCharts() {
        this._destroyCharts();
        if (!this.state.data) return;
        this._renderAppChart();
        this._renderGroupChart();
    }

    _renderAppChart() {
        const el = this.appChartRef.el; if (!el) return;
        const data = this.state.data.users_by_app || []; if (!data.length) return;
        const chart = new Chart(el, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.name),
                datasets: [{ data: data.map(d => d.count), backgroundColor: COLORS.slice(0, data.length) }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '55%',
                plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } },
            },
        });
        this._charts.push(chart);
    }

    _renderGroupChart() {
        const el = this.groupChartRef.el; if (!el) return;
        const data = this.state.data.top_groups || []; if (!data.length) return;
        const chart = new Chart(el, {
            type: 'bar',
            data: {
                labels: data.map(d => d.name.length > 30 ? d.name.substring(0, 30) + '...' : d.name),
                datasets: [{
                    label: 'Users', data: data.map(d => d.count),
                    backgroundColor: data.map((_, i) => COLORS[i % COLORS.length] + 'BB'),
                    borderColor: data.map((_, i) => COLORS[i % COLORS.length]),
                    borderWidth: 2, borderRadius: 6, barPercentage: 0.7,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, y: { grid: { display: false } } },
            },
        });
        this._charts.push(chart);
    }

    // ---- User expand ----
    toggleUser(userId) { this.state.expandedUsers[userId] = !this.state.expandedUsers[userId]; }
    isUserExpanded(userId) { return !!this.state.expandedUsers[userId]; }

    openUser(userId) {
        this.actionService.doAction({ type: 'ir.actions.act_window', name: 'User', res_model: 'res.users', res_id: userId, view_mode: 'form', views: [[false, 'form']] });
    }

    formatDate(dtStr) {
        if (!dtStr) return '-';
        const d = new Date(dtStr + 'Z');
        return d.toLocaleDateString();
    }
}

registry.category("actions").add("hst_access_audit", HSTAccessAudit);
