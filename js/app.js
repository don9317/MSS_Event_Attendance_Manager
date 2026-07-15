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
function recordKey(participantId,day=selectedDay(),session=selectedSession()){return `${participantId}|${day}|${session}`;}
function attendanceFor(p,day=selectedDay(),session=selectedSession()){return attendanceRecords.find(r=>r.participantId===p.id&&r.date===day&&r.session===session)||null;}
function slotRecord(p){return attendanceFor(p);}
function isChecked(p){return attendanceFor(p)?.status==='present';}
function arrivalFor(p){return attendanceFor(p)?.arrival||'';}
function currentArea(p){return attendanceFor(p)?.area||p.areaAssignments?.[slotKey()]||'';}
function areaOptions(p){const cur=currentArea(p);return '<option value=\"\">Select area</option>'+((appSettings.areas||[]).map(a=>`<option value=\"${a.replace(/\"/g,'&quot;')}\" ${a===cur?'selected':''}>${a}</option>`).join(''));}
function assignArea(id,value){const p=people.find(x=>x.id===id);if(!p)return;p.areaAssignments=p.areaAssignments||{};p.areaAssignments[slotKey()]=clean(value);const rec=attendanceFor(p);if(rec)rec.area=clean(value);save();renderAll();}
function renderAreaFilter(){const el=$('areaFilter');if(!el)return;const old=el.value;el.innerHTML='<option value=\"all\">All Areas</option>'+((appSettings.areas||[]).map(a=>`<option value=\"${a.replace(/\"/g,'&quot;')}\">${a}</option>`).join(''));if([...el.options].some(o=>o.value===old))el.value=old;}
function effectiveSession(p){return selectedSession()||p.session||'';}
function publicMatchesSession(p,sess){if(!sess||sess==='all')return true;const ps=low(p.session),ss=low(sess);return !ps||ps===ss||ps.includes(ss)||ss.includes(ps)||['registered','whole camp','all sessions','all'].includes(ps);}
function matchesSearch(p,q){if(!q)return true;const words=low(q).split(/\s+/).filter(Boolean);const hay=low([p.name,p.parent,p.email,p.phone,p.team,p.grade,p.age,p.session,p.memberId,p.qr,p.source,p.type,currentArea(p)].join(' '));return words.every(w=>hay.includes(w));}
function baseCohort(){const sess=selectedSession();const source=$('typeFilter')?.value||'all';const area=$('areaFilter')?.value||'all';return people.filter(p=>{if(source!=='all'&&p.source!==source)return false;if(p.type==='Public'&&!publicMatchesSession(p,sess))return false;if(area!=='all'&&currentArea(p)!==area)return false;return true;});}
function visiblePeople(){const q=$('search')?.value||'';const stat=$('statusFilter')?.value||'all';return baseCohort().filter(p=>{const checked=isChecked(p);if(stat==='checked'&&!checked)return false;if(stat==='notchecked'&&checked)return false;if(stat==='waiver'&&!needsWaiver(p))return false;return matchesSearch(p,q);});}
function formatDayLabel(d){const dt=new Date(d.date+'T12:00:00');const pretty=isNaN(dt)?d.date:dt.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});return `${d.label||'Day'} — ${pretty}`;}
const LS='mssAttendance_v20_';
const OLD_KEYS=['mssAttendance_v13_','mssAttendance_v124_'];
function loadFirst(suffix,fallback){for(const k of [LS,...OLD_KEYS]){const raw=localStorage.getItem(k+suffix);if(raw){try{return JSON.parse(raw)}catch(e){}}}return fallback;}
let people=loadFirst('people',[]);
let legacyHistory=loadFirst('history',[]);
let attendanceRecords=loadFirst('records',[]);
const defaultDays=[{date:today(),label:'Day 1',sessions:['Session 1','Session 2']}];
let appSettings=loadFirst('settings',null)||{activityName:'Multi-Day Event Check-In',activityType:'Camp',days:defaultDays,srcPublic:true,srcSwarm:true,methodQR:false,methodMembership:true,methodManual:true,ruleWaiver:false,ruleWaiverPublic:true,ruleWaiverSwarm:false,ruleHomework:true,ruleArrival:true,ruleSwarmEligible:true,secondarySourceName:'Other Source',ruleRequireGrade:true,ruleAssignArea:false,areas:['Court 1','Court 2','Court 3'],commSender:'',commReplyTo:'',surveyLink:''};
if(!appSettings.days)appSettings.days=[{date:today(),label:'Day 1',sessions:(appSettings.sessions||['Session 1','Session 2']).filter(Boolean)}];
appSettings={ruleWaiverPublic:true,ruleWaiverSwarm:false,secondarySourceName:'Other Source',ruleRequireGrade:true,ruleAssignArea:false,areas:['Court 1','Court 2','Court 3'],commSender:'',commReplyTo:'',surveyLink:'',...appSettings};
function migrateLegacyAttendance(){
 const add=(p,date,session,data={})=>{if(!p||!date||!session)return;const key=recordKey(p.id,date,session);if(attendanceRecords.some(r=>r.key===key||r.participantId===p.id&&r.date===date&&r.session===session))return;attendanceRecords.push({key,participantId:p.id,date,session,status:'present',arrival:data.arrival||data.time||'',homework:Boolean(data.homework??p.homework),area:data.area||'',source:p.source,type:p.type,team:p.team,name:p.name,createdAt:new Date().toISOString()});};
 people.forEach(p=>{Object.entries(p.attendance||{}).forEach(([slot,data])=>{if(!data?.checked)return;const [date,...rest]=slot.split('|');add(p,date,rest.join('|'),data);});delete p.attendance;if(p.checked){const d=appSettings.days[0];add(p,d?.date||today(),p.checkinSession||p.session||d?.sessions?.[0]||'Session 1',{arrival:p.arrival});p.checked=false;}});
 legacyHistory.forEach(h=>{const p=people.find(x=>low(x.name)===low(h.name)&&(!h.type||x.type===h.type));if(p)add(p,h.date||today(),h.session||appSettings.days[0]?.sessions?.[0]||'Session 1',h);});
 attendanceRecords=dedupeRecords(attendanceRecords);
}
function dedupeRecords(rows){const map=new Map();rows.forEach(r=>{const key=r.key||recordKey(r.participantId,r.date,r.session);map.set(key,{...r,key,status:r.status||'present'});});return [...map.values()];}
migrateLegacyAttendance();
let history=attendanceRecords;
let eventArchives=loadFirst('archives',[]);
let waiverTarget=null, sigCanvas=null, sigCtx=null, sigHasInk=false, drawing=false;
function save(){attendanceRecords=dedupeRecords(attendanceRecords);history=attendanceRecords;localStorage.setItem(LS+'people',JSON.stringify(people));localStorage.setItem(LS+'records',JSON.stringify(attendanceRecords));localStorage.setItem(LS+'history',JSON.stringify(attendanceRecords));localStorage.setItem(LS+'settings',JSON.stringify(appSettings));localStorage.setItem(LS+'archives',JSON.stringify(eventArchives));}

