# テンプレート機能拡張 Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** テンプレートに見積条件・備考欄を保存できるよう拡張し、読み込みダイアログにプレビュー機能を追加する。

**Architecture:** 既存の CustomModule8 テンプレート機能を最小限の変更で拡張する。保存 JSON に任意フィールドを追加し後方互換を維持。プレビューはメモリ上の `state.templateList` の `data` フィールドを展開して表示するため追加 CRM 通信なし。

**Tech Stack:** Vanilla JS、Zoho CRM Widget SDK (ZDK)、pdfmake（本タスクでは使用しない）

## Global Constraints

- 依頼された箇所のみ変更すること。他のコード・スタイル・ページ要素は一切変更しない
- `pdf-generator.js` は変更しない
- 既存テンプレート（`sections` のみの JSON）は変更なく読み込めること
- ビルドは `cd mitumori001 && zet pack` で行い、`dist/mitumori001.zip` が生成されること

---

## ファイル変更一覧

| ファイル | 変更内容 |
|---|---|
| `mitumori001/app/js/app.js` | `loadAllTemplates`・`execTemplateSave`・`filterTemplates`・`selectTemplate`・`execTemplateLoad`・`toggleTplDetail`（新規）・公開関数リスト |
| `mitumori001/app/index.html` | `tplSaveModal`（含める項目チェックボックス追加）・`tplLoadModal`（復元する項目チェックボックス追加） |

---

## Task 1: loadAllTemplates に data フィールドを追加

**Files:**
- Modify: `mitumori001/app/js/app.js:6229-6243`

**Interfaces:**
- Produces: `state.templateList[].data` — パース済み JSON オブジェクト（`null` の場合もある）

- [ ] **Step 1: `loadAllTemplates` を修正する**

`mitumori001/app/js/app.js` の以下の箇所を置き換える。

現在（6229〜6243行目）:
```javascript
  async function loadAllTemplates() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule8', 'Name');
      state.templateList = data
        .filter(r => r.JSON)
        .map(r => ({
          id:   r.id,
          name: r.Name || '',
          type: r.field17 || '',
          deptId:   r.field21?.id   || '',
          deptName: r.field21?.name || '',
        }));
    } catch (e) { console.warn('loadAllTemplates error:', e); }
  }
```

変更後:
```javascript
  async function loadAllTemplates() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule8', 'Name');
      state.templateList = data
        .filter(r => r.JSON)
        .map(r => {
          let parsed = null;
          try { parsed = JSON.parse(r.JSON); } catch(e) {}
          return {
            id:      r.id,
            name:    r.Name || '',
            type:    r.field17 || '',
            deptId:  r.field21?.id   || '',
            deptName:r.field21?.name || '',
            data:    parsed,
          };
        });
    } catch (e) { console.warn('loadAllTemplates error:', e); }
  }
```

- [ ] **Step 2: ビルドして動作確認**

```
cd mitumori001
zet pack
```

期待結果: `Extension packed successfully as mitumori001.zip in dist folder.`

Zoho でテンプレート読み込みダイアログを開き、一覧が表示されることを確認する（表示内容は変わらない）。

- [ ] **Step 3: コミット**

```
git add mitumori001/app/js/app.js mitumori001/dist/mitumori001.zip
git commit -m "feat: テンプレートリストに data フィールドを追加"
```

---

## Task 2: 保存ダイアログに「含める項目」チェックボックスを追加し、execTemplateSave を拡張する

**Files:**
- Modify: `mitumori001/app/index.html:1042-1070`（tplSaveModal 内）
- Modify: `mitumori001/app/js/app.js:6264-6323`（execTemplateSave）
- Modify: `mitumori001/app/js/app.js:6302-6315`（templateList 更新部分）

**Interfaces:**
- Consumes: `state.remarks`、`getValue('deliveryTerm')`、`getValue('deliveryMethod')`、`getValue('paymentTerm')`、`getValue('validDays')`
- Produces: 保存 JSON に `remarks`・`deliveryTerm`・`deliveryMethod`・`paymentTerm`・`validDays` を追加（チェック時のみ）

- [ ] **Step 1: `tplSaveModal` に含める項目チェックボックスを追加する（index.html）**

`mitumori001/app/index.html` の以下の箇所を置き換える。

