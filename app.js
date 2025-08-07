/* Horrified Companion — Classic Pro+ */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const STORAGE_KEY = "horrifiedClassicProPlus_v1";

/* --- Classic Monsters --- */
const MONSTERS = {
  dracula: { name:"Dracula", color:"#C72A2A" },
  frankenstein: { name:"Frankenstein & Bride", color:"#7EB33B" },
  wolfman: { name:"Wolf Man", color:"#B98322" },
  mummy: { name:"The Mummy", color:"#C0A55F" },
  invisible: { name:"Invisible Man", color:"#6FB2C6" },
  creature: { name:"Creature from the Black Lagoon", color:"#2CB36B", isCreature:true },
};

/* --- Heroes (Classic) --- */
const CHARACTER_LIST = [
  { name:"Archaeologist", actions:4, special:"Excavate: At Museum, you may pick up all items in adjacent spaces (1 action)." },
  { name:"Explorer", actions:4, special:"Scout: Move another hero up to 2 spaces (1 action)." },
  { name:"Inspector", actions:4, special:"Interrogate: At Precinct/Hospital (choose), move a villager to your space (1 action)." },
  { name:"Mayor", actions:4, special:"Mobilize: Move 1 villager up to 3 spaces (1 action)." },
  { name:"Priest", actions:4, special:"Sanctuary: At Church, ignore 1 hit (no item) once per turn." },
  { name:"Professor", actions:4, special:"Research: At Institute/Museum (choose), draw 1 perk (1 action)." },
  { name:"Scientist", actions:4, special:"Tinker: Take 1 extra pick up action for free each turn." },
  { name:"Courier", actions:4, special:"Delivery: Move any number of items between heroes in same space (free once per turn)." }
];

/* --- Classic preset map (abstracted) ---
 * 24 land nodes, two bridges, 3 water spaces.
 * Edges: type 'land' (lit path), 'bridge' (land path across river), 'water' (water path; Creature only)
 * Coordinates for SVG placement; tokens absolutely positioned on top.
*/
const CLASSIC_MAP = {
  nodes: [
    {id:"docks", name:"Docks", x:140, y:520, water:false},
    {id:"waterfront", name:"Waterfront", x:120, y:620, water:true},
    {id:"river", name:"River", x:600, y:350, water:true},
    {id:"lagoon", name:"Lagoon", x:1020, y:120, water:true},
    {id:"town", name:"Town Center", x:340, y:420, water:false},
    {id:"theater", name:"Theater", x:240, y:520, water:false},
    {id:"shop", name:"Shop", x:260, y:360, water:false},
    {id:"hospital", name:"Hospital", x:220, y:270, water:false},
    {id:"church", name:"Church", x:380, y:250, water:false},
    {id:"graveyard", name:"Graveyard", x:480, y:180, water:false},
    {id:"crypt", name:"Crypt", x:560, y:120, water:false},
    {id:"abbey", name:"Abbey", x:460, y:280, water:false},
    {id:"bridgeN", name:"Bridge North", x:560, y:320, water:false},
    {id:"bridgeS", name:"Bridge South", x:560, y:420, water:false},
    {id:"mansion", name:"Mansion", x:700, y:300, water:false},
    {id:"inn", name:"Inn", x:840, y:300, water:false},
    {id:"museum", name:"Museum", x:740, y:200, water:false},
    {id:"laboratory", name:"Laboratory", x:840, y:180, water:false},
    {id:"barn", name:"Barn", x:800, y:420, water:false},
    {id:"cave", name:"Cave", x:1000, y:340, water:false},
    {id:"camp", name:"Camp", x:960, y:220, water:false},
    {id:"forest", name:"Forest", x:900, y:520, water:false},
    {id:"park", name:"Park", x:720, y:520, water:false},
    {id:"riverside", name:"Riverside", x:620, y:460, water:false},
  ],
  edges: [
    // west land
    ["docks","theater","land"],["theater","town","land"],["town","shop","land"],["shop","hospital","land"],
    ["hospital","church","land"],["church","abbey","land"],["abbey","graveyard","land"],["graveyard","crypt","land"],
    ["town","bridgeS","land"],["church","bridgeN","land"],
    // bridges to east
    ["bridgeN","mansion","bridge"],["bridgeS","riverside","bridge"],
    // east land
    ["mansion","inn","land"],["mansion","museum","land"],["museum","laboratory","land"],
    ["inn","barn","land"],["barn","park","land"],["park","riverside","land"],["riverside","town","land"],
    ["inn","camp","land"],["camp","cave","land"],["cave","forest","land"],["forest","park","land"],
    // diagonals
    ["museum","camp","land"],["laboratory","lagoon","water"],
    // water
    ["waterfront","docks","water"],["waterfront","river","water"],["river","lagoon","water"],
    ["river","bridgeN","water"],["river","bridgeS","water"],["lagoon","camp","water"]
  ]
};