function flexiblePick(row, exactNames, containsWords=[]){
  const exact=pick(row,exactNames); if(exact) return exact;
  const keys=Object.keys(row);
  for(const words of containsWords){
    const list=Array.isArray(words)?words:[words];
    const key=keys.find(k=>list.every(w=>low(k).includes(low(w))));
    if(key && clean(row[key])) return clean(row[key]);
  }
  return '';
}
function normalizeRow(row,kind){
  const isMss=kind==='mss';
  const source=isMss?'MSS':(clean($('secondarySourceName')?.value)||clean(appSettings.secondarySourceName)||'Other Source');
  const player=flexiblePick(row,
    isMss?['playerOrTeamName','player/team name','participant','player name','attendee','child name','camper name','athlete name']:
          ['player name','participant name','camper name','athlete name','child name','student name','registrant name','customer name','full name','name','participant','child','athlete','camper'],
    [['player','name'],['participant','name'],['camper','name'],['athlete','name'],['child','name'],['student','name'],['registrant','name']]
  );
  const first=flexiblePick(row,['firstName','first name','player first name','participant first name','camper first name','athlete first name','userFirstName'],[['first','name']]);
  const last=flexiblePick(row,['lastName','last name','player last name','participant last name','camper last name','athlete last name','userLastName'],[['last','name']]);
  const name=player||[first,last].filter(Boolean).join(' ')||flexiblePick(row,['name']);
  const parent=[flexiblePick(row,['userFirstName','parent first name','guardian first name','purchaser first name']),flexiblePick(row,['userLastName','parent last name','guardian last name','purchaser last name'])].filter(Boolean).join(' ')||flexiblePick(row,['parent','guardian','contact','purchaser','buyer name'],[['parent'],['guardian']]);
  const team=flexiblePick(row,['team','team name','division','group','roster','club']);
  const grade=flexiblePick(row,['grade','current grade','school grade','grade level','player grade','participant grade','camper grade']);
  let age=flexiblePick(row,['age','player age','participant age','camper age']);
  const dob=flexiblePick(row,['date of birth','dob','birth date','birthday']);
  if(!age&&dob){const d=new Date(dob);if(!isNaN(d)){const n=new Date();age=String(n.getFullYear()-d.getFullYear()-((n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))?1:0));}}
  const email=flexiblePick(row,['userEmailAddress','email','email address','parent email','guardian email','customer email','buyer email'],[['email']]);
  const phone=flexiblePick(row,['userPhoneNumber','phone','phone number','parent phone','guardian phone','mobile','customer phone'],[['phone'],['mobile']]);
  const className=flexiblePick(row,['activity','class','event','program','product','product name','offer','item','name']);
  let session=flexiblePick(row,['session','session name','time','time slot','group','ticket type','option']);
  if(!session && /beginner/i.test(className)) session=appSettings.days[0]?.sessions[0]||'Beginner';
  if(!session && /intermediate/i.test(className)) session=appSettings.days[0]?.sessions[1]||'Intermediate';
  if(!session) session=className||'All Sessions';
  const waiverText=flexiblePick(row,['waiver','waiver status','signed waiver']);
  const paidText=flexiblePick(row,['paid','payment','paid status','payment status','status','price']);
  const sourceLower=low(source);
  const category=isMss?'MSS':((sourceLower.includes('swarm')||sourceLower.includes('leagueapps'))?'Swarm':'Other');
  const p={type:category,name,parent,email,phone,team:team||'',grade,age,dob,areaAssignments:{},session,source,checked:false,arrival:'',homework:false,waiver:/yes|signed|complete|true|current/i.test(waiverText),paid:isMss?!(/unpaid|failed|pending/i.test(paidText)):true,qr:flexiblePick(row,['qr','qr code','registration id','id','order id','order number']),memberId:flexiblePick(row,['member id','memberId','player id','athlete id','customer id'])};
  if(!p.qr && isMss) p.qr='MSS-'+makeId(p).slice(0,18).toUpperCase();
  if(!p.memberId && !isMss) p.memberId='EXT-'+makeId(p).slice(0,18).toUpperCase();
  p.id=makeId(p); return p;
}
function sameParticipant(a,b){
  if(low(a.name)!==low(b.name)) return false;
  const ae=low(a.email),be=low(b.email),ap=normPhone(a.phone),bp=normPhone(b.phone);
  if(ae&&be&&ae===be) return true;
  if(ap.length>=7&&bp.length>=7&&ap===bp) return true;
  const aparent=low(a.parent),bparent=low(b.parent);
  return !ae&&!be&&!ap&&!bp&&aparent&&bparent&&aparent===bparent;
}
function mergeDuplicate(a,b){
  const mssA=a.source==='MSS',mssB=b.source==='MSS';
  const primary=mssB&&!mssA?b:a;
  const secondary=primary===a?b:a;
  const merged={...secondary,...primary};
  ['name','parent','email','phone','team','session','qr','memberId','guardian','waiverDate','signature'].forEach(k=>{merged[k]=clean(primary[k])||clean(secondary[k]);});
  merged.attendance={...(secondary.attendance||{}),...(primary.attendance||{})};
  merged.homework=!!(a.homework||b.homework);
  merged.waiver=!!(a.waiver||b.waiver);
  merged.paid=!!(a.paid||b.paid);
  merged.id=makeId(merged);
  return merged;
}
function consolidatePeople(list){
  const out=[];
  list.filter(n=>n&&n.name).forEach(n=>{
    const i=out.findIndex(x=>sameParticipant(x,n));
    if(i<0) out.push({...n,attendance:n.attendance||{},id:n.id||makeId(n)});
    else out[i]=mergeDuplicate(out[i],n);
  });
  return out.sort((a,b)=>a.name.localeCompare(b.name));
}
function mergePeople(newOnes){
  const valid=newOnes.filter(n=>n.name);
  people=consolidatePeople([...people,...valid]);
  save(); renderAll();
  return valid.length;
}
function loadCsv(kind){
  const inp=kind==='mss'?$('mssFile'):$('secondaryFile');
  if(!inp?.files?.[0]){alert('Choose a CSV first.');return;}
  if(kind==='secondary'){
    appSettings.secondarySourceName=clean($('secondarySourceName')?.value)||'Other Source';appSettings.areas=clean($('setAreas')?.value).split(',').map(x=>clean(x)).filter(Boolean);appSettings.commSender=clean($('commSender')?.value);appSettings.commReplyTo=clean($('commReplyTo')?.value);appSettings.surveyLink=clean($('surveyLink')?.value);
    save(); updateSecondarySourceLabels();
  }
  const r=new FileReader();
  r.onload=()=>{
    try{
      const rows=parseCSV(r.result);
      if(!rows.length){alert('The CSV did not contain any readable data rows.');return;}
      const normalized=rows.map(row=>normalizeRow(row,kind));
      const count=mergePeople(normalized);
      if(!count){
        const headers=Object.keys(rows[0]||{}).join(', ');
        alert(`No participant names could be identified. CSV columns found: ${headers}`);
        return;
      }
      alert(`${count} participant${count===1?'':'s'} loaded from ${kind==='mss'?'MSS':appSettings.secondarySourceName}.`);
    }catch(err){alert('Could not import this CSV: '+(err?.message||err));}
  };
  r.onerror=()=>alert('The selected CSV could not be read.');
  r.readAsText(inp.files[0]);
}
function clearAll(){if(confirm('Clear all loaded participants and attendance records from this browser?')){people=[];attendanceRecords=[];history=attendanceRecords;save();renderAll();}}

