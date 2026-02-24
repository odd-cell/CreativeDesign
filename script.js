const STORAGE_KEYS = {
  courses: "cdlg_courses_v1",
  focusSkill: "cdlg_focus_skill_v1",
  checkins: "cdlg_checkins_v1",
};

const ACCOUNT_LIST_KEY = "cdlg_accounts_v1";
const CURRENT_ACCOUNT_KEY = "cdlg_current_account_v1";

function storageKey(base) {
  const userId = window.currentAccountEmail || "guest";
  return `${base}__user_${userId}`;
}

function ready(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

ready(() => {
  initAuth();
  initTabs();
  initCourses();
  initSkills();
  initCheckins();
});

function initSmoothScroll() {
  document.querySelectorAll("[data-scroll-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-scroll-target");
      const el = target && document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
  if (!tabs.length || !panels.length) return;

  const activate = (name) => {
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.tabPanel === name);
    });
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const initial = tabs[0].dataset.tab;
  activate(initial || "overview");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      if (!name) return;
      activate(name);
    });
  });
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function initAuth() {
  const trigger = document.getElementById("auth-trigger");
  const backdrop = document.getElementById("auth-backdrop");
  const closeBtn = document.getElementById("auth-close");
  const tabSignin = document.getElementById("auth-tab-signin");
  const tabSignup = document.getElementById("auth-tab-signup");
  const title = document.getElementById("auth-title");
  const subtitle = document.getElementById("auth-subtitle");
  const form = document.getElementById("auth-form");
  const emailInput = document.getElementById("auth-email");
  const nameGroup = document.getElementById("auth-name-group");
  const nameInput = document.getElementById("auth-name");
  const passwordInput = document.getElementById("auth-password");
  const pwConfirmGroup = document.getElementById("auth-password-confirm-group");
  const pwConfirmInput = document.getElementById("auth-password-confirm");
  const errorEl = document.getElementById("auth-error");
  const submitBtn = document.getElementById("auth-submit");
  const displayNameEl = document.getElementById("current-user-name");

  const accounts = safeParse(localStorage.getItem(ACCOUNT_LIST_KEY)) || [];
  const currentEmail = localStorage.getItem(CURRENT_ACCOUNT_KEY) || "";
  const currentAccount =
    accounts.find((a) => a.email && a.email.toLowerCase() === currentEmail?.toLowerCase()) ||
    null;

  window.currentAccountEmail = currentAccount?.email || "";
  if (displayNameEl) {
    displayNameEl.textContent = currentAccount?.name || "Guest";
  }

  if (!trigger || !backdrop || !closeBtn || !form) return;

  let mode = "signin";

  const applyMode = () => {
    const isSignin = mode === "signin";
    tabSignin?.classList.toggle("active", isSignin);
    tabSignup?.classList.toggle("active", !isSignin);
    nameGroup.hidden = isSignin;
    pwConfirmGroup.hidden = isSignin;
    title.textContent = isSignin ? "Welcome back" : "Create your account";
    subtitle.textContent = isSignin
      ? "Sign in to keep your progress tied to your email on this device."
      : "Use email and a password to keep your progress organized.";
    submitBtn.textContent = isSignin ? "Sign in" : "Sign up";
    errorEl.textContent = "";
  };

  const openModal = (startMode) => {
    if (startMode) mode = startMode;
    applyMode();
    backdrop.classList.remove("hidden");
    backdrop.setAttribute("aria-hidden", "false");
    emailInput.focus();
  };

  const closeModal = () => {
    backdrop.classList.add("hidden");
    backdrop.setAttribute("aria-hidden", "true");
    form.reset();
    errorEl.textContent = "";
  };

  trigger.addEventListener("click", () => {
    if (window.currentAccountEmail) {
      localStorage.removeItem(CURRENT_ACCOUNT_KEY);
      window.currentAccountEmail = "";
      if (displayNameEl) displayNameEl.textContent = "Guest";
      trigger.textContent = "Sign in / Sign up";
      return;
    }
    openModal("signin");
  });

  closeBtn.addEventListener("click", () => closeModal());
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });

  tabSignin?.addEventListener("click", () => {
    mode = "signin";
    applyMode();
  });
  tabSignup?.addEventListener("click", () => {
    mode = "signup";
    applyMode();
  });

  if (currentAccount) {
    trigger.textContent = "Sign out";
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const name = nameInput.value.trim() || email;

    if (!email || !password) {
      errorEl.textContent = "Email and password are required.";
      return;
    }

    const stored = safeParse(localStorage.getItem(ACCOUNT_LIST_KEY)) || [];

    if (mode === "signin") {
      const match = stored.find(
        (a) => a.email && a.email.toLowerCase() === email && a.password === password
      );
      if (!match) {
        errorEl.textContent = "Could not find that account or password is incorrect.";
        return;
      }
      localStorage.setItem(CURRENT_ACCOUNT_KEY, match.email);
      window.currentAccountEmail = match.email;
      if (displayNameEl) displayNameEl.textContent = match.name || match.email;
      trigger.textContent = "Sign out";
      closeModal();
    } else {
      if (!pwConfirmInput.value || pwConfirmInput.value !== password) {
        errorEl.textContent = "Passwords do not match.";
        return;
      }
      const exists = stored.find((a) => a.email && a.email.toLowerCase() === email);
      if (exists) {
        errorEl.textContent = "An account with that email already exists. Try signing in.";
        return;
      }
      const nextAccounts = [...stored, { email, password, name, createdAt: Date.now() }];
      localStorage.setItem(ACCOUNT_LIST_KEY, JSON.stringify(nextAccounts));
      localStorage.setItem(CURRENT_ACCOUNT_KEY, email);
      window.currentAccountEmail = email;
      if (displayNameEl) displayNameEl.textContent = name;
      trigger.textContent = "Sign out";
      closeModal();
    }
  });
}