現在（`tplSaveModal` 内 `modal-body`）:
```html
      <div class="modal-body">
        <div class="modal-form-row">
          <label>テンプレート名</label>
          <input type="text" id="tplSaveName" class="input-wide" placeholder="例: 温室暖房標準">
        </div>
        <div class="modal-form-row">
          <label>種別</label>
          <input type="text" id="tplSaveType" class="input-medium" placeholder="例: 暖房">
        </div>
        <div class="modal-form-row">
          <label>所課</label>
          <select id="tplSaveDept" class="input-standard">
            <option value="">― 選択 ―</option>
          </select>
        </div>
      </div>
```

変更後:
```html
      <div class="modal-body">
        <div class="modal-form-row">
          <label>テンプレート名</label>
          <input type="text" id="tplSaveName" class="input-wide" placeholder="例: 温室暖房標準">
        </div>
        <div class="modal-form-row">
          <label>種別</label>
          <input type="text" id="tplSaveType" class="input-medium" placeholder="例: 暖房">
        </div>
        <div class="modal-form-row">
          <label>所課</label>
          <select id="tplSaveDept" class="input-standard">
            <option value="">― 選択 ―</option>
          </select>
        </div>
        <div class="modal-form-row">
          <label>含める項目</label>
          <div style="display:flex;flex-direction:column;gap:4px">
            <label style="font-weight:normal;display:flex;align-items:center;gap:6px">
              <input type="checkbox" id="tplSaveIncludeConditions" checked>
              見積条件（納期・納入条件・支払条件・有効日数）
            </label>
            <label style="font-weight:normal;display:flex;align-items:center;gap:6px">
              <input type="checkbox" id="tplSaveIncludeRemarks" checked>
              鏡の備考欄
            </label>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: `execTemplateSave` を拡張する（app.js）**

`mitumori001/app/js/app.js` の `execTemplateSave` 関数内を以下のように変更する。

現在（6273〜6294行目 `const tplData = ...`）:
```javascript
    const tplData = JSON.stringify({
      sections: state.sections.map(sec => ({
        name:   sec.name,
        cat:    sec.cat || '',
        secQty: sec.secQty || 1,
        items: sec.items.map(item => ({
          name: item.name, spec: item.spec, qty: item.qty, unit: item.unit,
          unitPrice: item.unitPrice, amount: item.amount, genka: item.genka,
          includeInLabor: item.includeInLabor,
          dairiRate: item.dairiRate, calcCategory: item.calcCategory,
          houdan: item.houdan, houkouDirect: item.houkouDirect,
          houkouKubun: item.houkouKubun,
          gensuiKubun: item.gensuiKubun, gensuiA: item.gensuiA, gensuiB: item.gensuiB,
          gensuiEnabled: item.gensuiEnabled,
          kojiCategory: item.kojiCategory,
          specLines: item.specLines,
          machineSpec: item.machineSpec,
          specMasterContent: item.specMasterContent,
          machineSpecHidden: item.machineSpecHidden || false,
        })),
      })),
    });
```

変更後:
```javascript
    const includeConditions = document.getElementById('tplSaveIncludeConditions')?.checked;
    const includeRemarks    = document.getElementById('tplSaveIncludeRemarks')?.checked;

    const payload = {
      sections: state.sections.map(sec => ({
        name:   sec.name,
        cat:    sec.cat || '',
        secQty: sec.secQty || 1,
        items: sec.items.map(item => ({
          name: item.name, spec: item.spec, qty: item.qty, unit: item.unit,
          unitPrice: item.unitPrice, amount: item.amount, genka: item.genka,
          includeInLabor: item.includeInLabor,
          dairiRate: item.dairiRate, calcCategory: item.calcCategory,
          houdan: item.houdan, houkouDirect: item.houkouDirect,
          houkouKubun: item.houkouKubun,
          gensuiKubun: item.gensuiKubun, gensuiA: item.gensuiA, gensuiB: item.gensuiB,
          gensuiEnabled: item.gensuiEnabled,
          kojiCategory: item.kojiCategory,
          specLines: item.specLines,
          machineSpec: item.machineSpec,
          specMasterContent: item.specMasterContent,
          machineSpecHidden: item.machineSpecHidden || false,
        })),
      })),
    };
    if (includeConditions) {
      payload.deliveryTerm   = getValue('deliveryTerm')   || '';
      payload.deliveryMethod = getValue('deliveryMethod') || '';
      payload.paymentTerm    = getValue('paymentTerm')    || '';
      payload.validDays      = getValue('validDays')      || '';
    }
    if (includeRemarks) {
      payload.remarks = getValue('remarks') || '';
    }
    const tplData = JSON.stringify(payload);
