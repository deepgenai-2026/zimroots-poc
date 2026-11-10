const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const svgNS='http://www.w3.org/2000/svg';
let family,peopleById,childrenById,parentsById,undirected;
let selectedId=null, graphMode='ego', highlightedPath=[], viewport={x:0,y:0,w:1050,h:600},lastLayout={w:1050,h:600};
const pages={network:['Family network','Discover how we belong.','Explore four generations of family connections using an interactive relationship graph.'],discover:['Discover relationships','Everyone has a connection.','Find the path between two relatives and explore possible connections in the family graph.'],archive:['Family archive','Every family holds a story.','Preserve histories, photographs and cherished memories across generations.'],privacy:['Privacy & identity','Your family. Your choice.','Explore how secure verification and personal privacy could work in a future service.']};
let toastTimer;
function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3500)}
function text(v){return document.createTextNode(v??'')}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function initGraphData(){
 peopleById=new Map(family.people.map(p=>[p.id,p]));childrenById=new Map(family.people.map(p=>[p.id,new Set()]));parentsById=new Map(family.people.map(p=>[p.id,new Set()]));undirected=new Map(family.people.map(p=>[p.id,new Set()]));
 family.edges.forEach(e=>{childrenById.get(e.from).add(e.to);parentsById.get(e.to).add(e.from);undirected.get(e.from).add(e.to);undirected.get(e.to).add(e.from)});
 selectedId=[...family.people].sort((a,b)=>(undirected.get(b.id).size-undirected.get(a.id).size))[0].id;
}
function nav(view){
 $$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
 $$('.view').forEach(el=>el.classList.toggle('active',el.id===`view-${view}`));
 $('#breadcrumb-current').textContent=pages[view][0];$('#page-title').textContent=pages[view][1];$('#page-subtitle').textContent=pages[view][2];
 $('#overview-metrics').style.display=view==='network'?'grid':'none';
 window.scrollTo({top:0,behavior:'smooth'});
 if(view==='network')renderGraph();
}
function initials(name){return name.split(/\s+/).filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase()}
function displayShort(name,max=21){return name.length>max?name.slice(0,max-1)+'…':name}
function createSVG(tag,attributes={}){const e=document.createElementNS(svgNS,tag);for(const[k,v]of Object.entries(attributes))e.setAttribute(k,v);return e}
function withinHops(start,depth){const seen=new Set([start]);let frontier=[start];for(let k=0;k<depth;k++){const next=[];for(const p of frontier)for(const q of undirected.get(p)){if(!seen.has(q)){seen.add(q);next.push(q)}}frontier=next}return seen}
function renderGraph(){
 const shown=graphMode==='full'?new Set(family.people.map(p=>p.id)):withinHops(selectedId,1);
 for(const id of highlightedPath) shown.add(id);
 const groups=new Map();
 for(const p of family.people){if(!shown.has(p.id))continue;if(!groups.has(p.generation))groups.set(p.generation,[]);groups.get(p.generation).push(p)}
 const gens=[...groups.keys()].sort((a,b)=>a-b),maxCount=Math.max(...[...groups.values()].map(x=>x.length));
 const w=graphMode==='full'?Math.max(1050,maxCount*115):Math.max(1050,maxCount*130);
 const h=Math.max(600,gens.length*155+100);lastLayout={w,h};
 const positions=new Map();
 gens.forEach((gen,gi)=>{
  const people=groups.get(gen).sort((a,b)=>a.name.localeCompare(b.name));
  const span=Math.min(w-110,people.length*130);const step=span/(people.length||1);
  people.forEach((p,i)=>positions.set(p.id,{x:w/2-span/2+step*(i+.5),y:105+(gi*(h-210)/Math.max(1,gens.length-1))}));
 });
 const graph=$('#graph-content');graph.replaceChildren();
 const pathEdges=new Set(highlightedPath.slice(1).map((id,i)=>[highlightedPath[i],id].sort().join('|')));
 for(const e of family.edges){if(!shown.has(e.from)||!shown.has(e.to))continue;
  const a=positions.get(e.from),b=positions.get(e.to),line=createSVG('path',{d:`M${a.x},${a.y} C${a.x},${(a.y+b.y)/2} ${b.x},${(a.y+b.y)/2} ${b.x},${b.y}`,fill:'none','class':`graph-link ${pathEdges.has([e.from,e.to].sort().join('|'))?'highlight':''}`});graph.append(line);
 }
 for(const p of family.people){if(!shown.has(p.id))continue;const pos=positions.get(p.id),group=createSVG('g',{'class':`graph-node ${p.id===selectedId?'selected':''}`,transform:`translate(${pos.x},${pos.y})`,tabindex:'0',role:'button','aria-label':`Show ${p.name}`});
  const col=p.nameFlag==='As supplied'?(p.generation<=1?'#3e7460':p.generation===2?'#75a28a':'#c49b62'):'#a6aeab';
  const circle=createSVG('circle',{r:p.id===selectedId?'25':'21',fill:col});const init=createSVG('text',{y:'5','text-anchor':'middle','class':'node-initial'});init.append(text(initials(p.name)));
  const label=createSVG('text',{y:'43','text-anchor':'middle'});label.append(text(displayShort(p.name,graphMode==='full'?15:23)));
  const title=createSVG('title');title.append(text(`${p.name}${p.deceased?' · reported deceased':''}`));group.append(circle,init,label,title);
  if(p.deceased)group.append(createSVG('circle',{cx:'18',cy:'-18',r:'7',fill:'#68786E',stroke:'#ffffff','stroke-width':'2'}));
  group.addEventListener('click',()=>{selectedId=p.id;highlightedPath=[];graphMode='ego';setModeButtons();renderGraph();showProfile()});group.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();group.dispatchEvent(new Event('click'))}});graph.append(group);
 }
 viewport={x:0,y:0,w,h};$('#family-graph').setAttribute('viewBox',`0 0 ${w} ${h}`);
 $('#graph-count').textContent=`Showing ${shown.size} of ${family.people.length} people`;
}
function setModeButtons(){$('#ego-button').classList.toggle('active',graphMode==='ego');$('#all-button').classList.toggle('active',graphMode==='full')}
function zoom(factor,px=.5,py=.5){const w=viewport.w*factor,h=viewport.h*factor;viewport.x+=(viewport.w-w)*px;viewport.y+=(viewport.h-h)*py;viewport.w=w;viewport.h=h;$('#family-graph').setAttribute('viewBox',`${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`)}
function bindGraphInteraction(){
 $('#ego-button').onclick=()=>{graphMode='ego';setModeButtons();renderGraph()};$('#all-button').onclick=()=>{graphMode='full';setModeButtons();renderGraph()};
 $('#zoom-in').onclick=()=>zoom(.75);$('#zoom-out').onclick=()=>zoom(1.34);$('#reset-view').onclick=()=>{viewport={x:0,y:0,...lastLayout};$('#family-graph').setAttribute('viewBox',`0 0 ${viewport.w} ${viewport.h}`)};
 const svg=$('#family-graph');svg.addEventListener('wheel',ev=>{ev.preventDefault();zoom(ev.deltaY>0?1.14:.88,ev.offsetX/svg.clientWidth,ev.offsetY/svg.clientHeight)},{passive:false});
 let dragging=false,prev;
 svg.addEventListener('pointerdown',ev=>{if(ev.target.closest('.graph-node'))return;dragging=true;prev={x:ev.clientX,y:ev.clientY};svg.setPointerCapture(ev.pointerId);svg.classList.add('dragging')});
 svg.addEventListener('pointermove',ev=>{if(!dragging)return;const rect=svg.getBoundingClientRect();viewport.x-=(ev.clientX-prev.x)*viewport.w/rect.width;viewport.y-=(ev.clientY-prev.y)*viewport.h/rect.height;prev={x:ev.clientX,y:ev.clientY};svg.setAttribute('viewBox',`${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`)});
 svg.addEventListener('pointerup',()=>{dragging=false;svg.classList.remove('dragging')});svg.addEventListener('pointercancel',()=>{dragging=false;svg.classList.remove('dragging')});
 const input=$('#person-search'),results=$('#search-results');
 input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();if(!q){results.hidden=true;return}const hits=family.people.filter(p=>p.name.toLowerCase().includes(q)).slice(0,8);results.replaceChildren();for(const p of hits){const b=document.createElement('button');b.className='search-result';b.textContent=p.name;b.onclick=()=>{selectedId=p.id;highlightedPath=[];graphMode='ego';setModeButtons();renderGraph();showProfile();input.value='';results.hidden=true};results.append(b)}results.hidden=!hits.length});
 input.addEventListener('keydown',ev=>{if(ev.key==='Escape')results.hidden=true});document.addEventListener('click',ev=>{if(!ev.target.closest('.search-wrap'))results.hidden=true});
}
function showProfile(){
 const p=peopleById.get(selectedId),s=p.synthetic,card=$('#profile-card');
 const parentIds=[...parentsById.get(p.id)],childIds=[...childrenById.get(p.id)];
 const relativeButtons=(ids)=>ids.length?ids.map(id=>`<button type="button" data-person="${id}">${esc(displayShort(peopleById.get(id).name,21))}</button>`).join(''):'<span class="small-mute">None listed in source</span>';
 const edited=p.userEditedFields||[];
 const statusBadge=p.deceased?'<span class="memorial-pill">Fictional deceased</span>':'<span class="living-pill">Living</span>';
 const birthDisplay=s.birthYear==null?'Not supplied':Number(s.birthYear)<1800?`${esc(s.birthYear)} · please review`:esc(s.birthYear);
 card.innerHTML=`<div class="profile-top"><div class="profile-avatar">${esc(initials(p.name))}</div><div><h3>${esc(p.name)}</h3><small>Person ${esc(p.id)} · Generation ${p.generation+1}</small></div></div>
 ${statusBadge} <span class="profile-badge">${esc(s.verification)} · DEMO</span>
 <div class="profile-label">PERSONAL DETAILS · MIXED PROVENANCE</div>
 <div class="profile-row"><span>Birth year</span><strong>${birthDisplay}</strong></div>
 <div class="profile-row"><span>Location</span><strong>${esc([s.city,s.country].filter(Boolean).join(', ')||'Unresolved')}</strong></div>
 <div class="profile-row"><span>Occupation</span><strong>${esc(s.occupation||'Unresolved')}</strong></div>
 <div class="profile-row"><span>Privacy example</span><strong>${esc(s.visibility)}</strong></div>
 <div class="profile-label">PARENTS IN SOURCE (${parentIds.length})</div><div class="relative-buttons">${relativeButtons(parentIds)}</div>
 <div class="profile-label">CHILDREN IN SOURCE (${childIds.length})</div><div class="relative-buttons">${relativeButtons(childIds)}</div>
 <button class="profile-btn" id="profile-contact">${p.deceased?'Explore family archive':'Request family connection'}</button>
 <p class="tiny-explainer">All people and connections are fictional examples. No real verification, consent or messaging occurs.</p>`;
 card.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>{selectedId=b.dataset.person;highlightedPath=[];graphMode='ego';setModeButtons();renderGraph();showProfile()});
 $('#profile-contact').onclick=()=>p.deceased?nav('archive'):toast('Demo only: no connection request was sent.');
}
function pathBetween(a,b){if(a===b)return[a];const q=[a],seen=new Set([a]),prev=new Map();for(let i=0;i<q.length;i++){const p=q[i];for(const n of undirected.get(p)){if(seen.has(n))continue;seen.add(n);prev.set(n,p);if(n===b){const path=[b];let x=b;while(x!==a){x=prev.get(x);path.push(x)}return path.reverse()}q.push(n)}}return[]}
function isParent(a,b){return childrenById.get(a)?.has(b)}
function commonParents(a,b){return [...parentsById.get(a)].filter(x=>parentsById.get(b).has(x))}
function areSiblings(a,b){return a!==b&&commonParents(a,b).length>0}
function describe(a,b){
 if(a===b)return['Same person','You selected the same profile twice.'];
 if(isParent(a,b))return['Parent → child','The first person is listed as a parent of the second.'];
 if(isParent(b,a))return['Child → parent','The second person is listed as a parent of the first.'];
 let shared=commonParents(a,b);if(shared.length)return['Siblings or half-siblings',`They share ${shared.length} recorded parent${shared.length>1?'s':''}.`];
 for(const p of parentsById.get(b))if(isParent(a,p))return['Grandparent → grandchild','The first person is a parent of a recorded parent of the second.'];
 for(const p of parentsById.get(a))if(isParent(b,p))return['Grandchild → grandparent','The second person is a parent of a recorded parent of the first.'];
 for(const p of parentsById.get(b))if(areSiblings(a,p))return['Aunt/uncle relationship','The first person shares a recorded parent with a parent of the second.'];
 for(const p of parentsById.get(a))if(areSiblings(b,p))return['Aunt/uncle relationship','The second person shares a recorded parent with a parent of the first.'];
 for(const pa of parentsById.get(a))for(const pb of parentsById.get(b))if(areSiblings(pa,pb))return['Possible first cousins','Their recorded parents share at least one recorded parent.'];
 return['Connected family network','A path exists, but a specific kinship label needs additional interpretation and evidence.'];
}
function initDiscovery(){
 const a=$('#relation-a'),b=$('#relation-b');
 for(const p of family.people){for(const s of[a,b]){const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.name;s.append(opt)}}
 const first=family.discoveries.find(x=>x.kind==='Possible first cousins')||family.discoveries[0];a.value=first?.a||family.people[0].id;b.value=first?.b||family.people[1].id;
 function find(){const p1=peopleById.get(a.value),p2=peopleById.get(b.value),path=pathBetween(p1.id,p2.id),[type,description]=describe(p1.id,p2.id),result=$('#relationship-result');
 const pills=path.map(id=>`<span>${esc(displayShort(peopleById.get(id).name,24))}</span>`).join('<span>›</span>');
 result.innerHTML=`<div class="section-kicker">INFERRED CONNECTION</div><h3>${esc(type)}</h3><p>${esc(description)}</p><div class="path-pills">${pills}</div><p class="tiny-explainer">${path.length?path.length-1:0} graph edge${path.length===2?'':'s'} · Fictional relationship records</p><button id="view-path" class="primary-button" style="margin-top:12px">View path on family network →</button>`;
 $('#view-path').onclick=()=>{selectedId=p1.id;highlightedPath=path;graphMode='ego';setModeButtons();nav('network');renderGraph();showProfile()};
 }
 $('#find-connection').onclick=find;find();
 $('#discovery-count').textContent=`${family.discoveries.length} examples`;
 const list=$('#discoveries-list');family.discoveries.slice(0,12).forEach(d=>{const button=document.createElement('button');button.className='discovery-card';button.innerHTML=`<div class="discovery-title">${esc(displayShort(d.aName,25))} & ${esc(displayShort(d.bName,25))}</div><div class="discovery-kind">${esc(d.kind)}</div>`;button.onclick=()=>{a.value=d.a;b.value=d.b;find();window.scrollTo({top:180,behavior:'smooth'})};list.append(button)});
 const review=$('#review-list');family.flags.filter(f=>['Source labels','Source relationships','User-provided detail','User-edited plus synthetic'].includes(f[3])).forEach(f=>{const row=document.createElement('div');row.className='review-row';row.innerHTML=`<strong>${esc(f[0])}</strong><div>${esc(f[1])}<br>${esc(f[2])}</div>`;review.append(row)});
}
function initArchive(){const grid=$('#archive-grid');const icons=['▤','✉','♫','▧','◎'];family.archives.slice(0,15).forEach((a,i)=>{const card=document.createElement('article');card.className='archive-card';card.innerHTML=`<div class="archive-image"><div class="archive-illustration">${icons[i%icons.length]}</div></div><div class="archive-body"><div class="archive-type">${esc(a.type.toUpperCase())} · FICTIONAL</div><h3>${esc(a.title)}</h3><p>${esc(displayShort(a.name,45))}</p><div class="archive-bottom"><span>Example year: ${a.year}</span><span>Private demo</span></div></div>`;grid.append(card)});}
function initPrivacy(){
 $('#simulate-verification').onclick=()=>{$('#identity-message').textContent='Mock verification completed. No ID was checked.';$('#identity-badge').textContent='SIMULATED';toast('Mock verification only; no real ID was checked.');};
 const switches=$$('.switch-row input');switches.forEach(x=>x.addEventListener('change',()=>{$('#privacy-status').textContent=`Demo settings: discoverable ${$('#setting-discoverable').checked?'on':'off'}, requests ${$('#setting-requests').checked?'on':'off'}, archive sharing ${$('#setting-archive').checked?'on':'off'}. No real consent was obtained.`}));
 const counts=new Map();family.people.forEach(p=>{if(!p.synthetic.country)return;counts.set(p.synthetic.country,(counts.get(p.synthetic.country)||0)+1)});const max=Math.max(...counts.values());const root=$('#country-bars');[...counts].sort((a,b)=>b[1]-a[1]).forEach(([country,n])=>{const row=document.createElement('div');row.className='country-row';row.innerHTML=`<span>${esc(country)}</span><div class="bar"><span style="width:${(100*n/max).toFixed(1)}%"></span></div><b>${n}</b>`;root.append(row)})
}
async function boot(){
 try{const response=await fetch('./family_data.json');if(!response.ok)throw new Error('Data unavailable');family=await response.json();initGraphData();
 $('#metric-people').textContent=family.meta.people;$('#metric-links').textContent=family.meta.links;$('#metric-generations').textContent=family.meta.generations;$('#metric-deceased').textContent=family.meta.deceasedReported;
 $$('.nav-item').forEach(btn=>btn.onclick=()=>nav(btn.dataset.view));bindGraphInteraction();renderGraph();showProfile();initDiscovery();initArchive();initPrivacy();
 }catch(error){$('#graph-content').replaceChildren();$('.graph-hint').textContent='Unable to load the demo family dataset.';console.error(error)}
}
boot();
