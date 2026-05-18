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

const authView = document.querySelector("#authView");
const calendarView = document.querySelector("#calendarView");
const authForm = document.querySelector("#authForm");
const authMessage = document.querySelector("#authMessage");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const registerButton = document.querySelector("#registerButton");
const logoutButton = document.querySelector("#logoutButton");
const currentUserLabel = document.querySelector("#currentUserLabel");
const calendarMessage = document.querySelector("#calendarMessage");
const monthLabel = document.querySelector("#monthLabel");
const activeCropLabel = document.querySelector("#activeCropLabel");
const calendarGrid = document.querySelector("#calendarGrid");
const planCount = document.querySelector("#planCount");
const prevMonthButton = document.querySelector("#prevMonthButton");
const nextMonthButton = document.querySelector("#nextMonthButton");
const todayButton = document.querySelector("#todayButton");
const printMonthButton = document.querySelector("#printMonthButton");
const cropTabs = [...document.querySelectorAll(".crop-tab")];
const planDialog = document.querySelector("#planDialog");
const planForm = document.querySelector("#planForm");
const dialogDateLabel = document.querySelector("#dialogDateLabel");
const activityFormList = document.querySelector("#activityFormList");
const closeDialogButton = document.querySelector("#closeDialogButton");
const cancelPlanButton = document.querySelector("#cancelPlanButton");
const clearActivitiesButton = document.querySelector("#clearActivitiesButton");

const MAX_ACTIVITIES = 3;
const CROP_NAMES = ["ข้าวโพดฝักอ่อน", "ถั่วแระ", "ถั่วพุ่ม", "ถั่วแขก"];

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat("th-TH", {
  month: "long",
  year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat("th-TH", {
  weekday: "short",
});

let activeUser = null;
let activeCrop = CROP_NAMES[0];
let viewedDate = new Date();
let selectedDateKey = "";
let plansCache = {};
let rawPlanRows = {};

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(left, right) {
  return formatDateKey(left) === formatDateKey(right);
}

function getMonthRange(date) {
  const firstDay = monthStart(date);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);

  return {
    start: formatDateKey(gridStart),
    end: formatDateKey(gridEnd),
  };
}

function normalizeActivityList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_ACTIVITIES)
    .map((activity) => ({
      detail: activity.detail || activity.title || "",
      updatedAt: activity.updatedAt || activity.updated_at || new Date().toISOString(),
    }))
    .filter((activity) => activity.detail);
}

function normalizePlanMap(value) {
  if (!value) return {};

  if (Array.isArray(value)) {
    return {
      [CROP_NAMES[0]]: normalizeActivityList(value),
    };
  }

  if (Array.isArray(value.activities)) {
    return {
      [CROP_NAMES[0]]: normalizeActivityList(value.activities),
    };
  }

  const map = {};
  CROP_NAMES.forEach((cropName) => {
    map[cropName] = normalizeActivityList(value[cropName]);
  });
  return map;
}

function getActiveActivities(dateKey) {
  return plansCache[dateKey] || [];
}

function showAuth(message = "") {
  calendarView.classList.add("hidden");
  authView.classList.remove("hidden");
  authMessage.textContent = message;
  calendarMessage.textContent = "";
  passwordInput.value = "";
  emailInput.focus();
}

