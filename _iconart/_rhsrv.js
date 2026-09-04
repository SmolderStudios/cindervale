const http=require('http'),fs=require('fs'),p=require('path');
http.createServer((q,r)=>{let f=p.join('C:/code/embervale/_iconart',decodeURIComponent(q.url.split('?')[0]));
try{const b=fs.readFileSync(f);r.writeHead(200,{'Content-Type':f.endsWith('.png')?'image/png':'text/html'});r.end(b);}catch(e){r.writeHead(404);r.end('no');}}).listen(8834,()=>console.log('up 8834'));
