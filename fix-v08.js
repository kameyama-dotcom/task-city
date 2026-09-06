(() => {
  const PATCH_VERSION = '0.9.0';

  const style = document.createElement('style');
  style.textContent = `
    .add-btn,#saveTask,.nav,.radial,.radial *,.tag-orb,.radial-center{
      -webkit-user-select:none!important;
      user-select:none!important;
      -webkit-touch-callout:none!important;
    }
    .date-today-btn{
      border-color:#9edfe1!important;
      background:#effcfc!important;
      color:#137a7d!important;
      font-weight:900!important;
    }
    .plan-edit-box{
      margin-top:12px;
      padding:12px;
      border:1px solid var(--line);
      border-radius:14px;
      background:#f8fcfb;
    }
    .plan-edit-box .label{margin-bottom:8px}
    .plan-date-sheet{
      height:min(88dvh,720px)!important;
      max-height:92dvh!important;
      display:flex!important;
      flex-direction:column!important;
      overflow:hidden!important;
    }
    .plan-date-fixed{flex:0 0 auto}
    .plan-date-load{
      flex:1 1 auto;
      min-height:110px;
      overflow-y:auto;
      -webkit-overflow-scrolling:touch;
      padding:12px 2px 2px;
      margin-top:4px;
      border-top:1px solid var(--line);
    }
    .plan-date-load .panel{margin-bottom:0}
    .plan-date-actions{
      flex:0 0 auto;
      margin-top:10px!important;
      padding-top:10px;
      border-top:1px solid var(--line);
    }
    @media(max-width:560px){
      .plan-date-sheet{height:88dvh!important}
    }
  `;
  document.head.appendChild(style);

  function focusAddInput(){
    const el = $('#content');
    if(!el) return;
    try{
      el.focus({preventScroll:true});
      const end = el.value.length;
      el.setSelectionRange(end,end);
    }catch(e){
      try{ el.focus(); }catch(_){}
    }
  }

  startAddGesture = function(e){
    e.preventDefault();
    addGesture.holding=false;
    clearTimeout(addGesture.timer);

    const first=quickTags()[0]||Object.keys(TAGS)[0];
    const move=ev=>{
      if(ui.radial){
        const k=radialChoice(ev.clientX,ev.clientY);
        if(k&&k!==ui.radialSel){
          ui.radialSel=k;
          $$('[data-tag-radial]').forEach(n=>n.classList.toggle('sel',n.dataset.tagRadial===k));
        }
      }
    };
    const up=ev=>{
      clearTimeout(addGesture.timer);
      document.removeEventListener('pointermove',move,true);
      document.removeEventListener('pointerup',up,true);
      document.removeEventListener('pointercancel',up,true);
      if(ui.radial){
        const k=radialChoice(ev.clientX,ev.clientY)||ui.radialSel||first;
        openAdd(k);
      }else{
        openAdd(first);
      }
    };
    document.addEventListener('pointermove',move,true);
    document.addEventListener('pointerup',up,true);
    document.addEventListener('pointercancel',up,true);

    addGesture.timer=setTimeout(()=>{
      addGesture.holding=true;
      ui.radial=true;
      ui.radialSel=first;
      render();
    },220);
  };

  openAdd = function(tag){
    ui.radial=false;
    tag=TAGS[tag]?tag:Object.keys(TAGS)[0];
    ui.addTag=tag;
    ui.draft=newDraft(tag);
    ui.modal='add';
    render();
    focusAddInput();
    requestAnimationFrame(focusAddInput);
  };

  addModal = function(){
    const d=ui.draft||newDraft();
    ui.draft=d;
    return `<div class="modal-backdrop" id="backdrop"><div class="sheet">
      <div class="field-title">タグ</div>
      <div class="tag-pills icon-only">
        ${Object.entries(TAGS).map(([k,v])=>`<button class="tag-pill ${d.tag===k?'selected':''}" data-tag-draft="${k}">${v.icon} ${esc(v.name)}</button>`).join('')}
        <button class="tag-pill" id="manageTags">＋ タグ</button>
      </div>
      <div class="field"><input id="content" class="text-input" value="${escAttr(d.content)}" placeholder="何をする？" autocomplete="off"></div>
      <div class="field"><div class="field-title">👑 / 🧑 重要度　　🏃 / 🚶 緊急度</div>${quadGrid(d.quad)}</div>
      <div class="field">
        <div class="deadline-caption">〆切</div>
        <div class="row wrap">
          <div class="stepper"><button data-step-year="-1">−</button><span id="yearVal">${d.year}</span><button data-step-year="1">＋</button></div>
          <button id="draftToday" class="ghost date-today-btn">今日</button>
          <button id="draftDateMinus" class="ghost" title="1日前">−</button>
          <input id="dateRaw" class="mini-input" inputmode="numeric" maxlength="4" placeholder="906" value="${d.dateRaw||''}">
          <button id="draftDatePlus" class="ghost" title="1日後">＋</button>
          <span id="datePreview" class="subtle">${previewDate(d)}</span>
        </div>
      </div>
      <div class="field">
        <div class="row">
          <button id="timeMinus" class="ghost">−15</button>
          <input id="timeRaw" class="mini-input" inputmode="numeric" maxlength="4" placeholder="1830" value="${d.timeRaw||''}">
          <button id="timePlus" class="ghost">＋15</button>
          <span id="timePreview" class="subtle">${d.timeRaw?hhmm(d.timeRaw):'—'}</span>
        </div>
      </div>
      <div class="sheet-actions"><button id="cancelModal" class="ghost">×</button><button id="saveTask" class="primary-btn save">✓</button></div>
      <div class="save-hint">長押し ✓ → 続けて登録</div>
    </div></div>`;
  };

  function setDraftDateFromDate(x){
    ui.draft.year=x.getFullYear();
    ui.draft.dateRaw=String(x.getMonth()+1)+String(x.getDate()).padStart(2,'0');
  }

  stepDraftDate = function(delta){
    const d=ui.draft;
    const base=parseRawDate(d.dateRaw,d.year)||today();
    const x=addDays(new Date(base+'T00:00:00'),delta);
    setDraftDateFromDate(x);
    render();
  };

  bindAdd = function(){
    if($('#manageTags')) $('#manageTags').onclick=()=>openTagSettings('add');
    $('#content').oninput=e=>ui.draft.content=e.target.value;

    $$('[data-tag-draft]').forEach(b=>b.onclick=()=>{
      ui.draft.tag=b.dataset.tagDraft;
      render();
    });
    $$('[data-quad]').forEach(b=>b.onclick=()=>{
      ui.draft.quad=b.dataset.quad;
      render();
    });
    $$('[data-step-year]').forEach(b=>b.onclick=()=>{
      ui.draft.year+=Number(b.dataset.stepYear);
      render();
    });

    $('#dateRaw').oninput=e=>{
      ui.draft.dateRaw=e.target.value.replace(/\D/g,'').slice(0,4);
      const p=parseRawDate(ui.draft.dateRaw,ui.draft.year);
      $('#datePreview').textContent=p?fmt(p):'—';
    };
    $('#timeRaw').oninput=e=>{
      ui.draft.timeRaw=e.target.value.replace(/\D/g,'').slice(0,4);
      $('#timePreview').textContent=ui.draft.timeRaw?hhmm(ui.draft.timeRaw):'—';
    };

    $('#draftToday').onclick=()=>{
      setDraftDateFromDate(new Date());
      render();
    };
    $('#draftDateMinus').onclick=()=>stepDraftDate(-1);
    $('#draftDatePlus').onclick=()=>stepDraftDate(1);
    $('#timeMinus').onclick=()=>stepDraftTime(-15);
    $('#timePlus').onclick=()=>stepDraftTime(15);

    const saveBtn=$('#saveTask');
    let timer,long=false;
    saveBtn.oncontextmenu=e=>e.preventDefault();
    saveBtn.onselectstart=e=>e.preventDefault();
    saveBtn.onpointerdown=e=>{
      e.preventDefault();
      long=false;
      timer=setTimeout(()=>{
        long=true;
        saveDraft(true);
      },650);
    };
    saveBtn.onpointerup=e=>{
      e.preventDefault();
      clearTimeout(timer);
      if(!long) saveDraft(false);
    };
    saveBtn.onpointercancel=()=>clearTimeout(timer);
  };

  function isTodayTarget(x,t=today()){
    return x.planDate===t || (!x.planDate && x.deadline===t);
  }

  todayTasks = function(){
    const t=today();
    return active().filter(x=>isTodayTarget(x,t)).sort(scoreSort);
  };

  todayHtml = function(){
    const t=today();
    const ts=todayTasks();
    const done=state.tasks.filter(x=>
      x.completedAt &&
      iso(x.completedAt)===t &&
      isTodayTarget(x,t)
    ).length;
    const up=unplanned();
    return `${cityHtml()}
      <div class="today-strip">
        <span class="today-count">今日のタスク　${done}/${ts.length+done}</span>
        <button class="inbox-mini ${needsPlanAttention(up)?'warn':''}" data-view="plan" title="未計画">未 ${up.length}</button>
      </div>
      <div class="cards">${ts.slice(0,3).map((task,i)=>cardHtml(task,i===0)).join('')||`<div class="panel empty">☕<br><span class="subtle">予定なし</span></div>`}</div>
      ${ts.length>3?`<div class="hint">あと ${ts.length-3}</div>`:''}`;
  };

  cardHtml = function(t,primary){
    const dl=compactDeadline(t),tag=safeTag(t.tag);
    return `<article class="task-card ${primary?'primary':''}" data-task="${t.id}" style="--accent:${QUADS[t.quad].color}">
      <div class="task-line">
        <span class="priority-icons" title="重要度・緊急度">${priorityIcons(t.quad)}</span>
        <span class="task-tag-only" title="${escAttr(tag.name)}">${tag.icon}</span>
        <span class="task-title-inline">${esc(t.content)}</span>
        <span class="points">★${t.points}</span>
      </div>
      <div class="task-meta">
        <span class="deadline-compact ${dl.hot?'hot':''}">${dl.text}</span>
        <span>${t.planTime?`予定 ${hhmm(t.planTime)}`:''}</span>
        <span>${t.minutes?`予測 ${t.minutes}分`:''}</span>
      </div>
    </article>`;
  };

  openDate = function(id){
    ui.detailId=id;
    const t=state.tasks.find(x=>x.id===id);
    ui.dateBase=t?.planDate||today();
    ui.dateTime=t?.planTime||'';
    ui.dateMinutes=(t?.minutes ?? '');
    ui.modal='date';
    render();
  };

  dateModal = function(){
    const t=state.tasks.find(x=>x.id===ui.detailId);
    const base=ui.dateBase||t?.planDate||today();
    const rawTime=ui.dateTime||'';
    const minutes=ui.dateMinutes ?? t?.minutes ?? '';

    return `<div class="modal-backdrop" id="backdrop">
      <div class="sheet plan-date-sheet">
        <div class="plan-date-fixed">
          <h2>実行予定日</h2>
          ${t?`<div class="panel" style="box-shadow:none;margin-bottom:10px"><b>${esc(t.content)}</b><div class="subtle">${deadlineLabel(t)}</div></div>`:''}
          <div class="field" style="margin:10px 0">
            <div class="label">日付</div>
            <div class="row">
              <button id="dateMinus" class="ghost">−</button>
              <button class="primary-btn" id="datePick">${fmt(base)}</button>
              <button id="datePlus" class="ghost">＋</button>
            </div>
          </div>
          <div class="plan-edit-box">
            <div class="field" style="margin:0 0 11px">
              <div class="label">実行時刻（任意）</div>
              <div class="row wrap">
                <button id="dateTimeMinus" class="ghost">−15</button>
                <input id="dateTimeRaw" class="mini-input" inputmode="numeric" maxlength="4" placeholder="1830" value="${escAttr(rawTime)}">
                <button id="dateTimePlus" class="ghost">＋15</button>
                <span id="dateTimePreview" class="subtle">${rawTime?hhmm(rawTime):'—'}</span>
              </div>
            </div>
            <div class="field" style="margin:0">
              <div class="label">予測時間</div>
              <div class="row">
                <input id="dateMinutes" class="mini-input" inputmode="numeric" value="${escAttr(minutes)}">
                <span class="subtle">分</span>
              </div>
            </div>
          </div>
        </div>

        <div class="plan-date-load">
          <div class="label">この日の負荷</div>
          ${dayLoadHtml(base)}
        </div>

        <div class="sheet-actions plan-date-actions">
          <button id="cancelModal" class="ghost">閉じる</button>
          <button id="confirmDate" class="primary-btn">この日にする</button>
        </div>
      </div>
    </div>`;
  };

  function stepPlanModalTime(delta){
    let raw=ui.dateTime||'0900';
    raw=normTime(raw)||'0900';
    let h=Number(raw.slice(0,2)),m=Number(raw.slice(2));
    let total=(h*60+m+delta+1440)%1440;
    ui.dateTime=String(Math.floor(total/60)).padStart(2,'0')+String(total%60).padStart(2,'0');
    const input=$('#dateTimeRaw'),preview=$('#dateTimePreview');
    if(input) input.value=ui.dateTime;
    if(preview) preview.textContent=hhmm(ui.dateTime);
  }

  bindDate = function(){
    const t=state.tasks.find(x=>x.id===ui.detailId);

    $('#dateMinus').onclick=()=>{
      ui.dateBase=iso(addDays(new Date(ui.dateBase+'T00:00:00'),-1));
      render();
    };
    $('#datePlus').onclick=()=>{
      ui.dateBase=iso(addDays(new Date(ui.dateBase+'T00:00:00'),1));
      render();
    };

    $('#dateTimeRaw').oninput=e=>{
      ui.dateTime=e.target.value.replace(/\D/g,'').slice(0,4);
      $('#dateTimePreview').textContent=ui.dateTime?hhmm(ui.dateTime):'—';
    };
    $('#dateTimeMinus').onclick=()=>stepPlanModalTime(-15);
    $('#dateTimePlus').onclick=()=>stepPlanModalTime(15);
    $('#dateMinutes').oninput=e=>{
      ui.dateMinutes=e.target.value.replace(/\D/g,'').slice(0,3);
    };

    $('#confirmDate').onclick=()=>{
      t.planDate=ui.dateBase;
      t.planTime=normTime(ui.dateTime);
      t.minutes=Math.max(0,Number(ui.dateMinutes)||0);
      save();
      ui.modal=null;
      render();
    };
  };

  render();
  console.info(`[Task City] patch ${PATCH_VERSION} loaded`);
})();


