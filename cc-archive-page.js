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
    url.hash = anchor;
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

  function render(entries) {
    wall.replaceChildren();
    status.textContent = entries.length ? "" : "The Wall of Honor is empty. No donations yet.";
    for (const entry of entries) {
      const plaque = document.createElement("li");
      plaque.className = "plaque";
      plaque.id = "honor-" + entry.position;
      const link = document.createElement("a");
      link.href = "#" + plaque.id;
      link.textContent = entry.position + ". " + entry.name;
      plaque.append(link);
      if (entry.dedication) {
        const line = document.createElement("span");
        line.textContent = entry.dedication;
        plaque.append(line);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Share dedication";
      button.onclick = () => share(plaque.id, entry.name + " — Wall of Honor");
      plaque.append(button);
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
    byId("keeperDesk").hidden = access.result?.role !== "owner";
  });
  let ticket;
  form.addEventListener("input", () => { ticket = null; });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    if (button.disabled) return;
    const name = byId("donorName").value.trim();
    if (!name) { byId("donorMsg").textContent = "Enter the name to put on the wall."; return; }
    ticket ||= crypto.randomUUID();
    for (const field of form.elements) field.disabled = true;
    try {
      const result = await ask("/api/honor-wall", {action:"add", session:session(), ticket, name, dedication:byId("dedication").value.trim()});
      if (!result.success) throw Error(result.error || "Try again.");
      render(result.entries);
      form.reset();
      ticket = null;
      byId("donorMsg").textContent = name + " was added to the wall.";
    } catch (e) {
      byId("donorMsg").textContent = "Could not confirm the entry. " + e.message;
    } finally {
      for (const field of form.elements) field.disabled = false;
    }
  });
})();
