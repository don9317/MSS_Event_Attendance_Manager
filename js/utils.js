const $=id=>document.getElementById(id);
const clean=v=>(v??'').toString().trim();
const low=v=>clean(v).toLowerCase();
const today=()=>new Date().toISOString().slice(0,10);
const nowTime=()=>new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
function csvEscape(v){v=clean(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));a.download=name;document.body.appendChild(a);a.click();a.remove();}
function parseCSV(text){const rows=[];let row=[],cur='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(cur);cur='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cur);if(row.some(x=>clean(x)!==''))rows.push(row);row=[];cur='';}else cur+=c;}row.push(cur);if(row.some(x=>clean(x)!==''))rows.push(row);if(!rows.length)return[];const headers=rows.shift().map(h=>clean(h));return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));}
function pick(obj,names){const keys=Object.keys(obj);for(const n of names){let k=keys.find(k=>low(k)===low(n));if(k)return clean(obj[k]);k=keys.find(k=>low(k).includes(low(n)));if(k)return clean(obj[k]);}return'';}
function normPhone(p){return clean(p).replace(/[^0-9]/g,'');}
function makeId(p){return [p.type,p.name,p.team,p.phone].map(low).join('|').replace(/[^a-z0-9|]/g,'');}
function requiresWaiver(p){return !!(appSettings.ruleWaiver&&((p.type==='Public'&&appSettings.ruleWaiverPublic)||(p.type==='Swarm'&&appSettings.ruleWaiverSwarm)||(!['Public','Swarm'].includes(p.type)&&appSettings.ruleWaiverPublic)));}
function needsWaiver(p){return requiresWaiver(p)&&!p.waiver;}
function selectedDay(){return $('dayFilter')?.value||appSettings.days[0]?.date||today();}
function selectedSession(){return $('sessionFilter')?.value||appSettings.days.find(d=>d.date===selectedDay())?.sessions[0]||'Session 1';}
function slotKey(day=selectedDay(),session=selectedSession()){return `${day}|${session}`;}
function slotRecord(p,key=slotKey()){p.attendance=p.attendance||{};return p.attendance[key]||null;}
function isChecked(p,key=slotKey()){return !!slotRecord(p,key)?.checked;}
function arrivalFor(p,key=slotKey()){return slotRecord(p,key)?.arrival||'';}
function effectiveSession(p){return selectedSession()||p.session||'';}
function publicMatchesSession(p,sess){if(!sess||sess==='all')return true;const ps=low(p.session);const ss=low(sess);return ps===ss||ps.includes(ss)||ss.includes(ps)||ps==='registered'||ps==='whole camp'||ps==='all sessions';}
function visiblePeople(){const s=$('search')?low($('search').value):'';const sess=selectedSession();const source=$('typeFilter')?.value||'all';const stat=$('statusFilter')?.value||'all';return people.filter(p=>{if(source!=='all'&&p.source!==source)return false;if(p.type==='Public'&&!publicMatchesSession(p,sess))return false;const checked=isChecked(p);if(stat==='checked'&&!checked)return false;if(stat==='notchecked'&&checked)return false;if(stat==='waiver'&&!needsWaiver(p))return false;if(s&&!low([p.name,p.parent,p.email,p.phone,p.team,p.session,p.memberId,p.qr].join(' ')).includes(s))return false;return true;});}
function formatDayLabel(d){const dt=new Date(d.date+'T12:00:00');const pretty=isNaN(dt)?d.date:dt.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});return `${d.label||'Day'} — ${pretty}`;}
