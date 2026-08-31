/* Minimal SwarmUI API client.
 *
 * http.request, not fetch: undici caps response headers at 300s and a cold model
 * load (or any video job) blows straight through that while the GPU keeps working.
 *
 * READ THIS BEFORE CHANGING HOW OUTPUT IS COLLECTED.
 *
 * The historic advice was a snapshot diff of E:/SwarmUI/Output — take the file
 * that was not there before — because SwarmUI names files from the first ~40
 * characters of the prompt and silently de-duplicates, so its own returned View/
 * path could hand back someone else's image. That advice has a hole: the snapshot
 * diff assumes this process is the ONLY thing writing to that folder. It is not.
 * A 52 image batch here came back as mushrooms, axes and spellbooks because a
 * concurrent Cindervale icon batch was writing to the same directory, and the
 * diff faithfully collected ITS output. Every log line said OK, and the md5
 * duplicate check passed, because the images genuinely were all distinct.
 *
 * `donotsave: true` ends the whole class of problem: SwarmUI returns the PNG
 * inline as a base64 data URI, nothing touches the filesystem, and there is no
 * shared resource left to race over. Use gen() below. snapshot()/resolveNew()
 * are kept only for callers that genuinely need a file on disk.
 */
const http = require('http');
const fs = require('fs'), path = require('path');
const crypto = require('crypto');

const SWARM_OUT = 'E:/SwarmUI/Output';

const post = (route, body) => new Promise((res, rej) => {
  const data = JSON.stringify(body);
  const r = http.request({
    host: 'localhost', port: 7801, path: '/API/' + route, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  }, s => {
    let b = ''; s.on('data', c => b += c);
    s.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(new Error('bad json: ' + b.slice(0, 300))); } });
  });
  r.on('error', rej);
  r.setTimeout(30 * 60000, () => r.destroy(new Error('timeout')));
  r.write(data); r.end();
});

const session = async () => (await post('GetNewSession', {})).session_id;

const snapshot = (dir = SWARM_OUT) => {
  const out = new Set();
  const walk = d => {
    let e; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch (x) { return; }
    for (const f of e) { const p = path.join(d, f.name); f.isDirectory() ? walk(p) : out.add(p); }
  };
  walk(dir); return out;
};

/* Poll for the file that was not there before the call. Never the API path,
   never a name match, never "newest in folder". */
const resolveNew = async (before, tries = 60) => {
  for (let i = 0; i < tries; i++) {
    for (const f of snapshot()) if (!before.has(f) && /\.(png|jpe?g|webp)$/i.test(f)) return f;
    await new Promise(r => setTimeout(r, 250));
  }
  return null;
};

/* The safe path: ask for the bytes, not for a filename. Returns a Buffer.
   Throws with the API's own error text rather than returning a bad image. */
async function gen(session_id, params) {
  const res = await post('GenerateText2Image', Object.assign({ session_id, images: 1, donotsave: true }, params));
  if (res.error || res.error_id) throw new Error(res.error || res.error_id);
  const im = (res.images || [])[0];
  if (!im) throw new Error('no image returned: ' + JSON.stringify(res).slice(0, 200));
  const m = /^data:image\/\w+;base64,(.+)$/s.exec(im);
  if (!m) throw new Error('expected inline image, got a path (' + im.slice(0, 60) + ') — is donotsave set?');
  return Buffer.from(m[1], 'base64');
}

/* Aliasing is completely silent, so prove a finished batch is actually distinct. */
const dupeCheck = dir => {
  const by = {};
  const files = fs.readdirSync(dir).filter(f => /\.(png|webp|jpg)$/i.test(f));
  for (const f of files) {
    const h = crypto.createHash('md5').update(fs.readFileSync(path.join(dir, f))).digest('hex');
    (by[h] = by[h] || []).push(f);
  }
  const groups = Object.values(by).filter(g => g.length > 1);
  if (!groups.length) { console.log('\nintegrity: ' + files.length + ' files, all distinct'); return true; }
  console.log('\nINTEGRITY FAIL — duplicate images (SwarmUI name aliasing):');
  groups.forEach(g => console.log('   ' + g.join('  ==  ')));
  return false;
};

module.exports = { post, session, gen, snapshot, resolveNew, dupeCheck, SWARM_OUT };
