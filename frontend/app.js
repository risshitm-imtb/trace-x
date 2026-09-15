(() => {
    "use strict";

    const API = "/api";
    const STORAGE = "tracex.preferences";
    const app = document.getElementById("app");

    const state = {
        route: { name: "overview", params: {} },
        overview: null,
        alerts: [],
        wallets: [],
        transactions: [],
        currentData: null,
        graph: { data: null, selected: null, zoom: 1, labels: true, filters: { wallet: true, transaction: true, ip: true } },
        preferences: { theme: "dark", motion: true, graphLabels: true, graphAutoFit: true, density: "comfortable" }
    };

    const navItems = [
        ["overview", "Overview", "◫", ""],
        ["alerts", "Alerts", "△", "alerts"],
        ["network-graph", "Network Graph", "⌘", "LIVE"],
        ["wallets", "Wallets", "₿", "wallets"],
        ["transactions", "Transactions", "▤", ""],
        ["wallet-directory", "Wallet Directory", "▰", ""],
        ["import-dataset", "Import Dataset", "↑", ""],
        ["system-status", "System Status", "●", ""]
    ];

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
    const num = (value, digits = 2) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
    const int = value => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
    const short = (value, start = 12, end = 7) => {
        const text = String(value || "");
        return text.length > start + end + 3 ? `${text.slice(0, start)}...${text.slice(-end)}` : text || "-";
    };
    const severity = risk => risk >= 80 ? "Critical" : risk >= 60 ? "High" : risk >= 35 ? "Medium" : "Low";
    const riskClass = risk => risk >= 80 ? "risk-critical" : risk >= 60 ? "risk-high" : risk >= 35 ? "risk-medium" : "green";
    const isIP = value => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value.trim());
    const isTxid = value => /^[a-fA-F0-9]{32,}$/.test(value.trim());
    const isWallet = value => /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{20,}$/i.test(value.trim());

    function loadPrefs() {
        try {
            state.preferences = { ...state.preferences, ...JSON.parse(localStorage.getItem(STORAGE) || "{}") };
        } catch (_) {}
        applyTheme(state.preferences.theme);
    }

    function savePrefs() {
        localStorage.setItem(STORAGE, JSON.stringify(state.preferences));
        applyTheme(state.preferences.theme);
        updateThemeButtons();
    }

    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
        document.querySelector("meta[name='theme-color']")?.setAttribute("content", theme === "light" ? "#f4f7fb" : "#080b10");
    }

    async function api(path) {
        const response = await fetch(`${API}${path}`);
        if (!response.ok) {
            let message = `${response.status} ${response.statusText}`;
            try {
                const body = await response.json();
                message = body.detail || message;
            } catch (_) {}
            throw new Error(message);
        }
        return response.json();
    }

    async function loadOverview() {
        if (!state.overview) state.overview = await api("/overview");
        return state.overview;
    }

    async function loadAlerts() {
        if (!state.alerts.length) {
            const data = await api("/alerts");
            state.alerts = data.alerts || [];
        }
        return state.alerts;
    }

    async function loadWallets() {
        if (!state.wallets.length) {
            try {
                const data = await api("/wallets");
                state.wallets = data.wallets || [];
            } catch (_) {
                state.wallets = await loadAlerts();
            }
        }
        return state.wallets;
    }

    async function loadTransactions() {
        if (state.transactions.length) return state.transactions;
        const alerts = await loadAlerts();
        const map = new Map();
        for (const alert of alerts.slice(0, 12)) {
            try {
                const data = await api(`/wallet/${encodeURIComponent(alert.wallet_address)}`);
                (data.transactions || []).forEach(tx => map.set(tx.txid, { ...tx, wallet: alert.wallet_address }));
            } catch (_) {}
        }
        state.transactions = [...map.values()];
        return state.transactions;
    }

    function shell() {
        app.innerHTML = `
            <aside class="sidebar">
                <div class="brand">
                    <div class="brand-mark">TX</div>
                    <div><h1>TRACE-X</h1><p>CRYPTO INTELLIGENCE</p></div>
                </div>
                <div class="nav-group">
                    <div class="nav-label">Forensic Operations</div>
                    ${navItems.slice(0, 6).map(navButton).join("")}
                </div>
                <div class="nav-group">
                    <div class="nav-label">Ingestion & Tools</div>
                    ${navItems.slice(6).map(navButton).join("")}
                </div>
                <div class="sidebar-footer">
                    <div class="status-card">
                        <div class="status-row"><span><i class="dot"></i> Operational</span><span class="mono">NODE #1</span></div>
                        <p style="margin-top:8px">Offline analysis engine active against the local synthetic investigation dataset.</p>
                    </div>
                    <div class="theme-card">
                        <div class="status-row" style="margin-bottom:8px"><span>Theme</span><span class="mono">LOCAL</span></div>
                        <div class="theme-toggle">
                            <button type="button" data-theme-choice="dark">Dark</button>
                            <button type="button" data-theme-choice="light">Light</button>
                        </div>
                    </div>
                </div>
            </aside>
            <div class="workspace">
                <header class="topbar">
                    <div class="crumb"><strong>TRACE-X</strong> / FORENSIC-WORKSTATION</div>
                    <form class="search-wrap" id="globalSearchForm"><span>⌕</span><input id="globalSearch" placeholder="Search wallet, TXID, IP..." autocomplete="off"></form>
                    <div class="top-actions">
                        <div class="ledger"><i class="dot"></i> Ledger: Local SQLite</div>
                        <button class="btn" id="quickExport" type="button">⇩ Quick Export</button>
                        <button class="icon-btn" id="notificationsButton" type="button" title="Notifications">●</button>
                        <button class="icon-btn" id="settingsButton" type="button" title="Settings">⚙</button>
                        <button class="icon-btn" id="profileButton" type="button" title="Profile">◉</button>
                    </div>
                </header>
                <main class="main" id="main"></main>
            </div>`;
        bindShell();
    }

    function navButton([path, label, icon, badge]) {
        const badgeHtml = badge ? `<span class="badge ${badge === "alerts" ? "red" : ""}" data-badge="${badge}">${badge}</span>` : "";
        return `<button class="nav-item" type="button" data-route="${path}"><span class="nav-icon">${icon}</span><span class="nav-text">${esc(label)}</span>${badgeHtml}</button>`;
    }

    function bindShell() {
        $$("[data-route]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.route)));
        $("#globalSearchForm").addEventListener("submit", event => {
            event.preventDefault();
            globalSearch($("#globalSearch").value);
        });
        $("#quickExport").addEventListener("click", exportCurrent);
        $("#settingsButton").addEventListener("click", settingsModal);
        $("#profileButton").addEventListener("click", profilePopover);
        $("#notificationsButton").addEventListener("click", notificationsPopover);
        $$("[data-theme-choice]").forEach(button => button.addEventListener("click", () => {
            state.preferences.theme = button.dataset.themeChoice;
            savePrefs();
        }));
        updateThemeButtons();
        updateNav();
    }

    function updateThemeButtons() {
        $$("[data-theme-choice]").forEach(button => button.classList.toggle("active", button.dataset.themeChoice === state.preferences.theme));
    }

    function updateBadges() {
        const overview = state.overview || {};
        const alertBadge = $('[data-badge="alerts"]');
        const walletBadge = $('[data-badge="wallets"]');
        if (alertBadge) alertBadge.textContent = state.alerts.length || overview.high_risk_alerts || "0";
        if (walletBadge) walletBadge.textContent = overview.wallets || state.wallets.length || "480";
    }

    function updateNav() {
        $$("[data-route]").forEach(button => button.classList.toggle("active", button.dataset.route === state.route.name));
    }

    function main(html) {
        $("#main").innerHTML = `<div class="view">${html}</div>`;
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function head(kicker, title, body, actions = "") {
        return `<div class="page-head"><div><p class="eyebrow">${esc(kicker)}</p><h2>${esc(title)}</h2><p>${esc(body)}</p></div><div class="toolbar">${actions}</div></div>`;
    }

    function metric(label, value, note = "", cls = "") {
        return `<div class="card metric"><div class="metric-label">${esc(label)}</div><div class="metric-value ${cls}">${esc(value)}</div><div class="metric-note">${esc(note)}</div></div>`;
    }

    function table(headers, rows, empty = "No records found.") {
        return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty">${esc(empty)}</td></tr>`}</tbody></table></div>`;
    }

    async function navigate(name, params = {}, replace = false) {
        closeFloating();
        state.route = { name, params };
        updateNav();
        if (!replace) history.pushState(state.route, "", hashFor(name, params));
        try {
            await routes[name](params);
            updateBadges();
        } catch (error) {
            console.error(error);
            main(errorState("Unable to load view", error.message));
        }
    }

    function hashFor(name, params = {}) {
        if (name === "wallet-investigation") return `#wallet/${encodeURIComponent(params.address)}`;
        if (name === "transaction-analysis") return `#transaction/${encodeURIComponent(params.txid)}`;
        if (name === "network-graph" && params.wallet) return `#network-graph/${encodeURIComponent(params.wallet)}`;
        return `#${name}`;
    }

    function parseHash() {
        const raw = location.hash.replace(/^#/, "");
        if (!raw) return { name: "overview", params: {} };
        const [name, value] = raw.split("/");
        if (name === "wallet") return { name: "wallet-investigation", params: { address: decodeURIComponent(value || "") } };
        if (name === "transaction") return { name: "transaction-analysis", params: { txid: decodeURIComponent(value || "") } };
        if (name === "network-graph" && value) return { name, params: { wallet: decodeURIComponent(value) } };
        return { name: routes[name] ? name : "overview", params: {} };
    }

    const routes = {
        overview: renderOverview,
        alerts: renderAlerts,
        wallets: renderWallets,
        "wallet-directory": renderWalletDirectory,
        "wallet-investigation": ({ address }) => renderWalletInvestigation(address),
        transactions: renderTransactions,
        "transaction-analysis": ({ txid }) => renderTransactionAnalysis(txid),
        "network-graph": ({ wallet } = {}) => renderGraph(wallet),
        "import-dataset": renderImport,
        "system-status": renderSystemStatus
    };

    async function renderOverview() {
        const [overview, alerts] = await Promise.all([loadOverview(), loadAlerts()]);
        const highRows = alerts.slice(0, 8).map(alertRow).join("");
        state.currentData = { view: "overview", overview, alerts: alerts.slice(0, 20) };
        main(`
            ${head("Intelligence Dashboard", "Trace-X Overview", "Offline Bitcoin transaction investigation workspace backed by the local SQLite and ML pipeline.", `<button class="btn primary" data-action="open-alerts">Open Alerts</button>`)}
            <div class="grid-4">
                ${metric("Wallets", int(overview.wallets), "monitored entities", "cyan")}
                ${metric("High-Risk Alerts", int(overview.high_risk_alerts), "risk score >= 60", "red")}
                ${metric("Anomalies", int(overview.anomalies), "ML anomaly label", "violet")}
                ${metric("Maximum Risk", num(overview.max_risk), "highest scored wallet", "red")}
            </div>
            <div class="split">
                <section>${table(["Risk", "Wallet", "Transactions", "Network Diversity", "Evidence", "Status", "Action"], highRows, "No high-risk entities found.")}</section>
                <aside class="stack">
                    <div class="card"><h3>Detection Intelligence</h3><div class="list" style="margin-top:12px">
                        ${["ML Anomaly Detection", "Network Diversity", "Transaction Velocity", "Flow Imbalance", "Entity Clustering"].map((x, i) => signal(x, [overview.anomalies, "ASN/IP spread", "TX per source IP", "In/out asymmetry", "Focused graph"][i])).join("")}
                    </div></div>
                    <div class="card"><h3>Recent Investigative Activity</h3><div class="list" style="margin-top:12px">${alerts.slice(0, 5).map(a => `<button class="list-item nav-item" data-wallet="${esc(a.wallet_address)}"><span class="identifier">${short(a.wallet_address, 14, 8)}</span><span class="${riskClass(a.risk_score)}">${num(a.risk_score)}</span></button>`).join("")}</div></div>
                </aside>
            </div>`);
        bindWalletClicks();
        $("[data-action='open-alerts']")?.addEventListener("click", () => navigate("alerts"));
    }

    function alertRow(alert) {
        const risk = Number(alert.risk_score || 0);
        return `<tr class="clickable" data-wallet="${esc(alert.wallet_address)}">
            <td class="${riskClass(risk)}"><strong>${num(risk)}</strong><br>${severity(risk)}</td>
            <td class="identifier">${esc(short(alert.wallet_address, 16, 8))}</td>
            <td>${int(alert.transaction_count)}</td>
            <td>${int(alert.network_diversity)}</td>
            <td>${esc(alert.explanation || "Behavior differs from baseline")}</td>
            <td><span class="status-pill">Queued</span></td>
            <td class="row-actions"><button class="btn primary" data-wallet="${esc(alert.wallet_address)}">Investigate</button></td>
        </tr>`;
    }

    function alertQueueRow(alert, index) {
        const risk = Number(alert.risk_score || 0);
        return `<tr class="clickable" data-wallet="${esc(alert.wallet_address)}">
            <td><strong>#${String(index + 1).padStart(2, "0")}</strong><br><span class="${riskClass(risk)}">${severity(risk)}</span></td>
            <td class="identifier">${esc(short(alert.wallet_address, 16, 8))}</td>
            <td class="${riskClass(risk)}"><strong>${num(risk)}</strong></td>
            <td class="green">${num(alert.confidence || 0)}%</td>
            <td>${int(alert.transaction_count)}</td>
            <td>${int(alert.network_diversity)}</td>
            <td>${esc(alert.explanation || "Behavior differs from baseline")}</td>
            <td class="row-actions"><button class="btn primary" data-wallet="${esc(alert.wallet_address)}">Investigate</button></td>
        </tr>`;
    }

    function signal(title, detail) {
        return `<div class="list-item"><strong>${esc(title)}</strong><p>${esc(detail)}</p></div>`;
    }

    async function renderAlerts() {
        const alerts = await loadAlerts();
        state.currentData = { view: "alerts", alerts };
        main(`
            ${head("Alerts Investigation Queue", "Ranked ML Alerts", "Filter high-risk synthetic wallet entities by priority and evidence.", `<input class="control-input" id="alertSearch" placeholder="Search wallet, TXID, IP">`)}
            <div class="toolbar">
                <div class="filter-tabs" id="alertFilters">${["All", "Critical", "High", "Medium", "Low"].map((f, i) => `<button class="chip ${i === 0 ? "active" : ""}" data-filter="${f}">${f}</button>`).join("")}</div>
                <button class="btn" data-export-table="alerts">Export CSV</button>
            </div>
            <div id="alertsTable"></div>`);
        const draw = () => {
            const filter = $("#alertFilters .active")?.dataset.filter || "All";
            const q = $("#alertSearch").value.toLowerCase();
            const rows = alerts.filter(a => {
                const sev = severity(Number(a.risk_score || 0));
                const text = JSON.stringify(a).toLowerCase();
                return (filter === "All" || sev === filter) && (!q || text.includes(q));
            }).map(alertQueueRow).join("");
            $("#alertsTable").innerHTML = table(["Priority", "Wallet", "Risk Score", "Confidence", "Transactions", "Network Diversity", "Evidence", "Action"], rows);
            bindWalletClicks();
        };
        $("#alertSearch").addEventListener("input", draw);
        $$("#alertFilters button").forEach(button => button.addEventListener("click", () => {
            $$("#alertFilters button").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            draw();
        }));
        bindExportButtons();
        draw();
    }

    async function renderWallets() {
        const [overview, alerts, wallets] = await Promise.all([loadOverview(), loadAlerts(), loadWallets()]);
        const critical = wallets.filter(w => Number(w.risk_score || 0) >= 80).length;
        const high = wallets.filter(w => Number(w.risk_score || 0) >= 60 && Number(w.risk_score || 0) < 80).length;
        const topRows = wallets.slice(0, 7).map(walletDirectoryRow).join("");
        state.currentData = { view: "wallets", overview, wallets: wallets.slice(0, 50) };
        main(`
            ${head("Wallet Intelligence Overview", "Wallet Population", "A separate population view for wallet risk distribution and behavior, distinct from the searchable directory.", `<button class="btn primary" data-action="directory">Open Directory</button>`)}
            <div class="grid-4">
                ${metric("Total Wallets", int(overview.wallets || wallets.length), "local dataset", "cyan")}
                ${metric("Critical", int(critical), "risk >= 80", "red")}
                ${metric("High", int(high || alerts.length), "risk 60-79", "amber")}
                ${metric("Average Risk", num(overview.average_risk), "across detected wallets", "violet")}
            </div>
            <div class="split">
                <section>${table(["Wallet", "Risk", "Transactions", "Received", "Sent", "Network", "Last Seen", "Action"], topRows)}</section>
                <aside class="card"><h3>Behavioral Statistics</h3><div class="list" style="margin-top:12px">
                    ${signal("Risk distribution", `${critical} critical, ${high} high, ${alerts.length} total alert candidates`)}
                    ${signal("Network diversity", "Measured from source/destination IP and ASN spread")}
                    ${signal("Directory handoff", "Open the registry for search, sorting, filtering, and pagination")}
                </div></aside>
            </div>`);
        $("[data-action='directory']").addEventListener("click", () => navigate("wallet-directory"));
        bindWalletClicks();
    }

    async function renderWalletDirectory() {
        const wallets = await loadWallets();
        state.currentData = { view: "wallet-directory", wallets };
        main(`
            ${head("Forensic Registry", "Wallet Directory", "Searchable intelligence registry of monitored synthetic Bitcoin wallet entities.", `<button class="btn" data-export-table="wallets">Export CSV</button>`)}
            <div class="toolbar">
                <input class="control-input" id="walletSearch" style="max-width:420px" placeholder="Search address, evidence, status...">
                <div class="filter-tabs" id="walletRisk">${["All", "Critical", "High", "Medium", "Low"].map((f, i) => `<button class="chip ${i === 0 ? "active" : ""}" data-filter="${f}">${f}</button>`).join("")}</div>
                <select id="walletSort" style="max-width:230px"><option value="risk">Risk high to low</option><option value="tx">Transactions high to low</option><option value="received">Received high to low</option><option value="last">Last seen</option></select>
            </div>
            <div id="walletDirectoryTable"></div>
            <div class="toolbar"><button class="btn" id="prevPage">Previous</button><span class="mono" id="pageInfo"></span><button class="btn" id="nextPage">Next</button></div>`);
        let page = 1;
        const size = 25;
        const draw = () => {
            const filter = $("#walletRisk .active")?.dataset.filter || "All";
            const q = $("#walletSearch").value.toLowerCase();
            const sorted = wallets.filter(w => {
                const sev = severity(Number(w.risk_score || 0));
                return (filter === "All" || sev === filter) && (!q || JSON.stringify(w).toLowerCase().includes(q));
            }).sort(sortWallets($("#walletSort").value));
            const pages = Math.max(1, Math.ceil(sorted.length / size));
            page = Math.min(page, pages);
            const rows = sorted.slice((page - 1) * size, page * size).map(walletDirectoryRow).join("");
            $("#walletDirectoryTable").innerHTML = table(["Wallet", "Risk", "Transactions", "Received", "Sent", "Network Diversity", "Last Seen", "Status", "Action"], rows);
            $("#pageInfo").textContent = `Page ${page} / ${pages} (${sorted.length} wallets)`;
            $("#prevPage").disabled = page <= 1;
            $("#nextPage").disabled = page >= pages;
            bindWalletClicks();
        };
        $("#walletSearch").addEventListener("input", () => { page = 1; draw(); });
        $("#walletSort").addEventListener("change", draw);
        $$("#walletRisk button").forEach(button => button.addEventListener("click", () => {
            $$("#walletRisk button").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            page = 1;
            draw();
        }));
        $("#prevPage").addEventListener("click", () => { page -= 1; draw(); });
        $("#nextPage").addEventListener("click", () => { page += 1; draw(); });
        bindExportButtons();
        draw();
    }

    function sortWallets(key) {
        return (a, b) => {
            if (key === "tx") return Number(b.transaction_count || 0) - Number(a.transaction_count || 0);
            if (key === "received") return Number(b.total_received || 0) - Number(a.total_received || 0);
            if (key === "last") return String(b.last_seen || "").localeCompare(String(a.last_seen || ""));
            return Number(b.risk_score || 0) - Number(a.risk_score || 0);
        };
    }

    function walletDirectoryRow(wallet) {
        const address = wallet.wallet_address || wallet.address;
        const risk = Number(wallet.risk_score || 0);
        return `<tr class="clickable" data-wallet="${esc(address)}">
            <td class="identifier">${esc(short(address, 18, 8))}</td>
            <td class="${riskClass(risk)}"><strong>${num(risk)}</strong><br>${severity(risk)}</td>
            <td>${int(wallet.transaction_count)}</td>
            <td>${num(wallet.total_received || 0, 6)} BTC</td>
            <td>${num(wallet.total_sent || 0, 6)} BTC</td>
            <td>${int(wallet.network_diversity)}</td>
            <td class="mono">${esc(wallet.last_seen || "-")}</td>
            <td><span class="status-pill">${risk >= 60 ? "Review" : "Monitored"}</span></td>
            <td class="row-actions"><button class="btn primary" data-wallet="${esc(address)}">Investigate</button></td>
        </tr>`;
    }

    async function renderWalletInvestigation(address) {
        const data = await api(`/wallet/${encodeURIComponent(address)}`);
        state.currentData = { view: "wallet-investigation", data };
        const wallet = data.wallet || {};
        const risk = data.risk || {};
        const behavior = data.behavior || {};
        const network = data.network || {};
        const txRows = (data.transactions || []).map(tx => `<tr class="clickable" data-txid="${esc(tx.txid)}"><td class="identifier">${short(tx.txid, 18, 8)}</td><td class="mono">${esc(tx.timestamp)}</td><td>${int(tx.input_count)}</td><td>${int(tx.output_count)}</td><td>${num(tx.total_output || tx.value, 8)} BTC</td><td class="row-actions"><button class="btn" data-txid="${esc(tx.txid)}">Analyze</button></td></tr>`).join("");
        main(`
            ${head("Wallet Investigation", "Wallet Investigation", "Deep forensic wallet workspace with ML, network, flow, and activity evidence.", `<button class="btn" id="copyWallet">Copy Address</button><button class="btn" id="openWalletGraph">Open Graph</button><button class="btn primary" id="jumpTx">Investigate Transactions</button>`)}
            <div class="card"><div class="identifier">${esc(wallet.address || address)}</div></div>
            <div class="grid-4">
                ${metric("Risk Score", num(risk.score), severity(Number(risk.score || 0)), riskClass(Number(risk.score || 0)))}
                ${metric("Evidence Confidence", `${num(risk.confidence)}%`, "model agreement", "green")}
                ${metric("Transaction Count", int(wallet.transaction_count), "wallet activity", "cyan")}
                ${metric("Network Diversity", int(behavior.network_diversity), "IP/ASN spread", "violet")}
            </div>
            <div class="split">
                <section class="stack">
                    <div class="card"><h3>Risk Profile</h3><div class="list" style="margin-top:12px">${riskBars([
                        ["ML Anomaly", Number(risk.score || 0)],
                        ["Network Behavior", Math.min(100, Number(behavior.network_diversity || 0) * 10)],
                        ["Transaction Velocity", Math.min(100, Number(behavior.tx_per_ip || 0) * 10)],
                        ["Flow Imbalance", Math.min(100, Math.abs(Number(behavior.flow_imbalance || 0)) * 100)]
                    ])}</div></div>
                    <div class="card"><h3>Investigative Findings</h3><div class="list" style="margin-top:12px">${(data.signals || []).map(s => signal(s.title, `${s.category}: ${s.detail}`)).join("") || signal("No dominant signal", risk.explanation || "No returned finding.")}</div></div>
                </section>
                <aside class="stack">
                    <div class="card"><h3>Network Intelligence</h3><div class="list" style="margin-top:12px">
                        ${signal("Source IPs", (network.source_ips || []).slice(0, 10).join(", ") || "None observed")}
                        ${signal("Destination IPs", (network.destination_ips || []).slice(0, 10).join(", ") || "None observed")}
                        ${signal("Countries", (network.countries || []).join(", ") || "None observed")}
                        ${signal("ASNs", (network.asns || []).join(", ") || "None observed")}
                        ${signal("Observation Count", int(network.observation_count))}
                    </div></div>
                    <div class="card"><h3>Activity Window</h3><div class="list" style="margin-top:12px">${signal("First Seen", wallet.first_seen || "-")}${signal("Last Seen", wallet.last_seen || "-")}</div></div>
                </aside>
            </div>
            ${table(["TXID", "Timestamp", "Inputs", "Outputs", "Value", "Action"], txRows, "No transactions connected to this wallet.")}
            <div class="card"><h3>Connected Entities</h3><div class="filter-tabs" style="margin-top:12px">${(data.connected_wallets || []).slice(0, 36).map(w => `<button class="chip" data-wallet="${esc(w)}">${esc(short(w, 12, 7))}</button>`).join("") || `<span class="empty">No connected wallets.</span>`}</div></div>`);
        $("#copyWallet").addEventListener("click", () => copy(wallet.address || address));
        $("#openWalletGraph").addEventListener("click", () => navigate("network-graph", { wallet: wallet.address || address }));
        $("#jumpTx").addEventListener("click", () => $("#main table")?.scrollIntoView({ behavior: "smooth" }));
        bindWalletClicks();
        bindTransactionClicks();
    }

    function riskBars(items) {
        return items.map(([label, value]) => `<div><div class="toolbar"><span>${esc(label)}</span><span class="mono cyan">${num(value)}%</span></div><div class="progress"><i style="--v:${Math.max(0, Math.min(100, value))}%"></i></div></div>`).join("");
    }

    async function renderTransactions() {
        const transactions = await loadTransactions();
        state.currentData = { view: "transactions", transactions };
        const rows = transactions.map(tx => `<tr class="clickable" data-txid="${esc(tx.txid)}"><td class="identifier">${short(tx.txid, 18, 8)}</td><td class="mono">${esc(tx.timestamp || "-")}</td><td class="identifier">${short(tx.wallet, 14, 7)}</td><td>${int(tx.input_count)}</td><td>${int(tx.output_count)}</td><td>${num(tx.total_output || tx.value, 8)} BTC</td><td class="row-actions"><button class="btn primary" data-txid="${esc(tx.txid)}">Analyze</button></td></tr>`).join("");
        main(`${head("Transaction Index", "Transactions", "Recent transactions gathered from the highest-risk wallet investigations.", `<button class="btn" data-export-table="transactions">Export CSV</button>`)}${table(["TXID", "Timestamp", "Wallet", "Inputs", "Outputs", "Value", "Action"], rows, "No correlated transactions found.")}`);
        bindTransactionClicks();
        bindExportButtons();
    }

    async function renderTransactionAnalysis(txid) {
        const data = await api(`/transaction/${encodeURIComponent(txid)}`);
        state.currentData = { view: "transaction-analysis", data };
        const flow = data.flow || {};
        const network = data.network || {};
        main(`
            ${head("Transaction Analysis", "Transaction Analysis", "Flow reconstruction and priority breakdown from existing transaction, network, and connected-wallet evidence.", `<button class="btn" id="copyTx">Copy TXID</button>`)}
            <div class="card"><div class="identifier">${esc(data.txid || txid)}</div></div>
            <div class="grid-4">
                ${metric("Investigative Priority", num(data.priority), data.severity || "Low", riskClass(Number(data.priority || 0)))}
                ${metric("Total Input", `${num(flow.total_input, 6)} BTC`, `${int(flow.input_count)} inputs`, "cyan")}
                ${metric("Total Output", `${num(flow.total_output, 6)} BTC`, `${int(flow.output_count)} outputs`, "violet")}
                ${metric("Fee", `${num(data.fee, 8)} BTC`, data.script_type || "script", "green")}
            </div>
            <section class="card">
                <h3>Main Flow</h3>
                <div class="flow-vertical" style="margin-top:14px">
                    <button class="flow-node" data-wallet="${esc(flow.from || "")}"><p class="eyebrow">Source Wallet</p><div class="identifier">${esc(flow.from || "Unknown")}</div></button>
                    <div class="flow-arrow">↓</div>
                    <button class="flow-node" data-txid="${esc(data.txid || txid)}"><p class="eyebrow">Transaction</p><div class="identifier">${esc(data.txid || txid)}</div><p>${int(flow.input_count)} input(s), ${int(flow.output_count)} output(s)</p></button>
                    <div class="flow-arrow">↓</div>
                    <button class="flow-node" data-wallet="${esc(flow.to || "")}"><p class="eyebrow">Destination Wallet</p><div class="identifier">${esc(flow.to || "Unknown")}</div></button>
                </div>
            </section>
            <div class="split">
                <section class="card"><h3>Investigative Findings</h3><p style="margin-top:8px">${esc(data.explanation || "")}</p><div class="list" style="margin-top:12px">${(data.evidence || []).map(e => signal(e.title, `${e.category}: observed ${e.observed}; baseline ${e.baseline}; +${e.points} points`)).join("") || signal("No dominant finding", "No evidence threshold was exceeded.")}</div></section>
                <aside class="card"><h3>Priority Breakdown</h3><div class="list" style="margin-top:12px">${riskBars(Object.entries(data.risk || {}).map(([k, v]) => [k.replaceAll("_", " "), Number(v)]))}</div></aside>
            </div>
            <div class="grid-2">
                <div class="card"><h3>Network Evidence</h3><div class="list" style="margin-top:12px">${signal("Source IPs", (network.source_ips || []).join(", ") || "None")}${signal("Destination IPs", (network.destination_ips || []).join(", ") || "None")}${signal("ASNs", (network.asns || []).join(", ") || "None")}${signal("Countries", (network.countries || []).join(", ") || "None")}</div></div>
                <div class="card"><h3>Connected Entities</h3><div class="filter-tabs" style="margin-top:12px">${((data.wallets || {}).addresses || []).map(w => `<button class="chip" data-wallet="${esc(w)}">${short(w, 12, 7)}</button>`).join("")}</div></div>
            </div>`);
        $("#copyTx").addEventListener("click", () => copy(data.txid || txid));
        bindWalletClicks();
        bindTransactionClicks();
    }

    async function renderGraph(wallet = null) {
        const data = await api(`/graph/focused${wallet ? `?wallet_address=${encodeURIComponent(wallet)}` : ""}`);
        state.graph.data = data;
        state.graph.selected = data.nodes?.[0] || null;
        state.currentData = { view: "network-graph", data };
        drawGraphView();
    }

    function drawGraphView() {
        const data = state.graph.data || { nodes: [], edges: [] };
        const visible = (data.nodes || []).filter(n => state.graph.filters[n.type] !== false).slice(0, 90);
        const ids = new Set(visible.map(n => n.id));
        const edges = (data.edges || []).filter(e => ids.has(e.source) && ids.has(e.target));
        const pos = layoutGraph(visible, edges, 1000, 640);
        const nodeSvg = visible.map(n => graphNode(n, pos[n.id])).join("");
        const edgeSvg = edges.map(e => {
            const a = pos[e.source], b = pos[e.target];
            return a && b ? `<line class="graph-edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"></line>` : "";
        }).join("");
        const viewWidth = 1000 / state.graph.zoom;
        const viewHeight = 640 / state.graph.zoom;
        const viewX = (1000 - viewWidth) / 2;
        const viewY = (640 - viewHeight) / 2;
        main(`
            ${head("Network Graph", "Focused Link Analysis", "Bounded wallet, transaction, and IP graph for readable forensic exploration.", `<button class="btn" id="zoomOut">−</button><button class="btn" id="zoomIn">+</button><button class="btn" id="fitGraph">Fit</button><button class="btn" id="resetGraph">Reset</button>`)}
            <div class="toolbar">
                <input class="control-input" id="graphSearch" style="max-width:420px" placeholder="Search node identifier">
                <div class="filter-tabs">${["wallet", "transaction", "ip"].map(t => `<button class="chip ${state.graph.filters[t] ? "active" : ""}" data-graph-filter="${t}">${t}</button>`).join("")}</div>
                <div class="legend"><span><i style="background:var(--primary)"></i>Wallet</span><span><i style="background:var(--violet)"></i>Transaction</span><span><i style="background:var(--green)"></i>IP</span></div>
            </div>
            <div class="graph-shell">
                <div class="graph-stage"><svg viewBox="${viewX} ${viewY} ${viewWidth} ${viewHeight}" role="img" aria-label="Trace-X focused network graph">${edgeSvg}${nodeSvg}</svg></div>
                <aside class="card" id="graphInspector">${graphInspector(state.graph.selected, edges)}</aside>
            </div>`);
        bindGraph();
    }

    function layoutGraph(nodes, edges, width, height) {
        const pos = {};
        const center = { x: width / 2, y: height / 2 };
        const focus = nodes.find(n => n.id === state.graph.data.wallet) || nodes[0];
        if (focus) pos[focus.id] = center;
        const groups = {
            wallet: nodes.filter(n => n.type === "wallet" && n.id !== focus?.id),
            transaction: nodes.filter(n => n.type === "transaction"),
            ip: nodes.filter(n => n.type === "ip")
        };
        placeRing(groups.transaction, 145, center, pos, -Math.PI / 2);
        placeRing(groups.wallet, 265, center, pos, Math.PI / 10);
        placeRing(groups.ip, 235, center, pos, Math.PI);
        return pos;
    }

    function placeRing(nodes, radius, center, pos, offset) {
        nodes.forEach((node, index) => {
            const angle = offset + (Math.PI * 2 * index) / Math.max(1, nodes.length);
            pos[node.id] = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
        });
    }

    function graphNode(node, p) {
        if (!p) return "";
        const color = node.type === "ip" ? "var(--green)" : node.type === "transaction" ? "var(--violet)" : "var(--primary)";
        const r = node.type === "transaction" ? 11 : node.type === "ip" ? 9 : 13;
        const label = state.preferences.graphLabels ? `<text class="graph-label" x="${p.x + r + 5}" y="${p.y + 4}">${esc(short(node.id, 12, 5))}</text>` : "";
        return `<g class="graph-node" data-node="${esc(node.id)}"><circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${color}" opacity=".92"></circle><circle cx="${p.x}" cy="${p.y}" r="${r + 7}" fill="transparent" stroke="${color}" opacity=".18"></circle>${label}</g>`;
    }

    function graphInspector(node, edges) {
        if (!node) return `<h3>Selected Entity</h3><div class="empty">Select a node to inspect entity metadata.</div>`;
        const connected = edges.filter(e => e.source === node.id || e.target === node.id).map(e => e.source === node.id ? e.target : e.source);
        return `<h3>Selected Entity</h3><div class="list" style="margin-top:12px">
            ${signal("Type", node.type || "unknown")}
            ${signal("Identifier", node.id)}
            ${signal("Connected Entities", int(connected.length))}
            <div class="toolbar"><button class="btn primary" data-open-node="${esc(node.id)}" data-node-type="${esc(node.type)}">Open</button><button class="btn" data-copy-node="${esc(node.id)}">Copy</button></div>
        </div>`;
    }

    function bindGraph() {
        $$("[data-node]").forEach(node => node.addEventListener("click", () => {
            const id = node.dataset.node;
            state.graph.selected = (state.graph.data.nodes || []).find(n => n.id === id);
            const edges = (state.graph.data.edges || []);
            $("#graphInspector").innerHTML = graphInspector(state.graph.selected, edges);
            bindGraphInspector();
        }));
        $$("[data-graph-filter]").forEach(button => button.addEventListener("click", () => {
            const type = button.dataset.graphFilter;
            state.graph.filters[type] = !state.graph.filters[type];
            drawGraphView();
        }));
        $("#graphSearch").addEventListener("change", event => {
            const q = event.target.value.toLowerCase();
            const node = (state.graph.data.nodes || []).find(n => n.id.toLowerCase().includes(q));
            if (node) { state.graph.selected = node; $("#graphInspector").innerHTML = graphInspector(node, state.graph.data.edges || []); bindGraphInspector(); }
            else toast("No graph entity found");
        });
        $("#zoomIn").addEventListener("click", () => { state.graph.zoom = Math.min(2.4, state.graph.zoom + .2); drawGraphView(); });
        $("#zoomOut").addEventListener("click", () => { state.graph.zoom = Math.max(.7, state.graph.zoom - .2); drawGraphView(); });
        $("#fitGraph").addEventListener("click", () => { state.graph.zoom = 1; drawGraphView(); });
        $("#resetGraph").addEventListener("click", () => { state.graph.zoom = 1; renderGraph(); });
        bindGraphInspector();
    }

    function bindGraphInspector() {
        $("[data-open-node]")?.addEventListener("click", event => openEntity(event.currentTarget.dataset.openNode, event.currentTarget.dataset.nodeType));
        $("[data-copy-node]")?.addEventListener("click", event => copy(event.currentTarget.dataset.copyNode));
    }

    function openEntity(id, type = "") {
        if (type === "wallet" || isWallet(id)) navigate("wallet-investigation", { address: id });
        else if (type === "transaction" || isTxid(id)) navigate("transaction-analysis", { txid: id });
        else if (type === "ip" || isIP(id)) ipDetails(id);
        else toast("No detail route for this entity");
    }

    function renderImport() {
        state.currentData = { view: "import-dataset", supported: false };
        main(`${head("Dataset Ingestion", "Import Dataset", "The backend exposes offline ingestion scripts, but no browser upload endpoint is currently implemented.")}
            <div class="card"><h3>Supported Current Workflow</h3><div class="list" style="margin-top:12px">
                ${signal("Backend ingestion", "Use the existing local ingestion pipeline/scripts against approved CSV input.")}
                ${signal("Browser upload", "Not enabled by the current FastAPI API, so this UI will not fabricate a successful import.")}
                ${signal("Current dataset", "data/raw/bitcoin_traffic.csv loaded into local SQLite.")}
            </div></div>`);
    }

    async function renderSystemStatus() {
        const [overview, alerts] = await Promise.all([loadOverview(), loadAlerts()]);
        state.currentData = { view: "system-status", overview };
        main(`${head("System Status", "Offline Analysis Engine", "Local FastAPI, SQLite, ML detector, and focused graph services.")}
            <div class="grid-4">${metric("API", "Operational", "/api/health", "green")}${metric("Wallets", int(overview.wallets), "ML detection rows", "cyan")}${metric("Alerts", int(alerts.length), "queued leads", "red")}${metric("Mode", "Offline", "no live blockchain claims", "violet")}</div>`);
    }

    function bindWalletClicks() {
        $$("[data-wallet]").forEach(el => el.addEventListener("click", event => {
            event.stopPropagation();
            const address = el.dataset.wallet;
            if (address) navigate("wallet-investigation", { address });
        }));
    }

    function bindTransactionClicks() {
        $$("[data-txid]").forEach(el => el.addEventListener("click", event => {
            event.stopPropagation();
            const txid = el.dataset.txid;
            if (txid) navigate("transaction-analysis", { txid });
        }));
    }

    async function globalSearch(raw) {
        const query = raw.trim();
        if (!query) return;
        if (isIP(query)) return ipDetails(query);
        if (isWallet(query)) return navigate("wallet-investigation", { address: query });
        if (isTxid(query)) return navigate("transaction-analysis", { txid: query });
        const wallets = await loadWallets();
        const wallet = wallets.find(w => String(w.wallet_address || w.address || "").includes(query));
        if (wallet) return navigate("wallet-investigation", { address: wallet.wallet_address || wallet.address });
        const txs = await loadTransactions();
        const tx = txs.find(t => String(t.txid || "").includes(query));
        if (tx) return navigate("transaction-analysis", { txid: tx.txid });
        toast("No intelligence found");
    }

    function ipDetails(ip) {
        const graph = state.graph.data || {};
        const connections = (graph.edges || []).filter(e => e.source === ip || e.target === ip);
        modal("IP Intelligence", `<div class="list">${signal("IP Address", ip)}${signal("Supported Detail", "No dedicated backend IP endpoint is available. Showing local graph context when loaded.")}${signal("Graph Connections", int(connections.length))}</div>`);
    }

    function settingsModal() {
        modal("Settings", `<div class="list">
            ${settingSelect("Theme", "theme", [["dark", "Dark"], ["light", "Light"]])}
            ${settingSelect("Animation Preference", "motion", [["true", "Enabled"], ["false", "Reduced"]])}
            ${settingSelect("Graph Labels", "graphLabels", [["true", "Show"], ["false", "Hide"]])}
            ${settingSelect("Graph Auto-Fit", "graphAutoFit", [["true", "Enabled"], ["false", "Disabled"]])}
            ${settingSelect("Density", "density", [["comfortable", "Comfortable"], ["compact", "Compact"]])}
        </div><div class="toolbar" style="margin-top:16px"><button class="btn primary" id="saveSettings">Save Preferences</button></div>`);
        $("#saveSettings").addEventListener("click", () => {
            $$(".modal [data-pref]").forEach(input => {
                const key = input.dataset.pref;
                const value = input.value;
                state.preferences[key] = value === "true" ? true : value === "false" ? false : value;
            });
            savePrefs();
            closeFloating();
            toast("Preferences saved");
            if (state.route.name === "network-graph") drawGraphView();
        });
    }

    function settingSelect(label, key, options) {
        const current = String(state.preferences[key]);
        return `<label class="list-item"><strong>${esc(label)}</strong><select data-pref="${esc(key)}" style="margin-top:8px">${options.map(([value, text]) => `<option value="${value}" ${current === value ? "selected" : ""}>${esc(text)}</option>`).join("")}</select></label>`;
    }

    function profilePopover() {
        popover(`<h3>Analyst Profile</h3><div class="list" style="margin-top:12px">${signal("Analyst", "Local Trace-X operator")}${signal("Role", "Forensic workstation user")}${signal("System Status", "Operational")}${signal("Authentication", "No backend authentication is implemented")}</div>`);
    }

    async function notificationsPopover() {
        const [overview, alerts] = await Promise.all([loadOverview(), loadAlerts()]);
        popover(`<h3>Notifications</h3><div class="list" style="margin-top:12px">${signal("High-risk alerts detected", int(alerts.length || overview.high_risk_alerts))}${signal("ML detection status", `${int(overview.anomalies)} anomalies identified`) }${signal("System operational status", "FastAPI and local SQLite available")}</div>`);
    }

    function modal(title, body) {
        closeFloating();
        document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-floating><div class="modal"><div class="toolbar"><h3>${esc(title)}</h3><button class="icon-btn" data-close>×</button></div><div style="margin-top:14px">${body}</div></div></div>`);
        $("[data-close]").addEventListener("click", closeFloating);
        $(".modal-backdrop").addEventListener("click", event => { if (event.target.classList.contains("modal-backdrop")) closeFloating(); });
    }

    function popover(body) {
        closeFloating();
        document.body.insertAdjacentHTML("beforeend", `<div class="popover" data-floating>${body}</div>`);
    }

    function closeFloating() {
        $$("[data-floating]").forEach(el => el.remove());
    }

    async function copy(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (_) {
            const input = document.createElement("textarea");
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            input.remove();
        }
        toast("Copied to clipboard");
    }

    function toast(message) {
        $(".toast")?.remove();
        document.body.insertAdjacentHTML("beforeend", `<div class="toast">${esc(message)}</div>`);
        setTimeout(() => $(".toast")?.remove(), 2400);
    }

    function exportCurrent() {
        if (!state.currentData) return toast("No active investigation data to export");
        download(`tracex-${state.currentData.view || "export"}.json`, JSON.stringify(state.currentData, null, 2), "application/json");
    }

    function bindExportButtons() {
        $$("[data-export-table]").forEach(button => button.addEventListener("click", () => {
            const rows = $$("table tr").map(row => $$("th,td", row).map(cell => `"${cell.innerText.replaceAll('"', '""').trim()}"`).join(",")).join("\n");
            download(`tracex-${button.dataset.exportTable}.csv`, rows, "text/csv");
        }));
    }

    function download(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        toast("Export prepared");
    }

    function errorState(title, detail) {
        return `${head("Trace-X", title, detail)}<div class="card empty">The backend returned an error for this request.</div>`;
    }

    window.addEventListener("popstate", event => {
        const route = event.state || parseHash();
        navigate(route.name, route.params, true);
    });

    document.addEventListener("keydown", event => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            $("#globalSearch")?.focus();
        }
        if (event.key === "Escape") closeFloating();
    });

    async function init() {
        loadPrefs();
        shell();
        const route = parseHash();
        history.replaceState(route, "", hashFor(route.name, route.params));
        await navigate(route.name, route.params, true);
        Promise.allSettled([loadOverview(), loadAlerts(), loadWallets()]).then(updateBadges);
    }

    init();
})();
