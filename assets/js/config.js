/* =====================================================================
   Smile'n'Care Dental Clinic — site & booking configuration
   ---------------------------------------------------------------------
   Everything you'll likely want to tweak lives here. No build step.
   ===================================================================== */

window.CLINIC = {
  /* ---- Clinic identity (used by booking confirmations etc.) ---- */
  name: "Smile'n'Care Dental Clinic",
  phone: "9818670489",          // shown to patients
  phoneIntl: "919818670489",    // used for tel:/wa.me links (91 = India)
  email: "sarikatayaljain@yahoo.in",
  facebook: "https://facebook.com/dental.clinic.east.delhi",

  /* ---- Booking engine settings (all configurable) ---- */
  booking: {
    // Working days the clinic accepts appointments.
    // 0 = Sunday, 1 = Monday ... 6 = Saturday.  Open all 7 days.
    workingDays: [0, 1, 2, 3, 4, 5, 6],

    // How many days into the future patients can book.
    daysAhead: 30,

    // Length of each appointment slot, in minutes.
    slotMinutes: 30,

    // Daily sessions. Add/remove/resize freely — slots are generated
    // automatically at `slotMinutes` intervals within each session.
    // 24-hour "HH:MM" strings. `end` is exclusive (last slot starts
    // strictly before `end`).
    sessions: [
      { label: "Morning",  start: "09:00", end: "14:30" },
      { label: "Evening",  start: "17:00", end: "21:00" }
    ],

    // Optional: specific dates to fully block (holidays). "YYYY-MM-DD".
    blockedDates: [
      // "2026-08-15",
    ],

    // Hide slots that start within this many minutes from "now"
    // (so patients can't book a 10:00 slot at 9:58). Set 0 to disable.
    leadTimeMinutes: 60
  },

  /* ---- Supabase (optional) ----------------------------------------
     Leave both blank to run in DEMO mode (bookings saved in the
     visitor's browser only). Paste your Project URL + anon public key
     to enable REAL cross-patient, real-time slot locking.
     See README.md → "Enable real-time booking".
  ------------------------------------------------------------------- */
  supabase: {
    url: "",       // e.g. "https://xxxxxxxx.supabase.co"
    anonKey: ""    // e.g. "eyJhbGciOi..."
  }
};
