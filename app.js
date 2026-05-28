const config = window.MONTHLY_PLAN_CONFIG || {};
const isSupabaseConfigured =
  config.supabaseUrl &&
  config.supabaseAnonKey &&
  !config.supabaseUrl.includes("YOUR_") &&
  !config.supabaseAnonKey.includes("YOUR_");

const supabaseClient =
  isSupabaseConfigured && window.supabase
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null;

// ── DOM refs ──────────────────────────────────────────────────
const authView              = document.querySelector("#authView");
const appView               = document.querySelector("#appView");
const calendarPage          = document.querySelector("#calendarPage");
const dashboardPage         = document.querySelector("#dashboardPage");
const switchCalendarBtn     = document.querySelector("#switchCalendarBtn");
const switchDashboardBtn    = document.querySelector("#switchDashboardBtn");
const authForm              = document.querySelector("#authForm");
const authMessage           = document.querySelector("#authMessage");
const emailInput            = document.querySelector("#emailInput");
const passwordInput         = document.querySelector("#passwordInput");
const registerButton        = document.querySelector("#registerButton");
const logoutButton          = document.querySelector("#logoutButton");
const currentUserLabel      = document.querySelector("#currentUserLabel");
const calendarMessage       = document.querySelector("#calendarMessage");
const monthLabel            = document.querySelector("#monthLabel");
const activeCropLabel       = document.querySelector("#activeCropLabel");
const calendarGrid          = document.querySelector("#calendarGrid");
const planCount             = document.querySelector("#planCount");
const prevMonthButton       = document.querySelector("#prevMonthButton");
const nextMonthButton       = document.querySelector("#nextMonthButton");
const todayButton           = document.querySelector("#todayButton");
const printMonthButton      = document.querySelector("#printMonthButton");
const cropTabs              = [...document.querySelectorAll(".crop-tab")];
const planDialog            = document.querySelector("#planDialog");
const planForm              = document.querySelector("#planForm");
const dialogDateLabel       = document.querySelector("#dialogDateLabel");
const dialogCropName        = document.querySelector("#dialogCropName");
const kgInput               = document.querySelector("#kgInput");
const closeDialogButton     = document.querySelector("#closeDialogButton");
const cancelPlanButton      = document.querySelector("#cancelPlanButton");
const clearActivitiesButton = document.querySelector("#clearActivitiesButton");
// dashboard
const dashSummaryCards      = document.querySelector("#dashSummaryCards");
const dashTableBody         = document.querySelector("#dashTableBody");
const dashTableFoot         = document.querySelector("#dashTableFoot");
const dashboardMonthLabel   = document.querySelector("#dashboardMonthLabel");

// ── Constants ──────────────────────────────────────────────────
const CROP_NAMES = ["ข้าวโพดฝักอ่อน", "ถั่วแระ", "ถั่วพุ่ม", "ถั่วแขก"];

const CROP_THEME_MAP = {
  "ข้าวโพดฝักอ่อน": "corn",
  "ถั่วแระ":         "edamame",
  "ถั่วพุ่ม":        "bush",
  "ถั่วแขก":         "longbean",
};

const CROP_COLORS = {
  "ข้าวโพดฝักอ่อน": { bar: "#c8901a", pale: "#fef3dc" },
  "ถั่วแระ":         { bar: "#2a9a40", pale: "#edfaf0" },
  "ถั่วพุ่ม":        { bar: "#6ab000", pale: "#f4fae0" },
  "ถั่วแขก":         { bar: "#0080b8", pale: "#e8f4fc" },
};

function setCropTheme(cropName) {
  document.documentElement.dataset.crop = CROP_THEME_MAP[cropName] || "corn";
}

// ── Formatters ────────────────────────────────────────────────
const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric", month: "long", year: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat("th-TH", {
  month: "long", year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat("th-TH", { weekday: "short" });
const shortDateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric", month: "short",
});

// ── State ────────────────────────────────────────────────────
let activeUser       = null;
let activeCrop       = CROP_NAMES[0];
let viewedDate       = new Date();
let selectedDateKey  = "";
let plansCache       = {};   // dateKey → kg (number) for activeCrop
let rawPlanRows      = {};   // dateKey → { cropName: kg }
let dashChartInstance = null;

