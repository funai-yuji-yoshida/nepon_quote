# FRP見積機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FRPタンク製品の見積作成専用UIを実装する。ステップ式ウィザードで型式選択し、3段品名・送料注意文・出精値引きを含む専用PDFを出力する。

**Architecture:** 既存 `state.frpMode/frpItems/frpAB` を拡張し、新規 state（frpHz/frpDiscount/frpFooterText/frpShowZuban/frpCache）を追加する。既存の検索入力UIをウィザードモーダルに置き換え、FRPキャッシュ（全件）から型式を選択する。PDF出力は既存の `buildFrpDetailPages` を拡張する。

**Tech Stack:** Vanilla JS（フレームワークなし）, pdfmake 0.1.x, localStorage, Zoho CRM API（`fetchAllRecords`経由）

---

## 変更ファイル一覧

| ファイル | 変更箇所 |
|---|---|
| `mitumori001/app/js/app.js` | state追加（823行目付近）/ 定数追加 / switchFrpMode拡張 / addFrpItem拡張 / renderFrpItems拡張 / updateFrpTotals拡張 / ウィザード・設定画面 JS追加 |
| `mitumori001/app/index.html` | frpContainer書き換え（449-489行）/ ウィザードモーダル追加 / 設定モーダル追加 |
| `mitumori001/app/js/pdf-generator.js` | buildFrpDetailPages拡張（1146行目付近）/ buildPdfDataへのfrpフィールド追加は app.js側 |
| `mitumori001/app/css/style.css` | ウィザードモーダル・設定モーダル・出精値引きのCSS追加 |

---

## Task 1: state拡張 + FRPキャッシュ読み込み

**Files:**
- Modify: `mitumori001/app/js/app.js:820-823`（state定義）
- Modify: `mitumori001/app/js/app.js:2618-2631`（switchFrpMode entering branch）

- [ ] **Step 1: stateに新フィールドを追加する**

`app.js` の823行目（`nextFrpId` の直後）に以下を追加:

```javascript
    frpHz:       '50Hz',  // Hz設定（設定画面で変更可）
    frpDiscount: 0,       // 出精値引き（円）
    frpFooterText: '',    // 枠外文言
    frpShowZuban:  true,  // 図番印刷ON/OFF
    frpCache:      null,  // FRPモジュール全件キャッシュ
```

- [ ] **Step 2: loadFrpCache関数を追加する**

`app.js` の `// ── FRP見積モード ──` コメント（2603行目付近）の直後に追加:

```javascript
  async function loadFrpCache() {
    if (!zohoReady) { state.frpCache = []; return; }
    try {
      state.frpCache = await fetchAllRecords('FRP', 'number');
    } catch (e) {
      console.warn('FRP全件取得エラー:', e);
      state.frpCache = [];
    }
  }
```

- [ ] **Step 3: switchFrpModeのenteringブランチを拡張する**

`switchFrpMode()` (2618行目付近)の entering ブランチ:

```javascript
    if (entering) {
      state.frpMode       = true;
      state.frpItems      = [];
      state.nextFrpId     = 1;
      state.frpDiscount   = 0;
      state.frpCache      = null;
      state.sections      = [];
      state.nextSectionId = 1;
      state.nextItemId    = 1;
      loadFrpSettings();
      loadFrpCache();
      renderSections();
    }
```

- [ ] **Step 4: 手動確認**

ブラウザで index.html を開き、コンソールエラーがないことを確認。FRPモードに切り替えるとコンソールに `FRP全件取得エラー` が出るが（zohoReadyがfalseのため）、エラーで落ちないことを確認。

- [ ] **Step 5: コミット**

```
git add mitumori001/app/js/app.js
git commit -m "feat: FRP state拡張・キャッシュ読み込み追加"
```

---

## Task 2: 送料定数 + calcSoryoNote + addFrpItem拡張

**Files:**
- Modify: `mitumori001/app/js/app.js:2603`（FRP見積モードセクション）
- Modify: `mitumori001/app/js/app.js:2673-2726`（旧searchFrp/showFrpDropdown/hideFrpDropdownを削除）
- Modify: `mitumori001/app/js/app.js:2727-2750`（addFrpItem）

- [ ] **Step 1: 送料定数・種別×中分類テーブル・calcSoryoNote関数を追加する**

`loadFrpCache` 関数の直後に追加:

```javascript
  // 送料注意文（送料区分コード → 文言）
  const FRP_SORYO_NOTES = {
    1: '', 2: '', 3: '',
    4: '',
    40: '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります。',
    44: '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります（混載便への切替可）。',
    60: '※別途チャーター便手配が必要となります。',
    100: '※別途チャーター便手配が必要となります。',
  };

  // ①種別 → 表示する②中分類の一覧（コードに固定）
  const FRP_SHUBETSU_CHUBUNRUI = {
    'ポンプアップ槽':          ['標準（縦型）', 'シンプル', '横型'],
    'ポンプアップ槽【槽のみ】': ['標準（縦型）', 'シンプル', 'ロング', '横型'],
  };

  function calcSoryoNote(kubun) {
    return FRP_SORYO_NOTES[Number(kubun)] ?? '';
  }
```

- [ ] **Step 2: 旧searchFrp / showFrpDropdown / hideFrpDropdown を削除する**

2673〜2726行の `async function searchFrp`, `function showFrpDropdown`, `function hideFrpDropdown` の3関数を丸ごと削除する。（ウィザードUIに置き換えるため不要）

- [ ] **Step 3: addFrpItemを新フィールド対応に書き換える**

