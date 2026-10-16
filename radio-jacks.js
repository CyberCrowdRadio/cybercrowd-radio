/* Radio Jacks — audio input routing for Cybercrowd Radio.
 * Mic, turntable, aux. One file, one job: get audio IN.
 * DOES NOT: encode, stream, or broadcast. That's the next organ.
 * ONLY: capture local inputs and route them to a master output.
 */

(function () {
  "use strict";

  const Jacks = {
    ctx: null,
    master: null,
    inputs: {
      mic: null,        // James's voice
      turntable: null,  // vinyl
      aux: null,        // phone, other
    },
    streams: {},

    /* Init on user gesture (browser autoplay policy) */
    async init() {
      if (this.ctx) return true;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 1.0;
        this.master.connect(this.ctx.destination);
        return true;
      } catch (e) {
        console.error("Jacks init failed:", e);
        return false;
      }
    },

    /* Plug in a jack: 'mic', 'turntable', or 'aux' */
    async plug(jackName) {
      if (!this.ctx) await this.init();
      if (this.inputs[jackName]) return true; // already plugged

      try {
        const constraints = {
          audio: jackName === "mic"
            ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
            : true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const source = this.ctx.createMediaStreamSource(stream);
        const gain = this.ctx.createGain();
        gain.gain.value = 1.0;
        source.connect(gain);
        gain.connect(this.master);

        this.inputs[jackName] = { source, gain };
        this.streams[jackName] = stream;
        return true;
      } catch (e) {
        console.error(`Jack '${jackName}' failed:`, e);
        return false;
      }
    },

    /* Unplug a jack */
    unplug(jackName) {
      const input = this.inputs[jackName];
      if (!input) return;
      try {
        input.source.disconnect();
        input.gain.disconnect();
        if (this.streams[jackName]) {
          this.streams[jackName].getTracks().forEach(t => t.stop());
        }
      } catch (_) {}
      this.inputs[jackName] = null;
      this.streams[jackName] = null;
    },

    /* Set jack volume 0.0 - 1.0 */
    volume(jackName, level) {
      const input = this.inputs[jackName];
      if (input && this.ctx) {
        input.gain.gain.setTargetAtTime(
          Math.max(0, Math.min(1, level)),
          this.ctx.currentTime, 0.01
        );
      }
    },

    /* Mute/unmute a jack */
    mute(jackName, muted) {
      const input = this.inputs[jackName];
      if (input && this.ctx) {
        input.gain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.01);
      }
    },

    /* What's plugged in */
    status() {
      return {
        mic: !!this.inputs.mic,
        turntable: !!this.inputs.turntable,
        aux: !!this.inputs.aux,
      };
    },

    /* Kill everything */
    killAll() {
      ["mic", "turntable", "aux"].forEach(j => this.unplug(j));
    }
  };

  window.CCRadioJacks = Jacks;
})();
