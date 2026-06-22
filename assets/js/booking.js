/* =====================================================================
   Booking page controller
   Renders date picker + time slots from CLINIC.booking, reflects live
   availability from BookingStore, and submits appointments.
   ===================================================================== */

(function () {
  const cfg = (window.CLINIC && window.CLINIC.booking) || {};
  const store = window.BookingStore;

  const els = {
    dateStrip: document.getElementById("dateStrip"),
    slots: document.getElementById("slotArea"),
    modePill: document.getElementById("modePill"),
    summary: document.getElementById("selectedSummary"),
    summaryText: document.getElementById("summaryText"),
    form: document.getElementById("bookForm"),
    alert: document.getElementById("formAlert"),
    submit: document.getElementById("submitBtn"),
    fDate: document.getElementById("fDate"),
    fTime: document.getElementById("fTime"),
    fService: document.getElementById("fService"),
    formCard: document.getElementById("formCard"),
    doneCard: document.getElementById("doneCard"),
    doneSummary: document.getElementById("doneSummary")
  };
  if (!els.dateStrip || !store) return;

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  let selectedDate = null;   // "YYYY-MM-DD"
  let selectedTime = null;   // "HH:MM"

  /* ----------------------------- helpers ----------------------------- */
  const pad = (n) => String(n).padStart(2, "0");
  function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function toMinutes(hhmm) { const [h,m] = hhmm.split(":").map(Number); return h*60+m; }
  function fmt12(hhmm) {
    let [h,m] = hhmm.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${pad(m)} ${ap}`;
  }
  function prettyDate(isoStr) {
    const d = new Date(isoStr + "T00:00:00");
    return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Build the list of bookable dates (next N days on working days, minus holidays).
  function buildDates() {
    const out = [];
    const today = new Date(); today.setHours(0,0,0,0);
    const blocked = new Set(cfg.blockedDates || []);
    for (let i = 0; i < (cfg.daysAhead || 30) && out.length < 60; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      if (!(cfg.workingDays || [1,2,3,4,5,6]).includes(d.getDay())) continue;
      if (blocked.has(iso(d))) continue;
      out.push(d);
    }
    return out;
  }

  // Generate slot start times for a session: ["10:00","10:30",...]
  function sessionSlots(session) {
    const out = [];
    const step = cfg.slotMinutes || 30;
    for (let t = toMinutes(session.start); t + step <= toMinutes(session.end); t += step) {
      out.push(`${pad(Math.floor(t/60))}:${pad(t%60)}`);
    }
    return out;
  }

  /* ----------------------------- render ------------------------------ */
  function renderModePill() {
    if (!els.modePill) return;
    if (store.mode === "supabase") {
      els.modePill.className = "mode-pill live";
      els.modePill.innerHTML = '<span class="dot"></span> Live availability';
    } else {
      els.modePill.className = "mode-pill demo";
      els.modePill.innerHTML = '<span class="dot"></span> Demo mode';
      els.modePill.title = "Bookings are stored in this browser only. Add Supabase keys in config.js for real-time, cross-patient locking.";
    }
  }

  function renderDates() {
    const dates = buildDates();
    els.dateStrip.innerHTML = "";
    if (!dates.length) {
      els.dateStrip.innerHTML = '<p class="muted-note">No available days configured. Check working days in config.js.</p>';
      return;
    }
    dates.forEach((d, i) => {
      const isoStr = iso(d);
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "date-chip" + (i === 0 ? " active" : "");
      chip.dataset.date = isoStr;
      chip.innerHTML =
        `<div class="dow">${DOW[d.getDay()]}</div>` +
        `<div class="dnum">${d.getDate()}</div>` +
        `<div class="mon">${MONTHS[d.getMonth()]}</div>`;
      chip.addEventListener("click", () => selectDate(isoStr, chip));
      els.dateStrip.appendChild(chip);
    });
    selectDate(dates[0] ? iso(dates[0]) : null);
  }

  function selectDate(isoStr, chipEl) {
    selectedDate = isoStr;
    selectedTime = null;
    els.dateStrip.querySelectorAll(".date-chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.date === isoStr)
    );
    updateSummary();
    renderSlots();
  }

  async function renderSlots() {
    if (!selectedDate) return;
    els.slots.innerHTML = '<p class="muted-note">Loading available times…</p>';

    let booked = [];
    try { booked = await store.getBooked(selectedDate); }
    catch (e) { console.error(e); }
    const bookedSet = new Set(booked);

    // Lead-time cutoff for today
    const now = new Date();
    const isToday = selectedDate === iso(new Date());
    const cutoff = isToday ? (now.getHours()*60 + now.getMinutes()) + (cfg.leadTimeMinutes || 0) : -1;

    els.slots.innerHTML = "";
    let anyAvailable = false;

    (cfg.sessions || []).forEach((session) => {
      const all = sessionSlots(session);
      if (!all.length) return;

      const block = document.createElement("div");
      block.className = "slots-session";
      block.innerHTML =
        `<h4>${clockIcon()} ${session.label || "Session"} · ${fmt12(session.start)}–${fmt12(session.end)}</h4>`;

      const grid = document.createElement("div");
      grid.className = "slot-grid";

      all.forEach((t) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot";
        btn.textContent = fmt12(t);
        const taken = bookedSet.has(t);
        const past = toMinutes(t) <= cutoff;
        if (taken || past) {
          btn.disabled = true;
          btn.title = taken ? "Already booked" : "Too late to book";
        } else {
          anyAvailable = true;
          btn.classList.toggle("active", t === selectedTime);
          btn.addEventListener("click", () => selectTime(t));
        }
        grid.appendChild(btn);
      });

      block.appendChild(grid);
      els.slots.appendChild(block);
    });

    if (!anyAvailable) {
      els.slots.innerHTML =
        '<div class="empty-slots">' + calIcon() +
        '<p>No open slots for this day.<br>Please choose another date.</p></div>';
    }
  }

  function selectTime(t) {
    selectedTime = t;
    els.slots.querySelectorAll(".slot").forEach((s) =>
      s.classList.toggle("active", !s.disabled && s.textContent === fmt12(t))
    );
    updateSummary();
    // bring the form into view on mobile
    if (window.matchMedia("(max-width: 920px)").matches && els.formCard) {
      els.formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function updateSummary() {
    const ready = selectedDate && selectedTime;
    if (els.summary) els.summary.classList.toggle("show", !!ready);
    if (ready && els.summaryText) {
      els.summaryText.innerHTML =
        `<b>${prettyDate(selectedDate)}</b> at <b>${fmt12(selectedTime)}</b>`;
    }
    if (els.fDate) els.fDate.value = selectedDate || "";
    if (els.fTime) els.fTime.value = selectedTime || "";
  }

  function showAlert(type, msg) {
    if (!els.alert) return;
    els.alert.className = `form-alert show ${type}`;
    els.alert.textContent = msg;
    els.alert.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function clearAlert() { if (els.alert) els.alert.className = "form-alert"; }

  // Build a WhatsApp link to the clinic, pre-filled with the booking details.
  function waBookingUrl(appt) {
    const c = window.CLINIC || {};
    const lines = [
      "Hello " + (c.name || "Smile'n'Care Dental Clinic") + ", I'd like to book a dental appointment:",
      "",
      "Name: " + appt.name,
      "Date: " + prettyDate(appt.date),
      "Time: " + fmt12(appt.time)
    ];
    if (appt.service) lines.push("Service: " + appt.service);
    lines.push("Phone: " + appt.phone);
    if (appt.email) lines.push("Email: " + appt.email);
    if (appt.reason) lines.push("Reason for visit: " + appt.reason);
    lines.push("", "Please confirm my appointment. Thank you!");
    return "https://wa.me/" + (c.phoneIntl || "919818670489") +
           "?text=" + encodeURIComponent(lines.join("\n"));
  }

  /* ----------------------------- submit ------------------------------ */
  if (els.form) {
    els.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert();

      if (!selectedDate || !selectedTime) {
        showAlert("error", "Please pick a date and time slot first.");
        return;
      }

      const data = new FormData(els.form);
      const appt = {
        date: selectedDate,
        time: selectedTime,
        name: (data.get("name") || "").toString().trim(),
        phone: (data.get("phone") || "").toString().trim(),
        email: (data.get("email") || "").toString().trim(),
        service: (data.get("service") || "").toString(),
        reason: (data.get("reason") || "").toString().trim()
      };

      if (!appt.name || !appt.phone || !appt.email) {
        showAlert("error", "Please fill in your name, phone and email.");
        return;
      }
      if (!/^[\d+\-\s()]{8,15}$/.test(appt.phone)) {
        showAlert("error", "Please enter a valid phone number.");
        return;
      }

      // Open the WhatsApp tab NOW (inside the click) so it isn't popup-blocked
      // after the async booking call; we point it at the message on success.
      let waTab = null;
      try { waTab = window.open("", "_blank"); } catch (e) { waTab = null; }

      els.submit.disabled = true;
      const original = els.submit.textContent;
      els.submit.textContent = "Booking…";

      let res;
      try { res = await store.book(appt); }
      catch (err) { console.error(err); res = { ok: false, error: "Something went wrong. Please call us." }; }

      els.submit.disabled = false;
      els.submit.textContent = original;

      if (!res.ok) {
        if (waTab && !waTab.closed) waTab.close();
        showAlert("error", res.error || "Couldn't book that slot.");
        renderSlots(); // refresh in case it was just taken
        return;
      }

      // Show the confirmation, then take the patient to WhatsApp with the
      // appointment details prefilled. New tab if the browser allowed it,
      // otherwise navigate the SAME tab (never popup-blocked; on phones this
      // opens the WhatsApp app directly while the page stays on the card).
      const waUrl = waBookingUrl(appt);
      showDone(appt);
      if (waTab && !waTab.closed) {
        try { waTab.location.href = waUrl; } catch (e) { window.location.href = waUrl; }
      } else {
        window.location.href = waUrl;
      }
    });
  }

  function showDone(appt) {
    if (!els.doneCard || !els.formCard) {
      showAlert("success", "Your appointment request is confirmed. We'll call to confirm.");
      return;
    }
    els.formCard.style.display = "none";
    els.doneSummary.innerHTML =
      row("Name", appt.name) +
      row("Date", prettyDate(appt.date)) +
      row("Time", fmt12(appt.time)) +
      (appt.service ? row("Service", appt.service) : "") +
      row("Phone", appt.phone);
    const waBtn = document.getElementById("doneWhatsApp");
    if (waBtn) waBtn.href = waBookingUrl(appt);
    els.doneCard.style.display = "block";
    els.doneCard.scrollIntoView({ behavior: "smooth", block: "center" });
    function row(k, v) { return `<div class="row"><span>${k}</span><span>${v}</span></div>`; }
  }

  // "Book another" button on the success screen
  const againBtn = document.getElementById("bookAgain");
  if (againBtn) {
    againBtn.addEventListener("click", () => {
      els.form.reset();
      selectedTime = null;
      updateSummary();
      els.doneCard.style.display = "none";
      els.formCard.style.display = "block";
      renderSlots();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ------------------------- tiny inline icons ----------------------- */
  function clockIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'; }
  function calIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>'; }

  /* ----------------------- date scroller arrows ---------------------- */
  const prevBtn = document.getElementById("datesPrev");
  const nextBtn = document.getElementById("datesNext");
  function updateDateNav() {
    if (!prevBtn || !nextBtn) return;
    const el = els.dateStrip;
    const overflow = el.scrollWidth - el.clientWidth;
    if (overflow <= 4) {            // nothing to scroll → hide both
      prevBtn.style.display = nextBtn.style.display = "none";
      return;
    }
    prevBtn.style.display = nextBtn.style.display = "";
    prevBtn.disabled = el.scrollLeft <= 4;
    nextBtn.disabled = el.scrollLeft >= overflow - 4;
  }
  function scrollDates(dir) {
    const step = Math.max(els.dateStrip.clientWidth * 0.8, 200);
    els.dateStrip.scrollBy({ left: dir * step, behavior: "smooth" });
  }
  if (prevBtn) prevBtn.addEventListener("click", () => scrollDates(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => scrollDates(1));
  els.dateStrip.addEventListener("scroll", updateDateNav, { passive: true });
  window.addEventListener("resize", updateDateNav);

  /* ------------------------------ init ------------------------------- */
  renderModePill();
  renderDates();
  updateDateNav();
  setTimeout(updateDateNav, 150);   // after layout/fonts settle
  // Live updates: when anyone books, refresh the current day's slots.
  store.subscribe(() => renderSlots());
  store.ready && store.ready.then(() => { renderModePill(); renderSlots(); });
})();
