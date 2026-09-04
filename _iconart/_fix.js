const fs=require('fs'),path=require('path');
const P=path.join(__dirname,'subjects5.js');
let s=fs.readFileSync(P,'utf8');
// Any S('id', '...') whose prompt is a bare literal (no "+ STYLE") gains it.
s=s.replace(/S\('([a-z_0-9]+)',\s*'((?:[^'\]|\.)*)'(\s*(?:,|\)))/g,
  (m,id,body,tail)=>`S('${id}', '${body}' + STYLE${tail}`);
fs.writeFileSync(P,s);
console.log('patched');
