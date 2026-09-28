import {AEROS,MAPPING_TEXT} from './data/mapping';
export type Metrics={noticeGenerated:number;noticeDelivered:number;deliveredPct:number;hearingLapse:number;hearingHeld:number;heldLapsed:number;heldLapsedPct:number;parked:number};
export type MappingRow={ps:number;bloName:string;bloMobile:string;supervisor:string;aero:string;aeroMobile:string};
export type Snapshot={id:string;name:string;uploadedAt:string;sourceType:'detailed'|'aggregate';rows:Record<number,Metrics>;aggregate:Metrics|null};
const ZERO:Metrics={noticeGenerated:0,noticeDelivered:0,deliveredPct:0,hearingLapse:0,hearingHeld:0,heldLapsed:0,heldLapsedPct:0,parked:0};
export const MASTER:MappingRow[]=MAPPING_TEXT.split('\n').map(line=>{const [ps,ai,supervisor,bloName,bloMobile]=line.split('|');const a=AEROS[Number(ai)];return {ps:Number(ps),supervisor,bloName,bloMobile,aero:a.name,aeroMobile:a.mobile}});
const norm=(s:string)=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function num(v:any){if(typeof v==='number')return v;const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0}
export function pct(a:number,b:number){return b?Math.round(a/b*10000)/100:0}
export function parseWorkbook(rows:any[][]){
 const non=rows.filter(r=>r.some((x:any)=>String(x??'').trim()!==''));
 const headers=(non[0]||[]).map((x:any)=>String(x??''));const body=non.slice(1);const nh=headers.map(norm);
 const find=(names:string[])=>nh.findIndex(h=>names.some(n=>h.includes(norm(n))));
 const psIdx=nh.findIndex(h=>h==='ps'||h.includes('ps no')||h.includes('ps number')||h.includes('part no')||h.includes('part number'));
 const idx={gen:find(['notice generated']),del:find(['notice delivered']),lapse:find(['hearing date lapsed','hearing lapse']),held:find(['hearing held']),park:find(['parked for final publication'])};
 if(psIdx>=0&&body.some(r=>/^\d+$/.test(String(r[psIdx]??'').trim()))){
  const out:Record<number,Metrics>={};
  for(const r of body){const ps=num(r[psIdx]);if(!ps)continue;const gen=num(r[idx.gen]),del=num(r[idx.del]),lapse=num(r[idx.lapse]),held=num(r[idx.held]),park=num(r[idx.park]);out[ps]={noticeGenerated:gen,noticeDelivered:del,deliveredPct:pct(del,gen),hearingLapse:lapse,hearingHeld:held,heldLapsed:lapse+held,heldLapsedPct:pct(lapse+held,gen),parked:park}}
  return {sourceType:'detailed' as const,rows:out,aggregate:null};
 }
 const data=body.find(r=>r.some((x:any)=>typeof x==='number'))||[];const gen=num(data[0]),del=num(data[3]),held=num(data[5]),lapse=num(data[6]),park=num(data[13]);
 return {sourceType:'aggregate' as const,rows:{},aggregate:{noticeGenerated:gen,noticeDelivered:del,deliveredPct:pct(del,gen),hearingLapse:lapse,hearingHeld:held,heldLapsed:lapse+held,heldLapsedPct:pct(lapse+held,gen),parked:park}};
}
export function aeroTotals(snapshot:Snapshot){return AEROS.map(a=>{const rows=MASTER.filter(r=>r.aero===a.name);const m=rows.reduce((x,r)=>{const v=snapshot.rows[r.ps]||ZERO;x.noticeGenerated+=v.noticeGenerated;x.noticeDelivered+=v.noticeDelivered;x.hearingLapse+=v.hearingLapse;x.hearingHeld+=v.hearingHeld;x.parked+=v.parked;return x},{...ZERO});const heldLapsed=m.hearingLapse+m.hearingHeld;return {...a,count:rows.length,supervisorCount:new Set(rows.map(r=>r.supervisor)).size,...m,deliveredPct:pct(m.noticeDelivered,m.noticeGenerated),heldLapsed,heldLapsedPct:pct(heldLapsed,m.noticeGenerated)}})}
export function grand(snapshot:Snapshot){if(snapshot.aggregate)return snapshot.aggregate;return aeroTotals(snapshot).reduce((x,r)=>{x.noticeGenerated+=r.noticeGenerated;x.noticeDelivered+=r.noticeDelivered;x.hearingLapse+=r.hearingLapse;x.hearingHeld+=r.hearingHeld;x.parked+=r.parked;return x},{...ZERO});}