// ── Helpers ───────────────────────────────────────────────────
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(a, b) {
  return formatDateKey(a) === formatDateKey(b);
}

function getMonthRange(date) {
  const firstDay  = monthStart(date);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);
  return { start: formatDateKey(gridStart), end: formatDateKey(gridEnd) };
}

// ── Data normalization ────────────────────────────────────────
// stored format: { "ข้าวโพดฝักอ่อน": 12.5, "ถั่วแระ": 0, ... }
function normalizePlanMap(value) {
  if (!value) return {};
  const map = {};
  CROP_NAMES.forEach((c) => {
    const v = value[c];
    map[c] = typeof v === "number" ? v : (parseFloat(v) || 0);
  });
  return map;
}

function getActiveKg(dateKey) {
  return plansCache[dateKey] ?? null;
}

// ── UI: Auth ─────────────────────────────────────────────────
function showAuth(message = "") {
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
  authMessage.textContent = message;
  calendarMessage.textContent = "";
  passwordInput.value = "";
  emailInput.focus();
}

// ── UI: Page switching ────────────────────────────────────────
let activePage = "calendar"; // "calendar" | "dashboard"

function showPage(page) {
  activePage = page;
  const isCalendar = page === "calendar";
  calendarPage.classList.toggle("hidden", !isCalendar);
  dashboardPage.classList.toggle("hidden", isCalendar);
  switchCalendarBtn.classList.toggle("active", isCalendar);
  switchDashboardBtn.classList.toggle("active", !isCalendar);
  if (!isCalendar) renderDashboard();
}

switchCalendarBtn.addEventListener("click",  () => showPage("calendar"));
switchDashboardBtn.addEventListener("click", () => showPage("dashboard"));

