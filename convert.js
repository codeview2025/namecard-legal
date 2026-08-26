// Minimal Markdown -> HTML converter tailored to NameCard legal text structure.
const fs = require('fs');
const path = require('path');

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  s = escapeHtml(s);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1">$1</a>');
  return s;
}

function convert(md) {
  const lines = md.split('\n');
  let html = '';
  let i = 0;
  let inOl = false;
  let inUl = false;
  let inSubUl = false;

  function closeLists() {
    if (inSubUl) { html += '</ul>'; inSubUl = false; }
    if (inOl) { html += '</ol>\n'; inOl = false; }
    if (inUl) { html += '</ul>\n'; inUl = false; }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { closeLists(); i++; continue; }

    if (line.trim() === '---') { closeLists(); html += '<hr>\n'; i++; continue; }

    let m;
    if ((m = line.match(/^# (.+)$/))) { closeLists(); html += `<h1>${inline(m[1])}</h1>\n`; i++; continue; }
    if ((m = line.match(/^## (.+)$/))) { closeLists(); html += `<h2>${inline(m[1])}</h2>\n`; i++; continue; }
    if ((m = line.match(/^### (.+)$/))) { closeLists(); html += `<h3>${inline(m[1])}</h3>\n`; i++; continue; }

    // Table block
    if (line.trim().startsWith('|')) {
      closeLists();
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim());
        i++;
      }
      const header = rows[0].split('|').slice(1, -1).map((c) => c.trim());
      const body = rows.slice(2).map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
      html += '<div class="table-wrap"><table>\n<thead><tr>' +
        header.map((h) => `<th>${inline(h)}</th>`).join('') +
        '</tr></thead>\n<tbody>\n';
      for (const r of body) {
        html += '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>\n';
      }
      html += '</tbody></table></div>\n';
      continue;
    }

    // Indented sub-list: Korean lettering (가./나./다.) or a nested "- " bullet
    if ((m = line.match(/^\s+(?:(?:가|나|다|라|마)\.|-)\s+(.+)$/))) {
      if (!inSubUl) { html += '<ul class="sub">'; inSubUl = true; }
      html += `<li>${inline(m[1])}</li>`;
      i++;
      continue;
    }
    if (inSubUl) { html += '</ul>'; inSubUl = false; }

    // Ordered list (1. 2. 3.)
    if ((m = line.match(/^(\d+)\.\s+(.+)$/))) {
      if (!inOl) { closeLists(); html += '<ol>\n'; inOl = true; }
      html += `<li>${inline(m[2])}</li>\n`;
      i++;
      continue;
    }
    if (inOl && !line.match(/^\s+(가|나|다|라|마)\./)) { html += '</ol>\n'; inOl = false; }

    // Unordered list (- item)
    if ((m = line.match(/^- (.+)$/))) {
      if (!inUl) { closeLists(); html += '<ul>\n'; inUl = true; }
      html += `<li>${inline(m[1])}</li>\n`;
      i++;
      continue;
    }
    if (inUl) { html += '</ul>\n'; inUl = false; }

    // Plain paragraph
    html += `<p>${inline(line)}</p>\n`;
    i++;
  }
  closeLists();
  return html;
}

function page(title, bodyHtml) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | NameCard</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; padding: 0;
    background: #f5f7fb;
    color: #1a1f36;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
    line-height: 1.7;
  }
  .wrap { max-width: 780px; margin: 0 auto; padding: 32px 20px 80px; }
  .topbar { display: flex; align-items: center; gap: 8px; padding: 16px 20px; max-width: 780px; margin: 0 auto; }
  .topbar a { color: #2563EB; text-decoration: none; font-weight: 600; font-size: 14px; }
  .card { background: #fff; border-radius: 16px; padding: 32px 36px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04); }
  h1 { font-size: 26px; margin: 0 0 8px; color: #0f172a; }
  h2 { font-size: 19px; margin: 32px 0 12px; color: #0f172a; border-top: 1px solid #e5e9f0; padding-top: 24px; }
  h1 + h2, h1 ~ p:first-of-type { border-top: none; padding-top: 0; margin-top: 8px; }
  h3 { font-size: 16px; margin: 20px 0 8px; color: #1e293b; }
  p { margin: 8px 0; color: #334155; font-size: 14.5px; }
  strong { color: #0f172a; }
  a { color: #2563EB; }
  ul, ol { padding-left: 22px; margin: 8px 0; color: #334155; font-size: 14.5px; }
  ul.sub { padding-left: 20px; margin: 4px 0; }
  li { margin: 4px 0; }
  hr { border: none; border-top: 1px solid #e5e9f0; margin: 28px 0; }
  .table-wrap { overflow-x: auto; margin: 12px 0; }
  table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; color: #0f172a; }
  .footer { text-align: center; color: #94a3b8; font-size: 12.5px; margin-top: 40px; }
</style>
</head>
<body>
  <div class="topbar"><a href="./index.html">&larr; NameCard 안내 페이지</a></div>
  <div class="wrap">
    <div class="card">
${bodyHtml}
    </div>
    <div class="footer">NameCard by SoftDino(재능기부)</div>
  </div>
</body>
</html>
`;
}

const dir = __dirname;
const termsMd = fs.readFileSync(path.join(dir, 'terms.md'), 'utf8');
const privacyMd = fs.readFileSync(path.join(dir, 'privacy.md'), 'utf8');

fs.writeFileSync(path.join(dir, 'terms.html'), page('이용약관', convert(termsMd)));
fs.writeFileSync(path.join(dir, 'privacy.html'), page('개인정보처리방침', convert(privacyMd)));

const indexHtml = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NameCard 안내 페이지</title>
<style>
  body { margin:0; background:#f5f7fb; color:#1a1f36; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif; }
  .wrap { max-width:560px; margin:0 auto; padding:80px 20px; text-align:center; }
  h1 { font-size:24px; margin-bottom:8px; }
  p.sub { color:#64748b; margin-bottom:32px; }
  .links { display:flex; flex-direction:column; gap:12px; }
  a.btn { display:block; background:#fff; border-radius:12px; padding:16px; text-decoration:none; color:#0f172a; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,0.06),0 8px 24px rgba(0,0,0,0.04); }
  a.btn span { display:block; font-weight:400; color:#64748b; font-size:13px; margin-top:2px; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>NameCard</h1>
    <p class="sub">SoftDino(재능기부)</p>
    <div class="links">
      <a class="btn" href="./privacy.html">개인정보처리방침<span>Privacy Policy</span></a>
      <a class="btn" href="./terms.html">서비스 이용약관<span>Terms of Service</span></a>
    </div>
  </div>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), indexHtml);

console.log('Generated index.html, privacy.html, terms.html');