/* --- Initial State --- */
let state = load() || {
  audio: { loop:true, volume:0.35, name:null, dataUrl:null },
  players: [
    { id:"p1", name:"Jack", color:"#7dd3fc", character:"Scientist", special:"", actionsPerTurn:4, actionsLeft:4, perks:[], node:"hospital" },
    { id:"p2", name:"Meg", color:"#fda4af", character:"Explorer", special:"", actionsPerTurn:4, actionsLeft:4, perks:[], node:"town" },
  ],
  monstersSelected: ["dracula","creature"],
  monsters: Object.fromEntries(Object.keys(MONSTERS).map(k => [k, { id:k, node:"mansion" }])),
  villagers: [], // {id,name,node}
  map: CLASSIC_MAP,
  current: {
    started: null,
    turnIndex: 0,
    log: [],
    monsterCards: [],
  },
  sessions: []
};

/* --- Navigation --- */
$$(".nav-btn").forEach(btn => btn.addEventListener("click", e => show(e.currentTarget.dataset.view)));

/* --- Audio Controls --- */
const ambient = $("#ambient");
const audioFile = $("#audioFile");
const audioPlay = $("#audioPlay");
const audioPause = $("#audioPause");
const audioVol = $("#audioVol");
const audioLoop = $("#audioLoop");

function initAudioFromState(){
  ambient.loop = !!state.audio.loop;
  ambient.volume = state.audio.volume ?? 0.35;
  if(state.audio.dataUrl){ ambient.src = state.audio.dataUrl; }
  audioVol.value = ambient.volume; audioLoop.checked = ambient.loop;
}
initAudioFromState();
audioFile.addEventListener("change", async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const dataUrl = await fileToDataUrl(f);
  state.audio.dataUrl = dataUrl; state.audio.name = f.name; ambient.src = dataUrl; save();
});
audioPlay.addEventListener("click", ()=> ambient.play().catch(()=>{}));
audioPause.addEventListener("click", ()=> ambient.pause());
audioVol.addEventListener("input", e=>{ ambient.volume = parseFloat(e.target.value); state.audio.volume = ambient.volume; save(); });
audioLoop.addEventListener("change", e=>{ ambient.loop = e.target.checked; state.audio.loop = ambient.loop; save(); });

