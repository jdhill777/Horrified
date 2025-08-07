/* Horrified Companion logic (vanilla JS) */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const STORAGE_KEY = "horrifiedCompanion_v1";

const MONSTERS = {
  // Classic
  dracula: { set:"classic", name:"Dracula", color:"#C72A2A",
    goal:"Destroy coffins (x4), then defeat Dracula.",
    tasks:[{label:"Coffins destroyed", type:"count", max:4},{label:"Final encounter", type:"bool"}] },
  frankenstein: { set:"classic", name:"Frankenstein & Bride", color:"#7EB33B",
    goal:"Teach both to be human, then unite them.",
    tasks:[{label:"Frankenstein taught", type:"count", max:6},{label:"Bride taught", type:"count", max:6},{label:"Brought together", type:"bool"}] },
  wolfman: { set:"classic", name:"Wolf Man", color:"#B98322",
    goal:"Complete the cure, then administer it.",
    tasks:[{label:"Cure progress", type:"count", max:6},{label:"Cured", type:"bool"}] },
  mummy: { set:"classic", name:"The Mummy", color:"#C0A55F",
    goal:"Solve the puzzle to locate his tomb, then defeat.",
    tasks:[{label:"Puzzle progress", type:"count", max:6},{label:"Entombed", type:"bool"}] },
  invisible: { set:"classic", name:"Invisible Man", color:"#6FB2C6",
    goal:"Collect and deliver evidence, then arrest.",
    tasks:[{label:"Evidence delivered", type:"count", max:6},{label:"Arrested", type:"bool"}] },
  creature: { set:"classic", name:"Creature from the Black Lagoon", color:"#2CB36B",
    goal:"Navigate to the Lagoon, then drive off the Creature.",
    tasks:[{label:"Boat progress", type:"count", max:10},{label:"Driven off", type:"bool"}] },

  // American Monsters (names only; tasks are thematic counters)
  banshee: { set:"american", name:"Banshee of the Badlands", color:"#9A6EE8",
    goal:"Resolve banshee shrieks; final confrontation.",
    tasks:[{label:"Shrieks resolved", type:"count", max:4},{label:"Finale", type:"bool"}] },
  chupacabra: { set:"american", name:"Chupacabra", color:"#C1476B",
    goal:"Secure livestock and set the trap; final fight.",
    tasks:[{label:"Livestock secured", type:"count", max:4},{label:"Finale", type:"bool"}] },
  jersey: { set:"american", name:"Jersey Devil", color:"#8B6A4F",
    goal:"Track the devil with clues; confront.",
    tasks:[{label:"Clues solved", type:"count", max:6},{label:"Finale", type:"bool"}] },
  mothman: { set:"american", name:"Mothman", color:"#6C9EA3",
    goal:"Interpret omens; avert disaster.",
    tasks:[{label:"Omens deciphered", type:"count", max:4},{label:"Finale", type:"bool"}] },
  bigfoot: { set:"american", name:"Bigfoot", color:"#7F8F55",
    goal:"Develop film evidence; confront.",
    tasks:[{label:"Reels developed", type:"count", max:5},{label:"Finale", type:"bool"}] },
  ozark: { set:"american", name:"Ozark Howler", color:"#A2632C",
    goal:"Set and spring traps; showdown.",
    tasks:[{label:"Traps set", type:"count", max:4},{label:"Finale", type:"bool"}] },
};

// State
let state = load() || {
  players:["Jack","Meg"],
  sessions:[],
  current:null
};

// --- Views ---
const views = {
  setup: $("#viewSetup"),
  session: $("#viewSession"),
  stats: $("#viewStats"),
};

// init
renderMonsterPicker("classic");
attachNav();
renderStats();
renderSetupFromState();

// PWA register
if ("serviceWorker" in navigator) {
  window.addEventListener("load", ()=>navigator.serviceWorker.register("./sw.js"));
}

// -------------- Setup --------------
function renderMonsterPicker(set){
  const el = $("#monsterPicker");
  el.innerHTML = "";
  const picks = Object.entries(MONSTERS)
    .filter(([id,m]) => set==="both" || m.set===set)
    .map(([id,m]) => {
      const chip = document.createElement("div");
      chip.className = "monster-chip";
      chip.dataset.id = id;
      chip.innerHTML = `${monsterDot(m.color)} ${m.name}`;
      chip.addEventListener("click", ()=>chip.classList.toggle("active"));
      return chip;
    });
  picks.forEach(c=>el.appendChild(c));
}

$("#gameSet").addEventListener("change", e => renderMonsterPicker(e.target.value));

function renderSetupFromState(){
  $("#p1").value = state.players[0] || "Jack";
  $("#p2").value = state.players[1] || "Meg";
}

