/* CCChannelsPage — live channel grid for channels.html.
 * One file, one job: render channels from STATION_CONFIG.
 * Empty until the studio connects feeds — then this wall fills in.
 */
(function () {
  "use strict";
  var cfg = window.STATION_CONFIG || {};
  var grid = document.getElementById("channelsGrid");
  if (!grid) return;

  var channels = (cfg.channels || []).filter(function (c) { return (c.src || "").trim() !== ""; });
  if (!channels.length) {
    grid.innerHTML =
      '<div class="channel-empty">' +
      '<p class="channel-empty-title">The channels go live when the studio does.</p>' +
      "<p>Studio Live. Vinyl Vault. The booth decides the lineup \u2014 this wall fills in when the feeds connect.</p>" +
      "</div>";
    return;
  }
  channels.forEach(function (c) {
    var el = document.createElement("button");
    el.className = "channel-card";
    el.type = "button";
    var nm = String(c.name || "").replace(/</g, "&lt;");
    var kd = String(c.kind || "live").replace(/</g, "&lt;");
    el.innerHTML = '<span class="channel-name">' + nm + '</span><span class="channel-kind">' + kd + "</span>";
    grid.appendChild(el);
  });
})();
