/* Measure each monster sheet's row gutter AND the column gutters inside each row.
 *
 *     node _iconart/_rowsplit.js           human readable
 *     node _iconart/_rowsplit.js --json    JSON for the plan generator
 *
 * A row is ARTWORK if its ink comes in long runs; caption rows are many short marks.
 * The row split is the last non-art row before the lower band's artwork starts. Inside
 * a band, columns are the widest blank gutters measured over art rows only, which is
 * what stops an equal division slicing a neighbour's wing into the cell next door.
 */
'use strict';
const fs=require('fs'), path=require('path');
const KIT='C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer=require(KIT+'/node_modules/puppeteer-core');
const CHROME=KIT+'/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const DIR=path.join(__dirname,'sheets');
const JSONOUT=process.argv.includes('--json');

const WORK=`async (uri, nTop, nBot) => {
  const img=new Image(); img.src=uri; await img.decode();
  const W=img.width,H=img.height;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0);
  const px=x.getImageData(0,0,W,H).data;
  const lum=i=>(px[i*4]*299+px[i*4+1]*587+px[i*4+2]*114)/1000;
  const bg=[0,W-1,(H-1)*W,W*H-1].map(lum).reduce((a,b)=>a+b,0)/4, INK=bg-8;
  const on=i=>px[i*4+3]>24 && lum(i)<INK;
  const art=[];
  for(let y=0;y<H;y++){ let n=0,runs=0,was=false;
    for(let X=0;X<W;X++){ const o=on(y*W+X); if(o){n++; if(!was) runs++;} was=o; }
    art.push(runs>0 && n/runs>=12 ? 1:0); }
  const gaps=[]; let s=-1;
  for(let y=0;y<H;y++){ if(!art[y]){ if(s<0) s=y; } else { if(s>=0) gaps.push([s,y-1]); s=-1; } }
  if(s>=0) gaps.push([s,H-1]);
  const mid=gaps.filter(g=>{const m=(g[0]+g[1])/2; return m>H*0.2 && m<H*0.8;})
                .sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));
  const split=mid.length?mid[0][1]:Math.round(H/2);
  /* Column edges as the DEEPEST VALLEY near each equal-division boundary, not as a
     blank gutter: on these sheets the creatures' tails and wings overlap, so several
     rows have no fully empty column anywhere and a blank test returns one cell for
     three creatures. A valley still exists wherever two silhouettes meet. */
  const colsFor=(y0,y1,N)=>{
    const colInk=new Int32Array(W);
    for(let X=0;X<W;X++){ let n=0; for(let y=y0;y<=y1;y++) if(art[y] && on(y*W+X)) n++; colInk[X]=n; }
    const edges=[0]; const cw=W/N; let zeros=0;
    for(let k=1;k<N;k++){
      const target=Math.round(k*cw), win=Math.round(cw*0.34);
      let lo=Math.max(1,target-win), hi=Math.min(W-2,target+win);
      let best=-1, bestInk=Infinity;
      for(let X=lo;X<=hi;X++){
        const v=colInk[X];
        if(v<bestInk || (v===bestInk && Math.abs(X-target)<Math.abs(best-target))){ bestInk=v; best=X; }
      }
      /* If the valley bottoms out at zero, centre the edge in that zero run. */
      if(bestInk===0){
        let a=best,b2=best;
        while(a>lo && colInk[a-1]===0) a--;
        while(b2<hi && colInk[b2+1]===0) b2++;
        best=Math.round((a+b2)/2); zeros++;
      }
      edges.push(best);
    }
    edges.push(W);
    return {edges, found:zeros};
  };
  const top=colsFor(0,split,nTop), bot=colsFor(split+1,H-1,nBot);
  return JSON.stringify({W,H,split,top,bot});
}`;

(async()=>{
  const b=await puppeteer.launch({executablePath:CHROME,headless:true,args:['--allow-file-access-from-files']});
  const p=await b.newPage(); await p.setContent('<body></body>',{waitUntil:'load'});
  const fn=await p.evaluateHandle(`(${WORK})`);
  const out={};
  for(const f of fs.readdirSync(DIR).filter(f=>/^mon_.*\.png$/.test(f)).sort()){
    const zone=f.replace(/^mon_|\.png$/g,'');
    const ids=fs.readFileSync(path.join(DIR,'mon_'+zone+'.txt'),'utf8').split('\n').map(s=>s.trim()).filter(Boolean);
    const nTop=ids.length===5?3:2, nBot=ids.length-nTop;
    const uri='data:image/png;base64,'+fs.readFileSync(path.join(DIR,f)).toString('base64');
    const r=JSON.parse(await p.evaluate((fn,u,a,c)=>fn(u,a,c),fn,uri,nTop,nBot));
    out[zone]={...r,ids,nTop,nBot};
    if(!JSONOUT) console.log(zone.padEnd(18)+r.W+'x'+r.H+'  split '+r.split
      +'  top '+r.top.edges.join(',')+' (gutters '+r.top.found+')'
      +'  bot '+r.bot.edges.join(',')+' ('+r.bot.found+')');
  }
  await b.close();
  if(JSONOUT) fs.writeFileSync(path.join(__dirname,'_rowsplit.json'), JSON.stringify(out));
})();