```javascript
  function addFrpItem(record) {
    const specs = [];
    for (let i = 1; i <= 9; i++) {
      const v = String(record[`spec${i}`] || '').trim();
      if (v) specs.push(v);
    }
    const soryoKubun = Number(record.field2) || 0;
    const item = {
      id:          state.nextFrpId++,
      type:        record.field3 === 'オプション部品' ? 'option' : 'product',
      shubetsu:    record.field3  || '',
      chubunrui:   record.field4  || '',
      kashira:     record.field1  || '',
      hinmei:      record.field3  || record.Name || '',
      itemnum:     record.itemnum || '',
      zuban:       record.field   || '',
      qty:         1,
      unit:        record.unit    || '',
      price:       Number(record.price) || 0,
      priceA:      Number(record.A)     || 0,
      priceB:      Number(record.B)     || 0,
      soryoKubun,
      soryoNote:   calcSoryoNote(soryoKubun),
      specs,
    };
    state.frpItems.push(item);
    markDirty();
    renderFrpItems();
    updateFrpTotals();
    updateOutput();
  }
```

- [ ] **Step 4: 手動確認**

コンソールエラーなし。`app.addFrpItem({field3:'ポンプアップ槽', field4:'標準（縦型）', field1:'CRK', field:'CK01-No01', field2:2, Name:'テスト', itemnum:'CRK50-02B', unit:'台', price:100000, A:70000, B:65000})` をコンソールで実行し、`state.frpItems[0]` に期待通りのフィールドが入ることを確認。

- [ ] **Step 5: コミット**

```
git add mitumori001/app/js/app.js
git commit -m "feat: FRP 送料定数・calcSoryoNote・addFrpItem拡張"
```

---

## Task 3: renderFrpItems拡張（3段品名・送料注意文）

**Files:**
- Modify: `mitumori001/app/js/app.js:2760-2817`（renderFrpItems）

- [ ] **Step 1: renderFrpItemsを3段品名・送料注意文対応に書き換える**

```javascript
  function renderFrpItems() {
    const tbody = document.getElementById('frpItemsTbody');
    if (!tbody) return;

    const shikiriKey = state.frpAB === 'A' ? 'priceA' : 'priceB';
    const rows = [];

    state.frpItems.forEach((item, idx) => {
      const shikiri      = item[shikiriKey] || 0;
      const qty          = Number(item.qty) || 1;
      const priceTotal   = item.price * qty;
      const shikiriTotal = shikiri    * qty;

      // 3段品名
      const line1 = escHtml(item.hinmei);
      const line2 = item.itemnum ? escHtml(item.itemnum) : '';
      const line3 = (state.frpShowZuban && item.zuban)
        ? `【図番:${escHtml(item.zuban)}】` : '';
      const nameHtml = [line1, line2, line3].filter(Boolean).join('<br>');

      rows.push(`
        <tr class="frp-item-row" data-frp-id="${item.id}">
          <td class="frp-col-no" style="text-align:center">${idx + 1}</td>
          <td class="frp-col-name frp-item-name">${nameHtml}</td>
          <td class="frp-col-qty">
            <input type="number" class="frp-qty-input" value="${item.qty}"
                   min="0" step="any" data-frp-id="${item.id}">
          </td>
          <td class="frp-col-unit" style="text-align:center">${escHtml(item.unit)}</td>
          <td class="frp-col-price" style="text-align:right">${fmtFrp(item.price)}</td>
          <td class="frp-col-total" style="text-align:right">${fmtFrp(priceTotal)}</td>
          <td class="frp-col-shikiri" style="text-align:right">${fmtFrp(shikiri)}</td>
          <td class="frp-col-shikiri-total" style="text-align:right">${fmtFrp(shikiriTotal)}</td>
          <td class="frp-col-del">
            <button onclick="app.removeFrpItem(${item.id})"
                    style="color:#c00;background:none;border:none;cursor:pointer;font-size:14px;">✕</button>
          </td>
        </tr>
      `);

      // 送料注意文行
      if (item.soryoNote) {
        rows.push(`
          <tr class="frp-soryo-row">
            <td></td>
            <td colspan="8" class="frp-soryo-note">${escHtml(item.soryoNote)}</td>
          </tr>
        `);
      }

      // 仕様補足行
      item.specs.forEach(spec => {
        rows.push(`
          <tr class="frp-spec-row">
            <td></td>
            <td colspan="8">${escHtml(spec)}</td>
          </tr>
        `);
      });
    });

    tbody.innerHTML = rows.join('');

    tbody.querySelectorAll('.frp-qty-input').forEach(input => {
      input.addEventListener('input', () => {
        const id = Number(input.dataset.frpId);
        const item = state.frpItems.find(i => i.id === id);
        if (item) {
          item.qty = Number(input.value) || 0;
          renderFrpItems();
          updateFrpTotals();
          updateOutput();
        }
      });
    });
  }
```

- [ ] **Step 2: 手動確認**

コンソールでアイテムを追加し、テーブルに3段品名と送料注意文が表示されることを確認:

```javascript
app.addFrpItem({field3:'ポンプアップ槽', field4:'標準（縦型）', field1:'CRK', field:'CK01-No01', field2:40, Name:'CRK50-02B', itemnum:'CRK50-02B', unit:'台', price:100000, A:70000, B:65000})
```

区分40なので「※現場直送不可...」が表示されること、3段で品名/型式/図番が表示されることを確認。

- [ ] **Step 3: コミット**

```
git add mitumori001/app/js/app.js
git commit -m "feat: FRP 3段品名・送料注意文表示対応"
```

---

## Task 4: updateFrpTotals拡張（出精値引き・御見積金額）

**Files:**
- Modify: `mitumori001/app/js/app.js:2819-2828`（updateFrpTotals）

- [ ] **Step 1: updateFrpTotalsを出精値引き・御見積金額対応に書き換える**

```javascript
  function updateFrpTotals() {
    const shikiriKey   = state.frpAB === 'A' ? 'priceA' : 'priceB';
    const priceTotal   = state.frpItems.reduce((s, i) => s + i.price * (Number(i.qty) || 1), 0);
    const shikiriTotal = state.frpItems.reduce((s, i) => s + (i[shikiriKey] || 0) * (Number(i.qty) || 1), 0);
    const discount     = state.frpDiscount || 0;
    const grandTotal   = Math.max(0, priceTotal - discount);

    const ptEl = document.getElementById('frpPriceTotal');
    const stEl = document.getElementById('frpShikiriTotal');
    const gtEl = document.getElementById('frpGrandTotal');
    if (ptEl) ptEl.textContent = '¥' + priceTotal.toLocaleString('ja-JP');
    if (stEl) stEl.textContent = '¥' + shikiriTotal.toLocaleString('ja-JP');
    if (gtEl) gtEl.textContent = '¥' + grandTotal.toLocaleString('ja-JP');
  }
```

