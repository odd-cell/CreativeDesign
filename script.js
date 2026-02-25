const STORAGE_KEYS = {
  courses: "cdlg_courses_v1",
  focusSkill: "cdlg_focus_skill_v1",
  checkins: "cdlg_checkins_v1",
};
const ACCOUNT_LIST_KEY = "cdlg_accounts_v1";
const CURRENT_ACCOUNT_KEY = "cdlg_current_account_v1";

let supabase = null;
const cfg = typeof window !== "undefined" && window.CDLG_SUPABASE;
if (cfg && cfg.url && cfg.anonKey && !cfg.url.includes("YOUR_PROJECT")) {
  supabase = window.supabase?.createClient(cfg.url, cfg.anonKey) || null;
}

function getUserId() {
  if (supabase && window.currentUserId) return window.currentUserId;
  const email = window.currentAccountEmail || "";
  return email || "guest";
}

function storageKey(base) {
  return `${base}__user_${getUserId()}`;
}

function ready(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

ready(() => {
  initAuth((user) => {
    initTabs();
    initCourses();
    initSkills();
    initCheckins();
  });
});

function safeParse(json) {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function initAuth(onAuthReady) {
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
  const deviceNote = document.getElementById("auth-device-note");

  if (deviceNote) {
    deviceNote.textContent = supabase
      ? "Your account and progress sync across devices."
      : "Accounts are stored on this device only. Add Supabase (see README) to sync across devices.";
  }

  function setUserState(user, profileName) {
    window.currentUserId = user?.id || null;
    window.currentAccountEmail = user?.email || "";
    if (displayNameEl) {
      displayNameEl.textContent = profileName || user?.email || "Guest";
    }
    if (trigger) {
      trigger.textContent = user ? "Sign out" : "Sign in / Sign up";
    }
  }

  function applyMode() {
    const isSignin = mode === "signin";
    tabSignin?.classList.toggle("active", isSignin);
    tabSignup?.classList.toggle("active", !isSignin);
    nameGroup.hidden = isSignin;
    pwConfirmGroup.hidden = isSignin;
    if (pwConfirmInput) pwConfirmInput.removeAttribute("required");
    if (nameInput) nameInput.removeAttribute("required");
    if (isSignin) {
      passwordInput.setAttribute("autocomplete", "current-password");
      submitBtn.textContent = "Sign in";
    } else {
      passwordInput.setAttribute("autocomplete", "new-password");
      pwConfirmInput?.setAttribute("required", "");
      submitBtn.textContent = "Sign up";
    }
    title.textContent = isSignin ? "Welcome back" : "Create your account";
    subtitle.textContent = isSignin
      ? "Enter your email and password to continue."
      : "Use email and a password to keep your progress organized.";
    errorEl.textContent = "";
  }

  let mode = "signin";

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

  if (supabase) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      window.currentUserId = user?.id ?? null;
      window.currentAccountEmail = user?.email ?? "";
      if (user && displayNameEl) {
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            displayNameEl.textContent = data?.display_name || user.email || "Guest";
          })
          .catch(() => {
            displayNameEl.textContent = user.email || "Guest";
          });
      } else if (displayNameEl) {
        displayNameEl.textContent = "Guest";
      }
      if (trigger) trigger.textContent = user ? "Sign out" : "Sign in / Sign up";
      onAuthReady(user);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUserState(user, null);
      if (user && displayNameEl) {
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (displayNameEl) displayNameEl.textContent = data?.display_name || user.email || "Guest";
          })
          .catch(() => {});
      }
      onAuthReady(user);
    });
  } else {
    const accounts = safeParse(localStorage.getItem(ACCOUNT_LIST_KEY)) || [];
    const currentEmail = localStorage.getItem(CURRENT_ACCOUNT_KEY) || "";
    const currentAccount = accounts.find(
      (a) => a.email && a.email.toLowerCase() === currentEmail?.toLowerCase()
    ) || null;
    window.currentAccountEmail = currentAccount?.email || "";
    window.currentUserId = null;
    if (displayNameEl) displayNameEl.textContent = currentAccount?.name || "Guest";
    if (trigger) trigger.textContent = currentAccount ? "Sign out" : "Sign in / Sign up";
    onAuthReady(currentAccount ? { email: currentAccount.email } : null);
  }

  if (!trigger || !backdrop || !closeBtn || !form) return;

  trigger.addEventListener("click", () => {
    if (window.currentAccountEmail || window.currentUserId) {
      if (supabase) {
        supabase.auth.signOut().then(() => {
          window.currentUserId = null;
          window.currentAccountEmail = "";
          if (displayNameEl) displayNameEl.textContent = "Guest";
          trigger.textContent = "Sign in / Sign up";
          onAuthReady(null);
        });
      } else {
        localStorage.removeItem(CURRENT_ACCOUNT_KEY);
        window.currentAccountEmail = "";
        window.currentUserId = null;
        if (displayNameEl) displayNameEl.textContent = "Guest";
        trigger.textContent = "Sign in / Sign up";
        onAuthReady(null);
      }
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const name = nameInput.value.trim() || email;

    if (!email || !password) {
      errorEl.textContent = "Email and password are required.";
      return;
    }

    if (supabase) {
      try {
        if (mode === "signin") {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            errorEl.textContent = error.message || "Sign in failed.";
            return;
          }
          const uid = data.user?.id;
          if (uid && displayNameEl) {
            const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", uid).single();
            displayNameEl.textContent = profile?.display_name || data.user?.email || "Guest";
          }
          closeModal();
          onAuthReady(data.user);
        } else {
          if (!pwConfirmInput.value || pwConfirmInput.value !== password) {
            errorEl.textContent = "Passwords do not match.";
            return;
          }
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: name } },
          });
          if (error) {
            errorEl.textContent = error.message || "Sign up failed.";
            return;
          }
          if (data.user && displayNameEl) {
            displayNameEl.textContent = name;
          }
          closeModal();
          onAuthReady(data.user);
        }
      } catch (err) {
        errorEl.textContent = err.message || "Something went wrong.";
      }
      return;
    }

    const stored = safeParse(localStorage.getItem(ACCOUNT_LIST_KEY)) || [];
    if (mode === "signin") {
      const match = stored.find(
        (a) => a.email && a.email.toLowerCase() === email && a.password === password
      );
      if (!match) {
        errorEl.textContent = "No account found. Use Sign up on this device or set up Supabase to sync.";
        return;
      }
      localStorage.setItem(CURRENT_ACCOUNT_KEY, match.email);
      window.currentAccountEmail = match.email;
      if (displayNameEl) displayNameEl.textContent = match.name || match.email;
      trigger.textContent = "Sign out";
      closeModal();
      onAuthReady({ email: match.email });
    } else {
      const existing = stored.find((a) => a.email && a.email.toLowerCase() === email);
      if (existing && existing.password === password) {
        localStorage.setItem(CURRENT_ACCOUNT_KEY, existing.email);
        window.currentAccountEmail = existing.email;
        if (displayNameEl) displayNameEl.textContent = existing.name || existing.email;
        trigger.textContent = "Sign out";
        closeModal();
        onAuthReady({ email: existing.email });
        return;
      }
      if (existing) {
        errorEl.textContent = "An account with that email already exists. Sign in with the correct password.";
        return;
      }
      if (!pwConfirmInput.value || pwConfirmInput.value !== password) {
        errorEl.textContent = "Passwords do not match.";
        return;
      }
      const nextAccounts = [...stored, { email, password, name, createdAt: Date.now() }];
      localStorage.setItem(ACCOUNT_LIST_KEY, JSON.stringify(nextAccounts));
      localStorage.setItem(CURRENT_ACCOUNT_KEY, email);
      window.currentAccountEmail = email;
      if (displayNameEl) displayNameEl.textContent = name;
      trigger.textContent = "Sign out";
      closeModal();
      onAuthReady({ email });
    }
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

