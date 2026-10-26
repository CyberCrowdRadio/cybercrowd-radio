/* Cybercrowd Radio - share dialog only.
   One job: open a custom dialog when the share button is tapped.
   The dialog shows one icon per platform, in an icon grid, in order.
   Direct doors are used where a web share door exists.
   For the other platforms, the link is copied first, then the platform
   is opened, so the user is taken there and can share there.
   The share words below are the original words, unchanged.
   The referral code, if present, comes from localStorage ccr_ref.
   No new referral code is created here.
*/
(function () {
  "use strict";
  var SHARE_TEXT = "AI plays AI – 69 songs, DJ on the decks. Sonny Daze will jack the vinyl rack.";
  var PLATFORMS = [
    { name: "Facebook", kind: "direct", icon: "f", color: "#1877f2" },
    { name: "Instagram", kind: "copy-open", site: "https://www.instagram.com/", icon: "◎", color: "#e1306c" },
    { name: "X", kind: "direct", icon: "X", color: "#000000" },
    { name: "TikTok", kind: "copy-open", site: "https://www.tiktok.com/", icon: "♪", color: "#000000" },
    { name: "YouTube", kind: "copy-open", site: "https://www.youtube.com/", icon: "▶", color: "#ff0000" },
    { name: "WhatsApp", kind: "direct", icon: "💬", color: "#25d366" },
    { name: "Telegram", kind: "direct", icon: "✈", color: "#229ed9" },
    { name: "Snapchat", kind: "copy-open", site: "https://www.snapchat.com/", icon: "👻", color: "#e3c800" },
    { name: "Reddit", kind: "direct", icon: "R", color: "#ff4500" },
    { name: "Pinterest", kind: "direct", icon: "P", color: "#e60023" },
    { name: "LinkedIn", kind: "direct", icon: "in", color: "#0a66c2" },
    { name: "Email", kind: "direct", icon: "✉", color: "#555555" },
    { name: "Copy Link", kind: "copy", icon: "🔗", color: "#333333" }
  ];
  function getShareLink() {
    var base = window.location.origin + window.location.pathname;
    try {
      var ref = window.localStorage.getItem("ccr_ref");
      if (ref) {
        ref = ref.trim();
        if (ref) {
          return base + "?ref=" + encodeURIComponent(ref);
        }
      }
    } catch (err) {}
    return base;
  }
  function copyLink(link, done) {
    function fallback() {
      try {
        var area = document.createElement("textarea");
        area.value = link;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      } catch (err) {}
      if (done) { done(); }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () { if (done) { done(); } }, fallback);
      } else {
        fallback();
      }
    } catch (err) {
      fallback();
    }
  }
  function openDirect(name, link) {
    var url = "";
    if (name === "Facebook") {
      url = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(link);
      window.open(url, "_blank", "noopener");
    } else if (name === "X") {
      url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(SHARE_TEXT) + "&url=" + encodeURIComponent(link);
      window.open(url, "_blank", "noopener");
    } else if (name === "WhatsApp") {
      url = "https://wa.me/?text=" + encodeURIComponent(SHARE_TEXT + " " + link);
      window.open(url, "_blank", "noopener");
    } else if (name === "Telegram") {
      url = "https://t.me/share/url?url=" + encodeURIComponent(link) + "&text=" + encodeURIComponent(SHARE_TEXT);
      window.open(url, "_blank", "noopener");
    } else if (name === "Reddit") {
      url = "https://www.reddit.com/submit?url=" + encodeURIComponent(link) + "&title=" + encodeURIComponent(SHARE_TEXT);
      window.open(url, "_blank", "noopener");
    } else if (name === "Pinterest") {
      url = "https://www.pinterest.com/pin/create/button/?url=" + encodeURIComponent(link) + "&description=" + encodeURIComponent(SHARE_TEXT);
      window.open(url, "_blank", "noopener");
    } else if (name === "LinkedIn") {
      url = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(link);
      window.open(url, "_blank", "noopener");
    } else if (name === "Email") {
      var anchor = document.createElement("a");
      anchor.href = "mailto:?body=" + encodeURIComponent(SHARE_TEXT + "\n" + link);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  }
  function closeDialog() {
    var old = document.getElementById("cc-share-dialog");
    if (old && old.parentNode) { old.parentNode.removeChild(old); }
    document.removeEventListener("keydown", onKeyDown);
  }
  function onKeyDown(event) {
    if (event && event.key === "Escape") { closeDialog(); }
  }
  function openDialog() {
    closeDialog();
    var link = getShareLink();
    var backdrop = document.createElement("div");
    backdrop.id = "cc-share-dialog";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-label", "Share the station");
    backdrop.style.position = "fixed";
    backdrop.style.left = "0";
    backdrop.style.top = "0";
    backdrop.style.right = "0";
    backdrop.style.bottom = "0";
    backdrop.style.background = "rgba(0, 0, 0, 0.8)";
    backdrop.style.display = "flex";
    backdrop.style.alignItems = "center";
    backdrop.style.justifyContent = "center";
    backdrop.style.zIndex = "9999";
    backdrop.style.padding = "16px";
    var box = document.createElement("div");
    box.style.background = "#111111";
    box.style.color = "#ffffff";
    box.style.border = "1px solid #e9c979";
    box.style.padding = "16px";
    box.style.maxWidth = "480px";
    box.style.width = "100%";
    box.style.textAlign = "center";
    var heading = document.createElement("h2");
    heading.textContent = "Share the station";
    box.appendChild(heading);
    var words = document.createElement("p");
    words.textContent = SHARE_TEXT;
    box.appendChild(words);
    var status = document.createElement("p");
    status.setAttribute("aria-live", "polite");
    var grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(4, 1fr)";
    grid.style.gap = "12px";
    grid.style.margin = "12px 0";
    PLATFORMS.forEach(function (platform) {
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", platform.name);
      button.title = platform.name;
      button.style.background = "transparent";
      button.style.border = "none";
      button.style.padding = "0";
      button.style.cursor = "pointer";
      button.style.color = "#ffffff";
      var icon = document.createElement("span");
      icon.textContent = platform.icon;
      icon.style.display = "block";
      icon.style.width = "56px";
      icon.style.height = "56px";
      icon.style.lineHeight = "56px";
      icon.style.margin = "0 auto";
      icon.style.borderRadius = "50%";
      icon.style.background = platform.color;
      icon.style.color = "#ffffff";
      icon.style.fontSize = "26px";
      icon.style.fontWeight = "bold";
      icon.style.textAlign = "center";
      button.appendChild(icon);
      var label = document.createElement("span");
      label.textContent = platform.name;
      label.style.display = "block";
      label.style.marginTop = "6px";
      label.style.fontSize = "12px";
      label.style.textAlign = "center";
      button.appendChild(label);
      button.addEventListener("click", function () {
        if (platform.kind === "direct") {
          openDirect(platform.name, link);
        } else if (platform.kind === "copy-open") {
          copyLink(link, function () { status.textContent = "Link copied."; });
          window.open(platform.site, "_blank", "noopener");
        } else {
          copyLink(link, function () { status.textContent = "Link copied."; });
        }
      });
      grid.appendChild(button);
    });
    box.appendChild(grid);
    box.appendChild(status);
    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.style.marginTop = "12px";
    closeButton.style.padding = "8px 16px";
    closeButton.style.cursor = "pointer";
    closeButton.addEventListener("click", closeDialog);
    box.appendChild(closeButton);
    backdrop.appendChild(box);
    backdrop.addEventListener("click", function (event) {
      if (event.target === backdrop) { closeDialog(); }
    });
    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(backdrop);
    closeButton.focus();
  }
  function wireShareDialog() {
    var shareBtn = document.getElementById("shareBtn");
    if (!shareBtn) { return; }
    if (shareBtn.getAttribute("data-cc-share-dialog") === "wired") { return; }
    shareBtn.setAttribute("data-cc-share-dialog", "wired");
    shareBtn.addEventListener("click", function (event) {
      event.preventDefault();
      openDialog();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireShareDialog);
  } else {
    wireShareDialog();
  }
  window.CC_SHARE_DIALOG_LOADED = true;
})();