- [ ] **Step 2: 出精値引き入力イベントをapplyFrpModeUI内で登録する**

`applyFrpModeUI()` (2644行目付近) の末尾に追加:

```javascript
    // 出精値引き入力イベント（FRPモード開始時に毎回登録）
    if (frpOn) {
      const discountInput = document.getElementById('frpDiscountInput');
      if (discountInput) {
        discountInput.value = state.frpDiscount || 0;
        discountInput.oninput = () => {
          state.frpDiscount = Number(discountInput.value) || 0;
          updateFrpTotals();
          updateOutput();
        };
      }
    }
```

- [ ] **Step 3: 手動確認**

FRPモードでアイテムを追加し、出精値引きを入力すると御見積金額が変わることを確認。（この時点ではHTMLにフッターUIがないので Task 5完了後に再確認）

- [ ] **Step 4: コミット**

```
git add mitumori001/app/js/app.js
git commit -m "feat: FRP 出精値引き・御見積金額計算追加"
```

---

## Task 5: index.html拡張（ボタン・フッター・モーダル）

**Files:**
- Modify: `mitumori001/app/index.html:449-489`（frpContainer全体を書き換え）
- Modify: `mitumori001/app/index.html`（末尾付近のモーダル追加）

- [ ] **Step 1: frpContainerを書き換える（449-489行）**

現在の `<div id="frpContainer" ...>` 全体（489行の `</div>` まで）を以下に置き換える:

```html
      <!-- FRP見積コンテナー（frpMode時のみ表示） -->
      <div id="frpContainer" style="display:none">
        <div class="frp-header">
          <div class="frp-ab-toggle">
            <span class="frp-ab-label">価格モード：</span>
            <button class="btn-ab active" id="btnFrpA" onclick="app.setFrpAB('A')">A価</button>
            <button class="btn-ab"        id="btnFrpB" onclick="app.setFrpAB('B')">B価</button>
          </div>
          <div class="frp-add-buttons">
            <button class="btn-frp-add" onclick="app.openFrpWizard('product')">＋ 製品を追加</button>
            <button class="btn-frp-add" onclick="app.openFrpWizard('option')">＋ オプション部品</button>
            <button class="btn-frp-settings" onclick="app.openFrpSettings()">⚙ 設定</button>
          </div>
          <button class="btn-frp-back" onclick="app.switchFrpMode()">← 通常モードに戻す</button>
        </div>

        <table class="frp-table">
          <thead>
            <tr>
              <th class="frp-col-no">番号</th>
              <th class="frp-col-name">品名</th>
              <th class="frp-col-qty">数量</th>
              <th class="frp-col-unit">単位</th>
              <th class="frp-col-price">定価単価</th>
              <th class="frp-col-total">定価合計</th>
              <th class="frp-col-shikiri">仕切単価</th>
              <th class="frp-col-shikiri-total">仕切合計</th>
              <th class="frp-col-del"></th>
            </tr>
          </thead>
          <tbody id="frpItemsTbody"></tbody>
        </table>

        <div class="frp-footer">
          <div class="frp-totals-row">
            <span class="frp-footer-label">定価合計：</span>
            <strong id="frpPriceTotal">¥0</strong>
            <span class="frp-footer-label frp-footer-label-right">仕切合計：</span>
            <strong id="frpShikiriTotal">¥0</strong>
          </div>
          <div class="frp-discount-row">
            <span class="frp-footer-label">出精値引き：</span>
            <input type="number" id="frpDiscountInput" class="frp-discount-input" value="0" min="0">
            <span class="frp-footer-label">円</span>
          </div>
          <div class="frp-grand-row">
            <span class="frp-footer-label">御見積金額（税別）：</span>
            <strong id="frpGrandTotal">¥0</strong>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: ウィザードモーダルを追加する**

index.html の末尾（`</body>` 直前）にある既存モーダル群の末尾（例: tplLoadModalの `</div>` 直後）に追加:

```html
  <!-- FRP型式選択ウィザードモーダル -->
  <div id="frpWizardModal" class="modal-overlay" style="display:none">
    <div class="modal-dialog frp-wizard-dialog">
      <div class="modal-header">
        <span id="frpWizardTitle">製品を選択</span>
        <button class="modal-close"
                onclick="document.getElementById('frpWizardModal').style.display='none'">✕</button>
      </div>
      <div class="modal-body" id="frpWizardBody" style="min-height:200px"></div>
      <div class="modal-footer" id="frpWizardFooter"></div>
    </div>
  </div>

  <!-- FRP設定モーダル -->
  <div id="frpSettingsModal" class="modal-overlay" style="display:none">
    <div class="modal-dialog" style="max-width:540px">
      <div class="modal-header">
        <span>FRP設定</span>
        <button class="modal-close"
                onclick="document.getElementById('frpSettingsModal').style.display='none'">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-form-row">
          <label style="min-width:100px">Hz初期値</label>
          <label><input type="radio" name="frpSettingsHz" value="50Hz"> 50Hz</label>
          <label style="margin-left:12px"><input type="radio" name="frpSettingsHz" value="60Hz"> 60Hz</label>
          <label style="margin-left:12px"><input type="radio" name="frpSettingsHz" value="共通"> 共通</label>
        </div>
        <div class="modal-form-row">
          <label style="min-width:100px">図番を印刷する</label>
          <input type="checkbox" id="frpSettingsZuban" checked>
        </div>
        <div class="modal-form-row" style="flex-direction:column;align-items:stretch;gap:6px">
          <label>枠外文言</label>
          <textarea id="frpSettingsFooter" class="frp-footer-textarea" rows="14"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary"
                onclick="document.getElementById('frpSettingsModal').style.display='none'">キャンセル</button>
        <button class="btn-primary" onclick="app.saveFrpSettings()">💾 保存</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 3: 手動確認**

