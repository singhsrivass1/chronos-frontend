const CONFIG = Object.freeze({
    MAX_CHART_POINTS : 80,
    MAX_FEED_ROWS    : 50,
    TPS_BAR_MAX      : 5000,

    CHART_LINE_COLOR : '#e5e7eb',

    TICK_MS_MIN : 100,
    TICK_MS_MAX : 800,
    ARB_S_MIN   : 2,
    ARB_S_MAX   : 4,

    MOCK_PATHS : [
        'USDT → ETH  → BTC  → USDT',
        'USDT → BNB  → ETH  → USDT',
        'USDT → SOL  → BTC  → USDT',
        'USDT → AVAX → ETH  → USDT',
        'ETH  → BNB  → SOL  → ETH',
        'USDT → MATIC → SOL → ETH → USDT',
        'USDT → BTC  → LTC  → USDT',
        'USDT → DOGE → BTC  → ETH → USDT',
        'USDT → ARB  → ETH  → USDT',
        'BTC  → ETH  → BNB  → BTC',
    ],
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
        el.peakPnl       = document.getElementById('peak-pnl');
        el.maxDrawdown   = document.getElementById('max-drawdown');
        el.chartPeak     = document.getElementById('chart-peak');
        el.chartDraw     = document.getElementById('chart-draw');
        el.uptimeDisplay = document.getElementById('uptime-display');
        el.execFeed      = document.getElementById('execution-feed');
        el.feedEmpty     = document.getElementById('feed-empty');
        el.feedCount     = document.getElementById('feed-count');
    }

    function updateTPS(tps) {
        el.tpsValue.textContent = tps.toLocaleString();
        el.tpsBar.style.width   = Math.min((tps / CONFIG.TPS_BAR_MAX) * 100, 100).toFixed(1) + '%';
    }

    function updateUptime(seconds) {
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(seconds % 60)).padStart(2, '0');
        el.uptimeDisplay.textContent = `${h}:${m}:${s}`;
    }

    function updateCycles(count, timestamp) {
        el.cyclesValue.textContent = count.toLocaleString();
        el.lastCycleTs.textContent = timestamp;

        clearTimeout(flashDotTimer);
        el.flashDot.style.backgroundColor = 'rgba(255,255,255,0.85)';
        flashDotTimer = setTimeout(() => {
            el.flashDot.style.backgroundColor = 'rgba(255,255,255,0.1)';
        }, 320);
    }

    function updatePnL(cumPct) {
        const sign = cumPct >= 0 ? '+' : '';
        el.pnlValue.textContent = `${sign}${cumPct.toFixed(4)}%`;

        el.pnlValue.classList.remove('text-white', 'text-emerald-600', 'text-rose-600');
        el.pnlValue.classList.add(cumPct >= 0 ? 'text-emerald-600' : 'text-rose-600');

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

        const row = document.createElement('div');
        row.className   = 'row-new grid text-xs border-b border-gray-800/20 px-5 py-2';
        row.style.gridTemplateColumns = '148px 1fr 140px 114px';

        row.innerHTML = `
            <span class="text-gray-500 tabular-nums">${trade.timestamp}</span>
            <span class="text-gray-400 truncate pr-3">${trade.path}</span>
            <span class="text-right text-gray-400 tabular-nums">${trade.multiplier.toFixed(6)}&times;</span>
            <span class="text-right ${profitCls} font-semibold tabular-nums">${sign}${trade.profitPercent.toFixed(4)}%</span>
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

    return { init, updateTPS, updateUptime, updateCycles, updatePnL, prependFeedRow };
})();


class ChronosMockEngine {

    constructor(onMessage) {
        this._emit      = onMessage;
        this._tickTimer = null;
        this._arbTimer  = null;
        this._startMs   = Date.now();
        this._seq       = 0;
    }

    start() {
        this._tick();
        this._arb();
    }

    stop() {
        clearTimeout(this._tickTimer);
        clearTimeout(this._arbTimer);
    }

    _tick() {
        const delay = CONFIG.TICK_MS_MIN + Math.random() * (CONFIG.TICK_MS_MAX - CONFIG.TICK_MS_MIN);
        this._tickTimer = setTimeout(() => {
            this._emit({
                type : 'METRICS_UPDATE',
                data : {
                    tps           : Math.floor(800 + Math.random() * 4200),
                    uptimeSeconds : (Date.now() - this._startMs) / 1000,
                },
            });
            this._tick();
        }, delay);
    }

    _arb() {
        const delay = (CONFIG.ARB_S_MIN + Math.random() * (CONFIG.ARB_S_MAX - CONFIG.ARB_S_MIN)) * 1000;
        this._arbTimer = setTimeout(() => {
            const now        = new Date();
            const hms        = now.toTimeString().slice(0, 8);
            const ms         = String(now.getMilliseconds()).padStart(3, '0');
            const multiplier = 1 + (0.0008 + Math.random() * 0.019);
            const profitPct  = parseFloat(((multiplier - 1) * 100).toFixed(4));

            this._emit({
                type : 'ARBITRAGE_FOUND',
                data : {
                    id            : `${Date.now()}${++this._seq}`,
                    timestamp     : `${hms}.${ms}`,
                    path          : CONFIG.MOCK_PATHS[Math.floor(Math.random() * CONFIG.MOCK_PATHS.length)],
                    multiplier,
                    profitPercent : profitPct,
                },
            });
            this._arb();
        }, delay);
    }
}


const state = {
    totalCycles : 0,
    netPnL      : 0,
};

function handleMessage(payload) {
    switch (payload.type) {

        case 'METRICS_UPDATE': {
            const { tps, uptimeSeconds } = payload.data;
            UIManager.updateTPS(tps);
            UIManager.updateUptime(uptimeSeconds);
            break;
        }

        case 'ARBITRAGE_FOUND': {
            const { timestamp, path, multiplier, profitPercent } = payload.data;
            state.totalCycles += 1;
            state.netPnL = parseFloat((state.netPnL + profitPercent).toFixed(6));
            UIManager.updateCycles(state.totalCycles, timestamp);
            UIManager.updatePnL(state.netPnL);
            UIManager.prependFeedRow({ timestamp, path, multiplier, profitPercent });
            ChartManager.addPoint(timestamp, state.netPnL);
            break;
        }

        default:
            console.warn('[CHRONOS] Unknown message type:', payload.type);
    }
}


function init() {
    UIManager.init();
    ChartManager.init();
    const engine = new ChronosMockEngine(handleMessage);
    engine.start();
}

document.addEventListener('DOMContentLoaded', init);