function updateCropUi() {
  cropTabs.forEach((button) => {
    const isActive = button.dataset.crop === activeCrop;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  activeCropLabel.textContent = activeCrop;
}

function showCalendar() {
  authView.classList.add("hidden");
  calendarView.classList.remove("hidden");
  currentUserLabel.textContent = activeUser ? `User: ${activeUser.email}` : "";
  calendarMessage.textContent = "";
  updateCropUi();
  renderCalendar();
}

function createActivityCard(activity, activityIndex) {
  const item = document.createElement("div");
  item.className = "activity-chip";

  const order = document.createElement("span");
  order.className = "activity-order";
  order.textContent = activityIndex + 1;

  const detail = document.createElement("span");
  detail.className = "activity-detail-only";
  detail.textContent = activity.detail || "ไม่มีรายละเอียด";

  item.append(order, detail);
  return item;
}

function renderCalendar() {
  const firstDay = monthStart(viewedDate);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  const today = new Date();
  const activeMonth = viewedDate.getMonth();
  const activeYear = viewedDate.getFullYear();
  let monthActivityCount = 0;

  monthLabel.textContent = monthFormatter.format(viewedDate);
  activeCropLabel.textContent = activeCrop;
  calendarGrid.innerHTML = "";

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(cellDate);
    const activities = getActiveActivities(dateKey);
    const isCurrentMonth = cellDate.getMonth() === activeMonth && cellDate.getFullYear() === activeYear;

    if (isCurrentMonth) monthActivityCount += activities.length;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    if (!isCurrentMonth) button.classList.add("outside");
    if (sameDay(cellDate, today)) button.classList.add("today");
    button.dataset.date = dateKey;
    button.setAttribute("aria-label", `แก้ไขรายละเอียดวันที่ ${dateFormatter.format(cellDate)} - ${activeCrop}`);

    const dateHeader = document.createElement("div");
    dateHeader.className = "date-line";

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = cellDate.getDate();
    dateHeader.append(number);

    const weekday = document.createElement("span");
    weekday.className = "day-weekday";
    weekday.textContent = weekdayFormatter.format(cellDate);
    dateHeader.append(weekday);

    if (activities.length) {
      const badge = document.createElement("span");
      badge.className = "activity-count";
      badge.textContent = `${activities.length}/3`;
      dateHeader.append(badge);
    }

    button.append(dateHeader);

    if (activities.length) {
      const preview = document.createElement("div");
      preview.className = "activity-preview";
      activities.forEach((activity, activityIndex) => {
        preview.append(createActivityCard(activity, activityIndex));
      });
      button.append(preview);
    } else {
      const hint = document.createElement("div");
      hint.className = "empty-hint";
      hint.textContent = "+ เพิ่มรายละเอียด";
      button.append(hint);
    }

    calendarGrid.append(button);
  }

  planCount.textContent =
    monthActivityCount === 0 ? "ยังไม่มีรายละเอียดในเดือนนี้" : `${monthActivityCount} รายการในเดือนนี้`;
}

function rebuildActiveCropCache() {
  plansCache = {};
  Object.entries(rawPlanRows).forEach(([dateKey, planMap]) => {
    const activities = normalizeActivityList(planMap[activeCrop]);
    if (activities.length) plansCache[dateKey] = activities;
  });
}

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
  } catch (error) {
    rawPlanRows = {};
    plansCache = {};
    renderCalendar();
    calendarMessage.textContent =
      "โหลดข้อมูลจาก Supabase ไม่สำเร็จ: " +
      error.message +
      " | ถ้ายังไม่ได้รัน SQL ให้เปิดไฟล์ supabase-schema.sql แล้วรันใน Supabase SQL Editor ก่อน";
  }
}