/* --- Players & Monsters picker --- */
const playersWrap = $("#players"); const monsterPicker = $("#monsterPicker");
function renderPlayers(){
  playersWrap.innerHTML = "";
  state.players.forEach((p, idx)=>{
    const div = document.createElement("div");
    div.className = "panel";
    div.innerHTML = `
      <div class="grid two">
        <label>Player Name<input value="${p.name}" data-id="${p.id}" class="p-name"></label>
        <label>Color<input value="${p.color}" data-id="${p.id}" class="p-color" type="color"></label>
      </div>
      <div class="grid two">
        <label>Character
          <select class="fancy-select p-character" data-id="${p.id}">
            ${CHARACTER_LIST.map(c=>`<option ${p.character===c.name?"selected":""}>${c.name}</option>`).join("")}
          </select>
        </label>
        <label>Actions per Turn
          <input type="number" min="1" max="6" value="${p.actionsPerTurn}" class="p-apt" data-id="${p.id}">
        </label>
      </div>
      <label>Special Ability / Event
        <input value="${escapeHtml(p.special||"")}" class="p-special" data-id="${p.id}" placeholder="Describe or paste from hero card">
      </label>
      <div class="actions" style="justify-content:flex-end">
        <button class="ghost remove" data-id="${p.id}" ${state.players.length<=1?"disabled":""}>Remove</button>
      </div>`;
    playersWrap.appendChild(div);
  });
  $$(".p-name").forEach(i=> i.oninput = e=>{ findPlayer(e.target.dataset.id).name = e.target.value; save(); refreshTurnBar(); renderPerkOwnerSelect(); renderTokens(); });
  $$(".p-color").forEach(i=> i.oninput = e=>{ findPlayer(e.target.dataset.id).color = e.target.value; save(); refreshTurnBar(); renderTokens(); });
  $$(".p-character").forEach(i=> i.onchange = e=>{ findPlayer(e.target.dataset.id).character = e.target.value; save(); });
  $$(".p-apt").forEach(i=> i.oninput = e=>{ const v=Math.max(1,Math.min(6,parseInt(e.target.value||4))); findPlayer(e.target.dataset.id).actionsPerTurn=v; save(); });
  $$(".p-special").forEach(i=> i.oninput = e=>{ findPlayer(e.target.dataset.id).special = e.target.value; save(); });
  $$(".remove").forEach(b=> b.onclick = e=>{ removePlayer(e.target.dataset.id); });
}
function addPlayer(){
  const id = "p"+Math.random().toString(36).slice(2,7);
  const def = CHARACTER_LIST[Math.floor(Math.random()*CHARACTER_LIST.length)];
  state.players.push({ id, name:"Player "+state.players.length, color:randomPastel(), character:def.name, special:def.special||"", actionsPerTurn:def.actions||4, actionsLeft:def.actions||4, perks:[], node:"town" });
  save(); renderPlayers(); refreshTurnBar(); renderPerkOwnerSelect(); renderTokens();
}
function removePlayer(id){
  state.players = state.players.filter(p=>p.id!==id);
  save(); renderPlayers(); refreshTurnBar(); renderPerkOwnerSelect(); renderTokens();
}
function findPlayer(id){ return state.players.find(p=>p.id===id); }
$("#addPlayer").addEventListener("click", addPlayer);

function renderMonstersPicker(){
  monsterPicker.innerHTML = "";
  Object.entries(MONSTERS).forEach(([id,m])=>{
    const chip = document.createElement("div");
    chip.className = "monster-chip"+(state.monstersSelected.includes(id)?" active":"");
    chip.dataset.id = id;
    chip.textContent = m.name;
    chip.onclick = () => {
      const on = chip.classList.toggle("active");
      if(on && !state.monstersSelected.includes(id)) state.monstersSelected.push(id);
      if(!on) state.monstersSelected = state.monstersSelected.filter(k=>k!==id);
      save(); renderTokens();
      renderHelperMonsterSelect();
    };
    monsterPicker.appendChild(chip);
  });
}
renderPlayers(); renderMonstersPicker();

/* --- Start / Update --- */
$("#btnStart").addEventListener("click", ()=>{
  state.current.started ??= new Date().toISOString();
  state.players.forEach(p => p.actionsLeft = p.actionsPerTurn);
  logAction("Session updated. Monsters: "+ state.monstersSelected.map(id=>MONSTERS[id].name).join(", "));
  save(); refreshTurnBar(); renderPerkOwnerSelect(); renderTokens(); renderHelperMonsterSelect(); renderVillagerLocSelect(); show("session");
});