function initCourses() {
  const boxes = Array.from(document.querySelectorAll(".course-card .course-checkbox"));
  if (!boxes.length) return;

  boxes.forEach((box) => {
    const card = box.closest(".course-card");
    const id = card?.dataset.courseId;
    if (!id) return;

    box.addEventListener("change", () => {
      const key = storageKey(STORAGE_KEYS.courses);
      const current = safeParse(localStorage.getItem(key)) || {};
      const state = { ...current, [id]: box.checked };
      if (!box.checked) delete state[id];
      localStorage.setItem(key, JSON.stringify(state));
      card.classList.toggle("course-complete", box.checked);
      updateOverallProgress();
    });
  });

  const saved = safeParse(localStorage.getItem(storageKey(STORAGE_KEYS.courses))) || {};
  boxes.forEach((box) => {
    const card = box.closest(".course-card");
    const id = card?.dataset.courseId;
    if (!id || !card) return;
    const checked = !!saved[id];
    box.checked = checked;
    card.classList.toggle("course-complete", checked);
  });

  updateOverallProgress();
}

function updateOverallProgress() {
  const boxes = Array.from(document.querySelectorAll(".course-card .course-checkbox"));
  const total = boxes.length;
  if (!total) return;
  const done = boxes.filter((b) => b.checked).length;
  const percent = Math.round((done / total) * 100);

  const label = document.getElementById("overall-percent");
  const bar = document.getElementById("overall-progress-fill");
  if (label) label.textContent = `${percent}%`;
  if (bar) bar.style.width = `${percent}%`;
}

function initSkills() {
  const pills = Array.from(document.querySelectorAll(".skill-pill"));
  if (!pills.length) return;

  const saved = localStorage.getItem(storageKey(STORAGE_KEYS.focusSkill));
  if (saved) {
    pills.forEach((pill) => {
      if (pill.dataset.skill === saved) pill.classList.add("active");
    });
  }

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const id = pill.dataset.skill;
      const isActive = pill.classList.contains("active");
      pills.forEach((p) => p.classList.remove("active"));

      if (!isActive) {
        pill.classList.add("active");
        localStorage.setItem(storageKey(STORAGE_KEYS.focusSkill), id);
      } else {
        localStorage.removeItem(storageKey(STORAGE_KEYS.focusSkill));
      }
    });
  });
}

