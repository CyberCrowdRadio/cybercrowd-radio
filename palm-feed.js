/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: palm-feed.js
Movements: Read a subscribed RSS or Atom source and identify each entry.
Purpose: Preserve source attribution and links back to original activity.
Does NOT: Request provider passwords or transmit a Radio session.
*/
export function publicLink(value, base) {
  if (!value) return null;
  try {
    const link = new URL(value, base);
    return link.protocol === 'https:' && !link.username && !link.password ? link.href : null;
  } catch { return null; }
}
export async function readFeed(address) {
  const response = await fetch(address, {
    credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store',
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw Error('Feed returned HTTP ' + response.status + '.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let xml = '', bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 2 * 1024 * 1024) { await reader.cancel(); throw Error('Feed exceeds 2 MB.'); }
    xml += decoder.decode(value, { stream: true });
  }
  xml += decoder.decode();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  const atom = root.localName === 'feed';
  const collection = root.localName === 'rss' ? root.querySelector('channel') : root;
  if ((!atom && !['rss','RDF'].includes(root.localName)) || !collection)
    throw Error('This address did not return an RSS or Atom feed.');
  const child = (node, name) => Array.from(node.children).find(el => el.localName === name);
  const title = child(collection, 'title')?.textContent.trim() || new URL(address).host;
  const entries = Array.from(collection.children).filter(el => el.localName === (atom ? 'entry' : 'item'));
  const items = await Promise.all(entries.slice(0,50).map(async entry => {
    const nodes = Array.from(entry.children);
    const field = name => child(entry, name)?.textContent.trim() || '';
    const link = nodes.find(el => el.localName === 'link' && (!atom || !el.hasAttribute('rel') || el.getAttribute('rel') === 'alternate'));
    const href = publicLink(atom ? link?.getAttribute('href') : link?.textContent.trim(), response.url || address);
    const date = field('published') || field('pubDate') || field('updated') || field('date');
    const label = field('title') || 'Untitled entry';
    const identity = field('id') || field('guid') || href || label + '\n' + date;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
    const id = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('');
    return { id, href, date: Date.parse(date) || 0, label };
  }));
  return { title, items: [...new Map(items.map(item => [item.id,item])).values()] };
}