/* --- Turn Tracker --- */
const turnBar = $("#turnBar"); const useActionBtn = $("#useAction"); const resetActionsBtn = $("#resetActions"); const nextTurnBtn = $("#nextTurn");
function refreshTurnBar(){
  turnBar.innerHTML = "";
  state.players.forEach((p, idx)=>{
    const chip = document.createElement("div");
    chip.className = "turn-chip"+(idx===state.current.turnIndex?" active":"");
    chip.innerHTML = `<span class="badge" style="background:${p.color}"></span>${p.name} — ${p.character} · <strong>${p.actionsLeft}</strong>/${p.actionsPerTurn}`;
    chip.onclick = ()=>{ state.current.turnIndex = idx; save(); refreshTurnBar(); };
    turnBar.appendChild(chip);
  });
}
useActionBtn.onclick = ()=>{
  const p = state.players[state.current.turnIndex]; if(!p) return;
  if(p.actionsLeft>0){ p.actionsLeft--; logAction(`${p.name} used an action. ${p.actionsLeft}/${p.actionsPerTurn} left.`); save(); refreshTurnBar(); }
};
resetActionsBtn.onclick = ()=>{ const p = state.players[state.current.turnIndex]; if(!p) return; p.actionsLeft = p.actionsPerTurn; save(); refreshTurnBar(); };
nextTurnBtn.onclick = ()=>{
  const p = state.players[state.current.turnIndex];
  if(p) logAction(`${p.name} ended their turn.`);
  state.current.turnIndex = (state.current.turnIndex+1) % state.players.length;
  const np = state.players[state.current.turnIndex];
  if(np){ np.actionsLeft = np.actionsPerTurn; logAction(`It is now ${np.name}'s turn.`); }
  save(); refreshTurnBar();
};

/* --- Perk Cards --- */
function renderPerkOwnerSelect(){
  const sel = $("#perkOwner");
  sel.innerHTML = state.players.map(p=>`<option value="${p.id}">${p.name}</option>`).join("");
}
renderPerkOwnerSelect();
$("#addPerk").onclick = ()=>{
  const owner = $("#perkOwner").value;
  const title = $("#perkTitle").value.trim();
  if(!title){ alert("Perk title required"); return; }
  const p = findPlayer(owner);
  p.perks.push({id:"perk"+Date.now(), title});
  logAction(`${p.name} received a perk: "${title}".`);
  $("#perkTitle").value = "";
  save(); renderPerkPanel();
};
function renderPerkPanel(){
  const wrap = $("#perkPanel"); wrap.innerHTML = "";
  state.players.forEach(p=>{
    const box = document.createElement("div");
    box.className = "panel";
    box.innerHTML = `<h3 style="margin:0 0 .35rem">${p.name} — Perks</h3>`;
    p.perks.forEach((k,i)=>{
      const item = document.createElement("div");
      item.className = "log-item";
      item.innerHTML = `${k.title} <button data-p="${p.id}" data-i="${i}" class="ghost" style="float:right">Use</button>`;
      box.appendChild(item);
    });
    wrap.appendChild(box);
  });
  $$("#perkPanel button.ghost").forEach(b=> b.onclick = e=>{
    const p = findPlayer(e.target.dataset.p);
    const i = parseInt(e.target.dataset.i,10);
    const perk = p.perks.splice(i,1)[0];
    logAction(`${p.name} used perk: "${perk.title}".`);
    save(); renderPerkPanel();
  });
}
renderPerkPanel();

/* --- Monster Cards Log --- */
function renderMonsterLog(){
  const wrap = $("#monsterLog"); wrap.innerHTML = "";
  state.current.monsterCards.forEach(entry=>{
    const row = document.createElement("div");
    row.className = "log-item";
    row.textContent = `[${fmtTime(entry.time)}] ${entry.type} — ${entry.note}`;
    wrap.appendChild(row);
  });
}
$("#addMonsterCard").onclick = ()=>{
  const type = $("#monsterTemplate").value;
  const note = $("#monsterNote").value.trim();
  state.current.monsterCards.push({ time: Date.now(), type, note });
  $("#monsterNote").value = "";
  logAction(`Monster card: ${type}${note? " — "+note:""}`);
  save(); renderMonsterLog();
};
renderMonsterLog();

