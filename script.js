(function () {
  const PAGES = ["login", "home", "submit", "dashboard", "about"];

  // Maps known College UIDs to display names for personalized greetings.
  const STUDENT_NAMES = {
    U2503166: "Judin",
    U2503167: "Julia",
    U2503168: "Juvinet",
    U2503169: "Karthik",
    U2503170: "Kasinath",
    U2503171: "Keith",
  };

  function nameForUid(uid) {
    if (!uid) {
      return "";
    }
    return STUDENT_NAMES[uid.toUpperCase()] || "";
  }

  function greetingLabel(uid) {
    const name = nameForUid(uid);
    return name ? name + " (" + uid + ")" : uid;
  }

  const POINTS = {
    "Mobile Phone": 50,
    Laptop: 100,
    Tablet: 70,
    "Charger / Cable": 10,
    "Keyboard / Mouse": 20,
    "Headphones / Earphones": 15,
    Battery: 30,
    "Other Electronic Item": 10,
  };

  const els = {
    header: document.getElementById("site-header"),
    footer: document.getElementById("site-footer"),
    nav: document.getElementById("primary-nav"),
    navToggle: document.getElementById("nav-toggle"),
    loginForm: document.getElementById("login-form"),
    uidInput: document.getElementById("college-uid"),
    loginError: document.getElementById("login-error"),
    logoutBtn: document.getElementById("logout-btn"),
    homeGreeting: document.getElementById("home-greeting"),
    submitForm: document.getElementById("submit-form"),
    formLayout: document.getElementById("form-layout"),
    item: document.getElementById("ewaste-item"),
    location: document.getElementById("pickup-location"),
    qty: document.getElementById("ewaste-qty"),
    notes: document.getElementById("ewaste-notes"),
    preview: document.getElementById("points-preview"),
    submitError: document.getElementById("submit-error"),
    success: document.getElementById("submit-success"),
    successMessage: document.getElementById("success-message"),
    submitAnother: document.getElementById("submit-another"),
    dashboardUid: document.getElementById("dashboard-uid"),
    motivation: document.getElementById("motivation"),
    emptyState: document.getElementById("empty-state"),
    tableWrap: document.getElementById("history-table-wrap"),
    tableBody: document.querySelector("#history-table tbody"),
    cards: document.getElementById("history-cards"),
  };

  function getCurrentUser() {
    return localStorage.getItem("currentUser");
  }

  // Each student has a private list under submissions_<UID>.
  function storageKey(uid) {
    return "submissions_" + uid;
  }

  function loadSubmissions(uid) {
    try {
      const raw = localStorage.getItem(storageKey(uid));
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveSubmissions(uid, records) {
    localStorage.setItem(storageKey(uid), JSON.stringify(records));
  }

  function pointsFor(item, quantity) {
    const perItem = POINTS[item] || 0;
    return perItem * quantity;
  }

  function parseQuantity(value) {
    const qty = Number(value);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      return null;
    }
    return qty;
  }

  function createId() {
    return "EW-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function summarize(records) {
    const submissions = records.length;
    const items = records.reduce(function (sum, rec) {
      return sum + rec.quantity;
    }, 0);
    const points = records.reduce(function (sum, rec) {
      return sum + rec.points;
    }, 0);
    return { submissions: submissions, items: items, points: points };
  }

  function motivationText(points) {
    if (points <= 0) {
      return "Your sustainable journey starts here.";
    }
    if (points <= 99) {
      return "Good start! Every responsible disposal counts.";
    }
    if (points <= 249) {
      return "Great work! You are making a positive impact.";
    }
    return "Eco Champion! Keep leading by example.";
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  let currentPage = "login";

  function showPage(name) {
    PAGES.forEach(function (id) {
      const page = document.getElementById(id);
      if (page) {
        page.hidden = id !== name;
      }
    });

    const loggedIn = Boolean(getCurrentUser());
    els.header.hidden = !loggedIn;
    els.footer.hidden = !loggedIn;
    closeNav();

    document.querySelectorAll("[data-nav]").forEach(function (link) {
      if (link.tagName === "A") {
        link.classList.toggle("is-active", link.getAttribute("data-nav") === name);
      }
    });

    if (name === "home" || name === "dashboard") {
      refreshStats();
    }
    if (name === "dashboard") {
      renderDashboard();
    }
    if (name === "submit" && currentPage !== "submit") {
      resetSubmitForm();
    }
    currentPage = name;
  }

  function go(name) {
    if (!getCurrentUser() && name !== "login") {
      showPage("login");
      return;
    }
    if (getCurrentUser() && name === "login") {
      showPage("home");
      return;
    }
    showPage(name);
  }

  function refreshStats() {
    const uid = getCurrentUser();
    const stats = summarize(uid ? loadSubmissions(uid) : []);
    document.querySelectorAll("[data-stat]").forEach(function (node) {
      const key = node.getAttribute("data-stat");
      node.textContent = stats[key] ?? 0;
    });

    if (els.homeGreeting) {
      const name = nameForUid(uid);
      els.homeGreeting.textContent = name
        ? "Welcome back, " + name + "! 👋"
        : uid
        ? "Welcome back, " + uid + "! 👋"
        : "";
    }
  }

  function updatePreview() {
    const item = els.item.value;
    const qty = parseQuantity(els.qty.value) || 0;
    const earned = item ? pointsFor(item, qty) : 0;
    els.preview.textContent = "You will earn: " + earned + " Activity Points";
  }

  function renderDashboard() {
    const uid = getCurrentUser();
    const records = loadSubmissions(uid);
    const stats = summarize(records);

    els.dashboardUid.textContent = greetingLabel(uid);
    els.motivation.textContent = motivationText(stats.points);

    const empty = records.length === 0;
    els.emptyState.hidden = !empty;
    els.tableWrap.hidden = empty;
    els.cards.hidden = empty;

    els.tableBody.innerHTML = "";
    els.cards.innerHTML = "";

    if (empty) {
      return;
    }

    records
      .slice()
      .reverse()
      .forEach(function (rec) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          escapeHtml(rec.item) +
          "</td><td>" +
          rec.quantity +
          "</td><td>" +
          escapeHtml(rec.location || "—") +
          "</td><td>" +
          rec.points +
          "</td><td>" +
          escapeHtml(formatDate(rec.date)) +
          '</td><td><span class="status-pill">' +
          escapeHtml(rec.status) +
          "</span></td>";
        els.tableBody.appendChild(tr);

        const card = document.createElement("article");
        card.className = "card history-card";
        card.innerHTML =
          "<h3>" +
          escapeHtml(rec.item) +
          "</h3><dl>" +
          "<dt>Quantity</dt><dd>" +
          rec.quantity +
          "</dd>" +
          "<dt>Pickup Point</dt><dd>" +
          escapeHtml(rec.location || "—") +
          "</dd>" +
          "<dt>Points Earned</dt><dd>" +
          rec.points +
          "</dd>" +
          "<dt>Date</dt><dd>" +
          escapeHtml(formatDate(rec.date)) +
          "</dd>" +
          "<dt>Status</dt><dd><span class=\"status-pill\">" +
          escapeHtml(rec.status) +
          "</span></dd></dl>";
        els.cards.appendChild(card);
      });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setError(node, message) {
    if (!message) {
      node.hidden = true;
      node.textContent = "";
      return;
    }
    node.hidden = false;
    node.textContent = message;
  }

  function closeNav() {
    els.nav.classList.remove("is-open");
    els.navToggle.setAttribute("aria-expanded", "false");
  }

  function resetSubmitForm() {
    els.submitForm.reset();
    els.qty.value = "1";
    els.location.value = "";
    els.success.hidden = true;
    els.submitForm.hidden = false;
    els.formLayout.hidden = false;
    setError(els.submitError, "");
    updatePreview();
  }

  els.loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const uid = els.uidInput.value.trim();
    if (uid.length < 8) {
      setError(els.loginError, "College UID must be at least 8 characters.");
      els.uidInput.focus();
      return;
    }
    setError(els.loginError, "");
    localStorage.setItem("currentUser", uid);
    go("home");
  });

  els.logoutBtn.addEventListener("click", function () {
    // Logout clears the session only; submissions_<UID> stay in localStorage.
    localStorage.removeItem("currentUser");
    els.uidInput.value = "";
    closeNav();
    go("login");
  });

  els.item.addEventListener("change", updatePreview);
  els.qty.addEventListener("input", updatePreview);

  els.submitForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const uid = getCurrentUser();
    const item = els.item.value;
    const location = els.location.value;
    const qty = parseQuantity(els.qty.value);
    const notes = els.notes.value.trim();

    if (!item) {
      setError(els.submitError, "Please select an e-waste item.");
      els.item.focus();
      return;
    }
    if (!location) {
      setError(els.submitError, "Please select a pickup location.");
      els.location.focus();
      return;
    }
    if (qty === null) {
      setError(els.submitError, "Quantity must be a whole number from 1 to 10.");
      els.qty.focus();
      return;
    }

    const earned = pointsFor(item, qty);
    const record = {
      id: createId(),
      uid: uid,
      item: item,
      location: location,
      quantity: qty,
      points: earned,
      notes: notes,
      status: "Verified",
      date: new Date().toISOString(),
    };

    const records = loadSubmissions(uid);
    records.push(record);
    saveSubmissions(uid, records);

    setError(els.submitError, "");
    els.successMessage.textContent =
      "Submission recorded! You earned " + earned + " Activity Points.";
    els.submitForm.hidden = true;
    els.formLayout.hidden = true;
    els.success.hidden = false;
    refreshStats();
  });

  els.submitAnother.addEventListener("click", resetSubmitForm);

  document.addEventListener("click", function (event) {
    const trigger = event.target.closest("[data-nav]");
    if (!trigger) {
      return;
    }
    event.preventDefault();
    go(trigger.getAttribute("data-nav"));
  });

  els.navToggle.addEventListener("click", function () {
    const open = !els.nav.classList.contains("is-open");
    els.nav.classList.toggle("is-open", open);
    els.navToggle.setAttribute("aria-expanded", String(open));
  });

  function start() {
    if (getCurrentUser()) {
      go("home");
    } else {
      go("login");
    }
    updatePreview();
  }

  start();
})();