// ── UI: Crop tabs ─────────────────────────────────────────────
function updateCropUi() {
  cropTabs.forEach((btn) => {
    const isActive = btn.dataset.crop === activeCrop;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
  activeCropLabel.textContent = activeCrop;
  setCropTheme(activeCrop);
}

// ── UI: Calendar ──────────────────────────────────────────────
function renderCalendar() {
  const firstDay    = monthStart(viewedDate);
  const gridStart   = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  const today       = new Date();
  const activeMonth = viewedDate.getMonth();
  const activeYear  = viewedDate.getFullYear();
  let totalKg       = 0;
  let dayCount      = 0;

  monthLabel.textContent = monthFormatter.format(viewedDate);
  activeCropLabel.textContent = activeCrop;
  calendarGrid.innerHTML = "";

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const dateKey  = formatDateKey(cellDate);
    const kg       = getActiveKg(dateKey);
    const isCurMon = cellDate.getMonth() === activeMonth && cellDate.getFullYear() === activeYear;

    if (isCurMon && kg !== null && kg > 0) { totalKg += kg; dayCount++; }

    const btn = document.createElement("div");
    btn.className = "day-cell";
    if (!isCurMon) btn.classList.add("outside");
    if (sameDay(cellDate, today)) btn.classList.add("today");
    btn.dataset.date = dateKey;
    btn.setAttribute("role", "button");
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("aria-label", `บันทึกผลผลิตวันที่ ${dateFormatter.format(cellDate)} - ${activeCrop}`);

    // date line
    const dateLine = document.createElement("div");
    dateLine.className = "date-line";
    const num = document.createElement("span");
    num.className   = "day-number";
    num.textContent = cellDate.getDate();
    dateLine.append(num);
    const wd = document.createElement("span");
    wd.className   = "day-weekday";
    wd.textContent = weekdayFormatter.format(cellDate);
    dateLine.append(wd);
    btn.append(dateLine);

    // kg display
    if (kg !== null && kg > 0) {
      const kgBlock = document.createElement("div");
      kgBlock.className = "kg-display";
      kgBlock.innerHTML = `<span class="kg-value">${kg.toLocaleString("th-TH", { maximumFractionDigits: 2 })}</span><span class="kg-label-sm">กิโลกรัม</span>`;
      btn.append(kgBlock);
    } else {
      const hint = document.createElement("div");
      hint.className   = "empty-hint";
      hint.textContent = "+ บันทึกน้ำหนัก";
      btn.append(hint);
    }

    calendarGrid.append(btn);
  }

  planCount.textContent = totalKg === 0
    ? "ยังไม่มีข้อมูลในเดือนนี้"
    : `รวม ${totalKg.toLocaleString("th-TH", { maximumFractionDigits: 2 })} กก. (${dayCount} วัน)`;
}

// ── Cache rebuild ─────────────────────────────────────────────
function rebuildActiveCropCache() {
  plansCache = {};
  Object.entries(rawPlanRows).forEach(([dateKey, planMap]) => {
    const kg = planMap[activeCrop] ?? 0;
    if (kg > 0) plansCache[dateKey] = kg;
  });
}

// ── Data loading ──────────────────────────────────────────────
async function loadPlansForViewedMonth() {
  if (!activeUser) return;
  const { start, end } = getMonthRange(viewedDate);
  calendarMessage.textContent = "";

  try {
    const { data, error } = await supabaseClient
      .from("monthly_plans")
      .select("plan_date, activities")
      .gte("plan_date", start)
      .lte("plan_date", end);

    if (error) throw error;

    rawPlanRows = {};
    (data || []).forEach((row) => {
      rawPlanRows[row.plan_date] = normalizePlanMap(row.activities);
    });
    rebuildActiveCropCache();
    renderCalendar();
    renderDashboard();
  } catch (err) {
    rawPlanRows = {};
    plansCache  = {};
    renderCalendar();
    renderDashboard();
    calendarMessage.textContent =
      "โหลดข้อมูลไม่สำเร็จ: " + err.message;
  }
}

// ── Upsert (save kg) ──────────────────────────────────────────
async function upsertKg(dateKey, kg) {
  const planMap = normalizePlanMap(rawPlanRows[dateKey]);
  planMap[activeCrop] = kg;

  const hasAny = CROP_NAMES.some((c) => (planMap[c] || 0) > 0);

  if (hasAny) {
    const { error } = await supabaseClient.from("monthly_plans").upsert(
      { user_id: activeUser.id, plan_date: dateKey, activities: planMap, updated_at: new Date().toISOString() },
      { onConflict: "user_id,plan_date" },
    );
    if (error) throw error;
    rawPlanRows[dateKey] = planMap;
  } else {
    const { error } = await supabaseClient.from("monthly_plans").delete()
      .eq("user_id", activeUser.id).eq("plan_date", dateKey);
    if (error) throw error;
    delete rawPlanRows[dateKey];
  }

  rebuildActiveCropCache();
}

// ── Dialog ────────────────────────────────────────────────────
function openPlanDialog(dateKey) {
  selectedDateKey     = dateKey;
  const [y, m, d]     = dateKey.split("-").map(Number);
  const date          = new Date(y, m - 1, d);
  dialogDateLabel.textContent = dateFormatter.format(date);
  dialogCropName.textContent  = activeCrop;
  const cur = rawPlanRows[dateKey]?.[activeCrop] || 0;
  kgInput.value = cur > 0 ? cur : "";
  clearActivitiesButton.disabled = !cur;
  planDialog.showModal();
  kgInput.focus();
}

// ── Dashboard ─────────────────────────────────────────────────
function getMonthDays() {
  const y = viewedDate.getFullYear();
  const m = viewedDate.getMonth();
  const days = [];
  const d = new Date(y, m, 1);
  while (d.getMonth() === m) {
    days.push(formatDateKey(new Date(d)));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function renderDashboard() {
  const days = getMonthDays();
  dashboardMonthLabel.textContent = monthFormatter.format(viewedDate);

  // totals per crop
  const totals = {};
  CROP_NAMES.forEach((c) => { totals[c] = 0; });
  days.forEach((dk) => {
    const row = rawPlanRows[dk];
    if (!row) return;
    CROP_NAMES.forEach((c) => { totals[c] += row[c] || 0; });
  });
  const grandTotal = CROP_NAMES.reduce((s, c) => s + totals[c], 0);

  // ── Summary cards ──
  dashSummaryCards.innerHTML = "";
  const allCard = document.createElement("div");
  allCard.className = "dash-card dash-card-total";
  allCard.innerHTML = `
    <div class="dash-card-icon">🌾</div>
    <div class="dash-card-body">
      <div class="dash-card-label">รวมทั้งหมด</div>
      <div class="dash-card-value">${grandTotal.toLocaleString("th-TH", { maximumFractionDigits: 2 })}</div>
      <div class="dash-card-unit">กิโลกรัม</div>
    </div>`;
  dashSummaryCards.append(allCard);

  CROP_NAMES.forEach((c) => {
    const col = CROP_COLORS[c];
    const pct = grandTotal > 0 ? ((totals[c] / grandTotal) * 100).toFixed(1) : 0;
    const card = document.createElement("div");
    card.className = "dash-card";
    card.style.setProperty("--card-color", col.bar);
    card.style.setProperty("--card-pale",  col.pale);
    card.innerHTML = `
      <div class="dash-card-body">
        <div class="dash-card-label">${c}</div>
        <div class="dash-card-value" style="color:${col.bar}">${totals[c].toLocaleString("th-TH", { maximumFractionDigits: 2 })}</div>
        <div class="dash-card-unit">กก. <span class="dash-card-pct">(${pct}%)</span></div>
        <div class="dash-card-bar"><div class="dash-card-bar-fill" style="width:${pct}%;background:${col.bar}"></div></div>
      </div>`;
    dashSummaryCards.append(card);
  });

  // ── Chart ──
  const ctx = document.getElementById("dashChart").getContext("2d");
  if (dashChartInstance) dashChartInstance.destroy();

  dashChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: CROP_NAMES,
      datasets: [{
        label: "กิโลกรัม",
        data: CROP_NAMES.map((c) => totals[c]),
        backgroundColor: CROP_NAMES.map((c) => CROP_COLORS[c].bar + "cc"),
        borderColor:     CROP_NAMES.map((c) => CROP_COLORS[c].bar),
        borderWidth: 2,
        borderRadius: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y.toLocaleString("th-TH", { maximumFractionDigits: 2 })} กก.`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(0,0,0,0.06)" },
          ticks: { callback: (v) => v.toLocaleString("th-TH") + " กก." },
        },
        x: { grid: { display: false } },
      },
    },
  });

  // ── Table ──
  dashTableBody.innerHTML = "";
  dashTableFoot.innerHTML = "";

  // rows with any data
  const activeDays = days.filter((dk) => {
    const row = rawPlanRows[dk];
    return row && CROP_NAMES.some((c) => (row[c] || 0) > 0);
  });

  if (activeDays.length === 0) {
    dashTableBody.innerHTML = `<tr><td colspan="6" class="dash-empty">ยังไม่มีข้อมูลในเดือนนี้</td></tr>`;
  } else {
    activeDays.forEach((dk) => {
      const row  = rawPlanRows[dk] || {};
      const rowTotal = CROP_NAMES.reduce((s, c) => s + (row[c] || 0), 0);
      const [y, m, d] = dk.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${shortDateFormatter.format(dateObj)}</td>
        ${CROP_NAMES.map((c) => `<td class="num-cell">${row[c] > 0 ? row[c].toLocaleString("th-TH", { maximumFractionDigits: 2 }) : "-"}</td>`).join("")}
        <td class="num-cell total-cell">${rowTotal.toLocaleString("th-TH", { maximumFractionDigits: 2 })}</td>`;
      dashTableBody.append(tr);
    });
  }

  // footer totals
  const tfRow = document.createElement("tr");
  tfRow.innerHTML = `
    <td><strong>รวมเดือน</strong></td>
    ${CROP_NAMES.map((c) => `<td class="num-cell"><strong>${totals[c].toLocaleString("th-TH", { maximumFractionDigits: 2 })}</strong></td>`).join("")}
    <td class="num-cell total-cell"><strong>${grandTotal.toLocaleString("th-TH", { maximumFractionDigits: 2 })}</strong></td>`;
  dashTableFoot.append(tfRow);
}

// ── Show calendar ──────────────────────────────────────────────
function showCalendar() {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  currentUserLabel.textContent = activeUser ? `User: ${activeUser.email}` : "";
  calendarMessage.textContent  = "";
  showPage("calendar");
  updateCropUi();
  renderCalendar();
}

// ── Auth ──────────────────────────────────────────────────────
async function handleLogin(event) {
  event.preventDefault();
  authMessage.textContent = "";
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput.value.trim(), password: passwordInput.value,
  });
  if (error) { authMessage.textContent = "เข้าสู่ระบบไม่สำเร็จ: " + error.message; return; }
  activeUser = data.user;
  showCalendar();
  await loadPlansForViewedMonth();
}