/* --- Villagers --- */
function renderVillagerLocSelect(){
  const sel = $("#helperVillagerLoc");
  sel.innerHTML = state.map.nodes.map(n=>`<option value="${n.id}">${n.name}</option>`).join("");
}
function addVillager(name, nodeId){
  state.villagers.push({ id:"v"+Math.random().toString(36).slice(2,7), name, node:nodeId });
  logAction(`Villager added${name? " ("+name+")":""} at ${nodeById(nodeId).name}.`);
  save(); renderTokens();
}
$("#applyVillager").onclick = ()=>{
  const nodeId = $("#helperVillagerLoc").value;
  const name = $("#helperVillagerName").value.trim();
  addVillager(name, nodeId);
  $("#helperVillagerName").value = "";
};

/* --- Map (SVG) --- */
const svg = $("#boardSvg");
function nodeById(id){ return state.map.nodes.find(n=>n.id===id); }
function neighborsOf(id, includeWater=false){
  return state.map.edges
    .filter(([a,b,type]) => (a===id || b===id) && (includeWater || type!=="water"))
    .map(([a,b]) => a===id ? b : a);
}
function renderMap(){
  svg.innerHTML = "";
  // Edges
  state.map.edges.forEach(([a,b,type])=>{
    const na = nodeById(a), nb = nodeById(b); if(!na || !nb) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1", na.x); line.setAttribute("y1", na.y);
    line.setAttribute("x2", nb.x); line.setAttribute("y2", nb.y);
    line.setAttribute("class","edge "+(type||"land"));
    svg.appendChild(line);
  });
  // Nodes
  state.map.nodes.forEach(n=>{
    const g = document.createElementNS("http://www.w3.org/2000/svg","g");
    const circ = document.createElementNS("http://www.w3.org/2000/svg","circle");
    circ.setAttribute("cx", n.x); circ.setAttribute("cy", n.y); circ.setAttribute("r", 16);
    circ.setAttribute("class","node "+(n.water?"water":""));
    g.appendChild(circ);
    const tx = document.createElementNS("http://www.w3.org/2000/svg","text");
    tx.setAttribute("x", n.x+20); tx.setAttribute("y", n.y+4); tx.setAttribute("class","node-label");
    tx.textContent = n.name;
    tx.addEventListener("click", ()=>{
      const nn = prompt("Node name:", n.name);
      if(nn!==null){ n.name = nn; save(); renderMap(); renderVillagerLocSelect(); }
    });
    g.appendChild(tx);
    svg.appendChild(g);
  });
  positionTokens();
}
function svgToClient(x,y){
  const rect = svg.getBoundingClientRect();
  const viewW = rect.width; const viewH = rect.height;
  const scaleX = viewW/1200, scaleY = viewH/700;
  const left = rect.left + x*scaleX; const top = rect.top + y*scaleY;
  return {left, top};
}
function positionTokens(){
  // Clear existing absolutely-positioned tokens
  $$(".token").forEach(t=>t.remove());
  // Place players
  state.players.forEach(p=> addToken("player", p.id, p.color, p.name.charAt(0).toUpperCase(), p.node));
  // Place monsters
  state.monstersSelected.forEach(id => {
    const m = state.monsters[id];
    addToken("monster", id, MONSTERS[id].color, "M", m.node);
  });
  // Villagers
  state.villagers.forEach(v=> addToken("villager", v.id, "#ffffff", "V", v.node));
}
function addToken(kind, id, color, label, nodeId){
  const n = nodeById(nodeId) || state.map.nodes[0];
  const pos = svgToClient(n.x, n.y);
  const token = document.createElement("div");
  token.className = `token ${kind}`;
  token.draggable = true;
  token.dataset.kind = kind; token.dataset.id = id;
  token.style.background = color;
  token.style.left = (pos.left - 14) + "px"; // center
  token.style.top  = (pos.top  - 14) + "px";
  token.textContent = label;
  token.addEventListener("dragstart", onDragToken);
  document.body.appendChild(token);
}
let dragInfo = null;
function onDragToken(e){ const t = e.target; dragInfo = { kind:t.dataset.kind, id:t.dataset.id }; }
svg.addEventListener("dragover", e=> e.preventDefault());
svg.addEventListener("drop", e=>{
  if(!dragInfo) return;
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const ctm = svg.getScreenCTM().inverse(); const loc = pt.matrixTransform(ctm);
  // pick nearest node
  let best = null; let bestDist = 1e9;
  state.map.nodes.forEach(n=>{
    const d = Math.hypot(n.x - loc.x, n.y - loc.y);
    if(d < bestDist){ best = n; bestDist = d; }
  });
  if(!best) return;
  if(dragInfo.kind==="player"){
    const p = state.players.find(x=>x.id===dragInfo.id);
    const from = p.node; p.node = best.id;
    logMove(p.name, nodeById(from).name, best.name);
  }else if(dragInfo.kind==="monster"){
    const m = state.monsters[dragInfo.id]; const from = m.node; m.node = best.id;
    logAction(`${MONSTERS[dragInfo.id].name} moved ${nodeById(from).name} → ${best.name}.`);
  }else if(dragInfo.kind==="villager"){
    const v = state.villagers.find(x=>x.id===dragInfo.id); const from = v.node; v.node = best.id;
    logAction(`Villager moved ${nodeById(from).name} → ${best.name}.`);
  }
  save(); positionTokens();
  dragInfo = null;
});

