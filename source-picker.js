/* Stream Source Picker — choose where the music comes from.
 * Four avenues. One file, one job: let James pick the source.
 * DOES NOT: play audio itself. It tells the player WHERE to pull from.
 */

(function () {
  "use strict";

  const SOURCES = {
    suno: {
      label: "Suno Playlist",
      desc: "Playlist-style, like the Suno share link",
      // Future: connect to Suno playlist URL
    },
    donna: {
      label: "Donna",
      desc: "Direct audio only",
      // Future: Donna direct-audio feed
    },
    facebook: {
      label: "Facebook Audio",
      desc: "Audio only, no video needed",
      // Future: Facebook audio stream
    },
    thisthat: {
      label: "This or That",
      desc: "Pick between two, crowd chooses",
      // Future: A/B stream chooser
    },
    r2: {
      label: "Station Library (R2)",
      desc: "Cybercrowd Radio bucket — default",
    },
  };

  const KEY = "ccr-stream-source";

  const Picker = {
    current: "r2",

    init() {
      try {
        const saved = localStorage.getItem(KEY);
        if (saved && SOURCES[saved]) this.current = saved;
      } catch (_) {}
      this.render();
    },

    set(source) {
      if (!SOURCES[source]) return false;
      this.current = source;
      try { localStorage.setItem(KEY, source); } catch (_) {}
      this.render();
      if (window.CCRadioDJ && typeof window.CCRadioDJ.setSource === "function") {
        window.CCRadioDJ.setSource(source);
      }
      return true;
    },

    get() {
      return this.current;
    },

    list() {
      return Object.keys(SOURCES).map(k => ({ id: k, ...SOURCES[k] }));
    },

    render() {
      const el = document.getElementById("sourcePicker");
      if (!el) return;
      el.innerHTML = this.list().map(s => `
        <button class="source-btn ${s.id === this.current ? 'active' : ''}"
                data-source="${s.id}"
                onclick="CCSourcePicker.set('${s.id}')">
          <strong>${s.label}</strong>
          <span>${s.desc}</span>
        </button>`).join("");
    },
  };

  window.CCSourcePicker = Picker;

  // Auto-init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => Picker.init());
  } else {
    Picker.init();
  }
})();