function setupTabs(){document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.tab').forEach(t=>t.classList.add('hidden'));$(b.dataset.tab).classList.remove('hidden');renderAll();});}
function renderDayBuilder(){const count=Number($('setDayCount')?.value||appSettings.days.length||1);const holder=$('dayBuilder');if(!holder)return;const days=[...appSettings.days];while(days.length<count)days.push({date:'',label:`Day ${days.length+1}`,sessions:['Morning Session','Afternoon Session']});holder.innerHTML=days.slice(0,count).map((d,i)=>`<div class="dayCard"><h3>Day ${i+1}</h3><div class="two"><div class="field"><label>Date</label><input type="date" id="dayDate${i}" value="${d.date||''}"></div><div class="field"><label>Day Label</label><input id="dayLabel${i}" value="${d.label||`Day ${i+1}`}"></div></div><div class="two"><div class="field"><label>Session 1</label><input id="daySession1_${i}" value="${d.sessions?.[0]||''}" placeholder="Morning Camp 9:00-12:00"></div><div class="field"><label>Session 2 (optional)</label><input id="daySession2_${i}" value="${d.sessions?.[1]||''}" placeholder="Afternoon Camp 1:00-4:00"></div></div></div>`).join('');}
function applySettingsToUI(){$('activityTitle').textContent=appSettings.activityName;$('activitySub').textContent=`${appSettings.activityType} • up to 5 days and 2 sessions per day`;$('setActivityName').value=appSettings.activityName;$('setActivityType').value=appSettings.activityType;$('setDayCount').value=String(appSettings.days.length);if($('secondarySourceName'))$('secondarySourceName').value=appSettings.secondarySourceName||'Other Source';if($('setAreas'))$('setAreas').value=(appSettings.areas||[]).join(', ');if($('commSender'))$('commSender').value=appSettings.commSender||'';if($('commReplyTo'))$('commReplyTo').value=appSettings.commReplyTo||'';if($('surveyLink'))$('surveyLink').value=appSettings.surveyLink||'';updateSecondarySourceLabels();['srcPublic','srcSwarm','methodQR','methodMembership','methodManual','ruleWaiver','ruleWaiverPublic','ruleWaiverSwarm','ruleHomework','ruleArrival','ruleRequireGrade','ruleAssignArea','ruleSwarmEligible'].forEach(id=>{if($(id))$(id).checked=!!appSettings[id];});$('scanPanel').classList.toggle('hidden',!(appSettings.methodQR||appSettings.methodMembership));renderDayBuilder();const df=$('dayFilter'),oldDay=df.value;df.innerHTML=appSettings.days.map(d=>`<option value="${d.date}">${formatDayLabel(d)}</option>`).join('');df.value=appSettings.days.some(d=>d.date===oldDay)?oldDay:(appSettings.days[0]?.date||today());onDayChange(false);}
function onDayChange(doRender=true){const day=appSettings.days.find(d=>d.date===selectedDay())||appSettings.days[0];const sf=$('sessionFilter'),old=sf.value;sf.innerHTML=(day?.sessions||[]).filter(Boolean).map(s=>`<option value="${s}">${s}</option>`).join('');if([...sf.options].some(o=>o.value===old))sf.value=old;$('datePill').textContent=formatDayLabel(day||{date:today(),label:'Today'});if(doRender)renderAll();}
function updateSecondarySourceLabels(){
  const name=clean($('secondarySourceName')?.value)||appSettings.secondarySourceName||'Other Source';
  if($('secondarySourceLabel'))$('secondarySourceLabel').textContent=`${name} Roster / Registration CSV`;
  if($('secondaryUploadBtn'))$('secondaryUploadBtn').textContent=`Upload ${name} CSV`;
  if($('secondarySourceHelp'))$('secondarySourceHelp').textContent=`Select the CSV exported from ${name}.`;
  if($('srcSwarmLabel'))$('srcSwarmLabel').textContent=`${name} registrations / roster`;
}
function saveSettings(){appSettings.activityName=clean($('setActivityName').value)||'MSS Attendance';appSettings.activityType=$('setActivityType').value;appSettings.secondarySourceName=clean($('secondarySourceName')?.value)||'Other Source';appSettings.areas=clean($('setAreas')?.value).split(',').map(x=>clean(x)).filter(Boolean);appSettings.commSender=clean($('commSender')?.value);appSettings.commReplyTo=clean($('commReplyTo')?.value);appSettings.surveyLink=clean($('surveyLink')?.value);const count=Number($('setDayCount').value);appSettings.days=[];for(let i=0;i<count;i++){const date=$(`dayDate${i}`).value||today();const label=clean($(`dayLabel${i}`).value)||`Day ${i+1}`;const sessions=[clean($(`daySession1_${i}`).value),clean($(`daySession2_${i}`).value)].filter(Boolean);appSettings.days.push({date,label,sessions:sessions.length?sessions:['Session 1']});}['srcPublic','srcSwarm','methodQR','methodMembership','methodManual','ruleWaiver','ruleWaiverPublic','ruleWaiverSwarm','ruleHomework','ruleArrival','ruleRequireGrade','ruleAssignArea','ruleSwarmEligible'].forEach(id=>appSettings[id]=!!$(id).checked);save();applySettingsToUI();renderAll();alert('Multi-day setup saved.');}
function resetSettings(){localStorage.removeItem(LS+'settings');location.reload();}
function renderSourceFilter(){const el=$('typeFilter');if(!el)return;const old=el.value;const sources=[...new Set(people.map(p=>clean(p.source)).filter(Boolean))].sort();el.innerHTML='<option value="all">All Sources</option>'+sources.map(src=>`<option value="${src.replace(/"/g,'&quot;')}">${src}</option>`).join('');if([...el.options].some(o=>o.value===old))el.value=old;}
function personCard(p){const needs=needsWaiver(p),checked=isChecked(p),arrival=arrivalFor(p),area=currentArea(p),missingProfile=appSettings.ruleRequireGrade&&!clean(p.grade)&&!clean(p.age);return `<div class="person ${checked?'checked':''} ${needs||missingProfile?'blocked':''}"><div class="name">${p.name||'(No name)'}</div><div class="meta">${p.source||p.type}${p.team?' • '+p.team:''} • ${selectedSession()}</div><div class="profileLine"><b>Grade:</b> ${p.grade||'—'} &nbsp; <b>Age:</b> ${p.age||'—'}</div>${appSettings.ruleAssignArea?`<div class="areaBox"><label>Send To</label><select onchange="assignArea('${p.id}',this.value)">${areaOptions(p)}</select></div>`:''}<div class="badges"><span class="badge ${p.source==='MSS'?'public':'swarm'}">${p.source||p.type}</span>${checked?`<span class="badge good">Checked ${arrival}</span>`:'<span class="badge neutral">Not checked</span>'}${area?`<span class="badge areaBadge">${area}</span>`:''}${missingProfile?'<span class="badge warn">Grade/Age Needed</span>':''}${!requiresWaiver(p)?'<span class="badge neutral">Waiver Not Required</span>':(p.waiver?'<span class="badge good">Waiver</span>':'<span class="badge warn">Needs Waiver</span>')}${p.homework?'<span class="badge good">Homework</span>':''}</div><div class="small">Parent: ${p.parent||'—'}<br>Email: ${p.email||'—'}<br>Phone: ${p.phone||'—'}</div><div class="row" style="margin-top:10px"><button class="btn ${checked?'secondary':'green'}" onclick="toggleCheck('${p.id}')">${checked?'Undo':'Check In'}</button><button class="btn secondary" onclick="toggleHomework('${p.id}')">Homework</button><button class="btn secondary" onclick="startWaiver('${p.id}')">Waiver</button></div></div>`;}
function renderAreaSummary(){const card=$('areaSummaryCard'),el=$('areaSummary');if(!card||!el)return;card.classList.toggle('hidden',!appSettings.ruleAssignArea);if(!appSettings.ruleAssignArea)return;const areas=appSettings.areas||[];el.innerHTML=areas.map(a=>{const assigned=people.filter(p=>currentArea(p)===a);const checked=assigned.filter(p=>isChecked(p)).length;return `<div class="areaStat"><div class="areaStatName">${a}</div><div class="areaStatNum">${checked}</div><div class="small">checked in • ${assigned.length} assigned</div></div>`;}).join('')||'<div class="notice">Add court/area names in Session Builder.</div>';}
function renderPeople(){const v=visiblePeople();$('peopleList').innerHTML=v.map(personCard).join('')||'';const searching=clean($('search')?.value);$('filterMsg').classList.toggle('hidden',!!v.length||!people.length);$('filterMsg').textContent=people.length?(searching?'No participant matches that search within the selected session/source.':'No participants match the selected filters. Try Clear Filters.'):'No participants loaded yet.';}

function renderKpis(){const cohort=baseCohort();$('kRegistered').textContent=cohort.length;$('kChecked').textContent=cohort.filter(isChecked).length;$('kWaiver').textContent=cohort.filter(needsWaiver).length;$('kHomework').textContent=cohort.filter(p=>attendanceFor(p)?.homework||p.homework).length;}

function renderTables(){const rows=people.slice(0,300).map(p=>`<tr><td>${p.name}</td><td>${p.type}</td><td><input class="miniInput" value="${p.grade||''}" onchange="updateParticipant('${p.id}','grade',this.value)"></td><td><input class="miniInput" value="${p.age||''}" onchange="updateParticipant('${p.id}','age',this.value)"></td><td>${p.team||''}</td><td>${p.session||''}</td><td>${p.email||''}</td><td>${p.phone||''}</td><td>${p.source||''}</td></tr>`).join('');$('importTable').innerHTML=`<table><tr><th>Name</th><th>Type</th><th>Grade</th><th>Age</th><th>Team</th><th>Registered Session</th><th>Email</th><th>Phone</th><th>Source</th></tr>${rows}</table>`;$('waiverTable').innerHTML=`<table><tr><th>Name</th><th>Type</th><th>Status</th><th>Action</th></tr>${people.map(p=>`<tr><td>${p.name}</td><td>${p.type}</td><td>${!requiresWaiver(p)?'Not Required':(p.waiver?'Complete':'Missing')}</td><td><button class="btn secondary" onclick="startWaiver('${p.id}')">Open</button></td></tr>`).join('')}</table>`;$('homeworkTable').innerHTML=`<table><tr><th>Name</th><th>Type</th><th>Team</th><th>Homework</th><th>Action</th></tr>${people.map(p=>`<tr><td>${p.name}</td><td>${p.type}</td><td>${p.team}</td><td>${p.homework?'Complete':'Pending'}</td><td><button class="btn secondary" onclick="toggleHomework('${p.id}')">Toggle</button></td></tr>`).join('')}</table>`;}
function updateParticipant(id,field,value){const p=people.find(x=>x.id===id);if(!p)return;p[field]=clean(value);save();renderAll();}
function clearFilters(){$('typeFilter').value='all';$('statusFilter').value='all';if($('areaFilter'))$('areaFilter').value='all';$('search').value='';renderAll();}
function renderAll(){renderSourceFilter();renderAreaFilter();renderAreaSummary();renderKpis();renderPeople();renderTables();renderComm();renderTracker();renderReports();}
function recordHistory(p){return attendanceFor(p);}

function toggleCheck(id){const p=people.find(x=>x.id===id);if(!p)return;const existing=attendanceFor(p);if(!existing&&appSettings.ruleRequireGrade&&!clean(p.grade)&&!clean(p.age)){alert('Grade or age is required before check-in. Add it in Admin Upload.');return;}if(!existing&&appSettings.ruleAssignArea&&!currentArea(p)){alert('Select the court or area before checking this participant in.');return;}if(!existing&&needsWaiver(p)){startWaiver(id);return;}if(existing){attendanceRecords=attendanceRecords.filter(r=>r.key!==existing.key);}else{const area=p.areaAssignments?.[slotKey()]||'';attendanceRecords.push({key:recordKey(p.id),participantId:p.id,date:selectedDay(),session:selectedSession(),status:'present',arrival:appSettings.ruleArrival?nowTime():'',homework:!!p.homework,area,source:p.source,type:p.type,team:p.team,name:p.name,createdAt:new Date().toISOString()});}history=attendanceRecords;save();renderAll();}

function toggleHomework(id){const p=people.find(x=>x.id===id);if(!p)return;p.homework=!p.homework;const rec=attendanceFor(p);if(rec)rec.homework=p.homework;save();renderAll();}

function findByCode(raw){const code=low(raw);if(!code)return null;return people.find(x=>low(x.qr)===code||low(x.memberId)===code||low(x.id)===code||normPhone(x.phone)===normPhone(code)||(x.qr&&low(raw).includes(low(x.qr)))||(x.memberId&&low(raw).includes(low(x.memberId))));}
function processScannedCode(raw,source='manual'){const p=findByCode(raw);$('scanMsg').classList.remove('hidden');if(!p){$('scanMsg').innerHTML='<b>Not found.</b> Use manual search or add the participant as a walk-in.';showScanToast('NOT REGISTERED','Use manual search or walk-in entry.','red');return null;}const wasChecked=isChecked(p);$('scanMsg').innerHTML=`<b>Found:</b> ${p.name} (${p.type})`;if(!wasChecked)toggleCheck(p.id);if(needsWaiver(p)){showScanToast('ACTION REQUIRED',`${p.name}<br>Waiver missing - signature required.`,'yellow');}else{showScanToast(wasChecked?'ALREADY CHECKED IN':'WELCOME, '+p.name,`${selectedSession()}<br>${arrivalFor(p)||nowTime()}`,'green');}return p;}
function scanCode(){const raw=$('scanInput').value;if(!clean(raw))return;processScannedCode(raw,'manual');$('scanInput').value='';}
function exportCsv(kind){let rows=[];if(kind==='practiceBridge'){rows=people.filter(p=>p.type==='Swarm').map(p=>({Date:selectedDay(),Player:p.name,Team:p.team,Session:selectedSession(),SkillsPresent:isChecked(p)?'Yes':'No',Arrival:arrivalFor(p),Homework:p.homework?'Yes':'No',Waiver:p.waiver?'Yes':'No'}));}else if(kind==='waivers'){rows=people.map(p=>({Date:selectedDay(),Player:p.name,Type:p.type,Team:p.team,Waiver:p.waiver?'Complete':'Missing',Guardian:p.guardian||'',WaiverDate:p.waiverDate||''}));}else{rows=people.map(p=>({Date:selectedDay(),Player:p.name,Type:p.type,Team:p.team,Session:selectedSession(),CheckedIn:isChecked(p)?'Yes':'No',Arrival:arrivalFor(p),Homework:p.homework?'Yes':'No',Waiver:p.waiver?'Yes':'No',Grade:p.grade||'',Age:p.age||'',Area:currentArea(p),Email:p.email,Phone:p.phone}));}const header=Object.keys(rows[0]||{Date:'',Player:''});download(`${kind}-${selectedDay()}-${selectedSession().replace(/[^a-z0-9]+/gi,'-')}.csv`,[header.join(','),...rows.map(r=>header.map(h=>csvEscape(r[h])).join(','))].join('\n'));}
function renderReports(){const div=$('reportSummary');if(!div)return;const slot=attendanceRecords.filter(r=>r.date===selectedDay()&&r.session===selectedSession()&&r.status==='present');div.innerHTML=`<table><tr><th>Metric</th><th>Count</th></tr><tr><td>Event roster</td><td>${people.length}</td></tr><tr><td>Eligible session roster</td><td>${baseCohort().length}</td></tr><tr><td>Attendance records — selected session</td><td>${slot.length}</td></tr><tr><td>Swarm checked in</td><td>${slot.filter(r=>r.type==='Swarm').length}</td></tr><tr><td>Public checked in</td><td>${slot.filter(r=>r.type==='Public').length}</td></tr><tr><td>All unified attendance records</td><td>${attendanceRecords.length}</td></tr><tr><td>Missing required waiver</td><td>${baseCohort().filter(needsWaiver).length}</td></tr></table>`;}

function exportHistory(){const rows=attendanceRecords.map(r=>({date:r.date,time:r.arrival,name:r.name||people.find(p=>p.id===r.participantId)?.name||'',type:r.type,team:r.team,session:r.session,homework:r.homework?'Yes':'No',source:r.source,area:r.area||''}));const header=['date','time','name','type','team','session','homework','source','area'];download(`attendance-records-${today()}.csv`,[header.join(','),...rows.map(r=>header.map(h=>csvEscape(r[h])).join(','))].join('\n'));}

function importHistory(){const f=$('historyFile').files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const rows=parseCSV(r.result);rows.forEach(h=>{let p=people.find(x=>low(x.name)===low(h.name||h.Player)&&(!h.type||x.type===h.type));if(!p)return;const date=h.date||h.Date||today(),session=h.session||h.Session||appSettings.days[0]?.sessions?.[0]||'Session 1';attendanceRecords.push({key:recordKey(p.id,date,session),participantId:p.id,date,session,status:'present',arrival:h.time||h.Arrival||'',homework:/yes|true|complete/i.test(h.homework||''),area:h.area||h.Area||'',source:p.source,type:p.type,team:p.team,name:p.name,createdAt:new Date().toISOString()});});attendanceRecords=dedupeRecords(attendanceRecords);history=attendanceRecords;save();renderAll();};r.readAsText(f);}