/* === v0.10 : full today list + overdue shelf + list/matrix switch === */
(() => {
  const PATCH_VERSION_V10 = '0.10.0';

  const style = document.createElement('style');
  style.textContent = `
    .overdue-block{
      margin:4px 0 14px;
      padding:12px;
      border:1px solid #ffc8d5;
      border-radius:18px;
      background:linear-gradient(180deg,#fff7f9,#fff);
      box-shadow:0 7px 20px rgba(228,60,108,.07);
    }
    .overdue-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin:0 1px 9px;
      color:#c6325d;
      font-weight:950;
    }
    .overdue-count{
      min-width:28px;
      height:28px;
      border-radius:999px;
      display:grid;
      place-items:center;
      background:#ffe3ea;
      font-size:12px;
    }
    .overdue-cards{display:flex;flex-direction:column;gap:7px}
    .past-reason{font-weight:900;color:#d43b68}
    .today-all-note{font-size:11px;color:var(--muted);margin:-3px 2px 9px}
    .list-toolbar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin:3px 0 12px;
    }
    .list-toolbar h2{font-size:20px;margin:0}
    .list-mode-toggle{
      display:flex;
      gap:3px;
      padding:3px;
      border:1px solid var(--line);
      border-radius:999px;
      background:#f1f8f8;
    }
    .list-mode-toggle button{
      border:0;
      background:transparent;
      color:var(--muted);
      padding:8px 12px;
      border-radius:999px;
      font-size:12px;
      font-weight:900;
    }
    .list-mode-toggle button.active{
      background:#fff;
      color:var(--ink);
      box-shadow:0 3px 10px rgba(33,49,59,.09);
    }
    .list-vertical{
      overflow:hidden;
      padding:2px 14px!important;
    }
    .list-v10-row{
      width:100%;
      display:grid;
      grid-template-columns:auto minmax(0,1fr) auto;
      gap:9px;
      align-items:center;
      text-align:left;
      border:0;
      border-bottom:1px solid var(--line);
      background:transparent;
      color:var(--ink);
      padding:12px 0;
    }
    .list-v10-row:last-child{border-bottom:0}
    .list-v10-row .priority-badge{
      width:34px!important;
      height:34px!important;
      border-radius:10px!important;
    }
    .list-v10-main{min-width:0}
    .list-v10-title{
      font-weight:900;
      font-size:15px;
      line-height:1.35;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .list-v10-meta{
      display:flex;
      flex-wrap:wrap;
      gap:4px 9px;
      margin-top:4px;
      color:var(--muted);
      font-size:11px;
    }
    .list-v10-points{
      font-size:12px;
      font-weight:950;
      white-space:nowrap;
    }
    .list-overdue-text{color:#d43b68!important;font-weight:850}
    @media(max-width:560px){
      .overdue-block{padding:10px;margin-bottom:11px}
      .list-toolbar{margin-top:0}
      .list-toolbar h2{font-size:18px}
      .list-mode-toggle button{padding:7px 10px;font-size:11px}
      .list-vertical{padding:1px 11px!important}
      .list-v10-row{padding:10px 0;gap:7px}
      .list-v10-title{font-size:14px}
    }
  `;
  document.head.appendChild(style);

  // Keep the refreshed illustrations stable even if an older image is still in the HTTP cache.
  priorityIcons = function(q){
    return `<span class="priority-badge" style="--prio:${QUADS[q].color}"><img src="assets/${q}.png?v=10" alt="" draggable="false"></span>`;
  };

  function isTodayTargetV10(x,t=today()){
    // A task belongs to today when either its execution date OR its deadline is today.
    return x.planDate===t || x.deadline===t;
  }

  function prioritySortV10(a,b){
    const q={hh:0,hl:1,lh:2,ll:3};
    const qa=q[a.quad] ?? 9, qb=q[b.quad] ?? 9;
    if(qa!==qb) return qa-qb;

    const deadlineValue=x=>{
      if(!x.deadline) return Number.MAX_SAFE_INTEGER;
      const time=normTime(x.deadlineTime||'2359')||'2359';
      return Number(x.deadline.replaceAll('-','')+time);
    };
    const da=deadlineValue(a), db=deadlineValue(b);
    if(da!==db) return da-db;

    const pt=x=>x.planTime?Number(normTime(x.planTime)):9999;
    if(pt(a)!==pt(b)) return pt(a)-pt(b);

    return new Date(a.createdAt)-new Date(b.createdAt);
  }

  todayTasks = function(){
    const t=today();
    return active().filter(x=>isTodayTargetV10(x,t)).sort(prioritySortV10);
  };

  function pastTasksV10(){
    const t=today();
    return active()
      .filter(x=>{
        if(isTodayTargetV10(x,t)) return false;
        return (x.deadline && x.deadline<t) || (x.planDate && x.planDate<t);
      })
      .sort((a,b)=>{
        const ad=a.deadline||a.planDate||'9999-99-99';
        const bd=b.deadline||b.planDate||'9999-99-99';
        if(ad!==bd) return ad.localeCompare(bd);
        return prioritySortV10(a,b);
      });
  }

  function wasTodayTargetWhenCompletedV10(x,t=today()){
    return x.planDate===t || x.deadline===t;
  }

  function pastReasonV10(t){
    const td=today();
    if(t.deadline && t.deadline<td){
      const days=Math.max(1,Math.floor((new Date(td+'T00:00:00')-new Date(t.deadline+'T00:00:00'))/86400000));
      return `〆切 ${days}日超過`;
    }
    if(t.planDate && t.planDate<td){
      return `実行予定 ${fmt(t.planDate)} 未完了`;
    }
    return '未完了';
  }

  function pastCardHtmlV10(t){
    const tag=safeTag(t.tag);
    const dl=compactDeadline(t);
    return `<article class="task-card" data-task="${t.id}" style="--accent:${QUADS[t.quad].color}">
      <div class="task-line">
        <span class="priority-icons">${priorityIcons(t.quad)}</span>
        <span class="task-tag-only" title="${escAttr(tag.name)}">${tag.icon}</span>
        <span class="task-title-inline">${esc(t.content)}</span>
        <span class="points">★${t.points}</span>
      </div>
      <div class="task-meta">
        <span class="past-reason">${pastReasonV10(t)}</span>
        ${dl.text && !dl.text.includes('超過')?`<span>${dl.text}</span>`:''}
        <span>${t.minutes?`予測 ${t.minutes}分`:''}</span>
      </div>
    </article>`;
  }

  // Every active task for today is shown. No "top 3" cap and no hidden remainder.
  todayHtml = function(){
    const t=today();
    const ts=todayTasks();
    const past=pastTasksV10();
    const done=state.tasks.filter(x=>
      x.completedAt &&
      iso(x.completedAt)===t &&
      wasTodayTargetWhenCompletedV10(x,t)
    ).length;
    const up=unplanned();

    const pastHtml=past.length?`
      <section class="overdue-block">
        <div class="overdue-head"><span>⚠️ 過去のタスク</span><span class="overdue-count">${past.length}</span></div>
        <div class="overdue-cards">${past.map(pastCardHtmlV10).join('')}</div>
      </section>`:'';

    return `${cityHtml()}
      ${pastHtml}
      <div class="today-strip">
        <span class="today-count">今日のタスク　${done}/${ts.length+done}</span>
        <button class="inbox-mini ${needsPlanAttention(up)?'warn':''}" data-view="plan" title="未計画">未 ${up.length}</button>
      </div>
      <div class="today-all-note">優先度順 · すべて表示</div>
      <div class="cards">
        ${ts.map(task=>cardHtml(task,false)).join('')||`<div class="panel empty">☕<br><span class="subtle">予定なし</span></div>`}
      </div>`;
  };

  ui.listMode=ui.listMode||'rows';

  function activeListSortV10(a,b){
    const t=today();
    const overdue=x=>((x.deadline&&x.deadline<t)||(x.planDate&&x.planDate<t))?0:1;
    if(overdue(a)!==overdue(b)) return overdue(a)-overdue(b);

    const todayRank=x=>isTodayTargetV10(x,t)?0:1;
    if(todayRank(a)!==todayRank(b)) return todayRank(a)-todayRank(b);

    const p=prioritySortV10(a,b);
    if(p!==0) return p;

    const ad=a.planDate||a.deadline||'9999-99-99';
    const bd=b.planDate||b.deadline||'9999-99-99';
    return ad.localeCompare(bd);
  }

  function verticalListRowV10(t){
    const tag=safeTag(t.tag);
    const td=today();
    const overdue=(t.deadline&&t.deadline<td)||(t.planDate&&t.planDate<td);
    const dateBits=[];
    if(t.planDate) dateBits.push(`予定 ${fmt(t.planDate)}${t.planTime?' '+hhmm(t.planTime):''}`);
    else dateBits.push('未計画');
    if(t.deadline) dateBits.push(deadlineLabel(t));
    if(t.minutes) dateBits.push(`予測 ${t.minutes}分`);

    return `<button class="list-v10-row" data-task="${t.id}">
      <span>${priorityIcons(t.quad)}</span>
      <span class="list-v10-main">
        <span class="list-v10-title">${tag.icon} ${esc(t.content)}</span>
        <span class="list-v10-meta ${overdue?'list-overdue-text':''}">${dateBits.map(esc).join('<span> · </span>')}</span>
      </span>
      <span class="list-v10-points">★${t.points}</span>
    </button>`;
  }

  listHtml = function(){
    const mode=ui.listMode||'rows';
    const all=active().slice().sort(activeListSortV10);
    const toggle=`<div class="list-toolbar">
      <h2>タスク一覧</h2>
      <div class="list-mode-toggle" role="tablist" aria-label="一覧表示">
        <button data-list-mode="rows" class="${mode==='rows'?'active':''}">☰ 縦並び</button>
        <button data-list-mode="matrix" class="${mode==='matrix'?'active':''}">▦ 表</button>
      </div>
    </div>`;

    if(mode==='matrix'){
      return `${toggle}<div class="matrix-wrap"><div class="matrix" title="上ほど重要・右ほど緊急"><span class="matrix-y">🧑 ↓　重要度　↑ 👑</span><span class="matrix-x">🚶 ←　緊急度　→ 🏃</span>${all.map((t,i)=>matrixTaskHtml(t,i)).join('')}</div><div class="matrix-count">${all.length}</div></div>`;
    }

    return `${toggle}<section class="panel list-vertical">
      ${all.map(verticalListRowV10).join('')||'<div class="empty">タスクはありません</div>'}
    </section>`;
  };

  const bindBeforeV10=bind;
  bind = function(){
    bindBeforeV10();
    $$('[data-list-mode]').forEach(b=>b.onclick=()=>{
      ui.listMode=b.dataset.listMode;
      render();
    });
    $$('.list-v10-row[data-task]').forEach(r=>r.onclick=()=>openDetail(r.dataset.task));
  };

  render();
  console.info(`[Task City] patch ${PATCH_VERSION_V10} loaded`);
})();
