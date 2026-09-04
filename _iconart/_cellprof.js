'use strict';
const fs=require('fs'),path=require('path');
const KIT='C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer=require(KIT+'/node_modules/puppeteer-core');
const CHROME=KIT+'/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const [,,sheet,gr,idx]=process.argv;
const [C,R]=gr.split('x').map(Number); const I=+idx;
const WORK=`async (uri,C,R,I)=>{
  const img=new Image(); img.src=uri; await img.decode();
  const W=img.width,H=img.height;
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0);
  const px=x.getImageData(0,0,W,H).data;
  const lum=i=>(px[i*4]*299+px[i*4+1]*587+px[i*4+2]*114)/1000;
  const bg=[0,W-1,(H-1)*W,W*H-1].map(lum).reduce((a,b)=>a+b,0)/4;
  const isInk=i=>px[i*4+3]>24&&lum(i)<bg-8;
  const cw=W/C,ch=H/R,r=Math.floor(I/C),k=I%C;
  const x0=Math.round(k*cw),x1=Math.round((k+1)*cw)-1,y0=Math.round(r*ch),y1=Math.round((r+1)*ch)-1;
  const out=[];
  for(let y=y0;y<=y1;y++){let n=0,mn=-1,mx=-1;
    for(let X=x0;X<=x1;X++) if(isInk(y*W+X)){n++;if(mn<0)mn=X;mx=X;}
    out.push([y-y0,n,mx<0?0:+(n/(mx-mn+1)).toFixed(2)]);}
  return {x0,x1,y0,y1,out};
}`;
(async()=>{const uri='data:image/png;base64,'+fs.readFileSync(path.resolve(__dirname,sheet)).toString('base64');
const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});const p=await b.newPage();
const r=await p.evaluate(new Function('return '+WORK)(),uri,C,R,I);await b.close();
console.log('cell',r.x0,r.y0,'-',r.x1,r.y1);
console.log(r.out.filter(q=>q[0]<70).map(q=>q.join(':')).join(' '));})();
