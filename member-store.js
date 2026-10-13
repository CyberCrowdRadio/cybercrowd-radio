/* ============================================================
   MEMBER STORE — R2-backed member memory.
   One file, one authority: all member reads/writes go through here.
   Bucket: cybercrowd-members
   Prefix: Members only returning/
   ============================================================ */

const PREFIX = "Members only returning/";

/* Save a member record. key = handle (e.g. "kd909"). */
async function saveMember(bucket, handle, data) {
  const key = PREFIX + handle + ".json";
  const record = {
    handle: handle,
    email: data.email || "",
    joined: data.joined || new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
  await bucket.put(key, JSON.stringify(record), {
    httpMetadata: { contentType: "application/json" },
  });
  return record;
}

/* Load a member record by handle. Returns null if not found. */
async function loadMember(bucket, handle) {
  const key = PREFIX + handle + ".json";
  const obj = await bucket.get(key);
  if (!obj) return null;
  return await obj.json();
}

/* Check if a handle is a returning member. */
async function isMember(bucket, handle) {
  const member = await loadMember(bucket, handle);
  return member !== null;
}

/* Touch lastSeen on every visit — no new email, just a timestamp. */
async function touchMember(bucket, handle) {
  const member = await loadMember(bucket, handle);
  if (!member) return null;
  member.lastSeen = new Date().toISOString();
  const key = PREFIX + handle + ".json";
  await bucket.put(key, JSON.stringify(member), {
    httpMetadata: { contentType: "application/json" },
  });
  return member;
}

/* Export for Worker. */
export { saveMember, loadMember, isMember, touchMember, PREFIX };