function startWaiver(id){waiverTarget=people.find(p=>p.id===id);if(!waiverTarget)return;$('waiverFor').innerHTML=`<b>Participant:</b> ${waiverTarget.name}<br><b>Activity:</b> ${appSettings.activityName}<br><b>Date:</b> ${selectedDay()}<br><b>Session:</b> ${selectedSession()}`;$('guardianName').value=waiverTarget.guardian||waiverTarget.parent||'';$('waiverAgree').checked=false;sigHasInk=false;$('waiverModal').classList.add('show');setTimeout(()=>{initSig();clearSignature();updateWaiverReady();},30);}
function closeWaiver(){$('waiverModal').classList.remove('show');waiverTarget=null;}
function initSig(){sigCanvas=$('signaturePad');sigCtx=sigCanvas.getContext('2d');const rect=sigCanvas.getBoundingClientRect();sigCanvas.width=rect.width*devicePixelRatio;sigCanvas.height=rect.height*devicePixelRatio;sigCtx.scale(devicePixelRatio,devicePixelRatio);sigCtx.lineWidth=2;sigCtx.lineCap='round';sigCtx.strokeStyle='#111827';sigCanvas.onpointerdown=e=>{if(!$('waiverAgree').checked)return;drawing=true;sigHasInk=true;const r=sigCanvas.getBoundingClientRect();sigCtx.beginPath();sigCtx.moveTo(e.clientX-r.left,e.clientY-r.top);updateWaiverReady();};sigCanvas.onpointermove=e=>{if(!drawing)return;const r=sigCanvas.getBoundingClientRect();sigCtx.lineTo(e.clientX-r.left,e.clientY-r.top);sigCtx.stroke();};window.onpointerup=()=>drawing=false;}
function clearSignature(){if(!sigCanvas)return;const r=sigCanvas.getBoundingClientRect();sigCtx.clearRect(0,0,r.width,r.height);sigHasInk=false;updateWaiverReady();}
function updateWaiverReady(){const ready=clean($('guardianName').value)&&$('waiverAgree').checked&&sigHasInk;$('signaturePad').classList.toggle('disabled',!$('waiverAgree').checked);$('waiverCompleteBtn').disabled=!ready;$('waiverStatus').className='readyBox '+(ready?'green':'yellow');$('waiverStatus').textContent=ready?'Ready: complete waiver and check in.':'Action Required: enter guardian name, check agreement, and sign.';}
function completeWaiver(){if(!waiverTarget)return;const target=waiverTarget;target.waiver=true;target.guardian=clean($('guardianName').value);target.waiverDate=new Date().toLocaleString();target.signature=sigCanvas.toDataURL('image/png');save();closeWaiver();if(!isChecked(target))toggleCheck(target.id);else renderAll();}
let scannerStream=null,scannerTimer=null,barcodeDetector=null,scannerBusy=false;
function scannerSupported(){return 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;}
async function openScanner(){
  $('scannerModal').classList.add('show');
  if(!scannerSupported()){
    $('scannerStatus').className='readyBox red';
    $('scannerStatus').innerHTML='Camera QR scanning is not supported in this browser. Use Chrome/Edge, a USB scanner, or manual search.';
    return;
  }
  try{
    $('scannerStatus').className='readyBox yellow';
    $('scannerStatus').textContent='Requesting camera access...';
    barcodeDetector=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','upc_a']});
    scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    const video=$('scannerVideo'); video.srcObject=scannerStream; await video.play();
    $('scannerStatus').className='readyBox green';
    $('scannerStatus').textContent='Scanner active. Point camera at QR code.';
    scannerBusy=false; scanLoop();
  }catch(err){
    $('scannerStatus').className='readyBox red';
    $('scannerStatus').innerHTML='Camera could not be started. Allow camera access, use HTTPS/GitHub Pages, or use manual lookup.';
  }
}
function scanLoop(){
  clearTimeout(scannerTimer);
  scannerTimer=setTimeout(async()=>{
    if(!$('scannerModal').classList.contains('show')) return;
    try{
      const video=$('scannerVideo');
      if(barcodeDetector && video.readyState>=2 && !scannerBusy){
        const codes=await barcodeDetector.detect(video);
        if(codes && codes.length){
          scannerBusy=true;
          const raw=codes[0].rawValue||'';
          $('scannerStatus').className='readyBox green';
          $('scannerStatus').textContent='Code detected. Processing...';
          const p=processScannedCode(raw,'camera');
          if(p){ closeScanner(); return; }
          setTimeout(()=>{scannerBusy=false; scanLoop();},1200);
          return;
        }
      }
    }catch(e){}
    scanLoop();
  },350);
}
function closeScanner(){
  clearTimeout(scannerTimer); scannerTimer=null; scannerBusy=false;
  if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop()); scannerStream=null;}
  const video=$('scannerVideo'); if(video) video.srcObject=null;
  $('scannerModal').classList.remove('show');
}
function restartScanner(){closeScanner();setTimeout(openScanner,150);}
function showScanToast(title,body,color='green'){
  const t=$('scanToast'); if(!t)return;
  $('scanToastTitle').textContent=title;
  $('scanToastBody').innerHTML=body;
  t.className='scanToast '+color;
  setTimeout(()=>t.classList.add('hidden'),2200);
}
function renderTracker(){if(!$('individualTracker'))return;const teams=[...new Set(people.filter(p=>p.type==='Swarm'&&p.team).map(p=>p.team))].sort();const tt=$('trackerTeam');if(tt){const old=tt.value;tt.innerHTML='<option value="all">All Teams</option>'+teams.map(t=>`<option>${t}</option>`).join('');if([...tt.options].some(o=>o.value===old))tt.value=old;}$('trackRecords').textContent=attendanceRecords.length;$('trackTeams').textContent=teams.length;$('trackSwarmToday').textContent=attendanceRecords.filter(r=>r.date===selectedDay()&&r.session===selectedSession()&&r.type==='Swarm'&&r.status==='present').length;$('trackPublicToday').textContent=attendanceRecords.filter(r=>r.date===selectedDay()&&r.session===selectedSession()&&r.type==='Public'&&r.status==='present').length;const typ=$('trackerType')?.value||'all',team=$('trackerTeam')?.value||'all',q=$('trackerSearch')?.value||'';const ps=people.filter(p=>(typ==='all'||p.type===typ)&&(team==='all'||p.team===team)&&matchesSearch(p,q));$('individualTracker').innerHTML=`<table><tr><th>Player</th><th>Type</th><th>Team</th><th>Selected Session</th><th>Total Sessions</th><th>Last Attended</th><th>Attendance Detail</th></tr>${ps.map(p=>{const recs=attendanceRecords.filter(r=>r.participantId===p.id&&r.status==='present').sort((a,b)=>(b.date+b.session).localeCompare(a.date+a.session));const detail=recs.slice(0,5).map(r=>`${r.date} — ${r.session}${r.arrival?' ('+r.arrival+')':''}`).join('<br>')||'—';return `<tr><td>${p.name}</td><td>${p.type}</td><td>${p.team}</td><td>${isChecked(p)?'Present':'Not present'}</td><td>${recs.length}</td><td>${recs[0]?.date||'—'}</td><td class="small">${detail}</td></tr>`}).join('')}</table>`;const teamRows=teams.map(t=>{const roster=people.filter(p=>p.type==='Swarm'&&p.team===t);const present=roster.filter(isChecked).length;const all=attendanceRecords.filter(r=>r.type==='Swarm'&&r.team===t&&r.status==='present').length;return `<tr><td>${t}</td><td>${roster.length}</td><td>${present}</td><td>${roster.length?Math.round(present/roster.length*100):0}%</td><td>${all}</td></tr>`}).join('');$('teamTracker').innerHTML=`<table><tr><th>Team</th><th>Roster</th><th>Selected Session</th><th>Session %</th><th>All Attendance Records</th></tr>${teamRows}</table>`;}

