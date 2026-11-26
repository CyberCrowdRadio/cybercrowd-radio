/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: cc-archive-page.js
Movements: Display shared plaques and append owner-entered names.
Purpose: Show the public Wall of Honor in entry order.
Does NOT: Seed donor names or rank donations.
*/
(function () {
  "use strict";
  const byId = id => document.getElementById(id);
  const form = byId("donorForm");
  const wall = byId("donorWall");
  const status = byId("wallStatus");
  const ask = (path, body) => window.CCAuthority.ask(path, body);
  const session = () => localStorage.getItem("ccr-session");
  const mail = window.STATION_CONFIG?.archive?.mailTo?.trim();
  if (mail) byId("mailLine").textContent = "Mail your LPs to: " + mail;

  async function share(anchor, title) {
    const url = new URL(location.pathname, location.origin);
    if (/^honor-\d+$/.test(anchor)) url.pathname = "/honor/" + anchor.slice(6);
    else url.hash = anchor;
    try {
      if (navigator.share) {
        await navigator.share({title, url:url.href});
      } else {
        await navigator.clipboard.writeText(url.href);
        byId("shareStatus").textContent = "Link copied.";
      }
    } catch (error) {
      if (error.name !== "AbortError") window.prompt("Copy this link to share", url.href);
    }
  }
  byId("shareWall").onclick = () => share("wall-of-honor", "CyberCrowd Radio Wall of Honor");

  const lines = [1, 2, 3].map(number => byId("dedication" + number));
  let editing = null;
  let owner = false;
  let displayed = [];
  function edit(entry) {
    editing = entry;
    ticket = null;
    form.reset();
    byId("savePlaque").textContent = entry ? "Save changes" : "Add to Wall of Honor";
    byId("cancelEdit").hidden = !entry;
    byId("donorMsg").textContent = "";
    if (entry) {
      byId("donorName").value = entry.name;
      const existing = entry.dedication.split("\n");
      lines.forEach((field, index) => { field.value = existing[index] || ""; });
      byId("donorName").focus();
    }
  }
  byId("cancelEdit").onclick = () => edit(null);
  function render(entries) {
    displayed = entries;
    wall.replaceChildren();
    status.textContent = entries.length ? "" : "The Wall of Honor is empty. No donations yet.";
    for (const entry of entries) {
      const plaque = document.createElement("li");
      plaque.className = "plaque";
      plaque.id = "honor-" + entry.position;
      const link = document.createElement("a");
      link.href = "/honor/" + entry.position;
      link.textContent = entry.name;
      plaque.append(link);
      if (entry.dedication) {
        const line = document.createElement("span");
        line.style.whiteSpace = "pre-wrap";
        line.textContent = entry.dedication;
        plaque.append(line);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Share dedication";
      button.onclick = () => share(plaque.id, entry.name + " — Wall of Honor");
      plaque.append(button);
      if (owner) {
        const change = document.createElement("button");
        change.type = "button";
        change.textContent = "Edit";
        change.setAttribute("aria-label", "Edit " + entry.name);
        change.onclick = () => edit(entry);
        plaque.append(change);
      }
      wall.append(plaque);
    }
  }
  ask("/api/honor-wall", { action: "list" }).then(result => {
    if (!result.success) { status.textContent = "The wall could not be loaded. Refresh to try again."; return; }
    render(result.entries);
    if (/^#honor-\d+$/.test(location.hash)) byId(location.hash.slice(1))?.scrollIntoView();
  }).then(async () => {
    if (!session()) return;
    const access = await ask("/api/admin", {action:"status", scope:"radio", session:session()});
    owner = access.result?.role === "owner";
    byId("keeperDesk").hidden = !owner;
    if (owner) render(displayed);
  });
  let ticket;
  form.addEventListener("input", () => { ticket = null; });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = byId("savePlaque");
    if (button.disabled) return;
    const name = byId("donorName").value.trim();
    if (!name) { byId("donorMsg").textContent = "Enter the name to put on the wall."; return; }
    ticket ||= crypto.randomUUID();
    for (const field of form.elements) field.disabled = true;
    try {
      const dedication = lines.map(field => field.value).join("\n").replace(/\n+$/, "");
      const change = editing ? {action:"edit", position:editing.position, previousName:editing.name,
        previousDedication:editing.dedication} : {action:"add", ticket};
      const result = await ask("/api/honor-wall", {...change, session:session(), name, dedication});
      if (!result.success) throw Error(result.error || "Try again.");
      render(result.entries);
      const message = editing ? "Changes saved." : name + " was added to the wall.";
      edit(null);
      byId("donorMsg").textContent = message;
    } catch (e) {
      byId("donorMsg").textContent = "Could not confirm the entry. " + e.message;
    } finally {
      for (const field of form.elements) field.disabled = false;
    }
  });
})();
