import {AEROS,MAPPING_TEXT} from './data/mapping';
export {AEROS};
export type Metrics={noticeGenerated:number;noticeDelivered:number;deliveredPct:number;hearingLapse:number;hearingHeld:number;heldLapsed:number;heldLapsedPct:number;parked:number};
export type MappingRow={ps:number;bloName:string;bloMobile:string;supervisor:string;aero:string;aeroMobile:string};
export type Snapshot={id:string;name:string;uploadedAt:string;sourceType:'detailed'|'aggregate';rows:Record<number,Metrics>;aggregate:Metrics|null};
const ZERO:Metrics={noticeGenerated:0,noticeDelivered:0,deliveredPct:0,hearingLapse:0,hearingHeld:0,heldLapsed:0,heldLapsedPct:0,parked:0};
export const MASTER:MappingRow[]=MAPPING_TEXT.split('\n').map(line=>{const [ps,ai,supervisor,bloName,bloMobile]=line.split('|');const a=AEROS[Number(ai)];return {ps:Number(ps),supervisor,bloName,bloMobile,aero:a.name,aeroMobile:a.mobile}});
const norm=(s:string)=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function num(v:any){if(typeof v==='number')return v;const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0}
export function pct(a:number,b:number){return b?Math.round(a/b*10000)/100:0}
function headerIndex(headers:string[],names:string[]){return headers.findIndex(h=>names.some(n=>h===norm(n)||h.includes(norm(n))))}
export function parseWorkbook(rows:any[][]){
 const non=rows.filter(r=>r.some((x:any)=>String(x??'').trim()!==''));
 if(!non.length)return {sourceType:'aggregate' as const,rows:{},aggregate:null};
 const headerAt=non.findIndex(r=>{const h=r.map((x:any)=>norm(x));return h.some(x=>x==='part no'||x==='part number'||x==='ps no'||x==='ps number'||x.includes('notice generated'))});
 const header=non[headerAt>=0?headerAt:0]||[];
 const next=non[(headerAt>=0?headerAt:0)+1]||[];
 const headerNorm=header.map((x:any)=>norm(x));
 const nextLooksLikeHeader=next.some((x:any)=>{const s=norm(x);return s==='part no'||s.includes('notice generated')||s.includes('notice delivered')||s.includes('hearings held')||s.includes('hearing date lapsed')});
 const body=non.slice((headerAt>=0?headerAt:0)+(nextLooksLikeHeader?2:1));
 const headers=header.map((x:any)=>String(x??''));
 const psIdx=headerNorm.findIndex(h=>h==='part no'||h==='part number'||h==='ps'||h==='ps no'||h==='ps number'||h.includes('part no.')||h.includes('part number'));
 const idx={
  gen:headerIndex(headers,['Notice Generated']),
  del:headerIndex(headers,['Notice Delivered']),
  lapse:headerIndex(headers,['Hearing Date Lapsed','Hearing Lapse']),
  held:headerIndex(headers,['Hearings Held','Hearing Held']),
  park:headerIndex(headers,['ERO/AERO Status Parked For Final Publication','Parked for Final Publication'])
 };
 if(psIdx>=0&&body.some(r=>/^\d+$/.test(String(r[psIdx]??'').trim()))){
  const out:Record<number,Metrics>={};
  for(const r of body){
   const ps=num(r[psIdx]); if(!ps)continue;
   const gen=num(r[idx.gen]),del=num(r[idx.del]),lapse=num(r[idx.lapse]),held=num(r[idx.held]),park=num(r[idx.park]);
   out[ps]={noticeGenerated:gen,noticeDelivered:del,deliveredPct:pct(del,gen),hearingLapse:lapse,hearingHeld:held,heldLapsed:lapse+held,heldLapsedPct:pct(lapse+held,gen),parked:park};
  }
  return {sourceType:'detailed' as const,rows:out,aggregate:null};
 }
 const data=body.find(r=>r.some((x:any)=>typeof x==='number'))||[];
 const gen=num(data[idx.gen]),del=num(data[idx.del]),held=num(data[idx.held]),lapse=num(data[idx.lapse]),park=num(data[idx.park]);
 return {sourceType:'aggregate' as const,rows:{},aggregate:{noticeGenerated:gen,noticeDelivered:del,deliveredPct:pct(del,gen),hearingLapse:lapse,hearingHeld:held,heldLapsed:lapse+held,heldLapsedPct:pct(lapse+held,gen),parked:park}};
}
export function aeroTotals(snapshot:Snapshot){return AEROS.map(a=>{const rows=MASTER.filter(r=>r.aero===a.name);const m=rows.reduce((x,r)=>{const v=snapshot.rows[r.ps]||ZERO;x.noticeGenerated+=v.noticeGenerated;x.noticeDelivered+=v.noticeDelivered;x.hearingLapse+=v.hearingLapse;x.hearingHeld+=v.hearingHeld;x.parked+=v.parked;return x},{...ZERO});const heldLapsed=m.hearingLapse+m.hearingHeld;return {...a,count:rows.length,supervisorCount:new Set(rows.map(r=>r.supervisor)).size,...m,deliveredPct:pct(m.noticeDelivered,m.noticeGenerated),heldLapsed,heldLapsedPct:pct(heldLapsed,m.noticeGenerated)}})}
export function grand(snapshot:Snapshot){if(snapshot.aggregate)return snapshot.aggregate;return aeroTotals(snapshot).reduce((x,r)=>{x.noticeGenerated+=r.noticeGenerated;x.noticeDelivered+=r.noticeDelivered;x.hearingLapse+=r.hearingLapse;x.hearingHeld+=r.hearingHeld;x.parked+=r.parked;return x},{...ZERO});}
