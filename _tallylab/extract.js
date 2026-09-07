const fs=require('fs'),path=require('path');
const h=fs.readFileSync(path.join(__dirname,'..','cindervale.html'),'utf8');
module.exports=function grab(id){
  // find the ICONS registry entry: "\n  <id>: '<svg" ... "</svg>'"
  const key='\n  '+id+':';
  let i=-1;
  for(;;){
    i=h.indexOf(key,i+1);
    if(i<0) return null;
    const after=h.slice(i+key.length, i+key.length+40).trimStart();
    if(after.startsWith("'<svg")) break;
  }
  const s=h.indexOf("'<svg",i)+1;
  const e=h.indexOf('</svg>',s)+6;
  return h.slice(s,e).replace(/\'/g,"'");
};
