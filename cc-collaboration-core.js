/* CyberCrowd Radio — collaboration domain core.
 * One job: validate and apply project collaboration events.
 * No network, UI, authentication, payments, or broadcast side effects.
 * Identity is always an existing UIDL reference; this module never issues UIDLs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CCCollaborationCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function assert(ok, message) { if (!ok) throw new Error(message); }
  function clean(value, field, limit) {
    assert(typeof value === 'string', field + ' must be text');
    var s = value.trim();
    assert(s.length > 0 && s.length <= limit, field + ' length invalid');
    return s;
  }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function createProject(input) {
    assert(input && typeof input === 'object', 'project required');
    var id = clean(input.id, 'project id', 120);
    var owner = clean(input.ownerUidl, 'owner UIDL', 160);
    return { schema: 1, id: id, name: clean(input.name, 'name', 120), ownerUidl: owner,
      members: [{ uidl: owner, role: 'founder', state: 'accepted', invitedBy: null }],
      invitations: [], events: [] };
  }
  function apply(project, event, actorUidl) {
    var p = copy(project), e = copy(event);
    var actor = clean(actorUidl, 'actor UIDL', 160);
    assert(p.schema === 1 && Array.isArray(p.members) && Array.isArray(p.invitations), 'invalid project');
    assert(e && typeof e.type === 'string', 'event type required');
    var member = p.members.find(function (m) { return m.uidl === actor && m.state === 'accepted'; });
    var isOwner = actor === p.ownerUidl;
    if (e.type === 'invite') {
      assert(member, 'only active members may invite');
      var target = clean(e.targetUidl, 'target UIDL', 160);
      assert(target !== actor, 'cannot invite yourself');
      assert(!p.members.some(function (m) { return m.uidl === target; }), 'already a member');
      assert(!p.invitations.some(function (i) { return i.targetUidl === target && i.state === 'pending'; }), 'invitation pending');
      var role = clean(e.role, 'role', 80);
      p.invitations.push({ targetUidl: target, role: role, invitedBy: actor, state: 'pending' });
    } else if (e.type === 'respond') {
      var inv = p.invitations.find(function (i) { return i.targetUidl === actor && i.state === 'pending'; });
      assert(inv, 'no pending invitation for actor');
      assert(e.accept === true || e.accept === false, 'accept must be boolean');
      inv.state = e.accept ? 'accepted' : 'declined';
      if (e.accept) p.members.push({ uidl: actor, role: inv.role, state: 'accepted', invitedBy: inv.invitedBy });
    } else if (e.type === 'remove') {
      var who = clean(e.targetUidl, 'target UIDL', 160);
      assert(who !== p.ownerUidl, 'cannot remove owner');
      assert(isOwner || actor === who, 'only owner can remove others');
      var existing = p.members.find(function (m) { return m.uidl === who && m.state === 'accepted'; });
      assert(existing, 'active member not found');
      existing.state = 'departed';
    } else if (e.type === 'role') {
      assert(isOwner, 'only owner can assign roles');
      var targetMember = p.members.find(function (m) { return m.uidl === e.targetUidl && m.state === 'accepted'; });
      assert(targetMember, 'active member not found');
      assert(targetMember.uidl !== p.ownerUidl, 'founder role protected');
      targetMember.role = clean(e.role, 'role', 80);
    } else {
      throw new Error('unknown event type');
    }
    p.events.push({ type: e.type, actorUidl: actor, targetUidl: e.targetUidl || actor });
    return p;
  }
  return Object.freeze({ createProject: createProject, apply: apply });
});
