/* CC Weather — real zip-code weather. 2026-10-17.
 * James: "People want to enter their zip code"
 *
 * Account forecasts: Authority -> National Weather Service hourly forecast.
 * Manual lookup retains the existing providers:
 * - zippopotam.us: zip → lat/lon (US)
 * - open-meteo.com: lat/lon → current weather
 *
 * DOES: real weather for the signed-in account ZIP or a manually entered ZIP.
 * Account ZIP is retrieved through Authority and kept in memory only.
 * DOES NOT: fake generic text.
 */

(function () {
  "use strict";

  var ZIP_KEY = 'cc-zip';
  var selectedZip = '';
  var accountRequest = 0;
  var weatherRequest = 0;
  var accountReport = null;
  var accountReportToken = '';
  var accountWeatherActive = false;

  function session() {
    try { return localStorage.getItem('ccr-session') || ''; }
    catch (_) { return ''; }
  }

  function getZip() {
    if (selectedZip) return selectedZip;
    try {
      var zip = localStorage.getItem(ZIP_KEY) || '';
      return /^\d{5}$/.test(zip) ? zip : '';
    }
    catch (_) { return ''; }
  }

  function setZip(zip) {
    selectedZip = zip;
    try { localStorage.setItem(ZIP_KEY, zip); } catch (_) {}
  }

  // Retrieve only this signed-in listener's account ZIP; keep it in memory.
  // It is never added to presence, chat, or the broadcast.
  async function loadAccountWeather() {
    if (!document.getElementById('weather')) return;
    accountWeatherActive = true;
    var id = ++accountRequest;
    var token = session();
    selectedZip = '';
    accountReport = null;
    weatherRequest++;
    var input = document.getElementById('zipInput');
    var status = document.getElementById('weatherStatus');
    ['weatherTemp', 'weatherDesc', 'weatherReport', 'weatherSource'].forEach(function (name) {
      var el = document.getElementById(name);
      if (el) el.textContent = name === 'weatherTemp' ? '--' : '';
    });
    if (!token) return;
    if (!window.CCAuthority) {
      if (status) status.textContent = 'Sign in to load your account ZIP, or enter a ZIP below.';
      return;
    }
    if (status) status.textContent = 'Loading your account weather…';
    var result;
    try { result = await window.CCAuthority.ask('/api/session', { session: token }); }
    catch (_) { result = null; }
    if (id !== accountRequest || token !== session()) return;
    var zip = result && typeof result.zip === 'string' ? result.zip.trim() : '';
    if (!result || result.success !== true || !result.stageName || !/^\d{5}$/.test(zip)) {
      if (status) status.textContent = 'Account ZIP unavailable. Enter a five-digit ZIP below.';
      return;
    }
    selectedZip = zip;
    if (input) input.value = zip;
    var reportResult;
    try { reportResult = await window.CCAuthority.ask('/api/weather', { session: token }); }
    catch (_) { reportResult = null; }
    if (id !== accountRequest || token !== session()) return;
    var report = reportResult && reportResult.report;
    if (!reportResult || reportResult.success !== true || !report || report.kind !== 'hourly-forecast' ||
        !Number.isFinite(report.temperature) || report.temperatureUnit !== 'F' ||
        !(Date.parse(report.validFrom) <= Date.now() && Date.now() < Date.parse(report.validUntil))) {
      if (status) status.textContent = 'Your local forecast is temporarily unavailable. Try again shortly.';
      return;
    }
    accountReport = report;
    accountReportToken = token;
    var temp = document.getElementById('weatherTemp');
    var desc = document.getElementById('weatherDesc');
    var script = document.getElementById('weatherReport');
    var source = document.getElementById('weatherSource');
    if (temp) temp.textContent = report.temperature + '°F';
    if (desc) desc.textContent = report.shortForecast + ' near ' + report.location;
    if (script) script.textContent = report.script;
    if (source) source.textContent = 'National Weather Service hourly forecast · Issued ' +
      new Date(report.issuedAt).toLocaleString() + ' · Valid ' +
      new Date(report.validFrom).toLocaleTimeString() + '–' + new Date(report.validUntil).toLocaleTimeString();
    if (status) status.textContent = '';
  }

  function fetchWeather(zip) {
    accountWeatherActive = false;
    accountReport = null;
    ['weatherReport', 'weatherSource'].forEach(function (name) {
      var el = document.getElementById(name);
      if (el) el.textContent = '';
    });
    var id = ++weatherRequest;
    var token = session();
    var statusEl = document.getElementById('weatherStatus');
    var tempEl = document.getElementById('weatherTemp');
    var descEl = document.getElementById('weatherDesc');

    function setStatus(t) { if (statusEl) statusEl.textContent = t; }

    if (!zip || !/^\d{5}$/.test(zip)) {
      setStatus('Enter your zip.');
      return;
    }

    setStatus('Looking up ' + zip + '…');

    // Step 1: zip → lat/lon
    fetch('https://api.zippopotam.us/us/' + zip)
      .then(function (r) {
        if (!r.ok) throw new Error('zip not found');
        return r.json();
      })
      .then(function (geo) {
        var place = geo.places[0];
        var lat = place.latitude;
        var lon = place.longitude;
        var city = place['place name'];
        // Step 2: lat/lon → weather
        return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat +
          '&longitude=' + lon +
          '&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m' +
          '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto')
          .then(function (r) { return r.json(); })
          .then(function (wx) {
            if (id !== weatherRequest || token !== session()) return;
            var c = wx.current;
            var temp = Math.round(c.temperature_2m);
            var desc = weatherCodeToText(c.weather_code);
            if (tempEl) tempEl.textContent = temp + '°F';
            if (descEl) descEl.textContent = desc + ' in ' + city;
            setStatus('');
            // Update ticker if it exists
            var ticker = document.getElementById('tickerTrack');
            if (ticker) {
              ticker.textContent = city + ' ' + temp + '°F ' + desc + '  •  ';
            }
          });
      })
      .catch(function () {
        if (id !== weatherRequest || token !== session()) return;
        setStatus('Could not get weather for ' + zip + '. Check the zip code.');
        if (tempEl) tempEl.textContent = '--';
        if (descEl) descEl.textContent = '';
      });
  }

  function weatherCodeToText(code) {
    var map = {
      0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Icy fog',
      51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
      61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
      71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
      80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
      95: 'Thunderstorm', 96: 'Storm with hail', 99: 'Severe storm'
    };
    return map[code] || 'Unknown';
  }

  // A direct audition on the signed-in receiver. Authority owns ZIP and NOAA.
  function mountWeatherAudition() {
    var receiver = document.querySelector('.receiver');
    if (!receiver || document.getElementById('ccWeatherPreview')) return;
    var panel = document.createElement('div');
    var button = document.createElement('button');
    var status = document.createElement('p');
    button.id = 'ccWeatherPreview';
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.textContent = 'Hear my weather';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.style.cssText = 'padding:12px 16px;';
    status.style.cssText = 'margin:8px 0 0;line-height:1.5;';
    panel.appendChild(button);
    panel.appendChild(status);
    receiver.appendChild(panel);
    var watching = null;
    var attempt = 0;
    function finish(message) {
      clearInterval(watching);
      watching = null;
      button.disabled = false;
      status.textContent = message;
    }
    async function explainFailure(error, id) {
      var message = 'Weather could not play: ' + (error || 'weather-unavailable') + '.';
      // Ask the same Authority endpoint for its specific failure, never another ZIP source.
      if (window.CCAuthority && session()) {
        try {
          var reply = await window.CCAuthority.ask('/api/weather', {session: session()});
          if (id !== attempt) return;
          if (!reply || !reply.success) message = 'Weather could not load: ' + ((reply && reply.error) || 'authority-unreachable') + '.';
          else message = 'Your NOAA forecast is available. Speech could not play: ' + (error || 'weather-unavailable') + '.';
        } catch (_) {}
      }
      if (id === attempt) finish(message);
    }
    button.addEventListener('click', function () {
      var id = ++attempt;
      if (!session()) return finish('Sign in with your existing account to hear its saved ZIP weather.');
      var voice = window.CCWeather;
      if (!voice || typeof voice.preview !== 'function' || typeof voice.status !== 'function') {
        return finish('The weather audio receiver has not loaded. Tap Hear my weather again shortly.');
      }
      var audio = window.CCPlayerAudio;
      if (!audio || audio.paused) return finish('Press the radio Play button, then Hear my weather.');
      button.disabled = true;
      status.textContent = 'Preparing Kinetic’s NOAA forecast for your account ZIP…';
      voice.preview();
      var started = Date.now();
      clearInterval(watching);
      watching = setInterval(function () {
        var current = voice.status();
        if (!current.signedIn) return finish('Sign in with your existing account to hear its saved ZIP weather.');
        if (current.stage === 'unavailable' || current.stage === 'audio-unavailable') {
          clearInterval(watching);
          watching = null;
          explainFailure(current.error || current.stage, id);
          return;
        }
        if (current.stage === 'speaking') status.textContent = 'Kinetic is playing your local NOAA forecast.';
        if (current.stage === 'finished') return finish('Weather playback finished.');
        if (Date.now() - started > 420000) return finish('Weather preparation timed out. Tap Hear my weather to retry.');
      }, 250);
    });
  }


  function buildUI() {
    mountWeatherAudition();
    var section = document.getElementById('weather');
    if (!section) return;

    // Replace the generic content with real weather UI
    var head = section.querySelector('.section-head');
    if (head) {
      head.innerHTML =
        '<p class="eyebrow">Your sky</p>' +
        '<h2>What\'s your weather?</h2>' +
        '<p class="section-sub">Your account ZIP loads automatically. You can also look up another ZIP.</p>';
    }

    // Find or create the weather display
    var display = document.getElementById('weatherDisplay');
    if (!display) {
      display = document.createElement('div');
      display.id = 'weatherDisplay';
      display.style.cssText = 'text-align:center;padding:20px;';
      // Insert after the section head
      var headEl = section.querySelector('.section-head');
      if (headEl && headEl.nextSibling) {
        section.insertBefore(display, headEl.nextSibling);
      } else {
        section.appendChild(display);
      }
    }

    var savedZip = getZip();
    display.innerHTML =
      '<div style="font-size:48px;font-weight:bold;" id="weatherTemp">--</div>' +
      '<div style="font-size:18px;margin:8px 0;" id="weatherDesc"></div>' +
      '<p id="weatherReport" style="max-width:44rem;margin:16px auto;text-align:left;"></p>' +
      '<p id="weatherSource" style="font-size:14px;"></p>' +
      '<div style="margin-top:16px;">' +
      '<input type="text" id="zipInput" placeholder="Zip code" value="' + savedZip + '" ' +
      'style="padding:10px;font-size:16px;width:120px;text-align:center;" maxlength="5" inputmode="numeric">' +
      '<button id="zipGo" style="padding:10px 20px;font-size:16px;margin-left:8px;">Go</button>' +
      '</div>' +
      '<div id="weatherStatus" style="margin-top:8px;font-size:14px;opacity:0.7;"></div>';

    var zipInput = document.getElementById('zipInput');
    var zipGo = document.getElementById('zipGo');

    function go() {
      var zip = zipInput.value.trim();
      if (/^\d{5}$/.test(zip)) {
        accountRequest++;
        setZip(zip);
        fetchWeather(zip);
      }
    }

    if (zipGo) zipGo.addEventListener('click', go);
    if (zipInput) zipInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') go();
    });

    // Load saved zip weather on start
    if (session()) loadAccountWeather();
    else if (savedZip) fetchWeather(savedZip);
    window.setInterval(function () {
      if (accountWeatherActive && session() && !document.hidden) loadAccountWeather();
    }, 15 * 60 * 1000);
  }

  window.addEventListener('cc-account-verified', loadAccountWeather);
  window.addEventListener('storage', function (ev) {
    if (ev.key !== 'ccr-session' && ev.key !== null) return;
    accountRequest++;
    weatherRequest++;
    selectedZip = '';
    accountReport = null;
    ['weatherTemp', 'weatherDesc', 'weatherStatus', 'weatherReport', 'weatherSource'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = id === 'weatherTemp' ? '--' : '';
    });
    var input = document.getElementById('zipInput');
    if (input) input.value = '';
    loadAccountWeather();
  });

  // Tip-triggered personal weather shoutout — James 2026-10-17
  // "Cold morning for Julie in NYC, your temp is 42 with 20% chance of precipitation"
  function tipWeatherShoutout(tipperName, zip, sayFn) {
    if (!zip || !/^\d{5}$/.test(zip)) return;
    fetch('https://api.zippopotam.us/us/' + zip)
      .then(function (r) {
        if (!r.ok) throw new Error('zip not found');
        return r.json();
      })
      .then(function (geo) {
        var place = geo.places[0];
        var city = place['place name'];
        var state = place['state abbreviation'] || '';
        var locName = state ? city + ', ' + state : city;
        return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + place.latitude +
          '&longitude=' + place.longitude +
          '&current=temperature_2m,weather_code,precipitation_probability' +
          '&temperature_unit=fahrenheit&timezone=auto')
          .then(function (r) { return r.json(); })
          .then(function (wx) {
            var c = wx.current || {};
            var temp = Math.round(c.temperature_2m || 0);
            var precip = c.precipitation_probability;
            var precipStr = (precip !== undefined && precip !== null)
              ? ' with a ' + precip + ' percent chance of precipitation'
              : '';
            var timeWord = temp <= 45 ? 'Cold morning' : temp <= 65 ? 'Cool day' : 'Warm day';
            var msg = timeWord + ' for ' + tipperName + ' in ' + locName +
              '. Your temp is ' + temp + ' degrees' + precipStr + '. Thanks for the tip!';
            if (sayFn) { sayFn(msg); }
            else if (window.CCStationAI) {
              // Use Kinetic's voice if available — queue it as a shoutout
              try {
                var u = new SpeechSynthesisUtterance(msg);
                u.rate = 1.09; u.pitch = 0.9;
                window.speechSynthesis.speak(u);
              } catch (_) {}
            }
          });
      })
      .catch(function () {});
  }

  // Account ZIP -> Authority's NOAA hourly forecast -> audible preview.
  var previewState = {stage:'idle',error:'',signedIn:false};
  var previewUtterance = null;
  async function preview() {
    var auth = session();
    previewState = {stage:'preparing',error:'',signedIn:!!auth};
    if (!auth || !window.CCAuthority) {
      previewState.stage='unavailable'; previewState.error='account-unavailable'; return;
    }
    try {
      var account = await window.CCAuthority.ask('/api/session',{session:auth});
      if (session()!==auth) return;
      var zip = account && typeof account.zip==='string' ? account.zip.trim() : '';
      if (!account || account.success!==true || !/^\\d{5}$/.test(zip)) throw new Error('account-zip-unavailable');
      var response = await window.CCAuthority.ask('/api/weather',{session:auth});
      if (session()!==auth) return;
      var report = response && response.report;
      if (!response || response.success!==true || !report || report.kind!=='hourly-forecast' ||
          !Number.isFinite(report.temperature) || report.temperatureUnit!=='F' ||
          !report.script || !(Date.parse(report.validFrom)<=Date.now() && Date.now()<Date.parse(report.validUntil))) {
        throw new Error('noaa-forecast-unavailable');
      }
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) throw new Error('speech-unavailable');
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(report.script);
      previewUtterance = utterance;
      utterance.onstart=function () { if (previewUtterance===utterance) previewState.stage='speaking'; };
      utterance.onend=function () { if (previewUtterance===utterance) { previewState.stage='finished'; previewUtterance=null; } };
      utterance.onerror=function (e) { if (previewUtterance===utterance) { previewState.stage='audio-unavailable'; previewState.error=e.error||'speech-failed'; previewUtterance=null; } };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      previewState.stage='unavailable'; previewState.error=e.message||'weather-unavailable';
    }
  }
  function previewStatus() { return {stage:previewState.stage,error:previewState.error,signedIn:!!session()}; }

  window.CCWeather = {
    fetchWeather: fetchWeather,
    preview: preview,
    status: previewStatus,
    getZip: getZip,
    tipWeatherShoutout: tipWeatherShoutout,
    getAccountReport: function () {
      if (!accountReport || accountReportToken !== session() || Date.now() >= Date.parse(accountReport.validUntil)) return null;
      return accountReport;
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();


