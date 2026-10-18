/* CC Voice Picker — James picks Kinetic's voice by ear. 2026-10-17.
 * James: "I want dude gruff dude man guy older voice not a robot kid"
 *
 * System TTS voices vary by phone. This lets James tap through
 * every voice ON HIS DEVICE, hear it, and lock in the one he wants.
 * Choice is saved — Kinetic uses it every time.
 *
 * DOES: list real device voices, preview each, save his pick.
 * DOES NOT: guess. DOES NOT: fake a voice that isn't there.
 */

(function () {
  "use strict";

  var VOICE_KEY = 'cc-kinetic-voice';

  function getSavedVoiceURI() {
    try { return localStorage.getItem(VOICE_KEY) || ''; }
    catch (_) { return ''; }
  }

  function saveVoiceURI(uri) {
    try { localStorage.setItem(VOICE_KEY, uri); } catch (_) {}
  }

  function getVoices() {
    try { return window.speechSynthesis.getVoices() || []; }
    catch (_) { return []; }
  }

  function findVoiceByURI(uri) {
    var voices = getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].voiceURI === uri) return voices[i];
    }
    return null;
  }

  // The voice James picked — used by Kinetic everywhere
  function getKineticVoice() {
    var uri = getSavedVoiceURI();
    if (uri) {
      var v = findVoiceByURI(uri);
      if (v) return v;
    }
    return null; // no pick yet — caller falls back to auto-detect
  }

  function previewVoice(voice) {
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(
        "This is Kinetic, on Cybercrowd Radio. How do I sound?"
      );
      u.voice = voice;
      u.rate = 1.09;
      u.pitch = 0.75; // gruff — James wants older dude, not robot kid
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  function buildUI() {
    var container = document.getElementById('voicePicker');
    if (!container) return;

    function render() {
      var voices = getVoices();
      var savedURI = getSavedVoiceURI();
      container.innerHTML = '';

      if (!voices.length) {
        container.innerHTML = '<p>Loading voices…</p>';
        setTimeout(render, 1000);
        return;
      }

      var title = document.createElement('p');
      title.innerHTML = '<strong>Pick Kinetic\'s voice.</strong> Tap to hear, tap again to lock it in.';
      container.appendChild(title);

      // Sort: likely male/gruff first
      voices.sort(function (a, b) {
        var an = (a.name || '').toLowerCase();
        var bn = (b.name || '').toLowerCase();
        var aScore = /male/.test(an) ? 0 : 1;
        var bScore = /male/.test(bn) ? 0 : 1;
        return aScore - bScore;
      });

      voices.forEach(function (voice) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'display:block;width:100%;margin:6px 0;text-align:left;padding:12px;';
        var isSelected = voice.voiceURI === savedURI;
        btn.innerHTML = (isSelected ? '✓ ' : '') +
          (voice.name || 'Unknown voice') +
          (voice.lang ? ' <span style="opacity:0.6">(' + voice.lang + ')</span>' : '');
        if (isSelected) btn.style.border = '2px solid gold';

        btn.addEventListener('click', function () {
          previewVoice(voice);
          // Second tap on same voice = lock it in
          if (voice.voiceURI === getSavedVoiceURI()) return;
          // First tap previews. Tap the ✓ button to confirm.
          // Simple: single tap previews AND saves after a short delay
          // Actually — tap = preview, double-tap = save. Use detail:
        });

        // Double-tap to save
        btn.addEventListener('dblclick', function () {
          saveVoiceURI(voice.voiceURI);
          render();
        });

        container.appendChild(btn);
      });

      var hint = document.createElement('p');
      hint.style.cssText = 'opacity:0.7;font-size:14px;margin-top:12px;';
      hint.textContent = 'Tap a voice to hear it. Double-tap to lock it in as Kinetic.';
      container.appendChild(hint);

      // Also add a "use this one" button per voice for clarity
      // (double-tap can be finicky on mobile)
    }

    // Add explicit save buttons — clearer than double-tap
    function renderWithSave() {
      render();
      // Add save buttons after render
      var btns = container.querySelectorAll('button');
      btns.forEach(function (btn, idx) {
        var voices = getVoices();
        // Re-sort same way
        voices.sort(function (a, b) {
          var an = (a.name || '').toLowerCase();
          var bn = (b.name || '').toLowerCase();
          return (/male/.test(an) ? 0 : 1) - (/male/.test(bn) ? 0 : 1);
        });
        if (idx < voices.length) {
          var voice = voices[idx];
          var saveBtn = document.createElement('button');
          saveBtn.className = 'btn btn-primary';
          saveBtn.style.cssText = 'margin-left:8px;padding:12px;';
          saveBtn.textContent = 'Use this voice';
          (function (v) {
            saveBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              saveVoiceURI(v.voiceURI);
              previewVoice(v);
              renderWithSave();
            });
          })(voice);
          btn.appendChild(saveBtn);
        }
      });
    }

    // Voices load async — wait for them
    var tries = 0;
    var wait = setInterval(function () {
      tries++;
      if (getVoices().length || tries > 20) {
        clearInterval(wait);
        renderWithSave();
      }
    }, 500);

    try {
      if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = function () { renderWithSave(); };
      }
    } catch (_) {}
  }

  // Gruff defaults James wants: slower, lower pitch
  function gruffDefaults(u) {
    u.rate = 1.05;   // deliberate, older
    u.pitch = 0.7;   // gruff, deep
    var v = getKineticVoice();
    if (v) u.voice = v;
    return u;
  }

  window.CCVoicePicker = {
    buildUI: buildUI,
    getKineticVoice: getKineticVoice,
    gruffDefaults: gruffDefaults,
    previewVoice: previewVoice
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();
