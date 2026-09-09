/* Does saturation separate the steel from the wooden shaft/stock? */
const fs=require('fs'), path=require('path');
const KIT='C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer=require(KIT+'/node_modules/puppeteer-core');
const CHROME=KIT+'/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const CUT=path.join(__dirname,"cut");
const WORK=`async (uri)=>{
  const img=new Image(); img.src=uri; await img.decode();
  const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
  const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0);
  const px=x.getImageData(0,0,c.width,c.height).data;
  const bins=new Array(20).fill(0); let n=0;
  for(let i=0;i<c.width*c.height;i++){
    if(px[i*4+3]<16) continue;
    const r=px[i*4]/255,g=px[i*4+1]/255,b=px[i*4+2]/255;
    const mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2;
    const s = mx===mn?0:(l>0.5?(mx-mn)/(2-mx-mn):(mx-mn)/(mx+mn));
    bins[Math.min(19,Math.floor(s*20))]++; n++;
  }
  return {n, bins};
}`;
(async()=>{
  const br=await puppeteer.launch({executablePath:CHROME,headless:true,args:['--allow-file-access-from-files']});
  const p=await br.newPage(); await p.setContent('<body></body>',{waitUntil:'load'});
  const fn=await p.evaluateHandle('('+WORK+')');
  for(const id of process.argv.slice(2)){
    const f=path.join(CUT,id+'__painted.png');
    if(!fs.existsSync(f)){ console.log(id+': no cut'); continue; }
    const uri='data:image/png;base64,'+fs.readFileSync(f).toString('base64');
    const r=await p.evaluate((g,u)=>g(u), fn, uri);
    const pct=r.bins.map(b=>Math.round(b/r.n*100));
    console.log(id.padEnd(26)+' sat histogram (0.00 -> 1.00, % of opaque px)');
    console.log('  '+pct.map((v,i)=>String(v).padStart(3)).join('')); 
    let below=0; for(let i=0;i<5;i++) below+=r.bins[i];
    console.log('  sat<0.25: '+Math.round(below/r.n*100)+'%   sat>=0.25: '+Math.round((1-below/r.n)*100)+'%\n');
  }
  await br.close();
})().catch(e=>{console.error(e);process.exit(1);});