async function handleRegister() {
  authMessage.textContent = "";
  const { data, error } = await supabaseClient.auth.signUp({
    email: emailInput.value.trim(), password: passwordInput.value,
  });
  if (error) { authMessage.textContent = "สมัครไม่สำเร็จ: " + error.message; return; }
  if (data.user && !data.session) {
    authMessage.textContent = "สมัครแล้ว กรุณาเช็ก email เพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ";
    return;
  }
  activeUser = data.user;
  showCalendar();
  await loadPlansForViewedMonth();
}

// ── Event listeners ───────────────────────────────────────────
authForm.addEventListener("submit", handleLogin);
registerButton.addEventListener("click", handleRegister);

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  activeUser = null; rawPlanRows = {}; plansCache = {};
  showAuth("ออกจากระบบแล้ว");
});

prevMonthButton.addEventListener("click", async () => {
  viewedDate = new Date(viewedDate.getFullYear(), viewedDate.getMonth() - 1, 1);
  await loadPlansForViewedMonth();
});

nextMonthButton.addEventListener("click", async () => {
  viewedDate = new Date(viewedDate.getFullYear(), viewedDate.getMonth() + 1, 1);
  await loadPlansForViewedMonth();
});

todayButton.addEventListener("click", async () => {
  viewedDate = new Date();
  await loadPlansForViewedMonth();
});