// start session
$("#btnStart").addEventListener("click", ()=>{
  const selected = $$(".monster-chip.active").map(c => c.dataset.id);
  if (!selected.length) { alert("Pick at least one monster."); return; }
  state.players = [$("#p1").value.trim() || "Jack", $("#p2").value.trim() || "Meg"];
  const sess = {
    id: "s"+Date.now(),
    date: new Date().toISOString(),
    players: state.players.slice(),
    set: $("#gameSet").value,
    target: $("#target").value,
    houseRules: {
      fastVillagers: $("#hrFastVillagers").checked,
      noPerks: $("#hrNoPerks").checked,
      hardEvents: $("#hrHardEvents").checked
    },
    monsters: selected,
    terror: 0,
    saved: 0,
    turns: 0,
    monstersState: Object.fromEntries(selected.map(id => [id, defaultMonsterState(MONSTERS[id])])),
    notes: ""
  };
  state.current = sess;
  save();
  show("session");
  renderSession();
});

// -------------- Session --------------
function renderSession(){
  const s = state.current;
  if(!s){ return; }

  $("#terrorDisplay").textContent = s.terror;
  $("#savedDisplay").textContent = s.saved;
  $("#turnDisplay").textContent = s.turns;
  $("#notes").value = s.notes || "";

  const area = $("#monsterArea");
  area.innerHTML = "";
  s.monsters.forEach(id => {
    const m = MONSTERS[id];
    const ms = s.monstersState[id];
    const card = document.createElement("section");
    card.className = "monster-card panel";
    card.innerHTML = `
      <h3>${monsterDot(m.color)} ${m.name} <span class="tag">${m.set}</span></h3>
      <p class="goal">${m.goal}</p>
      <div class="tasks"></div>
    `;
    const tasks = card.querySelector(".tasks");
    m.tasks.forEach((t, idx)=>{
      const block = document.createElement("div");
      block.className = "progress";
      if(t.type==="count"){
        block.innerHTML = `
          <span>${t.label}</span>
          <button class="minus">–</button>
          <span class="pill"><span class="val">${ms[idx]||0}</span> / ${t.max}</span>
          <button class="plus">+</button>
        `;
        block.querySelector(".minus").addEventListener("click", ()=>{ ms[idx]=Math.max(0,(ms[idx]||0)-1); save(); renderSession(); });
        block.querySelector(".plus").addEventListener("click", ()=>{ ms[idx]=Math.min(t.max,(ms[idx]||0)+1); save(); renderSession(); });
      }else if(t.type==="bool"){
        const checked = !!ms[idx];
        block.innerHTML = `
          <label class="check"><input type="checkbox" ${checked?"checked":""}> ${t.label}</label>
        `;
        block.querySelector("input").addEventListener("change", e=>{ ms[idx]=e.target.checked; save(); });
      }
      tasks.appendChild(block);
    });
    area.appendChild(card);
  });

  // HUD controls
  $("#terrorUp").onclick = ()=>{ s.terror=Math.min(6, s.terror+1); save(); $("#terrorDisplay").textContent=s.terror; };
  $("#terrorDown").onclick = ()=>{ s.terror=Math.max(0, s.terror-1); save(); $("#terrorDisplay").textContent=s.terror; };
  $("#savedUp").onclick = ()=>{ s.saved+=1; save(); $("#savedDisplay").textContent=s.saved; };
  $("#savedDown").onclick = ()=>{ s.saved=Math.max(0, s.saved-1); save(); $("#savedDisplay").textContent=s.saved; };
  $("#turnUp").onclick = ()=>{ s.turns+=1; save(); $("#turnDisplay").textContent=s.turns; };
  $("#turnDown").onclick = ()=>{ s.turns=Math.max(0, s.turns-1); save(); $("#turnDisplay").textContent=s.turns; };

  $("#notes").oninput = (e)=>{ s.notes = e.target.value; save(); };

  $("#btnEnd").onclick = ()=>{
    if(!confirm("End session and record results?")) return;
    const result = summarizeCurrent();
    state.sessions.push(result);
    state.current = null;
    save();
    alert("Session saved!");
    renderStats();
    show("stats");
  };
}

function summarizeCurrent(){
  const s = state.current;
  // Determine a W/L heuristic: If every monster has their last bool task checked, count as Win.
  const win = s.monsters.every(id => {
    const def = MONSTERS[id];
    const ms = s.monstersState[id];
    const last = def.tasks[def.tasks.length-1];
    return last && last.type==="bool" && !!ms[def.tasks.length-1];
  });
  return {
    id:s.id,
    date:s.date,
    players:s.players,
    set:s.set, target:s.target, houseRules:s.houseRules,
    monsters:s.monsters,
    terror:s.terror, saved:s.saved, turns:s.turns,
    notes:s.notes,
    win
  };
}

