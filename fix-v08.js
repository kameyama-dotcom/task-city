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
/* === v0.11 : editable title + one-level parent/child tasks === */
(() => {
  const PATCH_VERSION_V11 = '0.11.0';

  const style = document.createElement('style');
  style.textContent = `
    .task-title-edit{
      width:100%;
      border:1px solid var(--line);
      border-radius:14px;
      padding:12px 13px;
      background:var(--surface);
      color:var(--ink);
      font-size:20px;
      line-height:1.35;
      font-weight:950;
    }
    .task-title-edit:focus{
      outline:3px solid rgba(25,197,199,.17);
      border-color:#19c5c7;
    }
    .relation-box{
      border:1px solid var(--line);
      border-radius:16px;
      padding:13px;
      background:#f8fcfb;
    }
    .relation-head{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      margin-bottom:8px;
    }
    .relation-head b{font-size:14px}
    .relation-link{
      width:100%;
      border:1px solid var(--line);
      background:#fff;
      border-radius:12px;
      padding:10px 11px;
      color:var(--ink);
      text-align:left;
      font-weight:850;
    }
    .relation-list{
      display:flex;
      flex-direction:column;
      gap:7px;
      margin-top:9px;
    }
    .relation-row{
      width:100%;
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:8px;
      align-items:center;
      border:1px solid var(--line);
      background:#fff;
      border-radius:12px;
      padding:10px 11px;
      color:var(--ink);
      text-align:left;
    }
    .relation-row b{
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      font-size:13px;
    }
    .relation-row span{
      color:var(--muted);
      font-size:11px;
      white-space:nowrap;
    }
    .child-parent-meta{
      color:#43848a!important;
      font-weight:850;
    }
    .parent-chip{
      display:flex;
      align-items:center;
      gap:7px;
      margin:0 0 11px;
      padding:9px 11px;
      border:1px solid #bfe7e6;
      background:#effbfb;
      border-radius:12px;
      color:#236a6e;
      font-size:12px;
      font-weight:850;
    }
    .parent-zero{
      border-radius:12px;
      background:#f3f6f6;
      padding:10px 12px;
      color:var(--muted);
      font-size:12px;
      font-weight:800;
    }
    .parent-picker-list{
      display:flex;
      flex-direction:column;
      gap:7px;
      max-height:52dvh;
      overflow-y:auto;
      -webkit-overflow-scrolling:touch;
      margin-top:12px;
    }
    .parent-picker-btn{
      width:100%;
      border:1px solid var(--line);
      background:#fff;
      color:var(--ink);
      border-radius:13px;
      padding:12px;
      text-align:left;
      font-weight:850;
    }
    .confirm-copy{
      color:var(--muted);
      font-size:13px;
      line-height:1.6;
      margin:7px 0 14px;
    }
    .choice-stack{
      display:flex;
      flex-direction:column;
      gap:9px;
      margin-top:15px;
    }
    .choice-stack button{width:100%}
    .parent-done-mark{
      width:62px;
      height:62px;
      margin:5px auto 12px;
      display:grid;
      place-items:center;
      border-radius:20px;
      background:#eafafa;
      font-size:31px;
    }
    @media(max-width:560px){
      .task-title-edit{font-size:18px}
      .relation-box{padding:11px}
    }
  `;
  document.head.appendChild(style);

  // Existing task data remains valid. Add only optional fields.
  state.tasks.forEach(t => {
    if(!('parentId' in t)) t.parentId = null;
    if(!('parentPointsBackup' in t)) t.parentPointsBackup = null;
  });

  const taskByIdV11 = id => state.tasks.find(t => t.id === id);
  const childrenOfV11 = id => state.tasks.filter(t => t.parentId === id);
  const unfinishedChildrenV11 = id => childrenOfV11(id).filter(t => !t.completedAt);
  const hasChildrenV11 = id => childrenOfV11(id).length > 0;
  const isParentV11 = t => !!t && hasChildrenV11(t.id);

  function parentForV11(t){
    return t?.parentId ? taskByIdV11(t.parentId) : null;
  }

  function makeParentV11(parent){
    if(!parent) return;
    if(parent.parentPointsBackup == null && Number(parent.points || 0) !== 0){
      parent.parentPointsBackup = Number(parent.points || 0);
    }
    parent.points = 0;
  }

  function restoreFormerParentPointsV11(parentId){
    if(!parentId) return;
    const parent = taskByIdV11(parentId);
    if(!parent) return;
    if(!hasChildrenV11(parentId)){
      if(parent.parentPointsBackup != null) parent.points = parent.parentPointsBackup;
      parent.parentPointsBackup = null;
    }else{
      makeParentV11(parent);
    }
  }

  function setParentV11(child, parentId){
    if(!child) return false;
    if(hasChildrenV11(child.id)) return false;

    const oldParentId = child.parentId || null;
    if(parentId){
      const parent = taskByIdV11(parentId);
      if(!parent || parent.id === child.id || parent.parentId) return false;
      child.parentId = parent.id;
      makeParentV11(parent);
    }else{
      child.parentId = null;
    }

    if(oldParentId && oldParentId !== parentId){
      restoreFormerParentPointsV11(oldParentId);
    }
    save();
    return true;
  }

  // A child is still a normal task, so it must also appear in the planning pool.
  unplanned = function(){
    return active().filter(t => !t.planDate);
  };

  // Normal + button always starts a top-level task.
  const openAddV10 = openAdd;
  openAdd = function(tag){
    ui.newChildParentId = null;
    return openAddV10(tag);
  };

  function openChildAddV11(parentId){
    const parent = taskByIdV11(parentId);
    if(!parent || parent.parentId) return;
    ui.newChildParentId = parent.id;
    ui.radial = false;
    ui.addTag = parent.tag;
    ui.draft = newDraft(parent.tag);
    ui.draft.quad = parent.quad;
    ui.modal = 'add';
    render();
    requestAnimationFrame(() => {
      const el = $('#content');
      if(el) el.focus();
    });
  }

  // Show which parent a newly-created child belongs to.
  const addModalV10 = addModal;
  addModal = function(){
    let html = addModalV10();
    const parent = ui.newChildParentId ? taskByIdV11(ui.newChildParentId) : null;
    if(parent){
      const chip = `<div class="parent-chip">↳ 子タスクとして追加　<b>${esc(parent.content)}</b></div>`;
      html = html.replace('<div class="field-title">タグ</div>', chip + '<div class="field-title">タグ</div>');
    }
    return html;
  };

  // Create a child with all the same normal task properties.
  const saveDraftV10 = saveDraft;
  saveDraft = function(again){
    const parentId = ui.newChildParentId;
    if(!parentId) return saveDraftV10(again);

    const parent = taskByIdV11(parentId);
    const d = ui.draft;
    if(!parent || !d || !d.content.trim()) return;

    const deadline = parseRawDate(d.dateRaw, d.year);
    const pts = estimatePoints(d.content);
    const t = task(
      d.content.trim(),
      d.tag,
      d.quad,
      deadline,
      d.timeRaw,
      '',
      pts,
      estimateMinutes(d.content, pts)
    );
    t.parentId = parent.id;
    state.tasks.unshift(t);
    makeParentV11(parent);
    save();

    if(again){
      ui.draft = newDraft(d.tag);
      ui.draft.quad = d.quad;
      ui.modal = 'add';
      render();
      requestAnimationFrame(() => $('#content')?.focus());
    }else{
      ui.newChildParentId = null;
      ui.modal = null;
      ui.snack = {text:`${parent.content} に子タスクを追加しました`,id:null};
      render();
      setTimeout(() => {
        if(ui.snack && !ui.snack.id){
          ui.snack = null;
          render();
        }
      },2200);
    }
  };

  function relationHtmlV11(t){
    const parent = parentForV11(t);

    if(parent){
      const siblings = unfinishedChildrenV11(parent.id).filter(x => x.id !== t.id);
      return `<div class="detail-section">
        <div class="relation-box">
          <div class="relation-head">
            <b>親タスク</b>
            <button id="changeParent" class="ghost">変更</button>
          </div>
          <button class="relation-link" data-open-related="${parent.id}">↳ ${esc(parent.content)}</button>
          ${siblings.length ? `
            <div class="field-title" style="margin-top:13px">同じ親の未完了タスク</div>
            <div class="relation-list">
              ${siblings.map(s => `<button class="relation-row" data-open-related="${s.id}">
                <b>${esc(s.content)}</b>
                <span>${s.planDate ? fmt(s.planDate) : '未計画'}</span>
              </button>`).join('')}
            </div>` : ''}
        </div>
      </div>`;
    }

    const children = unfinishedChildrenV11(t.id);
    return `<div class="detail-section">
      <div class="relation-box">
        <div class="relation-head">
          <b>${hasChildrenV11(t.id) ? '子タスク' : '親子タスク'}</b>
          ${!hasChildrenV11(t.id) ? `<button id="setParent" class="ghost">親を設定</button>` : ''}
        </div>
        ${hasChildrenV11(t.id) ? (
          children.length ? `<div class="relation-list">
            ${children.map(c => `<button class="relation-row" data-open-related="${c.id}">
              <b>${esc(c.content)}</b>
              <span>${c.planDate ? fmt(c.planDate) : '未計画'}</span>
            </button>`).join('')}
          </div>` : `<div class="subtle">未完了の子タスクはありません</div>`
        ) : `<div class="subtle">必要なら、このタスクを親にして1段だけ子タスクを作れます。</div>`}
        <button id="addChildTask" class="ghost" style="width:100%;margin-top:10px">＋ 子タスクを追加</button>
      </div>
    </div>`;
  }

  // Detail screen: title is now editable. AI breakdown is removed.
  detailModal = function(){
    const t = taskByIdV11(ui.detailId);
    if(!t) return '';

    const parentTask = isParentV11(t);

    return `<div class="modal-backdrop" id="backdrop"><div class="sheet">
      <div class="field">
        <div class="field-title">タイトル</div>
        <input id="taskTitleEdit" class="task-title-edit" value="${escAttr(t.content)}" maxlength="160">
      </div>

      <div class="tag-pills icon-only">
        ${Object.entries(TAGS).map(([k,v])=>`<button class="tag-pill ${t.tag===k?'selected':''}" data-tag-edit="${k}">${v.icon} ${esc(v.name)}</button>`).join('')}
        <button class="tag-pill" id="manageTags">＋ タグ</button>
      </div>

      <div class="deadline-focus">
        <div class="deadline-caption">〆切</div>
        <div class="deadline-big">${t.deadline?fmt(t.deadline):'なし'} ${t.deadlineTime?hhmm(t.deadlineTime):''}</div>
        <div class="deadline-year">
          <button class="ghost deadline-year-step" data-y="-1">−</button>
          <strong>${t.deadline?new Date(t.deadline+'T00:00:00').getFullYear():new Date().getFullYear()}</strong>
          <button class="ghost deadline-year-step" data-y="1">＋</button>
        </div>
        <div class="row">
          <button class="ghost deadline-step" data-d="-1">−</button>
          <button class="ghost" id="detailDeadline">${t.deadline?fmt(t.deadline):'なし'}</button>
          <button class="ghost deadline-step" data-d="1">＋</button>
          <input id="deadlineTime" class="mini-input" inputmode="numeric" maxlength="4" placeholder="時刻" value="${t.deadlineTime||''}">
        </div>
      </div>

      <div class="detail-section">
        <div class="plan-caption">実行予定日</div>
        <div class="row">
          <button class="ghost task-plan-step" data-d="-1">−</button>
          <button id="detailPlan" class="ghost">${t.planDate?fmt(t.planDate):'未設定'}</button>
          <button class="ghost task-plan-step" data-d="1">＋</button>
          <input id="planTime" class="mini-input" inputmode="numeric" maxlength="4" placeholder="時刻" value="${t.planTime||''}">
        </div>
        <div class="row" style="margin-top:10px">
          <span class="subtle">予測</span>
          <input id="minutes" class="mini-input" inputmode="numeric" value="${t.minutes||''}">
          <span class="subtle">分</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="field-title">${priorityIcons(t.quad)}　重要度・緊急度</div>
        ${quadGrid(t.quad)}
      </div>

      ${relationHtmlV11(t)}

      <div class="detail-section point-area">
        ${parentTask
          ? `<div class="parent-zero">親タスクは 0pt（街の成長は子タスクの完了で加算）</div>`
          : `<div class="subtle">★ AI ${t.points}pt</div>
             <div class="row wrap" style="margin-top:8px">
               ${POINTS.map(p=>`<button class="ghost point-edit" data-p="${p}" style="${t.points===p?'background:var(--ink);color:var(--surface)':''}">${p}</button>`).join('')}
             </div>`}
      </div>

      <div class="subtle">${new Date(t.createdAt).toLocaleDateString()} ・ ↪ ${t.skips||0}</div>

      ${parentTask && unfinishedChildrenV11(t.id).length===0
        ? `<button id="completeParentNow" class="primary-btn" style="width:100%;margin-top:14px">✓ 親タスクを完了</button>`
        : ''}

      <div class="sheet-actions">
        <button id="deleteTask" class="danger">削除</button>
        <button id="closeDetail" class="primary-btn">✓</button>
      </div>
    </div></div>`;
  };

  function parentPickerModalV11(){
    const child = taskByIdV11(ui.parentPickerTaskId);
    if(!child) return '';

    const candidates = active().filter(t =>
      t.id !== child.id &&
      !t.parentId
    );

    return `<div class="modal-backdrop" id="backdrop"><div class="sheet">
      <h2>親タスクを設定</h2>
      <div class="subtle">親子関係は1階層だけです。</div>
      <div class="parent-picker-list">
        ${child.parentId ? `<button class="parent-picker-btn" data-parent-choice="">親なしに戻す</button>` : ''}
        ${candidates.map(p => `<button class="parent-picker-btn" data-parent-choice="${p.id}">
          ${safeTag(p.tag).icon} ${esc(p.content)}
        </button>`).join('')}
        ${!candidates.length && !child.parentId ? `<div class="empty">親にできるタスクがありません</div>` : ''}
      </div>
      <div class="sheet-actions"><button id="cancelParentPicker" class="ghost">戻る</button></div>
    </div></div>`;
  }

  function deleteParentModalV11(){
    const parent = taskByIdV11(ui.deleteParentId);
    if(!parent) return '';
    const children = childrenOfV11(parent.id);
    const completed = children.filter(c => c.completedAt).length;

    return `<div class="modal-backdrop" id="backdrop"><div class="sheet">
      <h2>親タスクを削除</h2>
      <div class="confirm-copy">
        「${esc(parent.content)}」には子タスクが${children.length}件あります。
        ${completed ? `（完了済み${completed}件を含みます）` : ''}
      </div>
      <div class="choice-stack">
        <button id="deleteParentOnly" class="primary-btn">親だけ削除<br><span style="font-size:11px;font-weight:700">子は独立タスクとして残す</span></button>
        <button id="deleteParentAll" class="danger">親と子をすべて削除</button>
        <button id="cancelDeleteParent" class="ghost">キャンセル</button>
      </div>
    </div></div>`;
  }

  function parentDoneModalV11(){
    const parent = taskByIdV11(ui.parentCompleteId);
    if(!parent) return '';

    return `<div class="modal-backdrop" id="backdrop"><div class="sheet" style="text-align:center">
      <div class="parent-done-mark">🎉</div>
      <h2>子タスクがすべて完了しました</h2>
      <div class="confirm-copy">「${esc(parent.content)}」も完了しますか？</div>
      <div class="choice-stack">
        <button id="completeParentYes" class="primary-btn">親も完了する</button>
        <button id="completeParentNo" class="ghost">まだ完了しない</button>
      </div>
    </div></div>`;
  }

  const modalHtmlV10 = modalHtml;
  modalHtml = function(){
    if(ui.modal === 'parentPicker') return parentPickerModalV11();
    if(ui.modal === 'deleteParent') return deleteParentModalV11();
    if(ui.modal === 'parentDone') return parentDoneModalV11();
    return modalHtmlV10();
  };

  function openRelatedV11(id){
    if(!taskByIdV11(id)) return;
    ui.detailId = id;
    ui.modal = 'detail';
    render();
  }

  bindDetail = function(){
    const t = taskByIdV11(ui.detailId);
    if(!t) return;

    $('#taskTitleEdit').oninput = e => {
      const value = e.target.value;
      if(value.trim()){
        t.content = value;
        save();
      }
    };

    if($('#manageTags')) $('#manageTags').onclick=()=>openTagSettings('detail');

    $$('[data-tag-edit]').forEach(b=>b.onclick=()=>{
      t.tag=b.dataset.tagEdit;
      save();
      render();
    });

    $$('[data-quad]').forEach(b=>b.onclick=()=>{
      t.quad=b.dataset.quad;
      save();
      render();
    });

    $$('.point-edit').forEach(b=>b.onclick=()=>{
      t.points=Number(b.dataset.p);
      save();
      render();
    });

    $$('.task-plan-step').forEach(b=>b.onclick=()=>{
      t.planDate=iso(addDays(new Date((t.planDate||today())+'T00:00:00'),Number(b.dataset.d)));
      save();
      render();
    });

    $('#detailPlan').onclick=()=>openDate(t.id);

    $$('.deadline-year-step').forEach(b=>b.onclick=()=>{
      t.deadline=shiftYearDate(t.deadline||today(),Number(b.dataset.y));
      save();
      render();
    });

    $$('.deadline-step').forEach(b=>b.onclick=()=>{
      t.deadline=iso(addDays(new Date((t.deadline||today())+'T00:00:00'),Number(b.dataset.d)));
      save();
      render();
    });

    $('#planTime').onchange=e=>{
      t.planTime=normTime(e.target.value);
      save();
    };
    $('#deadlineTime').onchange=e=>{
      t.deadlineTime=normTime(e.target.value);
      save();
    };
    $('#minutes').onchange=e=>{
      t.minutes=Math.max(0,Number(e.target.value)||0);
      save();
    };

    $$('[data-open-related]').forEach(b=>b.onclick=()=>openRelatedV11(b.dataset.openRelated));

    if($('#changeParent')) $('#changeParent').onclick=()=>{
      ui.parentPickerTaskId=t.id;
      ui.modal='parentPicker';
      render();
    };

    if($('#setParent')) $('#setParent').onclick=()=>{
      ui.parentPickerTaskId=t.id;
      ui.modal='parentPicker';
      render();
    };

    if($('#addChildTask')) $('#addChildTask').onclick=()=>openChildAddV11(t.id);

    if($('#completeParentNow')) $('#completeParentNow').onclick=()=>{
      completeTask(t.id);
      ui.modal=null;
      render();
    };

    $('#deleteTask').onclick=()=>{
      if(hasChildrenV11(t.id)){
        ui.deleteParentId=t.id;
        ui.modal='deleteParent';
        render();
        return;
      }
      const oldParentId=t.parentId;
      state.tasks=state.tasks.filter(x=>x.id!==t.id);
      restoreFormerParentPointsV11(oldParentId);
      save();
      ui.modal=null;
      render();
    };

    $('#closeDetail').onclick=()=>{
      const input=$('#taskTitleEdit');
      if(input && input.value.trim()) t.content=input.value.trim();
      save();
      ui.modal=null;
      render();
    };
  };

  const bindModalV10 = bindModal;
  bindModal = function(){
    if(ui.modal === 'parentPicker'){
      $('#backdrop').onclick=e=>{
        if(e.target.id==='backdrop'){
          ui.modal='detail';
          render();
        }
      };
      $$('[data-parent-choice]').forEach(b=>b.onclick=()=>{
        const child=taskByIdV11(ui.parentPickerTaskId);
        const parentId=b.dataset.parentChoice || null;
        if(setParentV11(child,parentId)){
          ui.detailId=child.id;
          ui.modal='detail';
          render();
        }
      });
      $('#cancelParentPicker').onclick=()=>{
        ui.modal='detail';
        render();
      };
      return;
    }

    if(ui.modal === 'deleteParent'){
      $('#backdrop').onclick=e=>{
        if(e.target.id==='backdrop'){
          ui.modal='detail';
          render();
        }
      };

      $('#deleteParentOnly').onclick=()=>{
        const id=ui.deleteParentId;
        state.tasks.forEach(c=>{
          if(c.parentId===id) c.parentId=null;
        });
        state.tasks=state.tasks.filter(x=>x.id!==id);
        save();
        ui.modal=null;
        ui.deleteParentId=null;
        render();
      };

      $('#deleteParentAll').onclick=()=>{
        const id=ui.deleteParentId;
        state.tasks=state.tasks.filter(x=>x.id!==id && x.parentId!==id);
        save();
        ui.modal=null;
        ui.deleteParentId=null;
        render();
      };

      $('#cancelDeleteParent').onclick=()=>{
        ui.modal='detail';
        render();
      };
      return;
    }

    if(ui.modal === 'parentDone'){
      $('#backdrop').onclick=e=>{
        if(e.target.id==='backdrop'){
          ui.modal=null;
          render();
        }
      };

      $('#completeParentYes').onclick=()=>{
        const id=ui.parentCompleteId;
        ui.modal=null;
        ui.parentCompleteId=null;
        completeTask(id);
      };

      $('#completeParentNo').onclick=()=>{
        ui.modal=null;
        ui.parentCompleteId=null;
        render();
      };
      return;
    }

    return bindModalV10();
  };

  // Parent cannot be accidentally completed while unfinished children remain.
  // Finishing the final child offers, but never forces, parent completion.
  const completeTaskV10 = completeTask;
  completeTask = function(id){
    const t = taskByIdV11(id);
    if(!t) return;

    if(isParentV11(t)){
      const left = unfinishedChildrenV11(t.id);
      if(left.length){
        ui.snack={text:`未完了の子タスクが${left.length}件あります`,id:null};
        render();
        setTimeout(()=>{
          if(ui.snack && !ui.snack.id){
            ui.snack=null;
            render();
          }
        },3000);
        return;
      }
    }

    const parentId=t.parentId || null;
    completeTaskV10(id);

    if(parentId){
      const parent=taskByIdV11(parentId);
      if(parent && !parent.completedAt && unfinishedChildrenV11(parentId).length===0){
        ui.parentCompleteId=parentId;
        ui.modal='parentDone';
        render();
      }
    }
  };

  // Child titles can be short ("7月分"), so show the parent context on cards.
  const cardHtmlV10 = cardHtml;
  cardHtml = function(t,primary){
    const html=cardHtmlV10(t,primary);
    const parent=parentForV11(t);
    if(!parent) return html;

    const marker=`<span class="child-parent-meta">↳ ${esc(parent.content)}</span>`;
    return html.replace('<div class="task-meta">','<div class="task-meta">'+marker);
  };

  // Keep every parent at 0 pt, including after reload/update.
  state.tasks.forEach(t=>{
    if(hasChildrenV11(t.id)) makeParentV11(t);
  });
  save();

  render();
  console.info(`[Task City] patch ${PATCH_VERSION_V11} loaded`);
})();
/* === v0.12 : today tag filters + hide city from home === */
(() => {
  const PATCH_VERSION_V12 = '0.12.1';
  const FILTER_KEY = 'taskCityTodayHiddenTagsV1';

  const style = document.createElement('style');
  style.textContent = `
    .today-filter-wrap{margin:2px 0 12px;padding:10px 0 2px}
    .today-filter-title{font-size:12px;color:var(--muted);font-weight:850;margin:0 2px 7px}
    .today-filter-scroll{display:flex;gap:7px;overflow-x:auto;padding:1px 2px 5px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
    .today-filter-scroll::-webkit-scrollbar{display:none}
    .today-tag-chip{flex:0 0 auto;border:1px solid var(--line);background:#fff;color:var(--muted);border-radius:999px;padding:8px 11px;font-weight:850;font-size:12px}
    .today-tag-chip.on{background:#eafcfc;border-color:#8adfe1;color:#17666a;box-shadow:inset 0 0 0 1px #19c5c7}
    .today-tag-chip.all{font-weight:950}
    .today-no-city-spacer{height:2px}
    @media(max-width:560px){
      .today-filter-wrap{margin-top:0;padding-top:4px}
      .today-tag-chip{padding:7px 10px;font-size:11px}
    }
  `;
  document.head.appendChild(style);

  function loadHiddenTagsV12(){
    try{
      const v = JSON.parse(localStorage.getItem(FILTER_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    }catch(e){
      return [];
    }
  }

  function saveHiddenTagsV12(){
    try{
      localStorage.setItem(FILTER_KEY, JSON.stringify(ui.todayHiddenTags || []));
    }catch(e){}
  }

  ui.todayHiddenTags = loadHiddenTagsV12();

  function hiddenSetV12(){
    return new Set((ui.todayHiddenTags || []).filter(k => TAGS[k]));
  }

  function tagVisibleV12(t){
    return !hiddenSetV12().has(t.tag);
  }

  function tagFilterHtmlV12(){
    const hidden = hiddenSetV12();
    const ids = Object.keys(TAGS);
    const allOn = ids.every(k => !hidden.has(k));

    return `<div class="today-filter-wrap">
      <div class="today-filter-title">表示するタグ</div>
      <div class="today-filter-scroll">
        <button class="today-tag-chip all ${allOn?'on':''}" data-tag-filter-all="1">全部</button>
        ${ids.map(k=>{
          const v=TAGS[k], on=!hidden.has(k);
          return `<button class="today-tag-chip ${on?'on':''}" data-tag-filter="${escAttr(k)}">${esc(v.icon)} ${esc(v.name)}</button>`;
        }).join('')}
      </div>
    </div>`;
  }

  const todayTasksBeforeV12 = todayTasks;
  todayTasks = function(){
    return todayTasksBeforeV12().filter(tagVisibleV12);
  };

  function isTodayTargetV12(t, day=today()){
    return t.planDate===day || t.deadline===day;
  }

  function pastTasksV12(){
    const day=today();
    const q={hh:0,hl:1,lh:2,ll:3};

    return active().filter(t=>{
      if(!tagVisibleV12(t)) return false;
      if(isTodayTargetV12(t,day)) return false;
      return (t.deadline && t.deadline<day) || (t.planDate && t.planDate<day);
    }).sort((a,b)=>{
      const ad=a.deadline||a.planDate||'9999-99-99';
      const bd=b.deadline||b.planDate||'9999-99-99';
      if(ad!==bd) return ad.localeCompare(bd);
      return (q[a.quad]??9)-(q[b.quad]??9);
    });
  }

  function pastReasonV12(t){
    const day=today();
    if(t.deadline && t.deadline<day){
      const days=Math.max(1,Math.floor((new Date(day+'T00:00:00')-new Date(t.deadline+'T00:00:00'))/86400000));
      return `〆切 ${days}日超過`;
    }
    if(t.planDate && t.planDate<day){
      return `実行予定 ${fmt(t.planDate)} 未完了`;
    }
    return '未完了';
  }

  function pastCardHtmlV12(t){
    const tag=safeTag(t.tag);
    const parent=t.parentId?state.tasks.find(x=>x.id===t.parentId):null;
    const parentMeta=parent?`<span class="child-parent-meta">↳ ${esc(parent.content)}</span>`:'';

    return `<article class="task-card" data-task="${t.id}" style="--accent:${QUADS[t.quad].color}">
      <div class="task-line">
        <span class="priority-icons">${priorityIcons(t.quad)}</span>
        <span class="task-tag-only" title="${escAttr(tag.name)}">${tag.icon}</span>
        <span class="task-title-inline">${esc(t.content)}</span>
        <span class="points">★${t.points}</span>
      </div>
      <div class="task-meta">
        ${parentMeta}
        <span class="past-reason">${esc(pastReasonV12(t))}</span>
        ${t.minutes?`<span>予測 ${t.minutes}分</span>`:''}
      </div>
    </article>`;
  }

  todayHtml = function(){
    const day=today();
    const ts=todayTasks();
    const past=pastTasksV12();
    const hidden=hiddenSetV12();

    const done=state.tasks.filter(t=>
      t.completedAt &&
      iso(t.completedAt)===day &&
      isTodayTargetV12(t,day) &&
      !hidden.has(t.tag)
    ).length;

    const up=unplanned();

    const pastHtml=past.length?`
      <section class="overdue-block">
        <div class="overdue-head"><span>⚠️ 過去のタスク</span><span class="overdue-count">${past.length}</span></div>
        <div class="overdue-cards">${past.map(pastCardHtmlV12).join('')}</div>
      </section>`:'';

    const todayCards=ts.length
      ?ts.map(t=>cardHtml(t,false)).join('')
      :`<div class="panel empty">☕<br><span class="subtle">選択したタグの今日のタスクはありません</span></div>`;

    return `<div class="today-no-city-spacer"></div>
      ${tagFilterHtmlV12()}
      ${pastHtml}
      <div class="today-strip">
        <span class="today-count">今日のタスク　${done}/${ts.length+done}</span>
        <button class="inbox-mini ${needsPlanAttention(up)?'warn':''}" data-view="plan" title="未計画">未 ${up.length}</button>
      </div>
      <div class="today-all-note">優先度順 · すべて表示</div>
      <div class="cards">${todayCards}</div>`;
  };

  const bindBeforeV12 = bind;
  bind = function(){
    bindBeforeV12();

    const allBtn=document.querySelector('[data-tag-filter-all]');
    if(allBtn){
      allBtn.onclick=()=>{
        ui.todayHiddenTags=[];
        saveHiddenTagsV12();
        render();
      };
    }

    document.querySelectorAll('[data-tag-filter]').forEach(btn=>{
      btn.onclick=()=>{
        const key=btn.dataset.tagFilter;
        const hidden=hiddenSetV12();
        const ids=Object.keys(TAGS);
        const allOn=ids.every(k=>!hidden.has(k));

        if(allOn){
          // 「全部」状態から個別タグを押したら、そのタグだけ表示。
          ui.todayHiddenTags=ids.filter(k=>k!==key);
        }else{
          // 個別選択中は通常のON/OFF。最後の1個もOFFにできる。
          if(hidden.has(key)) hidden.delete(key);
          else hidden.add(key);
          ui.todayHiddenTags=Array.from(hidden);
        }

        saveHiddenTagsV12();
        render();
      };
    });
  };

  render();
  console.info(`[Task City] patch ${PATCH_VERSION_V12} loaded`);
})();
