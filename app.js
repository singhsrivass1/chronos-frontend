const CONFIG = Object.freeze({
    MAX_CHART_POINTS : 80,
    MAX_FEED_ROWS    : 50,
    TPS_BAR_MAX      : 5000,

    CHART_LINE_COLOR : '#e5e7eb',

    WS_URL           : 'wss://chronos-backend-1-2ffx.onrender.com/ws',
    HYDRATE_URL      : 'https://chronos-backend-1-2ffx.onrender.com/api/hydrate',
    TOTALS_URL       : 'https://chronos-backend-1-2ffx.onrender.com/api/totals',
});

const ChartManager = (() => {
    let chart = null;

    function init() {
        const ctx = document.getElementById('profit-chart').getContext('2d');

        chart = new Chart(ctx, {
            type : 'line',
            data : {
                labels   : [],
                datasets : [{
                    data                      : [],
                    borderColor               : CONFIG.CHART_LINE_COLOR,
                    borderWidth               : 1,
                    tension                   : 0.3,
                    fill                      : false,
                    pointRadius               : 0,
                    pointHoverRadius          : 3,
                    pointHoverBackgroundColor : CONFIG.CHART_LINE_COLOR,
                    pointHoverBorderColor     : CONFIG.CHART_LINE_COLOR,
                }],
            },
            options : {
                responsive          : true,
                maintainAspectRatio : false,
                animation           : false,
                interaction         : { mode: 'index', intersect: false },

                plugins : {
                    legend  : { display: false },
                    tooltip : {
                        backgroundColor : '#0a0a0a',
                        borderColor     : '#374151',
                        borderWidth     : 1,
                        titleColor      : '#4b5563',
                        bodyColor       : '#f3f4f6',
                        padding         : 10,
                        titleFont       : { family: 'JetBrains Mono', size: 9 },
                        bodyFont        : { family: 'JetBrains Mono', size: 12, weight: '600' },
                        callbacks : {
                            title : (items) => items[0].label,
                            label : (item) => {
                                const v = item.parsed.y;
                                return ` ${v >= 0 ? '+' : ''}${v.toFixed(4)}%`;
                            },
                        },
                    },
                },

                scales : {
                    x : {
                        grid   : { color: 'rgba(255,255,255,0.04)', tickLength: 0 },
                        border : { display: false },
                        ticks  : {
                            color         : '#374151',
                            font          : { family: 'JetBrains Mono', size: 9 },
                            maxTicksLimit : 6,
                            maxRotation   : 0,
                        },
                    },
                    y : {
                        grid   : { color: 'rgba(255,255,255,0.04)', tickLength: 0 },
                        border : { display: false },
                        ticks  : {
                            color    : '#374151',
                            font     : { family: 'JetBrains Mono', size: 9 },
                            callback : (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
                        },
                    },
                },
            },
        });
    }

    function addPoint(label, value) {
        if (!chart) return;

        chart.data.labels.push(label);
        chart.data.datasets[0].data.push(value);

        if (chart.data.labels.length > CONFIG.MAX_CHART_POINTS) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.update('none');
    }

    return { init, addPoint };
})();


const UIManager = (() => {
    const el          = {};
    let rowCount      = 0;
    let peakPnl       = null;
    let troughPnl     = null;
    let flashDotTimer = null;

    function init() {
        el.tpsValue      = document.getElementById('tps-value');
        el.tpsBar        = document.getElementById('tps-bar');
        el.cyclesValue   = document.getElementById('cycles-value');
        el.flashDot      = document.getElementById('cycle-flash-dot');
        el.lastCycleTs   = document.getElementById('last-cycle-ts');
        el.pnlValue      = document.getElementById('pnl-value');
        el.pnlInrValue   = document.getElementById('pnl-inr-value');
        el.peakPnl       = document.getElementById('peak-pnl');
        el.maxDrawdown   = document.getElementById('max-drawdown');
        el.chartPeak     = document.getElementById('chart-peak');
        el.chartDraw     = document.getElementById('chart-draw');
        el.uptimeDisplay = document.getElementById('uptime-display');
        el.execFeed      = document.getElementById('execution-feed');
        el.feedEmpty     = document.getElementById('feed-empty');
        el.feedCount     = document.getElementById('feed-count');
    }
  
    function updateTPS(tps, uptimeSeconds, totalCycles) {
        el.tpsValue.textContent = tps.toLocaleString();
        el.tpsBar.style.width   = Math.min((tps / CONFIG.TPS_BAR_MAX) * 100, 100).toFixed(1) + '%';
        
        const h = String(Math.floor(uptimeSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((uptimeSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(uptimeSeconds % 60)).padStart(2, '0');
        el.uptimeDisplay.textContent = `${h}:${m}:${s}`;

        el.cyclesValue.textContent = totalCycles.toLocaleString();
    }

    function setInitialPnL(netPercent, totalInr) {
        const sign = netPercent >= 0 ? '+' : '';
        el.pnlValue.textContent = `${sign}${netPercent.toFixed(4)}%`;
        el.pnlInrValue.textContent = `₹${totalInr.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        peakPnl = netPercent;
        troughPnl = netPercent;
    }

    function flashCycleUpdate(timestamp) {
        el.lastCycleTs.textContent = timestamp;
        clearTimeout(flashDotTimer);
        el.flashDot.style.backgroundColor = 'rgba(255,255,255,0.85)';
        flashDotTimer = setTimeout(() => { el.flashDot.style.backgroundColor = 'rgba(255,255,255,0.1)'; }, 320);
    }

    function updatePnL(cumPct, totalInr) {
        const sign = cumPct >= 0 ? '+' : '';
        el.pnlValue.textContent = `${sign}${cumPct.toFixed(4)}%`;

        el.pnlValue.classList.remove('text-white', 'text-emerald-600', 'text-rose-600');
        el.pnlValue.classList.add(cumPct >= 0 ? 'text-emerald-600' : 'text-rose-600');

        el.pnlInrValue.textContent = `₹${totalInr.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        if (peakPnl === null || cumPct > peakPnl) {
            peakPnl = cumPct;
            const txt = `+${cumPct.toFixed(4)}%`;
            el.peakPnl.textContent   = txt;
            el.chartPeak.textContent = txt;
        }

        if (troughPnl === null || cumPct < troughPnl) {
            troughPnl = cumPct;
            const txt = `${cumPct.toFixed(4)}%`;
            el.maxDrawdown.textContent = txt;
            el.chartDraw.textContent   = txt;
        }
    }

    function prependFeedRow(trade) {
        if (rowCount === 0) {
            el.feedEmpty.style.display = 'none';
        }

        const isProfit  = trade.profitPercent >= 0;
        const profitCls = isProfit ? 'text-emerald-600' : 'text-rose-600';
        const sign      = isProfit ? '+' : '';
        const baseAsset = trade.path.split('->')[0].trim();

        const row = document.createElement('div');
        row.className   = 'row-new grid text-xs border-b border-gray-800/20 px-5 py-2';
        row.style.gridTemplateColumns = '130px 1fr 130px 110px 90px 100px';

        row.innerHTML = `
            <span class="text-gray-500 tabular-nums">${trade.timestamp}</span>
            <span class="text-gray-400 truncate pr-3">${trade.path}</span>
            <span class="text-right text-cyan-500 tabular-nums">${trade.maxCapacity.toFixed(2)} ${baseAsset}</span>
            <span class="text-right text-gray-400 tabular-nums">${trade.multiplier.toFixed(6)}&times;</span>
            <span class="text-right ${profitCls} font-semibold tabular-nums">${sign}${trade.profitPercent.toFixed(4)}%</span>
            <span class="text-right ${profitCls} font-semibold tabular-nums tracking-wider">₹${trade.inrProfit.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        `;

        row.addEventListener('mouseover', () => { row.style.backgroundColor = 'rgba(255,255,255,0.025)'; });
        row.addEventListener('mouseout',  () => { row.style.backgroundColor = ''; });

        el.execFeed.insertBefore(row, el.execFeed.firstChild);
        rowCount++;

        if (rowCount > CONFIG.MAX_FEED_ROWS) {
            el.execFeed.removeChild(el.execFeed.lastChild);
            rowCount = CONFIG.MAX_FEED_ROWS;
        }

        el.feedCount.textContent = `${rowCount} entr${rowCount === 1 ? 'y' : 'ies'}`;
    }

    return { init, updateTPS, setInitialPnL, flashCycleUpdate, updatePnL, prependFeedRow};
})();

const state = {
    netINRVolume  : 1.0,
    netMultiplier : 1.0,
    netProfitINR  : 0.0,
    processedIds  : new Set()
};

function initWebSocket() {
    console.log("[CHRONOS] Attempting connection to Engine...");
    const ws = new WebSocket(CONFIG.WS_URL);

    ws.onopen = () => console.log("[CHRONOS] Locked into HFT Stream.");
    ws.onclose = () => {
        console.warn("[CHRONOS] Stream severed. Reconnecting in 3s...");
        setTimeout(initWebSocket, 3000);
    };

    ws.onmessage = async (event) => {
        const payload = JSON.parse(event.data);

        if (payload.type === 'METRICS_UPDATE') {
            UIManager.updateTPS(payload.data.tps, payload.data.uptimeSeconds, payload.data.totalCycleCount);
        }

        if (payload.type === 'ARBITRAGE_FOUND') {
            const { id, timestamp, path, multiplier, maxCapacity, inrProfit } = payload.data;

            if (state.processedIds.has(id)) return;
            state.processedIds.add(id);

            const date = new Date(timestamp);
            const formattedTime = `${date.toTimeString().slice(0, 8)}.${String(date.getMilliseconds()).padStart(3, '0')}`;

            const profitPercent = (multiplier - 1.0) * 100;
            state.netProfitINR += inrProfit;
            state.netINRVolume += inrProfit / (multiplier - 1.0);

            state.netMultiplier = state.netProfitINR / state.netINRVolume;
            const netPnLPercent = state.netMultiplier * 100;

            UIManager.flashCycleUpdate(formattedTime);
            UIManager.prependFeedRow({ id, timestamp: formattedTime, path, maxCapacity, multiplier, profitPercent, inrProfit });
            ChartManager.addPoint(formattedTime, profitPercent);
            UIManager.updatePnL(netPnLPercent, state.netProfitINR);
        }
    };
}

async function init() {
    UIManager.init();
    ChartManager.init();
    
    try {
        const historyRes = await fetch(CONFIG.HYDRATE_URL);
        const history = await historyRes.json();
        
        const totalsRes = await fetch(CONFIG.TOTALS_URL);
        
        if (totalsRes.ok) {
            const totals = await totalsRes.json();
            state.netINRVolume = totals.totalInrVolume || 1.0;
            state.netProfitINR = totals.totalInrProfit || 0.0;

            state.netMultiplier = state.netProfitINR / state.netINRVolume;
            
            const trueNetPercent = state.netMultiplier * 100;
            UIManager.setInitialPnL(trueNetPercent, state.netProfitINR);
        }

        // Hydrate History Table
        if (history && history.length) {
            history.reverse().forEach((row) => {
                const { id, timestamp, path, multiplier, maxCapacity, inrProfit } = row;
                if (state.processedIds.has(id)) return;
                state.processedIds.add(id);

                const date = new Date(timestamp);
                const formattedTime = `${date.toTimeString().slice(0, 8)}.${String(date.getMilliseconds()).padStart(3, '0')}`;
                const profitPercent = (multiplier - 1.0) * 100;
                state.netProfitINR += inrProfit;
                state.netINRVolume += inrProfit / (multiplier - 1.0);

                UIManager.prependFeedRow({ id, timestamp: formattedTime, path, maxCapacity, multiplier, profitPercent, inrProfit });
                ChartManager.addPoint(formattedTime, profitPercent);
            });
        }
    } catch (e) {
        console.error("Boot sequence hydration failed:", e);
    }
    
    initWebSocket();
}

document.addEventListener('DOMContentLoaded', init);