ブラウザで開き、FRPモードに切り替えると「＋ 製品を追加」「＋ オプション部品」「⚙ 設定」ボタンが表示される。フッターに出精値引き入力欄・御見積金額表示がある。各ボタンをクリックするとモーダルが開く（中身は次タスクでJS実装）。

- [ ] **Step 4: コミット**

```
git add mitumori001/app/index.html
git commit -m "feat: FRP UI拡張（ウィザード・設定モーダル・出精値引き）"
```

---

## Task 6: ウィザードJS

**Files:**
- Modify: `mitumori001/app/js/app.js`（FRPセクション内に追加）

- [ ] **Step 1: ウィザード状態変数と openFrpWizard を追加する**

`calcSoryoNote` 関数の直後に追加:

```javascript
  let _frpWizard = {
    mode:     'product',
    hz:       null,
    shubetsu: null,
    chubunrui: null,
    kashira:  null,
    step:     1,
  };

  function openFrpWizard(mode) {
    if (!state.frpCache) {
      showToast('FRPデータを読み込み中です。しばらくお待ちください。', 'warn');
      return;
    }
    _frpWizard = {
      mode,
      hz:       state.frpHz,
      shubetsu: null,
      chubunrui: null,
      kashira:  null,
      step:     1,
    };
    const modal = document.getElementById('frpWizardModal');
    if (modal) modal.style.display = '';
    _frpWizardRender();
  }
```

- [ ] **Step 2: _frpWizardRender（メイン描画関数）を追加する**

```javascript
  function _frpWizardRender() {
    const titleEl  = document.getElementById('frpWizardTitle');
    const bodyEl   = document.getElementById('frpWizardBody');
    const footerEl = document.getElementById('frpWizardFooter');
    if (!bodyEl || !footerEl) return;

    const w = _frpWizard;
    const cache = state.frpCache || [];

    // モード別ステップ描画
    if (w.mode === 'product') {
      _frpWizardRenderProduct(w, cache, titleEl, bodyEl, footerEl);
    } else {
      _frpWizardRenderOption(w, cache, titleEl, bodyEl, footerEl);
    }
  }
```

- [ ] **Step 3: _frpWizardRenderProduct（製品ウィザード各ステップ）を追加する**