```

- [ ] **Step 3: templateList のメモリ更新部分に `data` を追加する（app.js）**

同じ `execTemplateSave` 関数内で、templateList を更新している2箇所に `data: payload` を追加する。

現在（6308行目）:
```javascript
        Object.assign(existing, { type, deptId, deptName });
```

変更後:
```javascript
        Object.assign(existing, { type, deptId, deptName, data: payload });
```

現在（6315行目）:
```javascript
        if (newId) state.templateList.push({ id: newId, name, type, deptId, deptName });
```

変更後:
```javascript
        if (newId) state.templateList.push({ id: newId, name, type, deptId, deptName, data: payload });
```

- [ ] **Step 4: ビルドして動作確認**

```
cd mitumori001
zet pack
```

期待結果: `Extension packed successfully as mitumori001.zip in dist folder.`

確認手順:
1. 見積条件・備考欄を入力した状態でテンプレート保存ダイアログを開く
2. 「含める項目」チェックボックスが両方チェックされていることを確認
3. 保存してCRM CustomModule8 レコードの JSON フィールドを確認 → `deliveryTerm` 等が含まれること
4. チェックを外して保存 → JSON に `deliveryTerm` 等が含まれないこと
5. 既存テンプレートを読み込む → 従来通り動作すること

- [ ] **Step 5: コミット**

```
git add mitumori001/app/index.html mitumori001/app/js/app.js mitumori001/dist/mitumori001.zip
git commit -m "feat: テンプレート保存に見積条件・備考欄を含めるオプションを追加"
```

---

## Task 3: 読み込みダイアログにプレビュートグルを追加する

**Files:**
- Modify: `mitumori001/app/js/app.js:6347-6376`（filterTemplates）
- Modify: `mitumori001/app/js/app.js:7970付近`（公開関数リスト）

**Interfaces:**
- Consumes: `state.templateList[].data`（Task 1 で追加）
- Produces: `toggleTplDetail(id)` — 公開関数

- [ ] **Step 1: `filterTemplates` を修正してプレビューボタンを追加する（app.js）**

現在（6365〜6375行目）:
```javascript
    listEl.innerHTML = filtered.map(t => `
      <div class="tpl-item${state.selectedTemplateId === t.id ? ' selected' : ''}"
           data-tpl-id="${t.id}" onclick="app.selectTemplate('${t.id}')">
        <input type="radio" class="tpl-item-radio" name="tplItem"
               ${state.selectedTemplateId === t.id ? 'checked' : ''}>
        <div class="tpl-item-info">
          <div class="tpl-item-name">${escHtml(t.name)}</div>
          <div class="tpl-item-meta">${[t.deptName, t.type].filter(Boolean).join(' / ') || '―'}</div>
        </div>
      </div>
    `).join('');
```

変更後:
```javascript
    listEl.innerHTML = filtered.map(t => `
      <div class="tpl-item${state.selectedTemplateId === t.id ? ' selected' : ''}"
           data-tpl-id="${t.id}" onclick="app.selectTemplate('${t.id}')">
        <input type="radio" class="tpl-item-radio" name="tplItem"
               ${state.selectedTemplateId === t.id ? 'checked' : ''}>
        <div class="tpl-item-info">
          <div class="tpl-item-name">${escHtml(t.name)}</div>
          <div class="tpl-item-meta">${[t.deptName, t.type].filter(Boolean).join(' / ') || '―'}</div>
        </div>
        <button class="tpl-detail-btn" onclick="event.stopPropagation();app.toggleTplDetail('${t.id}')"
                data-detail-id="${t.id}">▶ 詳細</button>
      </div>
      <div class="tpl-detail-panel" id="tpl-detail-${t.id}" style="display:none"></div>
    `).join('');
