const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");
const fromAmount = document.getElementById("fromAmount");
const toAmount = document.getElementById("toAmount");
const fromPrice = document.getElementById("fromPrice");
const toPrice = document.getElementById("toPrice");
const change = document.getElementById("change");
const fromType = document.getElementById("fromType");
const toType = document.getElementById("toType");
const updated = document.getElementById("updated");
const swapButton = document.getElementById("swapButton");
const refreshButton = document.getElementById("refreshButton");

let rates = {
    crypto: {},
    fiat: {}
};

// ==========================================
// 1. ПОЛУЧЕНИЕ КРИПТОВАЛЮТ
// ==========================================

async function fetchCryptoRates() {
    const cryptoMap = {
        "BTC": "BTCUSDT",
        "ETH": "ETHUSDT",
        "BNB": "BNBUSDT",
        "TON": "TONUSDT"
    };

    try {
        const response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
        if (response.ok) {
            const data = await response.json();
            const tickerMap = {};
            data.forEach(item => tickerMap[item.symbol] = item);

            for (const [code, symbol] of Object.entries(cryptoMap)) {
                if (tickerMap[symbol]) {
                    rates.crypto[code] = {
                        price_usd: parseFloat(tickerMap[symbol].lastPrice),
                        change_24h: parseFloat(tickerMap[symbol].priceChangePercent)
                    };
                }
            }
            return true;
        }
    } catch (e) {
        console.warn("Binance fetch failed, fallback to OKX...", e);
    }

    try {
        for (const [code, symbol] of Object.entries(cryptoMap)) {
            const instId = symbol.replace("USDT", "-USDT");
            const res = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`);
            if (res.ok) {
                const json = await res.json();
                if (json.data && json.data[0]) {
                    const item = json.data[0];
                    const open = parseFloat(item.sodUtc0 || item.open24h);
                    const last = parseFloat(item.last);
                    const changePercent = open ? ((last - open) / open) * 100 : 0;
                    rates.crypto[code] = {
                        price_usd: last,
                        change_24h: changePercent
                    };
                }
            }
        }
        return Object.keys(rates.crypto).length > 0;
    } catch (e) {
        console.error("OKX fetch failed:", e);
    }

    return false;
}

// ==========================================
// 2. ПОЛУЧЕНИЕ ФИАТНЫХ КУРСОВ
// ==========================================

async function fetchFiatRates() {
    rates.fiat["UAH"] = 1.0;

    try {
        const response = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json");
        if (response.ok) {
            const data = await response.json();
            data.forEach(item => {
                if (["USD", "EUR", "PLN"].includes(item.cc)) {
                    rates.fiat[item.cc] = parseFloat(item.rate);
                }
            });
            if (rates.fiat["USD"] && rates.fiat["EUR"]) {
                return true;
            }
        }
    } catch (e) {
        console.warn("NBU fetch failed, fallback...", e);
    }

    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        if (response.ok) {
            const data = await response.json();
            const uahRate = data.rates["UAH"] || 41.5;
            rates.fiat["USD"] = uahRate;
            rates.fiat["EUR"] = uahRate / data.rates["EUR"];
            rates.fiat["PLN"] = uahRate / data.rates["PLN"];
            return true;
        }
    } catch (e) {
        console.error("Fiat fallback failed:", e);
    }

    return false;
}

// ==========================================
// 3. ЗАГРУЗКА ВСЕХ КУРСОВ
// ==========================================

async function loadRates() {
    updated.textContent = "Updating...";

    const cryptoSuccess = await fetchCryptoRates();
    const fiatSuccess = await fetchFiatRates();

    if (cryptoSuccess && fiatSuccess) {
        updated.textContent = "Rates updated: " + new Date().toLocaleTimeString();
        calculate();
    } else {
        updated.textContent = "Failed to load rates. Check internet connection.";
    }
}

// ==========================================
// ИНИЦИАЛИЗА КАСТОМНЫХ ДРОПДАУНОВ
// ==========================================

function setupCustomSelect(selectEl) {
    const wrapper = document.createElement("div");
    wrapper.className = "custom-select-wrapper";

    const trigger = document.createElement("div");
    trigger.className = "custom-select-trigger";
    
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "custom-options";

    Array.from(selectEl.options).forEach(opt => {
        const optionEl = document.createElement("div");
        optionEl.className = "custom-option" + (opt.selected ? " selected" : "");
        optionEl.textContent = opt.textContent;
        optionEl.dataset.value = opt.value;

        if (opt.selected) {
            trigger.textContent = opt.textContent;
        }

        optionEl.addEventListener("click", (e) => {
            e.stopPropagation();
            selectEl.value = opt.value;
            trigger.textContent = opt.textContent;

            optionsContainer.querySelectorAll(".custom-option").forEach(el => el.classList.remove("selected"));
            optionEl.classList.add("selected");

            wrapper.classList.remove("open");
            selectEl.dispatchEvent(new Event("change"));
        });

        optionsContainer.appendChild(optionEl);
    });

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".custom-select-wrapper").forEach(w => {
            if (w !== wrapper) w.classList.remove("open");
        });
        wrapper.classList.toggle("open");
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsContainer);
    selectEl.parentNode.insertBefore(wrapper, selectEl);

    selectEl.updateCustomSelect = function() {
        const selectedOpt = selectEl.options[selectEl.selectedIndex];
        trigger.textContent = selectedOpt.textContent;
        optionsContainer.querySelectorAll(".custom-option").forEach(el => {
            el.classList.toggle("selected", el.dataset.value === selectEl.value);
        });
    };
}

setupCustomSelect(fromCurrency);
setupCustomSelect(toCurrency);

document.addEventListener("click", () => {
    document.querySelectorAll(".custom-select-wrapper").forEach(w => w.classList.remove("open"));
});

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

function isCrypto(currency) {
    return ["BTC", "ETH", "BNB", "TON"].includes(currency);
}

function getRateInUAH(currency) {
    if (isCrypto(currency)) {
        if (!rates.crypto[currency]) return null;
        const cryptoPriceUsd = rates.crypto[currency].price_usd;
        const usdUah = rates.fiat["USD"];
        return cryptoPriceUsd * usdUah;
    }
    return rates.fiat[currency];
}

function calculate() {
    const from = fromCurrency.value;
    const to = toCurrency.value;

    let amount = parseFloat(fromAmount.value);
    if (isNaN(amount) || amount < 0) {
        amount = 0;
    }

    const fromRate = getRateInUAH(from);
    const toRate = getRateInUAH(to);

    if (!fromRate || !toRate) {
        toAmount.textContent = "—";
        return;
    }

    const result = (amount * fromRate) / toRate;

    toAmount.textContent = formatNumber(result);
    updateInfo(from, to);
}

function updateInfo(from, to) {
    const fromRate = getRateInUAH(from);
    const toRate = getRateInUAH(to);

    if (fromRate) fromPrice.textContent = `1 ${from} = ${formatNumber(fromRate)} UAH`;
    if (toRate) toPrice.textContent = `1 ${to} = ${formatNumber(toRate)} UAH`;

    if (isCrypto(from) && rates.crypto[from]) {
        const changeValue = rates.crypto[from].change_24h;
        const sign = changeValue >= 0 ? "+" : "";
        change.textContent = `24h: ${sign}${changeValue.toFixed(2)}%`;
    } else {
        change.textContent = "Fiat exchange rate";
    }

    fromType.textContent = isCrypto(from) ? "CRYPTO" : "FIAT";
    toType.textContent = isCrypto(to) ? "CRYPTO" : "FIAT";
}

function formatNumber(number) {
    if (number === 0) return "0";
    if (Math.abs(number) < 0.000001) return number.toExponential(6);
    if (Math.abs(number) < 1) return number.toFixed(6);
    if (Math.abs(number) < 1000) return number.toFixed(2);
    return number.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// ==========================================
// МЯГКИЙ НЕОНОВЫЙ КРУГ ВОКРУГ МЫШКИ (БЫСТРО И ПЛАВНО ИСЧЕЗАЕТ)
// ==========================================

const canvas = document.getElementById("trail-canvas");
const ctx = canvas.getContext("2d");

let mouseX = -1000;
let mouseY = -1000;
let targetX = -1000;
let targetY = -1000;
let opacity = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

window.addEventListener("mousemove", (e) => {
    // Не рисуем прямо поверх инпутов и кнопок
    if (e.target.closest(".currency-box, button, input, .custom-select-wrapper")) {
        opacity = Math.max(0, opacity - 0.1);
        return;
    }

    targetX = e.clientX;
    targetY = e.clientY;
    
    // Если курсор только появился
    if (mouseX < 0) {
        mouseX = targetX;
        mouseY = targetY;
    }
    
    opacity = 1;
});

function animateGlow() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Плавное сглаживание движения
    mouseX += (targetX - mouseX) * 0.25;
    mouseY += (targetY - mouseY) * 0.25;

    // Быстрое затухание (пропадает мгновенно, когда курсор останавливается)
    opacity *= 0.88;

    if (opacity > 0.01) {
        const radius = 120; // Размер мягкого свечения
        
        const gradient = ctx.createRadialGradient(
            mouseX, mouseY, 0,
            mouseX, mouseY, radius
        );

        // Мягкое неоновое фиолетовое свечение без резких краев
        gradient.addColorStop(0, `rgba(168, 85, 247, ${opacity * 0.35})`);
        gradient.addColorStop(0.4, `rgba(168, 85, 247, ${opacity * 0.15})`);
        gradient.addColorStop(1, "rgba(168, 85, 247, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    requestAnimationFrame(animateGlow);
}

animateGlow();

// ==========================================
// СОБЫТИЯ
// ==========================================

fromCurrency.addEventListener("change", calculate);
toCurrency.addEventListener("change", calculate);
fromAmount.addEventListener("input", calculate);

swapButton.addEventListener("click", () => {
    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;

    fromCurrency.updateCustomSelect();
    toCurrency.updateCustomSelect();

    calculate();
});

document.querySelectorAll(".quick-buttons button").forEach(button => {
    button.addEventListener("click", function () {
        fromCurrency.value = this.dataset.from;
        toCurrency.value = this.dataset.to;
        fromAmount.value = 1;

        fromCurrency.updateCustomSelect();
        toCurrency.updateCustomSelect();

        calculate();
    });
});

refreshButton.addEventListener("click", loadRates);

setInterval(loadRates, 60000);

loadRates();