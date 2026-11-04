// Device-matrix smoke test (emulated viewports/user agents in headless Chrome; NOT real devices or Safari).
// Start Chrome: chrome --headless=new --remote-debugging-port=9333 about:blank, then: node scripts/device-matrix.mjs <outdir>
// Edit B (site address) and SHARE (a valid share path) at the top. Writes <outdir>/matrix.json.
import fs from "node:fs";
const B=process.env.B||"http://192.168.1.166:3040";
const SHARE="/s/Xi9CpuR71PngdM4ph6RF05xOsoplPRd28OkNG_2PDJo";
const pages=["/","/services","/packages","/photobooth","/software/photobooth","/software/photobooth/pricing","/3d-printing","/about","/contact","/enquiry","/account/login",SHARE];
const UA={ios:"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
 ipad:"Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
 android:"Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
 desk:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"};
const devices=[["iPhone SE",375,667,2,true,UA.ios],["iPhone 15 Pro Max",430,932,3,true,UA.ios],["Galaxy S23",360,780,3,true,UA.android],["Pixel 7",412,915,2.6,true,UA.android],["iPad portrait",768,1024,2,true,UA.ipad],["iPad landscape",1024,768,2,true,UA.ipad],["Laptop 1366",1366,768,1,false,UA.desk],["Desktop 1920",1920,1080,1,false,UA.desk]];
const list=await (await fetch("http://127.0.0.1:9333/json")).json();
const ws=new WebSocket(list.find(t=>t.type==="page").webSocketDebuggerUrl);
let id=0;const pending=new Map();let logs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result)}else if(m.method==="Runtime.exceptionThrown")logs.push("EXC "+(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text).slice(0,120));else if(m.method==="Runtime.consoleAPICalled"&&m.params.type==="error")logs.push("ERR "+m.params.args.map(a=>a.value??a.description).join(" ").slice(0,120));else if(m.method==="Network.responseReceived"&&m.params.response.status>=400)logs.push("HTTP "+m.params.response.status+" "+m.params.response.url.slice(0,80))};
const send=(method,params={})=>new Promise(r=>{const i=++id;pending.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
await new Promise(r=>ws.onopen=r);await send("Runtime.enable");await send("Page.enable");await send("Network.enable");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async x=>(await send("Runtime.evaluate",{expression:x,awaitPromise:true,returnByValue:true})).result?.value;
const probe=`(()=>{const vw=innerWidth;const over=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>vw+2&&getComputedStyle(e).position!=='fixed'}).length;
const tiny=[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<11.5&&e.getBoundingClientRect().width>0).length;
const small=[...document.querySelectorAll('a,button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<32||r.width<32)&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[aria-hidden=true]')}).length;
const imgs=[...document.images];const broken=imgs.filter(i=>i.complete&&i.naturalWidth===0&&i.src).length;
return JSON.stringify({sw:document.documentElement.scrollWidth,vw,hs:document.documentElement.scrollWidth>vw+2,over,tiny,small,broken,imgs:imgs.length,len:document.body.innerText.length,font:getComputedStyle(document.body).fontFamily.slice(0,30)})})()`;
const rows=[];
for(const [name,w,h,dpr,mobile,ua] of devices){
  await send("Emulation.setUserAgentOverride",{userAgent:ua});
  await send("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:dpr,mobile});
  await send("Emulation.setTouchEmulationEnabled",{enabled:mobile});
  for(const p of pages){ logs=[]; await send("Page.navigate",{url:B+p}); await sleep(3500);
    let r={}; try{r=JSON.parse(await ev(probe))}catch{r={err:"probe failed"}}
    rows.push({device:name,page:p===SHARE?"/s/…":p,...r,logs:[...new Set(logs)].slice(0,3)});
    process.stdout.write(".");
  }
}
fs.writeFileSync(process.argv[2]+"/matrix.json",JSON.stringify(rows,null,1));
console.log("\ndone",rows.length);ws.close();process.exit(0);