```javascript
  function _frpWizardRenderProduct(w, cache, titleEl, bodyEl, footerEl) {
    const step = w.step;

    if (step === 1) {
      // Hz選択
      if (titleEl) titleEl.textContent = '① 対応Hz を選択';
      bodyEl.innerHTML = `
        <div class="frp-wizard-choices">
          ${['50Hz', '60Hz', '共通'].map(hz => `
            <button class="frp-wizard-choice ${w.hz === hz ? 'selected' : ''}"
                    onclick="app._frpWizardSetHz('${hz}')">${hz}</button>
          `).join('')}
        </div>
      `;
      footerEl.innerHTML = `
        <button class="btn-secondary" onclick="document.getElementById('frpWizardModal').style.display='none'">キャンセル</button>
        <button class="btn-primary" onclick="app._frpWizardNext()">次へ →</button>
      `;

    } else if (step === 2) {
      // 種別選択
      if (titleEl) titleEl.textContent = '② 種別を選択';
      const types = [...new Set(cache
        .filter(r => r.field3 && r.field3 !== 'オプション部品')
        .map(r => r.field3))].sort();
      bodyEl.innerHTML = `
        <div class="frp-wizard-choices">
          ${types.map(t => `
            <button class="frp-wizard-choice ${w.shubetsu === t ? 'selected' : ''}"
                    data-val="${escHtml(t)}"
                    onclick="app._frpWizardSetShubetsu(this.dataset.val)">${escHtml(t)}</button>
          `).join('')}
        </div>
      `;
      footerEl.innerHTML = `
        <button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>
        <button class="btn-secondary" onclick="app._frpWizardSkip()">スキップ</button>
        <button class="btn-primary" onclick="app._frpWizardNext()" ${!w.shubetsu ? 'disabled' : ''}>次へ →</button>
      `;

    } else if (step === 3) {
      // 中分類選択
      if (titleEl) titleEl.textContent = '③ 中分類を選択';
      const allowed = FRP_SHUBETSU_CHUBUNRUI[w.shubetsu] || [];
      const types = [...new Set(cache
        .filter(r => {
          if (w.shubetsu && r.field3 !== w.shubetsu) return false;
          return r.field4 && r.field4 !== '';
        })
        .map(r => r.field4)
        .filter(c => !w.shubetsu || allowed.length === 0 || allowed.includes(c))
      )].sort();

      if (types.length === 0) {
        // 中分類なし → スキップ
        _frpWizard.step = 4;
        _frpWizardRender();
        return;
      }

      bodyEl.innerHTML = `
        <div class="frp-wizard-choices">
          ${types.map(t => `
            <button class="frp-wizard-choice ${w.chubunrui === t ? 'selected' : ''}"
                    data-val="${escHtml(t)}"
                    onclick="app._frpWizardSetChubunrui(this.dataset.val)">${escHtml(t)}</button>
          `).join('')}
        </div>
      `;
      footerEl.innerHTML = `
        <button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>
        <button class="btn-secondary" onclick="app._frpWizardSkip()">スキップ</button>
        <button class="btn-primary" onclick="app._frpWizardNext()" ${!w.chubunrui ? 'disabled' : ''}>次へ →</button>
      `;

    } else if (step === 4) {
      // 型式グループ選択
      if (titleEl) titleEl.textContent = '④ 型式グループを選択';
      const filtered = cache.filter(r => {
        if (r.field3 === 'オプション部品') return false;
        if (w.shubetsu   && r.field3 !== w.shubetsu)   return false;
        if (w.chubunrui  && r.field4 !== w.chubunrui)  return false;
        if (w.hz !== '共通' && r.Hz && r.Hz !== '共通' && r.Hz !== w.hz) return false;
        return true;
      });
      const groups = [...new Set(filtered.map(r => r.field1).filter(Boolean))].sort();

      if (groups.length === 0) {
        bodyEl.innerHTML = '<p style="color:#888;padding:16px">条件に合う型式グループが見つかりません。</p>';
        footerEl.innerHTML = `<button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>`;
        return;
      }

      bodyEl.innerHTML = `
        <div class="frp-wizard-choices">
          ${groups.map(g => `
            <button class="frp-wizard-choice ${w.kashira === g ? 'selected' : ''}"
                    data-val="${escHtml(g)}"
                    onclick="app._frpWizardSetKashira(this.dataset.val)">${escHtml(g)}</button>
          `).join('')}
        </div>
      `;
      footerEl.innerHTML = `
        <button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>
        <button class="btn-primary" onclick="app._frpWizardNext()" ${!w.kashira ? 'disabled' : ''}>次へ →</button>
      `;

    } else if (step === 5) {
      // 型式一覧から選択
      if (titleEl) titleEl.textContent = '型式を選択';
      const items = cache.filter(r => {
        if (r.field3 === 'オプション部品') return false;
        if (w.shubetsu  && r.field3 !== w.shubetsu)  return false;
        if (w.chubunrui && r.field4 !== w.chubunrui) return false;
        if (w.kashira   && r.field1 !== w.kashira)   return false;
        if (w.hz !== '共通' && r.Hz && r.Hz !== '共通' && r.Hz !== w.hz) return false;
        return true;
      });

      if (items.length === 0) {
        bodyEl.innerHTML = '<p style="color:#888;padding:16px">条件に合う製品が見つかりません。</p>';
        footerEl.innerHTML = `<button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>`;
        return;
      }

      bodyEl.innerHTML = `
        <table class="frp-wizard-table">
          <thead>
            <tr><th>品名</th><th>型式</th><th>図番</th><th>定価</th><th></th></tr>
          </thead>
          <tbody>
            ${items.map((r, i) => `
              <tr>
                <td>${escHtml(r.field3 || '')}</td>
                <td>${escHtml(r.itemnum || '')}</td>
                <td>${escHtml(r.field || '')}</td>
                <td style="text-align:right">${(Number(r.price) || 0).toLocaleString('ja-JP')}</td>
                <td><button class="btn-primary btn-sm"
                            onclick="app._frpWizardSelect(${i})">選択</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      // itemsをウィザード状態に一時保存
      _frpWizard._items = items;
      footerEl.innerHTML = `<button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>`;
    }
  }
```

- [ ] **Step 4: オプション部品ウィザード + ナビゲーション関数を追加する**

```javascript
  function _frpWizardRenderOption(w, cache, titleEl, bodyEl, footerEl) {
    const step = w.step;
    if (step === 1) {
      if (titleEl) titleEl.textContent = 'オプション部品 - 中分類を選択';
      const types = [...new Set(cache
        .filter(r => r.field3 === 'オプション部品' && r.field4)
        .map(r => r.field4))].sort();
      bodyEl.innerHTML = `
        <div class="frp-wizard-choices">
          ${types.map(t => `
            <button class="frp-wizard-choice ${w.chubunrui === t ? 'selected' : ''}"
                    data-val="${escHtml(t)}"
                    onclick="app._frpWizardSetChubunrui(this.dataset.val)">${escHtml(t)}</button>
          `).join('')}
        </div>
      `;
      footerEl.innerHTML = `
        <button class="btn-secondary" onclick="document.getElementById('frpWizardModal').style.display='none'">キャンセル</button>
        <button class="btn-primary" onclick="app._frpWizardNext()" ${!w.chubunrui ? 'disabled' : ''}>次へ →</button>
      `;
    } else if (step === 2) {
      if (titleEl) titleEl.textContent = 'オプション部品 - 品名を選択';
      const items = cache.filter(r =>
        r.field3 === 'オプション部品' && r.field4 === w.chubunrui
      );
      bodyEl.innerHTML = `
        <table class="frp-wizard-table">
          <thead>
            <tr><th>品名</th><th>型式</th><th>定価</th><th></th></tr>
          </thead>
          <tbody>
            ${items.map((r, i) => `
              <tr>
                <td>${escHtml(r.Name || '')}</td>
                <td>${escHtml(r.itemnum || '')}</td>
                <td style="text-align:right">${(Number(r.price) || 0).toLocaleString('ja-JP')}</td>
                <td><button class="btn-primary btn-sm"
                            onclick="app._frpWizardSelect(${i})">選択</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      _frpWizard._items = items;
      footerEl.innerHTML = `<button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>`;
    }
  }

  // ナビゲーション
  function _frpWizardSetHz(hz)          { _frpWizard.hz = hz;           _frpWizardRender(); }
  function _frpWizardSetShubetsu(v)     { _frpWizard.shubetsu = v;      _frpWizardRender(); }
  function _frpWizardSetChubunrui(v)    { _frpWizard.chubunrui = v;     _frpWizardRender(); }
  function _frpWizardSetKashira(v)      { _frpWizard.kashira = v;       _frpWizardRender(); }

  function _frpWizardNext() {
    const maxStep = _frpWizard.mode === 'product' ? 5 : 2;
    if (_frpWizard.step < maxStep) { _frpWizard.step++; _frpWizardRender(); }
  }
  function _frpWizardBack() {
    if (_frpWizard.step > 1) { _frpWizard.step--; _frpWizardRender(); }
  }
  function _frpWizardSkip() {
    _frpWizard.step++;
    _frpWizardRender();
  }
  function _frpWizardSelect(idx) {
    const record = (_frpWizard._items || [])[idx];
    if (!record) return;
    addFrpItem(record);
    document.getElementById('frpWizardModal').style.display = 'none';
    showToast(`${record.Name || record.itemnum || '製品'} を追加しました`);
  }
```

- [ ] **Step 5: publicAPIに登録する**

`app.js` 6024行目付近の `// FRPモード` コメントの行を以下に置き換える:

```javascript
    // FRPモード
    switchFrpMode, setFrpAB,
    removeFrpItem,
    openFrpWizard,
    _frpWizardSetHz,
    _frpWizardSetShubetsu,
    _frpWizardSetChubunrui,
    _frpWizardSetKashira,
    _frpWizardNext,
    _frpWizardBack,
    _frpWizardSkip,
    _frpWizardSelect,
```

- [ ] **Step 6: 手動確認**

FRPモードで「＋ 製品を追加」→ Hz選択 → 種別選択 → 中分類選択 → 型式グループ選択 → 型式一覧 → 「選択」で frpItems に追加されること。「＋ オプション部品」→ 中分類 → 品名一覧 → 選択でも動くことを確認。

- [ ] **Step 7: コミット**

```
git add mitumori001/app/js/app.js
git commit -m "feat: FRP型式選択ウィザード実装"
```

---

## Task 7: 設定画面JS（openFrpSettings / saveFrpSettings / loadFrpSettings）

**Files:**
- Modify: `mitumori001/app/js/app.js`（FRPセクション末尾付近に追加）

- [ ] **Step 1: 枠外文言デフォルト値定数を追加する**

ウィザード変数の直後に追加:

```javascript
  const FRP_DEFAULT_FOOTER = `----ご注文について----
・ご注文の際は、仕様の最終確認として添付図面内に「OKサイン」を記載し
　ご注文書とあわせてFAX下さいますようお願いいたします。
・OKサイン図面のFAXを頂き次第、製作開始します。
　また当商品は受注製作品のため、OKサイン図面受信後の製品の仕様変更・返品・
　キャンセルはお受けいたしかねます。あらかじめご了承くださいますようお願い
　申し上げます。

----ご発注後の出荷日延期について----
　ご発注後の出荷日延期につきましては、弊社保管スペースの都合により、当初ご
　指定の出荷予定日（または生産完了日）から1か月以内の範囲で承ります。なお、
　この期間内であっても、月を跨ぐ変更となる場合には、保管および調整にかかる
　費用として10,000円（税別）を別途頂戴いたします。あらかじめご了承ください
　ますようお願い申し上げます。

----決算月に関する出荷について----
　弊社決算月（3月・6月・9月・12月）に出荷予定の案件につきましては、上記に
　かかわらず、当該月内での出荷完了をお願いしております。そのため、1か月以内
　の延期であっても、決算月を跨ぐ出荷延期はお受けいたしかねます。

----アフターサービスについて----
・納入後の故障や不具合に関する修理対応につきましては、着脱装置が付いていない
　型式は対応をお断りさせていただく場合がございますので、あらかじめご了承くだ
　さいますようお願い申し上げます。`;
```

- [ ] **Step 2: loadFrpSettings を追加する**

```javascript
  function loadFrpSettings() {
    const key = `frp_settings_${state.shoka || 'default'}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved) {
        state.frpHz         = saved.hz         || '50Hz';
        state.frpShowZuban  = saved.showZuban  !== false;
        state.frpFooterText = saved.footerText || FRP_DEFAULT_FOOTER;
      } else {
        state.frpHz         = '50Hz';
        state.frpShowZuban  = true;
        state.frpFooterText = FRP_DEFAULT_FOOTER;
      }
    } catch (e) {
      state.frpHz         = '50Hz';
      state.frpShowZuban  = true;
      state.frpFooterText = FRP_DEFAULT_FOOTER;
    }
  }
```

- [ ] **Step 3: openFrpSettings / saveFrpSettings を追加する**

```javascript
  function openFrpSettings() {
    const modal = document.getElementById('frpSettingsModal');
    if (!modal) return;

    const hzRadios = modal.querySelectorAll('input[name="frpSettingsHz"]');
    hzRadios.forEach(r => { r.checked = r.value === state.frpHz; });

    const zubanCb = document.getElementById('frpSettingsZuban');
    if (zubanCb) zubanCb.checked = state.frpShowZuban !== false;

    const ta = document.getElementById('frpSettingsFooter');
    if (ta) ta.value = state.frpFooterText || FRP_DEFAULT_FOOTER;

    modal.style.display = '';
  }

  function saveFrpSettings() {
    const hzRadio = document.querySelector('input[name="frpSettingsHz"]:checked');
    const hz      = hzRadio?.value || '50Hz';
    const zubanCb = document.getElementById('frpSettingsZuban');
    const ta      = document.getElementById('frpSettingsFooter');

    state.frpHz         = hz;
    state.frpShowZuban  = zubanCb ? zubanCb.checked : true;
    state.frpFooterText = ta ? ta.value : FRP_DEFAULT_FOOTER;

    const key = `frp_settings_${state.shoka || 'default'}`;
    localStorage.setItem(key, JSON.stringify({
      hz:         state.frpHz,
      showZuban:  state.frpShowZuban,
      footerText: state.frpFooterText,
    }));

    document.getElementById('frpSettingsModal').style.display = 'none';
    showToast('FRP設定を保存しました');
  }
```

- [ ] **Step 4: publicAPIに登録する**

`app.js` 6024行目付近（ウィザード関数の追加後の同じ箇所）に追加:

```javascript
    openFrpSettings,
    saveFrpSettings,
```

- [ ] **Step 5: 手動確認**

「⚙ 設定」→ Hz・図番・枠外文言を変更して「保存」→ localStorage に `frp_settings_default` が保存されることを確認。FRPモードを終了・再入すると設定が復元されることを確認。

- [ ] **Step 6: コミット**

```
git add mitumori001/app/js/app.js
git commit -m "feat: FRP設定画面（Hz・図番・枠外文言）実装"
```

---

## Task 8: PDF拡張（buildFrpDetailPages・buildPdfData）

**Files:**
- Modify: `mitumori001/app/js/app.js:5306-5309`（buildPdfData内 frpMode行付近）
- Modify: `mitumori001/app/js/pdf-generator.js:1146-1238`（buildFrpDetailPages）

- [ ] **Step 1: buildPdfData に frpDiscount / frpFooterText / frpShowZuban を追加する**

`app.js` の `buildPdfData` 内（5306行目付近）の `frpMode: state.frpMode || false,` 付近:

```javascript
      frpMode:         state.frpMode  || false,
      frpAB:           state.frpAB    || 'A',
      frpItems:        state.frpMode ? (state.frpItems || []) : undefined,
      frpDiscount:     state.frpMode ? (state.frpDiscount || 0) : 0,
      frpFooterText:   state.frpMode ? (state.frpFooterText || '') : '',
      frpShowZuban:    state.frpMode ? (state.frpShowZuban !== false) : true,
```

- [ ] **Step 2: buildFrpDetailPages の呼び出し箇所を更新する**

`pdf-generator.js` の約300行目付近（`buildFrpDetailPages` 呼び出し）:

```javascript
            ? buildFrpDetailPages({
                quoteNoStr, frpItems, frpAB, frpPriceTotal, frpShikiriTotal,
                frpDiscount:   data.frpDiscount   || 0,
                frpFooterText: data.frpFooterText || '',
                frpShowZuban:  data.frpShowZuban  !== false,
              })
```

- [ ] **Step 3: buildFrpDetailPages を拡張する**

`pdf-generator.js` の `buildFrpDetailPages` 関数（1146行目）全体を以下に書き換える:

```javascript
  function buildFrpDetailPages({ quoteNoStr, frpItems, frpAB,
      frpPriceTotal, frpShikiriTotal,
      frpDiscount = 0, frpFooterText = '', frpShowZuban = true }) {
    const COL_WIDTHS    = [22, '*', 25, 20, 45, 45, 50, 50];
    const shikiriLabel  = `仕切単価(${frpAB}価)`;
    const shikiriTLabel = `仕切合計(${frpAB}価)`;

    const headerRow = [
      { text: 'No',           style: 'tableHeader' },
      { text: '品名',         style: 'tableHeader' },
      { text: '数量',         style: 'tableHeader' },
      { text: '単位',         style: 'tableHeader' },
      { text: '定価単価',     style: 'tableHeader' },
      { text: '定価合計',     style: 'tableHeader' },
      { text: shikiriLabel,   style: 'tableHeader' },
      { text: shikiriTLabel,  style: 'tableHeader' },
    ];

    const rows = [headerRow];
    let rowNo = 1;

    frpItems.forEach(item => {
      const shikiri      = frpAB === 'A' ? (Number(item.priceA) || 0) : (Number(item.priceB) || 0);
      const qty          = Number(item.qty) || 1;
      const priceTotal   = (Number(item.price) || 0) * qty;
      const shikiriTotal = shikiri * qty;

      // 3段品名: hinmei / itemnum / 【図番:zuban】
      const nameParts = [];
      if (item.hinmei)  nameParts.push({ text: item.hinmei, bold: true, fontSize: 9 });
      if (item.itemnum) nameParts.push({ text: item.itemnum, fontSize: 8, color: '#333' });
      if (frpShowZuban && item.zuban)
        nameParts.push({ text: `【図番:${item.zuban}】`, fontSize: 7, color: '#555' });
      const nameCell = nameParts.length > 0
        ? { stack: nameParts }
        : { text: item.name || '', bold: true };

      rows.push([
        { text: String(rowNo++), alignment: 'center' },
        nameCell,
        { text: String(qty), alignment: 'center' },
        { text: item.unit || '', alignment: 'center' },
        { text: fmt(item.price),   alignment: 'right' },
        { text: fmt(priceTotal),   alignment: 'right' },
        { text: fmt(shikiri),      alignment: 'right' },
        { text: fmt(shikiriTotal), alignment: 'right' },
      ]);

      // 送料注意文行
      if (item.soryoNote) {
        rows.push([
          { text: '', border: [true, false, false, false] },
          { text: `  ${item.soryoNote}`, fontSize: 7, color: '#c00', colSpan: 7,
            border: [false, false, true, false] },
          ...Array(7).fill({ text: '' }),
        ]);
      }

      // 仕様補足行
      (item.specs || []).forEach(spec => {
        rows.push([
          { text: '', border: [true, false, false, false] },
          { text: `　${spec}`, fontSize: 8, color: '#555', colSpan: 7,
            border: [false, false, true, false] },
          ...Array(7).fill({ text: '' }),
        ]);
      });
    });

    // 空白行
    for (let i = 0; i < 2; i++) {
      rows.push([
        { text: '', border: [true, false, true, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, true, false] },
      ]);
    }

    // 合計行
    rows.push([
      { text: '', border: [true, true, false, true], fillColor: '#e8f0f8' },
      { text: '合　　計', alignment: 'center', bold: true, colSpan: 4,
        border: [false, true, false, true], fillColor: '#e8f0f8' },
      { text: '' }, { text: '' }, { text: '' },
      { text: fmt(frpPriceTotal),   alignment: 'right', bold: true,
        border: [false, true, false, true], fillColor: '#e8f0f8' },
      { text: '', border: [false, true, false, true], fillColor: '#e8f0f8' },
      { text: fmt(frpShikiriTotal), alignment: 'right', bold: true,
        border: [false, true, true, true], fillColor: '#e8f0f8' },
    ]);

    // 出精値引き行
    if (frpDiscount > 0) {
      rows.push([
        { text: '', border: [true, false, false, true], fillColor: '#fff' },
        { text: '出精値引き', alignment: 'center', colSpan: 4,
          border: [false, false, false, true], fillColor: '#fff' },
        { text: '' }, { text: '' }, { text: '' },
        { text: `▲ ${fmt(frpDiscount)}`, alignment: 'right',
          border: [false, false, false, true], fillColor: '#fff' },
        { text: '', border: [false, false, false, true], fillColor: '#fff' },
        { text: '', border: [false, false, true, true], fillColor: '#fff' },
      ]);
      const grandTotal = Math.max(0, frpPriceTotal - frpDiscount);
      rows.push([
        { text: '', border: [true, false, false, true], fillColor: '#dce8f7' },
        { text: '御見積金額（税別）', alignment: 'center', bold: true, colSpan: 4,
          border: [false, false, false, true], fillColor: '#dce8f7' },
        { text: '' }, { text: '' }, { text: '' },
        { text: fmt(grandTotal), alignment: 'right', bold: true,
          border: [false, false, false, true], fillColor: '#dce8f7' },
        { text: '', border: [false, false, false, true], fillColor: '#dce8f7' },
        { text: '', border: [false, false, true, true], fillColor: '#dce8f7' },
      ]);
    }

    const tableBlock = {
      table: { widths: COL_WIDTHS, headerRows: 1, body: rows },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.8 : 0.3,
        vLineWidth: () => 0.5,
        paddingLeft:   () => 3,
        paddingRight:  () => 3,
        paddingTop:    () => 2,
        paddingBottom: () => 2,
        hLineColor: () => '#555',
        vLineColor: () => '#888',
      },
      margin: [0, 0, 0, 0],
    };

    const content = [tableBlock];

    // 枠外文言
    if (frpFooterText) {
      content.push({
        text: frpFooterText,
        fontSize: 8,
        color: '#444',
        margin: [0, 12, 0, 0],
        lineHeight: 1.5,
        preserveLeadingSpaces: true,
      });
    }

    return content;
  }
