/* Cybercrowd Radio - share dialog only.
   One job: open a custom dialog when the share button is tapped.
   The dialog lists each platform on its own line, in order.
   Direct doors are used where a web share door exists.
   For the other platforms, the link is copied and the site is
   opened for manual paste. No direct post is claimed there.
   The share words below are the original words, unchanged.
   The referral code, if present, comes from localStorage ccr_ref.
   No new referral code is created here.
*/
(function () {
  "use strict";
  var SHARE_TEXT = "AI plays AI – 69 songs, DJ on the decks. Sonny Daze will jack the vinyl rack.";
  var PLATFORMS = [
    { name: "Facebook", kind: "direct", label: "Facebook" },
    { name: "Instagram", kind: "manual", site: "https://www.instagram.com/", label: "Instagram - Copy Link, then paste by hand on Instagram. No direct post from here." },
    { name: "X", kind: "direct", label: "X" },
    { name: "TikTok", kind: "manual", site: "https://www.tiktok.com/", label: "TikTok - Copy Link, then paste by hand on TikTok. No direct post from here." },
    { name: "YouTube", kind: "manual", site: "https://www.youtube.com/", label: "YouTube - Copy Link, then paste by hand on YouTube. No direct post from here." },
    { name: "WhatsApp", kind: "direct", label: "WhatsApp" },
    { name: "Telegram", kind: "direct", label: "Telegram" },
    { name: "Snapchat", kind: "manual", site: "https://www.snapchat.com/", label: "Snapchat - Copy Link, then paste by hand on Snapchat. No direct post from here." },
    { name: "Reddit", kind: "manual", site: "https://www.reddit.com/", label: "Reddit - Copy Link, then paste by hand on Reddit. No direct post from here." },
    { name: "Pinterest", kind: "manual", site: "https://www.pinterest.com/", label: "Pinterest - Copy Link, then paste by hand on Pinterest. No direct post from here." },
    { name: "LinkedIn", kind: "manual", site: "https://www.linkedin.com/", label: "LinkedIn - Copy Link, then paste by hand on LinkedIn. No direct post from here." },
    { name: "Email", kind: "direct", label: "Email" },
    { name: "Copy Link", kind: "copy", label: "Copy Link" }
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
    box.style.maxWidth = "420px";
    box.style.width = "100%";
    box.style.maxHeight = "90vh";
    box.style.overflow = "auto";
    box.style.textAlign = "left";
    var heading = document.createElement("h2");
    heading.textContent = "Share the station";
    box.appendChild(heading);
    var words = document.createElement("p");
    words.textContent = SHARE_TEXT;
    box.appendChild(words);
    var status = document.createElement("p");
    status.setAttribute("aria-live", "polite");
    var list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";
    list.style.margin = "0";
    PLATFORMS.forEach(function (platform) {
      var item = document.createElement("li");
      item.style.margin = "6px 0";
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = platform.label;
      button.style.display = "block";
      button.style.width = "100%";
      button.style.textAlign = "left";
      button.style.background = "#222222";
      button.style.color = "#ffffff";
      button.style.border = "1px solid #e9c979";
      button.style.padding = "8px";
      button.style.cursor = "pointer";
      button.addEventListener("click", function () {
        if (platform.kind === "direct") {
          openDirect(platform.name, link);
        } else if (platform.kind === "manual") {
          copyLink(link, function () { status.textContent = "Link copied. Paste it by hand on " + platform.name + "."; });
          window.open(platform.site, "_blank", "noopener");
        } else {
          copyLink(link, function () { status.textContent = "Link copied."; });
        }
      });
      item.appendChild(button);
      list.appendChild(item);
    });
    box.appendChild(list);
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
