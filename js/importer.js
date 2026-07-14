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
  const p={type:category,name,parent,email,phone,team:team||'',session,source,checked:false,arrival:'',homework:false,waiver:/yes|signed|complete|true|current/i.test(waiverText),paid:isMss?!(/unpaid|failed|pending/i.test(paidText)):true,qr:flexiblePick(row,['qr','qr code','registration id','id','order id','order number']),memberId:flexiblePick(row,['member id','memberId','player id','athlete id','customer id'])};
  if(!p.qr && isMss) p.qr='MSS-'+makeId(p).slice(0,18).toUpperCase();
  if(!p.memberId && !isMss) p.memberId='EXT-'+makeId(p).slice(0,18).toUpperCase();
  p.id=makeId(p); return p;
}
function mergePeople(newOnes){
  const valid=newOnes.filter(n=>n.name);
  const map=new Map(people.map(p=>[p.id,p]));
  valid.forEach(n=>{if(map.has(n.id)) Object.assign(map.get(n.id),n,map.get(n.id)); else map.set(n.id,n);});
  people=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name)); save(); renderAll();
  return valid.length;
}
function loadCsv(kind){
  const inp=kind==='mss'?$('mssFile'):$('secondaryFile');
  if(!inp?.files?.[0]){alert('Choose a CSV first.');return;}
  if(kind==='secondary'){
    appSettings.secondarySourceName=clean($('secondarySourceName')?.value)||'Other Source';
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
function clearAll(){if(confirm('Clear all loaded participants and history from this browser?')){people=[];history=[];save();renderAll();}}