function defaultMonsterState(m){
  return m.tasks.map(t => t.type==="count"?0:false);
}

// -------------- Stats --------------
function renderStats(){
  const sessions = state.sessions || [];
  const wins = sessions.filter(s=>s.win).length;
  const losses = sessions.length - wins;
  const totalTurns = sessions.reduce((a,s)=>a+s.turns,0);
  const avgTurns = sessions.length? (totalTurns/sessions.length).toFixed(1):"-";
  $("#lifetime").innerHTML = `
    <div class="monster-card">
      <h3>Record</h3>
      <div class="grid three">
        <div><div class="hud-label">Wins</div><div class="count">${wins}</div></div>
        <div><div class="hud-label">Losses</div><div class="count">${losses}</div></div>
        <div><div class="hud-label">Avg Turns</div><div class="count">${avgTurns}</div></div>
      </div>
    </div>
  `;

  // By monster
  const by = {};
  sessions.forEach(s=>{
    s.monsters.forEach(id=>{
      by[id] ??= {plays:0,wins:0};
      by[id].plays++; if(s.win) by[id].wins++;
    });
  });
  const wrap = $("#byMonster");
  wrap.innerHTML = "";
  Object.entries(by).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([id,stat])=>{
    const m = MONSTERS[id];
    const winrate = stat.plays? Math.round((stat.wins/stat.plays)*100) : 0;
    const card = document.createElement("div");
    card.className = "monster-card";
    card.innerHTML = `
      <h3>${monsterDot(m.color)} ${m.name}</h3>
      <div class="goal">${m.set}</div>
      <div class="grid three">
        <div><div class="hud-label">Plays</div><div class="count">${stat.plays}</div></div>
        <div><div class="hud-label">Wins</div><div class="count">${stat.wins}</div></div>
        <div><div class="hud-label">Win%</div><div class="count">${winrate}</div></div>
      </div>
    `;
    wrap.appendChild(card);
  });

  // Recent
  const recent = sessions.slice(-8).reverse();
  const recentWrap = $("#recentSessions");
  recentWrap.innerHTML = "";
  recent.forEach(s=>{
    const box = document.createElement("div");
    box.className = "monster-card";
    const date = new Date(s.date).toLocaleString([], {dateStyle:"medium", timeStyle:"short"});
    const mons = s.monsters.map(id=>MONSTERS[id].name).join(", ");
    box.innerHTML = `
      <h3>${s.win? "🧡 Win":"💀 Loss"} — ${date}</h3>
      <div class="goal">${mons}</div>
      <div class="grid three">
        <div><div class="hud-label">Terror</div><div class="count">${s.terror}</div></div>
        <div><div class="hud-label">Saved</div><div class="count">${s.saved}</div></div>
        <div><div class="hud-label">Turns</div><div class="count">${s.turns}</div></div>
      </div>
      ${s.notes? `<p class="hint" style="margin-top:.6rem">${escapeHtml(s.notes)}</p>`:""}
    `;
    recentWrap.appendChild(box);
  });
}

// -------------- Export / Import --------------
$("#btnExport").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  a.download = `horrified-data-${stamp}.json`;
  a.click();
});

$("#fileImport").addEventListener("change", async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  try{
    const text = await f.text();
    const imported = JSON.parse(text);
    if(!imported.sessions) throw new Error("Invalid file");
    state = imported;
    save();
    renderStats();
    renderSetupFromState();
    alert("Import successful!");
  }catch(err){
    alert("Import failed: "+err.message);
  }finally{
    e.target.value="";
  }
});

// -------------- Nav --------------
function attachNav(){
  $("#btnSetup").onclick = ()=>show("setup");
  $("#btnSession").onclick = ()=>{ show("session"); renderSession(); };
  $("#btnStats").onclick = ()=>{ show("stats"); renderStats(); };
}

function show(key){
  Object.values(views).forEach(v=>v.classList.remove("show"));
  if(views[key]) views[key].classList.add("show");
  window.scrollTo({top:0, behavior:"smooth"});
}

// -------------- Helpers --------------
function load(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)); }catch{ return null; }
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function monsterDot(color){
  const el = document.createElement("span");
  el.style.display="inline-block";
  el.style.width="12px"; el.style.height="12px"; el.style.borderRadius="50%";
  el.style.backgroundColor=color; el.style.boxShadow=`0 0 0 3px rgba(166,255,239,.15)`;
  el.style.marginRight=".3rem";
  return el.outerHTML;
}
function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