async function upsertActivities(dateKey, activities) {
  const planMap = normalizePlanMap(rawPlanRows[dateKey]);
  planMap[activeCrop] = activities;

  const hasAnyDetail = CROP_NAMES.some((cropName) => normalizeActivityList(planMap[cropName]).length > 0);

  if (hasAnyDetail) {
    const { error } = await supabaseClient.from("monthly_plans").upsert(
      {
        user_id: activeUser.id,
        plan_date: dateKey,
        activities: planMap,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,plan_date" },
    );

    if (error) throw error;
    rawPlanRows[dateKey] = planMap;
  } else {
    const { error } = await supabaseClient
      .from("monthly_plans")
      .delete()
      .eq("user_id", activeUser.id)
      .eq("plan_date", dateKey);
    if (error) throw error;
    delete rawPlanRows[dateKey];
  }

  rebuildActiveCropCache();
}

function renderActivityFields(activities) {
  activityFormList.innerHTML = "";

  for (let index = 0; index < MAX_ACTIVITIES; index += 1) {
    const activity = activities[index] || {};
    const item = document.createElement("section");
    item.className = "activity-editor detail-only-editor";
    item.innerHTML = `
      <div class="activity-editor-heading">
        <span>${index + 1}</span>
        <strong>รายละเอียดที่ ${index + 1}</strong>
      </div>
      <label>
        รายละเอียด
        <textarea class="activity-detail-input" rows="4" placeholder="กรอกรายละเอียดของ ${activeCrop} ในวันนี้"></textarea>
      </label>
    `;

    item.querySelector(".activity-detail-input").value = activity.detail || "";
    activityFormList.append(item);
  }
}

function readActivityFields() {
  return [...activityFormList.querySelectorAll(".activity-editor")]
    .map((item) => ({
      detail: item.querySelector(".activity-detail-input").value.trim(),
      updatedAt: new Date().toISOString(),
    }))
    .filter((activity) => activity.detail);
}

function openPlanDialog(dateKey) {
  selectedDateKey = dateKey;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  dialogDateLabel.textContent = `${dateFormatter.format(date)} - ${activeCrop}`;
  renderActivityFields(getActiveActivities(dateKey));
  clearActivitiesButton.disabled = !getActiveActivities(dateKey).length;
  planDialog.showModal();
  activityFormList.querySelector("textarea").focus();
}

async function handleLogin(event) {
  event.preventDefault();
  authMessage.textContent = "";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value,
  });

  if (error) {
    authMessage.textContent = "เข้าสู่ระบบไม่สำเร็จ: " + error.message;
    return;
  }

  activeUser = data.user;
  showCalendar();
  await loadPlansForViewedMonth();
}

async function handleRegister() {
  authMessage.textContent = "";

  const { data, error } = await supabaseClient.auth.signUp({
    email: emailInput.value.trim(),
    password: passwordInput.value,
  });

  if (error) {
    authMessage.textContent = "สมัครไม่สำเร็จ: " + error.message;
    return;
  }

  if (data.user && !data.session) {
    authMessage.textContent = "สมัครแล้ว กรุณาเช็ก email เพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ";
    return;
  }

  activeUser = data.user;
  showCalendar();
  await loadPlansForViewedMonth();
}

authForm.addEventListener("submit", handleLogin);
registerButton.addEventListener("click", handleRegister);

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  activeUser = null;
  rawPlanRows = {};
  plansCache = {};
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

cropTabs.forEach((button) => {
  button.addEventListener("click", () => {
    activeCrop = button.dataset.crop;
    updateCropUi();
    rebuildActiveCropCache();
    renderCalendar();
  });
});

calendarGrid.addEventListener("click", (event) => {
  const dayCell = event.target.closest(".day-cell");
  if (!dayCell) return;
  openPlanDialog(dayCell.dataset.date);
});

planForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const activities = readActivityFields();

  try {
    await upsertActivities(selectedDateKey, activities);
    planDialog.close();
    renderCalendar();
  } catch (error) {
    alert("บันทึกไม่สำเร็จ: " + error.message);
  }
});

clearActivitiesButton.addEventListener("click", async () => {
  try {
    await upsertActivities(selectedDateKey, []);
    planDialog.close();
    renderCalendar();
  } catch (error) {
    alert("ล้างรายละเอียดไม่สำเร็จ: " + error.message);
  }
});

closeDialogButton.addEventListener("click", () => planDialog.close());
cancelPlanButton.addEventListener("click", () => planDialog.close());

async function initializeApp() {
  updateCropUi();

  if (!isSupabaseConfigured || !supabaseClient) {
    showAuth("กรุณาใส่ Supabase URL และ Anon Key ในไฟล์ config.js ก่อนใช้งาน");
    authForm.querySelectorAll("input, button").forEach((element) => {
      element.disabled = true;
    });
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) {
    showAuth();
    return;
  }

  activeUser = data.session.user;
  showCalendar();
  await loadPlansForViewedMonth();
}

initializeApp();