```

- [ ] **Step 4: 手動確認**

FRPモードでアイテムを追加し、PDFボタンを押す。以下を確認:
- 品名が3段（種別/型式/図番）で表示される
- 送料注意文（区分40/44/60/100の場合）が赤字で表示される
- 出精値引き入力時に「出精値引き」「御見積金額」行が追加される
- 枠外文言が末尾に表示される
- 図番OFF設定時に図番行が消える

- [ ] **Step 5: コミット**

```
git add mitumori001/app/js/app.js mitumori001/app/js/pdf-generator.js
git commit -m "feat: FRP PDF 3段品名・送料注意文・出精値引き・枠外文言対応"
```

---

## Task 9: CSS追加（ウィザード・設定モーダル・出精値引きフッター）

**Files:**
- Modify: `mitumori001/app/css/style.css`（末尾に追加）

- [ ] **Step 1: 必要なCSSを追加する**

`style.css` の末尾に追加:

```css
/* ── FRP追加分スタイル ─────────────────────────────── */

/* ボタン */
.frp-add-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-frp-add {
  background: #1a4d8f;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
}
.btn-frp-add:hover { background: #1565c0; }
.btn-frp-settings {
  background: #fff;
  border: 1px solid #aaa;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 13px;
  cursor: pointer;
  color: #555;
}
.btn-frp-settings:hover { background: #f5f5f5; }

/* フッター拡張 */
.frp-totals-row, .frp-discount-row, .frp-grand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
  padding: 4px 0;
}
.frp-grand-row strong {
  font-size: 16px;
  color: #1a4d8f;
}
.frp-discount-input {
  width: 100px;
  border: 1px solid #bbb;
  border-radius: 3px;
  padding: 3px 6px;
  text-align: right;
  font-size: 13px;
}

/* 送料注意文行 */
.frp-soryo-note {
  font-size: 11px;
  color: #c00;
  padding: 2px 8px;
  background: #fff8f8;
}

/* ウィザードモーダル */
.frp-wizard-dialog {
  max-width: 640px;
  width: 100%;
}
.frp-wizard-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 0;
}
.frp-wizard-choice {
  background: #f0f4fb;
  border: 1px solid #a0b4d0;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.frp-wizard-choice:hover   { background: #dce8f7; }
.frp-wizard-choice.selected {
  background: #1a4d8f;
  color: #fff;
  border-color: #1a4d8f;
}
.frp-wizard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.frp-wizard-table th {
  background: #dce8f7;
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #b0c8e8;
}
.frp-wizard-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #e0e8f0;
  vertical-align: middle;
}
.frp-wizard-table tr:hover td { background: #f5f9ff; }
.btn-sm {
  padding: 3px 10px;
  font-size: 12px;
}

/* 設定モーダル テキストエリア */
.frp-footer-textarea {
  width: 100%;
  font-size: 12px;
  font-family: monospace;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px;
  resize: vertical;
  line-height: 1.6;
}
```

- [ ] **Step 2: 手動確認**

ウィザードモーダルの選択肢が横並びで表示される。選択時にハイライトされる。型式一覧テーブルが読みやすい。設定モーダルのテキストエリアが適切なサイズ。

- [ ] **Step 3: コミット**

```
git add mitumori001/app/css/style.css
git commit -m "feat: FRP ウィザード・設定モーダルCSS追加"
```

---

## 最終確認チェックリスト

- [ ] FRPモードON → frpCacheがバックグラウンドで取得される
- [ ] 「＋ 製品を追加」→ ウィザード5ステップが動作する
- [ ] 「＋ オプション部品」→ ウィザード2ステップが動作する
- [ ] 選択した製品がテーブルに3段品名で表示される
- [ ] 区分40/44/60/100の製品に送料注意文が表示される
- [ ] 数量を変更すると合計が更新される
- [ ] 出精値引きを入力すると御見積金額が計算される
- [ ] 「⚙ 設定」→ Hz・図番・枠外文言を設定して保存できる
- [ ] 設定がlocalStorageに保存されFRPモード再入時に復元される
- [ ] PDF出力で3段品名・送料注意文・出精値引き・枠外文言が出力される
- [ ] FRPモードを終了し通常モードに戻れる