```

- [ ] **Step 2: `toggleTplDetail` 関数を追加する（app.js）**

`filterTemplates` 関数の直後（6376行目の後）に追加する:

```javascript
  function toggleTplDetail(id) {
    const panel = document.getElementById(`tpl-detail-${id}`);
    const btn   = document.querySelector(`[data-detail-id="${id}"]`);
    if (!panel) return;
    if (panel.style.display !== 'none') {
      panel.style.display = 'none';
      if (btn) btn.textContent = '▶ 詳細';
      return;
    }
    const tpl = state.templateList.find(t => t.id === id);
    const d   = tpl?.data;
    if (!d) { panel.innerHTML = '<div class="tpl-detail-empty">データなし</div>'; panel.style.display = ''; if (btn) btn.textContent = '▼ 詳細'; return; }

    const secLines = (d.sections || []).map(sec => {
      const items = sec.items || [];
      const shown = items.slice(0, 3).map(i => `<li>${escHtml(i.name || '（空白）')}　${i.qty ?? ''}${escHtml(i.unit || '')}</li>`).join('');
      const more  = items.length > 3 ? `<li style="color:#888">他 ${items.length - 3} 行</li>` : '';
      return `<div class="tpl-detail-sec"><strong>${escHtml(sec.name || '（無題）')}</strong>（${items.length}行）<ul>${shown}${more}</ul></div>`;
    }).join('');

    const condLine = (d.deliveryTerm || d.deliveryMethod || d.paymentTerm || d.validDays)
      ? `<div class="tpl-detail-cond">【見積条件】納期：${escHtml(d.deliveryTerm||'―')}　納入：${escHtml(d.deliveryMethod||'―')}　支払：${escHtml(d.paymentTerm||'―')}　有効：${escHtml(String(d.validDays||'―'))}</div>`
      : '';
    const remarkLine = d.remarks
      ? `<div class="tpl-detail-remark">【備考】${escHtml(d.remarks)}</div>`
      : '';

    panel.innerHTML = secLines + condLine + remarkLine;
    panel.style.display = '';
    if (btn) btn.textContent = '▼ 詳細';
  }
```

- [ ] **Step 3: `toggleTplDetail` を公開関数リストに追加する（app.js）**

7988行目付近の `filterTemplates,` の直後に追加する。

```javascript
    filterTemplates,
    toggleTplDetail,
    selectTemplate,
```

- [ ] **Step 4: ビルドして動作確認**

```
cd mitumori001
zet pack
```

期待結果: `Extension packed successfully as mitumori001.zip in dist folder.`

確認手順:
1. 読み込みダイアログを開く
2. 各テンプレートに「▶ 詳細」ボタンが表示されること
3. クリックすると展開して大項目・品名・見積条件・備考が表示されること
4. もう一度クリックすると折りたたまれること
5. 詳細ボタンをクリックしてもテンプレートの選択（ラジオボタン）が変わらないこと

- [ ] **Step 5: コミット**

```
git add mitumori001/app/js/app.js mitumori001/dist/mitumori001.zip
git commit -m "feat: テンプレート読み込みダイアログにプレビュー機能を追加"
```

---

## Task 4: 読み込みダイアログに「復元する項目」を追加し、execTemplateLoad を拡張する

**Files:**
- Modify: `mitumori001/app/index.html:1090-1093`（tplLoadModal 内 tpl-load-mode）
- Modify: `mitumori001/app/js/app.js:6378-6386`（selectTemplate）
- Modify: `mitumori001/app/js/app.js:6388-6474`（execTemplateLoad）

**Interfaces:**
- Consumes: `state.templateList[].data`（Task 1 で追加）、`state.selectedTemplateId`
- Consumes: `setValue('deliveryTerm', ...)` / `setValue('remarks', ...)` 等の既存関数

- [ ] **Step 1: `tplLoadModal` に「復元する項目」チェックボックスを追加する（index.html）**

現在（`tpl-load-mode` div）:
```html
        <div class="tpl-load-mode">
          <label><input type="radio" name="tplLoadMode" value="add" checked> 現在の明細に追加</label>
          <label><input type="radio" name="tplLoadMode" value="replace"> 現在の明細を置き換え</label>
        </div>
```

変更後:
```html
        <div class="tpl-load-mode">
          <label><input type="radio" name="tplLoadMode" value="add" checked> 現在の明細に追加</label>
          <label><input type="radio" name="tplLoadMode" value="replace"> 現在の明細を置き換え</label>
        </div>
        <div class="tpl-restore-options" style="margin-top:8px;display:flex;gap:16px">
          <label style="font-weight:normal;display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="tplRestoreConditions" checked disabled>
            見積条件を復元
          </label>
          <label style="font-weight:normal;display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="tplRestoreRemarks" checked disabled>
            備考欄を復元
          </label>
        </div>
