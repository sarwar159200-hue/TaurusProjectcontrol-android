(function () {
  const CSS = __TAURUS_CSS__;
  const LOGO = __TAURUS_LOGO__;

  function textOf(element) {
    return element ? element.textContent.trim() : "";
  }

  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function icon(name) {
    const icons = {
      overview: '<svg viewBox="0 0 24 24"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/></svg>',
      progress: '<svg viewBox="0 0 24 24"><path d="M4 18V8m6 10V4m6 14v-7m4 7H2"/></svg>',
      documents: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6M9 16h6"/></svg>',
      schedule: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/></svg>'
    };
    return icons[name];
  }

  function ensureChrome() {
    const root = document.documentElement;
    root.classList.add("taurus-native-v25");
    root.classList.toggle("tv25-dashboard", location.pathname === "/dashboard" || location.pathname === "/dashboard/");

    if (!document.getElementById("taurus-native-v25-style")) {
      const style = document.createElement("style");
      style.id = "taurus-native-v25-style";
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    if (!document.getElementById("taurus-native-header")) {
      const header = document.createElement("header");
      header.id = "taurus-native-header";
      header.innerHTML = '<img src="' + LOGO + '" alt="Taurus">' +
        '<div class="tv25-brand"><strong>Taurus Project Control</strong><span>PROJECT INTELLIGENCE</span></div>' +
        '<button type="button" aria-label="Open menu">☰</button>';
      header.querySelector("button").addEventListener("click", function () {
        root.classList.toggle("sidebar-open");
      });
      document.body.prepend(header);
    }

    if (!document.getElementById("taurus-native-bottom-nav")) {
      const nav = document.createElement("nav");
      nav.id = "taurus-native-bottom-nav";
      const items = [
        ["/dashboard", "Overview", "overview"],
        ["/dashboard/progress", "Progress", "progress"],
        ["/dashboard/document-control", "Documents", "documents"],
        ["/dashboard/schedule", "Schedule", "schedule"]
      ];
      nav.innerHTML = items.map(function (item) {
        return '<a href="' + item[0] + '" data-route="' + item[0] + '">' + icon(item[2]) + '<span>' + item[1] + '</span></a>';
      }).join("");
      document.body.appendChild(nav);
    }

    document.querySelectorAll("#taurus-native-bottom-nav a").forEach(function (link) {
      const route = link.getAttribute("data-route");
      const active = route === "/dashboard" ? location.pathname === route || location.pathname === route + "/" : location.pathname.indexOf(route) === 0;
      link.classList.toggle("active", active);
    });
  }

  function renameMetric(card, label, pattern) {
    if (!card) return;
    const candidates = card.querySelectorAll(".kpi-label,p,small,span,div");
    for (const candidate of candidates) {
      if (candidate.children.length === 0 && pattern.test(textOf(candidate))) {
        setText(candidate, label);
        return;
      }
    }
  }

  function dashboard() {
    if (!(location.pathname === "/dashboard" || location.pathname === "/dashboard/")) return;

    const heading = document.querySelector(".page-heading, .executive-page-header");
    const project = textOf(document.querySelector(".topbar strong")) || textOf(document.querySelector("[class*='project'] strong"));
    if (heading) {
      const title = heading.querySelector("h1");
      const subtitle = heading.querySelector("p");
      setText(title, "Executive Overview");
      if (subtitle && project) setText(subtitle, project);
    }

    const cards = document.querySelectorAll(".executive-metric-grid > *");
    renameMetric(cards[0], "Actual", /actual progress/i);
    renameMetric(cards[1], "Planned", /baseline progress/i);
    renameMetric(cards[3], "SV", /schedule variance/i);

    const curve = document.querySelector(".executive-curve-panel");
    if (curve) {
      const title = curve.querySelector("h2,h3");
      setText(title, "Overall Progress");
    }

    const grid = document.querySelector(".executive-snapshot-main-grid");
    if (grid && !document.getElementById("taurus-native-status")) {
      const status = document.createElement("section");
      status.id = "taurus-native-status";
      grid.insertAdjacentElement("afterend", status);
    }
    const status = document.getElementById("taurus-native-status");
    if (status) {
      const date = textOf(document.querySelector(".date-badge strong")) || "Live project data";
      const spiText = cards[2] ? textOf(cards[2]) : "";
      const match = spiText.match(/\b\d+(?:\.\d+)?\b/);
      const spi = match ? Number(match[0]) : 1;
      const label = spi > 1.01 ? "AHEAD" : spi >= .99 ? "ON TRACK" : spi >= .96 ? "WATCH" : "DELAYED";
      const content = '<div><h3>Project Status</h3><p>Data date: ' + date + '</p></div><b>' + label + '</b>';
      if (status.innerHTML !== content) status.innerHTML = content;
    }
  }

  let scheduled = false;
  function apply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      ensureChrome();
      dashboard();
    });
  }

  apply();
  new MutationObserver(apply).observe(document.documentElement, {childList: true, subtree: true});
  addEventListener("popstate", apply);
})();