function teamReportRows(){const teams=[...new Set(people.filter(p=>p.type==='Swarm'&&p.team).map(p=>p.team))].sort();return teams.map(t=>{const roster=people.filter(p=>p.type==='Swarm'&&p.team===t),present=roster.filter(p=>isChecked(p)).length,home=roster.filter(p=>p.homework).length;return {Date:selectedDay(),Team:t,Roster:roster.length,SkillsToday:present,AttendancePercent:roster.length?Math.round(present/roster.length*100):0,HomeworkComplete:home};});}
function exportTeamReport(){const rows=teamReportRows(),h=Object.keys(rows[0]||{Date:'',Team:''});download(`team-coach-report-${today()}.csv`,[h.join(','),...rows.map(r=>h.map(k=>csvEscape(r[k])).join(','))].join('\n'));}
function copyTeamReport(){const txt=teamReportRows().map(r=>`${r.Team}: ${r.SkillsToday}/${r.Roster} attended (${r.AttendancePercent}%), homework ${r.HomeworkComplete}`).join('\n');navigator.clipboard?.writeText(txt);alert('Team summary copied.');}
function commPeople(){const a=$('commAudience')?.value||'all';if(a==='visible')return visiblePeople();if(a==='checked')return people.filter(p=>isChecked(p));if(a==='notchecked')return people.filter(p=>!isChecked(p));if(a==='public')return people.filter(p=>p.type==='Public');if(a==='swarm')return people.filter(p=>p.type==='Swarm');if(a==='waiver')return people.filter(p=>!p.waiver);if(a==='homeworkPending')return people.filter(p=>!p.homework);return people;}
function renderComm(){if(!$('commList'))return;const ps=commPeople();$('commCount').textContent=ps.length;$('commEmailCount').textContent=ps.filter(p=>p.email).length;$('commList').innerHTML=`<table><tr><th>Name</th><th>Type</th><th>Email</th><th>Phone</th></tr>${ps.map(p=>`<tr><td>${p.name}</td><td>${p.type}</td><td>${p.email}</td><td>${p.phone}</td></tr>`).join('')}</table>`;}
function applyTemplate(){const t=$('commTemplate').value;const templates={cancel:['Class Cancelled','Hello,\n\nToday\'s session has been cancelled. We apologize for the inconvenience.\n\nThank you.'],homework:['Skills Homework','Hello,\n\nAttached/below is this week\'s skills homework. Please have your player complete it before the next session.\n\nThank you.'],reminder:['Skills Reminder','Hello,\n\nThis is a reminder for our upcoming skills session. Please arrive a few minutes early for check-in.\n\nThank you.'],survey:['We Value Your Feedback',`Hello,\n\nThank you for attending ${appSettings.activityName}. Please take a short survey: ${appSettings.surveyLink||'[Add survey link in Communications]' }\n\nThank you.\n${appSettings.commSender||''}`],waiver:['Waiver Reminder','Hello,\n\nOur records show that your player still needs a waiver completed before participation. Please complete it at check-in.\n\nThank you.']};if(templates[t]){$('commSubject').value=templates[t][0];$('commBody').value=templates[t][1];}}
function copyEmails(){navigator.clipboard?.writeText(commPeople().map(p=>p.email).filter(Boolean).join('; '));alert('Emails copied.');}
function copyPhones(){navigator.clipboard?.writeText(commPeople().map(p=>p.phone).filter(Boolean).join(', '));alert('Phone numbers copied.');}
function openEmail(){appSettings.commSender=clean($('commSender')?.value);appSettings.commReplyTo=clean($('commReplyTo')?.value);appSettings.surveyLink=clean($('surveyLink')?.value);save();const emails=commPeople().map(p=>p.email).filter(Boolean).join(';');location.href=`mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent($('commSubject').value)}&body=${encodeURIComponent($('commBody').value)}`;}
function exportCommList(){const rows=commPeople().map(p=>({Name:p.name,Type:p.type,Team:p.team,Grade:p.grade||'',Age:p.age||'',Area:currentArea(p),Email:p.email,Phone:p.phone}));const h=Object.keys(rows[0]||{Name:'',Email:''});download(`contacts-${today()}.csv`,[h.join(','),...rows.map(r=>h.map(k=>csvEscape(r[k])).join(','))].join('\n'));}
function loadSample(){mergePeople([
 {type:'Public',name:'Jack Myer',parent:'Sarah Myer',email:'sarah@example.com',phone:'4055551001',team:'',session:'Beginner 5:30-6:30',source:'MSS',checked:false,arrival:'',attendance:{},homework:false,waiver:false,paid:true,qr:'MSS-JACK-001',memberId:''},
 {type:'Public',name:'Cameran Cochran',parent:'Amy Cochran',email:'amy@example.com',phone:'4055551002',team:'',session:'Intermediate 6:30-7:30',source:'MSS',checked:false,arrival:'',attendance:{},homework:false,waiver:false,paid:true,qr:'MSS-CAM-002',memberId:''},
 {type:'Swarm',name:'Emma Smith',parent:'Jane Smith',email:'jane@example.com',phone:'4055552001',team:'2034 Elite',session:'Eligible Any Session',source:'Other Source',checked:false,arrival:'',attendance:{},homework:false,waiver:true,paid:true,qr:'',memberId:'SWARM-EMMA-2034'},
 {type:'Swarm',name:'Ava Jones',parent:'Kelly Jones',email:'kelly@example.com',phone:'4055552002',team:'2035 Blue',session:'Eligible Any Session',source:'Other Source',checked:false,arrival:'',attendance:{},homework:false,waiver:true,paid:true,qr:'',memberId:'SWARM-AVA-2035'}].map(p=>({...p,id:makeId(p)})));}
