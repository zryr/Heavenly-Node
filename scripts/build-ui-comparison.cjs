'use strict';
// Usage: node scripts/build-ui-comparison.cjs manifest.json comparison.html
// Paths are relative to the manifest. The output embeds every PNG and is portable.
const fs = require('node:fs');
const path = require('node:path');
const [manifestPath, outputPath] = process.argv.slice(2);
if (!manifestPath || !outputPath) throw new Error('Usage: node scripts/build-ui-comparison.cjs manifest.json comparison.html');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if (!Array.isArray(manifest.sections) || !manifest.sections.length) throw new Error('The manifest needs screenshot sections.');
let imageCount = 0;
const sections = manifest.sections.map(section => {
  const figures = section.captures.map(capture => {
    if (!capture.path || !capture.browser || !capture.viewport || !capture.revision || !capture.label) {
      throw new Error('Each capture needs path, browser, viewport, revision and label.');
    }
    const bytes = fs.readFileSync(path.resolve(path.dirname(manifestPath), capture.path));
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Expected PNG: ' + capture.path);
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    const label = `${capture.label} · ${capture.browser} · ${capture.viewport} · ${capture.revision}`;
    imageCount++;
    return `<figure><figcaption>${escape(label)}</figcaption><button type="button" class="preview" data-title="${escape(section.title+' — '+label)}" aria-label="${escape('View full resolution: '+section.title+' '+capture.label)}"><img src="data:image/png;base64,${bytes.toString('base64')}" width="${width}" height="${height}" alt="${escape(section.title+' '+capture.label)}"></button><p class="pixels">Capture: ${width} × ${height} pixels${capture.simulated ? ' · simulated viewport' : ''}</p></figure>`;
  }).join('');
  return `<section><h2>${escape(section.title)}</h2><p>${escape(section.description || '')}</p><div class="pair">${figures}</div></section>`;
}).join('');
const document = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(manifest.title)}</title><style>
body{font:16px/1.6 system-ui;background:#08111f;color:#dbeafe;max-width:1400px;margin:auto;padding:28px}h1{font-size:30px;line-height:1.3}h2{font-size:21px;color:#7dd3fc}p{color:#aebed3}section{border-top:1px solid #26364c;margin-top:30px;padding-top:18px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;padding:12px;background:#101b2d;border:1px solid #24344b;border-radius:14px;min-width:0}figcaption{color:#c4b5fd;margin-bottom:10px;font-size:13px}.preview{border:0;padding:0;background:transparent;cursor:zoom-in;max-width:100%;display:block}.preview img{display:block;max-width:100%;height:auto;max-height:1050px;object-fit:contain;object-position:top}.pixels{font-size:12px;margin:7px 0 0}button:focus-visible{outline:2px solid #c4b5fd;outline-offset:3px}dialog{width:min(94vw,1250px);max-width:94vw;height:92vh;max-height:92vh;padding:12px;border:1px solid #526078;border-radius:12px;background:#0f172a;color:#e2e8f0;box-sizing:border-box}dialog::backdrop{background:#000b}dialog header{display:flex;align-items:center;gap:12px;justify-content:space-between;margin-bottom:12px}dialog button,dialog a{color:#c4b5fd;background:#1e293b;border:1px solid #475569;border-radius:8px;padding:8px;cursor:pointer}.full{height:calc(100% - 70px);overflow:auto;background:#07101d}.full img{max-width:none;width:auto;height:auto;display:block}@media(max-width:720px){body{padding:14px}.pair{grid-template-columns:1fr}h1{font-size:24px}dialog header{font-size:12px}}
</style><h1>${escape(manifest.title)}</h1><p>${escape(manifest.description || '')}</p><p>Every screenshot is embedded in this file. Click a preview to inspect its original pixels; the full-resolution viewer scrolls without rescaling.</p>${sections}
<dialog id="viewer" aria-labelledby="image-title"><header><span id="image-title"></span><a id="download" download="heavenly-capture.png">Download PNG</a><button id="close" type="button">Close</button></header><div class="full"><img id="full-image" alt="Full-resolution screenshot"></div></dialog><script>
const viewer=document.getElementById('viewer'),full=document.getElementById('full-image');document.querySelectorAll('.preview').forEach(button=>button.addEventListener('click',()=>{full.src=button.querySelector('img').src;document.getElementById('download').href=full.src;document.getElementById('image-title').textContent=button.dataset.title;viewer.showModal()}));document.getElementById('close').onclick=()=>viewer.close();viewer.onclick=e=>{if(e.target===viewer)viewer.close()};
</script></html>`;
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive:true });
fs.writeFileSync(outputPath, document);
console.log(`Built a self-contained report with ${imageCount} embedded PNGs.`);
