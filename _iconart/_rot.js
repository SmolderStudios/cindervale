/* Rotate a raw crop before keying, to test whether a long thin subject reads
 * better on the diagonal. A vertical longbow letterboxes into a hairline: the
 * square tile is sized by the bow's HEIGHT, so its width lands at 7% of the tile. */
const fs=require('fs'),path=require('path');
const KIT='C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer=require(KIT+'/node_modules/puppeteer-core');
const CHROME=KIT+'/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const RAW=path.join(__dirname,'raw');
const WORK=`async (uri, deg) => {
  const img=new Image(); img.src=uri; await img.decode();
  const r=deg*Math.PI/180, W=img.width, H=img.height;
  const w2=Math.abs(W*Math.cos(r))+Math.abs(H*Math.sin(r));
  const h2=Math.abs(W*Math.sin(r))+Math.abs(H*Math.cos(r));
  const c=document.createElement('canvas'); c.width=Math.ceil(w2); c.height=Math.ceil(h2);
  const x=c.getContext('2d');
  x.fillStyle='#ffffff'; x.fillRect(0,0,c.width,c.height);
  x.translate(c.width/2,c.height/2); x.rotate(r); x.drawImage(img,-W/2,-H/2);
  return c.toDataURL('image/png');
}`;
(async()=>{
  const jobs=[]; const a=process.argv.slice(2);
  for(let i=0;i<a.length;i+=3) jobs.push([a[i],a[i+1],+a[i+2]]);
  const br=await puppeteer.launch({executablePath:CHROME,headless:true});
  const p=await br.newPage(); await p.setContent('<body></body>',{waitUntil:'load'});
  const fn=await p.evaluateHandle('('+WORK+')');
  for(const [src,dst,deg] of jobs){
    const f=path.join(RAW,src+'__painted.png');
    if(!fs.existsSync(f)){ console.log('no raw for '+src); continue; }
    const uri='data:image/png;base64,'+fs.readFileSync(f).toString('base64');
    const out=await p.evaluate((g,u,d)=>g(u,d), fn, uri, deg);
    fs.writeFileSync(path.join(RAW,dst+'__painted.png'), Buffer.from(out.split(',')[1],'base64'));
    console.log(src+' -> '+dst+'  ('+deg+' deg)');
  }
  await br.close();
})().catch(e=>{console.error(e);process.exit(1);});