function initCheckins() {
  const form = document.getElementById("checkin-form");
  const list = document.getElementById("checkin-list");
  const clearBtn = document.getElementById("clear-checkins");
  if (!form || !list || !clearBtn) return;

  const dateInput = document.getElementById("checkin-date");
  if (dateInput && !dateInput.value) {
    const today = new Date();
    dateInput.value = today.toISOString().slice(0, 10);
  }

  let checkins = safeParse(localStorage.getItem(storageKey(STORAGE_KEYS.checkins))) || [];
  if (!Array.isArray(checkins)) checkins = [];

  renderCheckins(checkins, list);
  updateStreakSummary(checkins);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = dateInput?.value;
    const focus = document.getElementById("checkin-focus")?.value;
    const notesField = document.getElementById("checkin-notes");
    const notes = notesField?.value.trim();

    if (!date || !focus || !notes) return;

    const entry = { date, focus, notes, createdAt: Date.now() };
    checkins = [...checkins, entry].sort((a, b) => (a.date < b.date ? 1 : -1));
    localStorage.setItem(storageKey(STORAGE_KEYS.checkins), JSON.stringify(checkins));

    renderCheckins(checkins, list);
    updateStreakSummary(checkins);
    if (notesField) notesField.value = "";
  });

  clearBtn.addEventListener("click", () => {
    if (!checkins.length) return;
    if (!confirm("Clear all check-ins from this browser?")) return;
    checkins = [];
    localStorage.removeItem(storageKey(STORAGE_KEYS.checkins));
    renderCheckins(checkins, list);
    updateStreakSummary(checkins);
  });
}

function renderCheckins(checkins, listEl) {
  listEl.innerHTML = "";
  if (!checkins.length) {
    const li = document.createElement("li");
    li.textContent = "No check-ins yet. Log your first one to start a streak.";
    li.style.color = "#9ca3af";
    li.style.fontSize = "0.8rem";
    listEl.appendChild(li);
    return;
  }

  checkins.slice(0, 6).forEach((entry) => {
    const li = document.createElement("li");
    li.className = "checkin-item";

    const header = document.createElement("div");
    header.className = "checkin-item-header";

    const dateSpan = document.createElement("span");
    dateSpan.className = "checkin-date";
    dateSpan.textContent = formatDate(entry.date);

    const tag = document.createElement("span");
    tag.className = "checkin-tag";
    tag.textContent = labelForFocus(entry.focus);

    header.appendChild(dateSpan);
    header.appendChild(tag);

    const notes = document.createElement("p");
    notes.className = "checkin-notes";
    notes.textContent = entry.notes;

    li.appendChild(header);
    li.appendChild(notes);
    listEl.appendChild(li);
  });
}

function labelForFocus(value) {
  switch (value) {
    case "phase1":
      return "Phase 1 · Foundations";
    case "phase2":
      return "Phase 2 · Storytelling & game design";
    case "phase3":
      return "Phase 3 · Technical craft";
    case "skills":
      return "Skill practice";
    case "other":
      return "Other";
    default:
      return "";
  }
}

function updateStreakSummary(checkins) {
  const streakEl = document.getElementById("streak-value");
  const captionEl = document.getElementById("streak-caption");
  const lastEl = document.getElementById("last-checkin");
  const totalEl = document.getElementById("total-sessions");
  if (!streakEl || !captionEl || !lastEl || !totalEl) return;

  if (!checkins.length) {
    streakEl.textContent = "0 days";
    captionEl.textContent = "Start logging check-ins to build momentum.";
    lastEl.textContent = "—";
    totalEl.textContent = "0";
    return;
  }

  const uniqueDates = Array.from(new Set(checkins.map((c) => c.date))).sort();
  const streak = calculateStreak(uniqueDates);
  streakEl.textContent = `${streak} day${streak === 1 ? "" : "s"}`;
  captionEl.textContent =
    streak >= 3 ? "Nice streak—keep showing up." : "You’re building a new habit.";

  const latestDate = uniqueDates[uniqueDates.length - 1];
  lastEl.textContent = formatDate(latestDate);
  totalEl.textContent = String(checkins.length);
}

function calculateStreak(sortedDatesAsc) {
  if (!sortedDatesAsc.length) return 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  let streak = 0;
  let current = todayStr;

  for (let i = sortedDatesAsc.length - 1; i >= 0; i -= 1) {
    const d = sortedDatesAsc[i];
    if (d === current) {
      streak += 1;
      current = shiftDate(current, -1);
    } else if (d === shiftDate(current, -1)) {
      streak += 1;
      current = shiftDate(current, -1);
    } else if (d < current) {
      break;
    }
  }

  return streak;
}

function shiftDate(dateStr, deltaDays) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