/* --- Helper: Move Monster (rules: closest person, shortest path; water for Creature only; bridges for all) --- */
function renderHelperMonsterSelect(){
  const sel = $("#helperMonster");
  sel.innerHTML = state.monstersSelected.map(id=>`<option value="${id}">${MONSTERS[id].name}</option>`).join("");
}
function personNodes(){ return [...state.players.map(p=>p.node), ...state.villagers.map(v=>v.node)]; }
function shortestPath(fromId, toId, includeWater=false){
  const q=[fromId]; const prev={}; const seen=new Set([fromId]);
  while(q.length){
    const cur = q.shift();
    if(cur===toId) break;
    neighborsOf(cur, includeWater).forEach(nb=>{
      if(!seen.has(nb)){ seen.add(nb); prev[nb]=cur; q.push(nb); }
    });
  }
  if(!(toId in prev) && fromId!==toId) return null;
  const path=[toId]; let u=toId; while(u!==fromId){ u=prev[u]; if(!u){return null;} path.push(u); }
  return path.reverse();
}
function closestPersonNode(fromId, includeWater){
  let best=null, bestPath=null;
  personNodes().forEach(pid=>{
    const path = shortestPath(fromId, pid, includeWater);
    if(path){
      if(!best || path.length<bestPath.length){ best=pid; bestPath=path; }
    }
  });
  return bestPath;
}
$("#applyMove").onclick = ()=>{
  const monId = $("#helperMonster").value;
  const steps = Math.max(0, Math.min(4, parseInt($("#helperSteps").value,10)||0));
  const m = state.monsters[monId]; const from = nodeById(m.node);
  const includeWater = !!MONSTERS[monId].isCreature; // Creature only
  // find path
  let path = $("#helperClosest").checked ? closestPersonNode(m.node, includeWater) : null;
  if(!path){ logAction(`${MONSTERS[monId].name} stays in place.`); return; }
  // move up to steps along path (stop if in same node as a person)
  let moves = steps;
  let idx = 0;
  while(moves>0 && idx < path.length-1){
    const nextNode = path[idx+1];
    m.node = nextNode;
    idx++; moves--;
    // stop if entered node with a person
    if(personNodes().includes(nextNode)) break;
  }
  save(); positionTokens();
  const to = nodeById(m.node);
  logAction(`${MONSTERS[monId].name} moved ${from.name} → ${to.name} (${idx} step${idx!==1?"s":""}).`);
};