printMonthButton.addEventListener("click", () => {
  document.title = `Monthly Plan - ${activeCrop} - ${monthLabel.textContent}`;
  window.print();
});

cropTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    activeCrop = btn.dataset.crop;
    updateCropUi();
    rebuildActiveCropCache();
    renderCalendar();
    // dashboard already shows all crops — no re-render needed
  });
});

calendarGrid.addEventListener("click", (e) => {
  const cell = e.target.closest(".day-cell");
  if (!cell) return;
  openPlanDialog(cell.dataset.date);
});

calendarGrid.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const cell = e.target.closest(".day-cell");
  if (!cell) return;
  e.preventDefault();
  openPlanDialog(cell.dataset.date);
});

planForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const kg = parseFloat(kgInput.value) || 0;
  try {
    await upsertKg(selectedDateKey, kg);
    planDialog.close();
    renderCalendar();
    renderDashboard();
  } catch (err) {
    alert("บันทึกไม่สำเร็จ: " + err.message);
  }
});

clearActivitiesButton.addEventListener("click", async () => {
  try {
    await upsertKg(selectedDateKey, 0);
    planDialog.close();
    renderCalendar();
    renderDashboard();
  } catch (err) {
    alert("ล้างข้อมูลไม่สำเร็จ: " + err.message);
  }
});

closeDialogButton.addEventListener("click",  () => planDialog.close());
cancelPlanButton.addEventListener("click",   () => planDialog.close());

// ── Init ──────────────────────────────────────────────────────
async function initializeApp() {
  updateCropUi();

  if (!isSupabaseConfigured || !supabaseClient) {
    showAuth("กรุณาใส่ Supabase URL และ Anon Key ในไฟล์ config.js ก่อนใช้งาน");
    authForm.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) { showAuth(); return; }

  activeUser = data.session.user;
  showCalendar();
  await loadPlansForViewedMonth();
}

initializeApp();
