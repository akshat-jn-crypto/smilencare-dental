/* =====================================================================
   Booking data layer
   ---------------------------------------------------------------------
   Exposes one async API used by booking.js, regardless of backend:

     await BookingStore.ready
     BookingStore.mode                         -> "supabase" | "demo"
     await BookingStore.getBooked(dateISO)      -> ["10:00","11:30",...]
     await BookingStore.book(appointment)       -> { ok, error }
     BookingStore.subscribe(cb)                 -> unsubscribe fn

   Backend is chosen automatically:
     - If CLINIC.supabase.url + anonKey are set  -> Supabase (real-time,
       cross-patient slot locking via a UNIQUE(date,time) constraint).
     - Otherwise                                 -> localStorage demo
       (locks per-device only; great for testing without any setup).
   ===================================================================== */

(function () {
  const cfg = window.CLINIC || {};
  const sb = cfg.supabase || {};
  const useSupabase = !!(sb.url && sb.anonKey);

  /* --------------------------- DEMO backend --------------------------- */
  function makeDemoStore() {
    const KEY = "snc_bookings_v1";
    const listeners = new Set();

    function readAll() {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; }
      catch { return []; }
    }
    function writeAll(rows) {
      localStorage.setItem(KEY, JSON.stringify(rows));
    }

    // Sync across tabs of the same browser.
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) listeners.forEach((cb) => cb());
    });

    return {
      mode: "demo",
      ready: Promise.resolve(),

      async getBooked(dateISO) {
        return readAll()
          .filter((r) => r.date === dateISO)
          .map((r) => r.time);
      },

      async book(appt) {
        const rows = readAll();
        const clash = rows.some(
          (r) => r.date === appt.date && r.time === appt.time
        );
        if (clash) {
          return { ok: false, error: "That slot was just taken. Please pick another." };
        }
        rows.push({ ...appt, created_at: new Date().toISOString() });
        writeAll(rows);
        listeners.forEach((cb) => cb());
        return { ok: true };
      },

      subscribe(cb) {
        listeners.add(cb);
        return () => listeners.delete(cb);
      }
    };
  }

  /* ------------------------- Supabase backend ------------------------- */
  function makeSupabaseStore() {
    const listeners = new Set();
    let client = null;

    const ready = (async () => {
      // Load the Supabase JS client from CDN on demand.
      const mod = await import("https://esm.sh/@supabase/supabase-js@2");
      client = mod.createClient(sb.url, sb.anonKey, {
        realtime: { params: { eventsPerSecond: 5 } }
      });

      // Real-time: any change to availability re-renders the slots.
      // We listen to `booked_slots` (date/time only — no patient data).
      client
        .channel("booked-slots-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "booked_slots" },
          () => listeners.forEach((cb) => cb())
        )
        .subscribe();
    })();

    return {
      mode: "supabase",
      ready,

      async getBooked(dateISO) {
        await ready;
        // booked_slots holds only date + time (safe to read publicly).
        const { data, error } = await client
          .from("booked_slots")
          .select("time")
          .eq("date", dateISO);
        if (error) { console.error(error); return []; }
        return (data || []).map((r) => r.time);
      },

      async book(appt) {
        await ready;
        const { error } = await client.from("bookings").insert([appt]);
        if (error) {
          // 23505 = unique_violation -> someone grabbed the slot first.
          if (error.code === "23505") {
            return { ok: false, error: "That slot was just taken. Please pick another." };
          }
          console.error(error);
          return { ok: false, error: "Couldn't save your booking. Please try again or call us." };
        }
        return { ok: true };
      },

      subscribe(cb) {
        listeners.add(cb);
        return () => listeners.delete(cb);
      }
    };
  }

  window.BookingStore = useSupabase ? makeSupabaseStore() : makeDemoStore();
})();