/* --- Action Log --- */
function logAction(text){
  state.current.log.push({ time: Date.now(), text });
  renderLog();
  save();
}
function logMove(name, from, to){
  const p = state.players[state.current.turnIndex];
  const by = p ? ` by ${p.name}` : "";
  logAction(`${name} moved ${from} → ${to}${by}.`);
}
function renderLog(){
  const log = $("#actionLog"); log.innerHTML = "";
  state.current.log.slice(-200).forEach(entry=>{
    const row = document.createElement("div");
    row.className = "log-item";
    row.textContent = `[${fmtTime(entry.time)}] ${entry.text}`;
    log.appendChild(row);
  });
  log.scrollTop = log.scrollHeight;
}
renderLog();
$("#clearLog").onclick = ()=>{ if(confirm("Clear action log?")){ state.current.log = []; save(); renderLog(); } };

/* --- Stats (placeholder same as before) --- */
function renderStats(){
  const sessions = state.sessions || [];
  const wins = sessions.filter(s=>s.win).length;
  const losses = sessions.length - wins;
  const totalTurns = sessions.reduce((a,s)=>a+s.turns,0);
  const avgTurns = sessions.length? (totalTurns/sessions.length).toFixed(1):"-";
  $("#lifetime").innerHTML = `
    <div class="panel">
      <div class="grid three">
        <div><div class="hint">Wins</div><div class="count">${wins}</div></div>
        <div><div class="hint">Losses</div><div class="count">${losses}</div></div>
        <div><div class="hint">Avg Turns</div><div class="count">${avgTurns}</div></div>
      </div>
    </div>`;

  const by = {};
  sessions.forEach(s=> s.monsters.forEach(id=>{ by[id] ??= {plays:0,wins:0}; by[id].plays++; if(s.win) by[id].wins++; }));
  const wrap = $("#byMonster"); wrap.innerHTML = "";
  Object.entries(by).forEach(([id,stat])=>{
    const winrate = stat.plays? Math.round(100*stat.wins/stat.plays):0;
    const card = document.createElement("div");
    card.className = "panel";
    card.innerHTML = `<strong>${MONSTERS[id].name}</strong><div class="grid three"><div><div class="hint">Plays</div><div class="count">${stat.plays}</div></div><div><div class="hint">Wins</div><div class="count">${stat.wins}</div></div><div><div class="hint">Win%</div><div class="count">${winrate}</div></div></div>`;
    wrap.appendChild(card);
  });
  const recent = $("#recentSessions"); recent.innerHTML = "<em>(Advanced session summary coming later)</em>";
}
renderStats();

/* --- Export/Import --- */
$("#btnExport").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  a.download = `horrified-classic-pro-plus-${stamp}.json`;
  a.click();
});
$("#fileImport").addEventListener("change", async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  try{ const txt = await f.text(); state = JSON.parse(txt); save(); location.reload(); }
  catch(err){ alert("Import failed: "+err.message); }
  finally{ e.target.value=""; }
});

/* --- View handling --- */
function show(id){
  $$(".view").forEach(v => v.classList.remove("show"));
  $("#view"+capitalize(id)).classList.add("show");
  if(id==="board"){ renderMap(); }
  if(id==="session"){ refreshTurnBar(); renderPerkPanel(); renderMonsterLog(); renderVillagerLocSelect(); }
}

/* --- Utils --- */
function load(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)); }catch{ return null; } }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function fmtTime(t){ const d = new Date(t); return d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); }
function randomPastel(){ const h = Math.floor(Math.random()*360); return `hsl(${h} 70% 70%)`; }
function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function fileToDataUrl(f){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); }); }

/* --- Init --- */
refreshTurnBar();
renderPerkOwnerSelect();
renderHelperMonsterSelect();
renderVillagerLocSelect();

/* --- Service worker --- */
if ("serviceWorker" in navigator) { window.addEventListener("load", ()=>navigator.serviceWorker.register("./sw.js")); }
