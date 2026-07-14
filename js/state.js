const LS='mssAttendance_v13_';
let people=JSON.parse(localStorage.getItem(LS+'people')||localStorage.getItem('mssAttendance_v124_people')||'[]');
let history=JSON.parse(localStorage.getItem(LS+'history')||localStorage.getItem('mssAttendance_v124_history')||'[]');
const defaultDays=[{date:today(),label:'Day 1',sessions:['Session 1','Session 2']}];
let settings=JSON.parse(localStorage.getItem(LS+'settings')||'null')||{activityName:'Multi-Day Event Check-In',activityType:'Camp',days:defaultDays,srcPublic:true,srcSwarm:true,methodQR:false,methodMembership:true,methodManual:true,ruleWaiver:false,ruleWaiverPublic:true,ruleWaiverSwarm:false,ruleHomework:true,ruleArrival:true,ruleSwarmEligible:true,secondarySourceName:'Other Source'};
if(!settings.days){settings.days=[{date:today(),label:'Day 1',sessions:(settings.sessions||['Session 1','Session 2']).filter(Boolean)}];}
settings={ruleWaiverPublic:true,ruleWaiverSwarm:false,secondarySourceName:'Other Source',...settings};
people.forEach(p=>{p.attendance=p.attendance||{}; if(p.checked){const d=settings.days[0]; const s=p.checkinSession||p.session||d.sessions[0]||'Session 1'; p.attendance[`${d.date}|${s}`]={checked:true,arrival:p.arrival||'',homework:!!p.homework}; p.checked=false;}});
let waiverTarget=null, sigCanvas=null, sigCtx=null, sigHasInk=false, drawing=false;
function save(){localStorage.setItem(LS+'people',JSON.stringify(people));localStorage.setItem(LS+'history',JSON.stringify(history));localStorage.setItem(LS+'settings',JSON.stringify(settings));}