function archiveCurrentEvent(){const name=prompt('Archive name',appSettings.activityName+' — '+(appSettings.days?.[0]?.date||today()));if(!name)return;eventArchives.unshift({id:Date.now(),name,archivedAt:new Date().toLocaleString(),settings:JSON.parse(JSON.stringify(appSettings)),people:JSON.parse(JSON.stringify(people)),records:JSON.parse(JSON.stringify(attendanceRecords))});save();renderEventArchives();alert('Event archived on this device.');}

function renderEventArchives(){const el=$('eventArchiveTable');if(!el)return;el.innerHTML=eventArchives.length?`<table><tr><th>Event</th><th>Archived</th><th>Participants</th><th>Action</th></tr>${eventArchives.map(a=>`<tr><td>${a.name}</td><td>${a.archivedAt}</td><td>${a.people?.length||0}</td><td><button class="btn secondary" onclick="openArchivedEvent(${a.id})">Open</button> <button class="btn red" onclick="deleteArchivedEvent(${a.id})">Delete</button></td></tr>`).join('')}</table>`:'<div class="notice">No archived events on this device.</div>';}
function openArchivedEvent(id){const a=eventArchives.find(x=>x.id===id);if(!a)return;if(!confirm('Replace the current working event with this archived event?'))return;people=JSON.parse(JSON.stringify(a.people||[]));attendanceRecords=dedupeRecords(JSON.parse(JSON.stringify(a.records||a.history||[])));history=attendanceRecords;appSettings=JSON.parse(JSON.stringify(a.settings||appSettings));save();applySettingsToUI();renderAll();}

