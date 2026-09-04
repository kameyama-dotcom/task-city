(() => {
  const PATCH_VERSION = '0.8.1';

  // iPhone long-press: prevent text selection/callout around the add fan and save button.
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
      margin-top:14px;
      padding:13px;
      border:1px solid var(--line);
      border-radius:14px;
      background:#f8fcfb;
    }
    .plan-edit-box .label{margin-bottom:8px}
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

  // 1,2: faster add-button fan and stronger selection prevention.
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

    // v0.7: 350ms -> v0.8: 220ms
    addGesture.timer=setTimeout(()=>{
      addGesture.holding=true;
      ui.radial=true;
      ui.radialSel=first;
      render();
    },220);
  };

  // 3: focus synchronously while still inside the user's pointer gesture.
  openAdd = function(tag){
    ui.radial=false;
    tag=TAGS[tag]?tag:Object.keys(TAGS)[0];
    ui.addTag=tag;
    ui.draft=newDraft(tag);
    ui.modal='add';
    render();
    focusAddInput();
    // Fallback for browsers that need one paint first.
    requestAnimationFrame(focusAddInput);
  };

  // 4: deadline remains empty by default; "今日" fills today's date.
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

  bindAdd = function(){
    if($('#manageTags')) $('#manageTags').onclick=()=>openTagSettings('add');

    $('#content').oninput=e=>ui.draft.content=e.target.value;

    $$('[data-tag-draft]').forEach(b=>b.onclick=()=>{
      ui.draft.tag=b.dataset.tagDraft;
      render();
      focusAddInput();
    });
    $$('[data-quad]').forEach(b=>b.onclick=()=>{
      ui.draft.quad=b.dataset.quad;
      render();
      focusAddInput();
    });
    $$('[data-step-year]').forEach(b=>b.onclick=()=>{
      ui.draft.year+=Number(b.dataset.stepYear);
      render();
      focusAddInput();
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
      const now=new Date();
      ui.draft.year=now.getFullYear();
      ui.draft.dateRaw=String(now.getMonth()+1)+String(now.getDate()).padStart(2,'0');
      render();
      focusAddInput();
    };
    $('#draftDateMinus').onclick=()=>stepDraftDate(-1);
    $('#draftDatePlus').onclick=()=>stepDraftDate(1);
    $('#timeMinus').onclick=()=>stepDraftTime(-15);
    $('#timePlus').onclick=()=>stepDraftTime(15);

    // 6: prevent native selection on long-press of ✓.
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

  // 5: an unplanned task due today still belongs in Today's deck.
  todayTasks = function(){
    const t=today();
    return active()
      .filter(x=>x.planDate===t || (!x.planDate && x.deadline===t))
      .sort(scoreSort);
  };

  // 7: Today cards do not repeat the date "today". Keep only an optional clock time.
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

  // 8: planning modal also edits optional execution time + predicted duration.
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
    return `<div class="modal-backdrop" id="backdrop"><div class="sheet">
      <h2>実行予定日</h2>
      ${t?`<div class="panel" style="box-shadow:none"><b>${esc(t.content)}</b><div class="subtle">${deadlineLabel(t)}</div></div>`:''}
      <div class="field">
        <div class="label">日付</div>
        <div class="row"><button id="dateMinus" class="ghost">−</button><button class="primary-btn" id="datePick">${fmt(base)}</button><button id="datePlus" class="ghost">＋</button></div>
      </div>
      <div class="plan-edit-box">
        <div class="field" style="margin-top:0">
          <div class="label">実行時刻（任意）</div>
          <div class="row wrap">
            <button id="dateTimeMinus" class="ghost">−15</button>
            <input id="dateTimeRaw" class="mini-input" inputmode="numeric" maxlength="4" placeholder="1830" value="${escAttr(rawTime)}">
            <button id="dateTimePlus" class="ghost">＋15</button>
            <span id="dateTimePreview" class="subtle">${rawTime?hhmm(rawTime):'—'}</span>
          </div>
        </div>
        <div class="field" style="margin-bottom:0">
          <div class="label">予測時間</div>
          <div class="row"><input id="dateMinutes" class="mini-input" inputmode="numeric" value="${escAttr(minutes)}"><span class="subtle">分</span></div>
        </div>
      </div>
      <div class="label" style="margin-top:14px">この日の負荷</div>
      ${dayLoadHtml(base)}
      <div class="sheet-actions"><button id="cancelModal" class="ghost">閉じる</button><button id="confirmDate" class="primary-btn">この日にする</button></div>
    </div></div>`;
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

  // Re-render once so the overridden functions are used immediately.
  render();
  console.info(`[Task City] patch ${PATCH_VERSION} loaded`);
})();