```

- [ ] **Step 2: `selectTemplate` を修正して復元チェックボックスの disabled 状態を制御する（app.js）**

現在（6378〜6386行目）:
```javascript
  function selectTemplate(id) {
    state.selectedTemplateId = id;
    document.getElementById('btnTplLoad').disabled = false;
    document.querySelectorAll('.tpl-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.tplId === id);
      const radio = el.querySelector('input[type=radio]');
      if (radio) radio.checked = el.dataset.tplId === id;
    });
  }
```

変更後:
```javascript
  function selectTemplate(id) {
    state.selectedTemplateId = id;
    document.getElementById('btnTplLoad').disabled = false;
    document.querySelectorAll('.tpl-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.tplId === id);
      const radio = el.querySelector('input[type=radio]');
      if (radio) radio.checked = el.dataset.tplId === id;
    });
    const tpl  = state.templateList.find(t => t.id === id);
    const d    = tpl?.data || {};
    const hasConditions = !!(d.deliveryTerm !== undefined || d.deliveryMethod !== undefined || d.paymentTerm !== undefined || d.validDays !== undefined);
    const hasRemarks    = d.remarks !== undefined;
    const cbCond    = document.getElementById('tplRestoreConditions');
    const cbRemarks = document.getElementById('tplRestoreRemarks');
    if (cbCond)    { cbCond.disabled    = !hasConditions; cbCond.checked    = hasConditions; }
    if (cbRemarks) { cbRemarks.disabled = !hasRemarks;    cbRemarks.checked = hasRemarks; }
  }
```

- [ ] **Step 3: `execTemplateLoad` に復元ロジックを追加する（app.js）**

現在（6467〜6474行目）の `markDirty()` より前に追加する:

現在:
```javascript
    markDirty();
    renumberSections();
    renderSections();
    updateOutput();
    document.getElementById('tplLoadModal').style.display = 'none';
    showToast(`テンプレートを${mode === 'replace' ? '置き換え' : '追加'}しました`);
    document.getElementById('noSectionsMsg').style.display = 'none';
  }
```

変更後:
```javascript
    const restoreConditions = document.getElementById('tplRestoreConditions')?.checked;
    const restoreRemarks    = document.getElementById('tplRestoreRemarks')?.checked;
    if (restoreConditions && tplData.deliveryTerm !== undefined) {
      setValue('deliveryTerm',   tplData.deliveryTerm);
      setValue('deliveryMethod', tplData.deliveryMethod);
      setValue('paymentTerm',    tplData.paymentTerm);
      setValue('validDays',      tplData.validDays);
    }
    if (restoreRemarks && tplData.remarks !== undefined) {
      state.remarks = tplData.remarks;
      setValue('remarks', tplData.remarks);
    }

    markDirty();
    renumberSections();
    renderSections();
    updateOutput();
    document.getElementById('tplLoadModal').style.display = 'none';
    showToast(`テンプレートを${mode === 'replace' ? '置き換え' : '追加'}しました`);
    document.getElementById('noSectionsMsg').style.display = 'none';
  }
```

- [ ] **Step 4: ビルドして動作確認**

```
cd mitumori001
zet pack
```

期待結果: `Extension packed successfully as mitumori001.zip in dist folder.`

確認手順:
1. 読み込みダイアログを開く（「復元する項目」が両方 disabled で表示される）
2. 見積条件・備考を含まない既存テンプレートを選択 → 両チェックボックスが disabled のまま
3. Task 2 で保存した新テンプレート（条件・備考あり）を選択 → 両チェックボックスが enabled になる
4. チェックを入れて読み込む → 見積条件・備考欄に値が反映される
5. チェックを外して読み込む → 見積条件・備考欄は変化しない
6. 置き換えモードで読み込む → 従来通り sections が置き換わり、条件・備考も復元される

- [ ] **Step 5: コミット**

```
git add mitumori001/app/index.html mitumori001/app/js/app.js mitumori001/dist/mitumori001.zip
git commit -m "feat: テンプレート読み込みに見積条件・備考欄の復元オプションを追加"
```

---

## デグレ防止チェックリスト（全タスク完了後）

- [ ] sections のみの既存テンプレートが読み込みダイアログに表示される
- [ ] 既存テンプレートを読み込んでも sections が正常に反映される
- [ ] 「含める項目」を両方外して保存したテンプレートが従来と同じ動作をする
- [ ] 物販・工事・作業・FRP いずれのモードでも保存・読み込みが動作する
- [ ] プレビューボタンは読み込み操作と独立して動作する（ラジオ選択を邪魔しない）