function initCourses() {
  const boxes = Array.from(document.querySelectorAll(".course-card .course-checkbox"));
  if (!boxes.length) return;
  const uid = window.currentUserId;

  if (supabase && uid) {
    supabase
      .from("course_progress")
      .select("course_id, completed")
      .eq("user_id", uid)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((row) => {
          map[row.course_id] = row.completed;
        });
        boxes.forEach((box) => {
          const card = box.closest(".course-card");
          const id = card?.dataset.courseId;
          if (!id || !card) return;
          const checked = !!map[id];
          box.checked = checked;
          card.classList.toggle("course-complete", checked);
        });
        updateOverallProgress();
      })
      .catch(() => updateOverallProgress());
  } else {
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

  boxes.forEach((box) => {
    const card = box.closest(".course-card");
    const id = card?.dataset.courseId;
    if (!id) return;
    box.addEventListener("change", async () => {
      const completed = box.checked;
      card.classList.toggle("course-complete", completed);
      if (supabase && uid) {
        await supabase.from("course_progress").upsert(
          { user_id: uid, course_id: id, completed, updated_at: new Date().toISOString() },
          { onConflict: "user_id,course_id" }
        );
      } else {
        const key = storageKey(STORAGE_KEYS.courses);
        const current = safeParse(localStorage.getItem(key)) || {};
        if (completed) current[id] = true;
        else delete current[id];
        localStorage.setItem(key, JSON.stringify(current));
      }
      updateOverallProgress();
    });
  });
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
  const uid = window.currentUserId;

  if (supabase && uid) {
    supabase
      .from("skill_focus")
      .select("skill")
      .eq("user_id", uid)
      .single()
      .then(({ data }) => {
        const skill = data?.skill;
        pills.forEach((pill) => {
          pill.classList.toggle("active", pill.dataset.skill === skill);
        });
      })
      .catch(() => {});
  } else {
    const saved = localStorage.getItem(storageKey(STORAGE_KEYS.focusSkill));
    if (saved) {
      pills.forEach((pill) => {
        if (pill.dataset.skill === saved) pill.classList.add("active");
      });
    }
  }

  pills.forEach((pill) => {
    pill.addEventListener("click", async () => {
      const id = pill.dataset.skill;
      const isActive = pill.classList.contains("active");
      pills.forEach((p) => p.classList.remove("active"));
      if (!isActive) {
        pill.classList.add("active");
        if (supabase && uid) {
          await supabase.from("skill_focus").upsert(
            { user_id: uid, skill: id, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        } else {
          localStorage.setItem(storageKey(STORAGE_KEYS.focusSkill), id);
        }
      } else {
        if (supabase && uid) {
          await supabase.from("skill_focus").upsert(
            { user_id: uid, skill: null, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        } else {
          localStorage.removeItem(storageKey(STORAGE_KEYS.focusSkill));
        }
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
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
  const uid = window.currentUserId;

  function renderAndStreak(checkins) {
    renderCheckins(checkins, list);
    updateStreakSummary(checkins);
  }

  if (supabase && uid) {
    supabase
      .from("checkins")
      .select("date, focus, notes, created_at")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .then(({ data }) => {
        const arr = (data || []).map((r) => ({
          date: r.date,
          focus: r.focus,
          notes: r.notes,
          createdAt: new Date(r.created_at).getTime(),
        }));
        renderAndStreak(arr);
      })
      .catch(() => renderAndStreak([]));
  } else {
    let checkins = safeParse(localStorage.getItem(storageKey(STORAGE_KEYS.checkins))) || [];
    if (!Array.isArray(checkins)) checkins = [];
    renderAndStreak(checkins);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = dateInput?.value;
    const focus = document.getElementById("checkin-focus")?.value;
    const notesField = document.getElementById("checkin-notes");
    const notes = notesField?.value?.trim();
    if (!date || !focus || !notes) return;

    if (supabase && uid) {
      const { error } = await supabase.from("checkins").insert({
        user_id: uid,
        date,
        focus,
        notes,
      });
      if (error) return;
      const { data } = await supabase
        .from("checkins")
        .select("date, focus, notes, created_at")
        .eq("user_id", uid)
        .order("date", { ascending: false });
      const arr = (data || []).map((r) => ({
        date: r.date,
        focus: r.focus,
        notes: r.notes,
        createdAt: new Date(r.created_at).getTime(),
      }));
      renderAndStreak(arr);
    } else {
      const entry = { date, focus, notes, createdAt: Date.now() };
      let checkins = safeParse(localStorage.getItem(storageKey(STORAGE_KEYS.checkins))) || [];
      if (!Array.isArray(checkins)) checkins = [];
      checkins = [...checkins, entry].sort((a, b) => (a.date < b.date ? 1 : -1));
      localStorage.setItem(storageKey(STORAGE_KEYS.checkins), JSON.stringify(checkins));
      renderAndStreak(checkins);
    }
    if (notesField) notesField.value = "";
  });

  clearBtn.addEventListener("click", async () => {
    if (supabase && uid) {
      if (!confirm("Clear all check-ins? This cannot be undone.")) return;
      const { error } = await supabase.from("checkins").delete().eq("user_id", uid);
      if (!error) renderAndStreak([]);
    } else {
      const checkins = safeParse(localStorage.getItem(storageKey(STORAGE_KEYS.checkins))) || [];
      if (!Array.isArray(checkins) || !checkins.length) return;
      if (!confirm("Clear all check-ins?")) return;
      localStorage.removeItem(storageKey(STORAGE_KEYS.checkins));
      renderAndStreak([]);
    }
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
  const map = {
    phase1: "Phase 1 · Foundations",
    phase2: "Phase 2 · Storytelling & game design",
    phase3: "Phase 3 · Technical craft",
    skills: "Skill practice",
    other: "Other",
  };
  return map[value] || "";
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
    streak >= 3 ? "Nice streak—keep showing up." : "You're building a new habit.";
  lastEl.textContent = formatDate(uniqueDates[uniqueDates.length - 1]);
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
    } else if (d < current) break;
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