function deleteArchivedEvent(id){if(!confirm('Delete this archived event from this browser?'))return;eventArchives=eventArchives.filter(x=>x.id!==id);save();renderEventArchives();}
function exportEventBackup(){const payload={version:'2.0',exportedAt:new Date().toISOString(),settings:appSettings,people,attendanceRecords};downloadJson(`mss-event-${(appSettings.activityName||'event').replace(/[^a-z0-9]+/gi,'-')}.json`,payload);}

function downloadJson(name,obj){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();}
function restoreEventBackup(){const f=$('eventBackupFile')?.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);people=d.people||[];attendanceRecords=dedupeRecords(d.attendanceRecords||d.records||d.history||[]);history=attendanceRecords;appSettings={...appSettings,...(d.settings||{})};save();applySettingsToUI();renderAll();alert('Event restored.');}catch(e){alert('Could not restore event: '+e.message);}};r.readAsText(f);}

function duplicateEventSetup(){people=[];attendanceRecords=[];history=attendanceRecords;appSettings={...appSettings,activityName:appSettings.activityName+' Copy',days:(appSettings.days||[]).map((d,i)=>({...d,date:i===0?today():d.date}))};save();applySettingsToUI();renderAll();alert('Setup duplicated. Import the new event roster.');}

function boot(){people=consolidatePeople(people);save();setupTabs();applySettingsToUI();renderAll();renderEventArchives();}
document.addEventListener('DOMContentLoaded',boot);
