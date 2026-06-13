# FRP見積 修正・機能追加 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FRP見積の残バグ修正（御見積金額計算・送料注意文・PDF列位置）と PDF出力の参考見積形式への整合、および送料行自動追加機能を実装する。

**Architecture:** 既存 FRP実装（ウィザード・UI・PDF）はすべて実装済み。本計画は参考見積PDF（3枚）との照合で発覚した4箇所のバグ修正、buildCoverPage のFRPアイテム全展開対応、送料行自動追加の追加実装。

**Tech Stack:** Vanilla JS, pdfmake 0.1.x

**前提:** 既存計画書 `2026-06-11-frp-estimate.md` のTask 1〜9は実装済み。

---

## 変更ファイル一覧

| ファイル | 変更箇所 |
|---|---|
| `mitumori001/app/js/app.js` | `updateFrpTotals`の grandTotal 修正 / `FRP_SORYO_NOTES` 区分1/2/3 修正 / 送料テーブル定数追加 / `addFrpItem` 送料自動追加 |
| `mitumori001/app/js/pdf-generator.js` | `buildFrpDetailPages` の grandTotal・列位置修正 / `buildCoverPage` のFRPアイテム全展開 / `buildPdfPages` のFRP分岐修正 |

---

## Task 1: バグ修正 — UI御見積金額（仕切合計ベースに変更）

**Files:**
- Modify: `mitumori001/app/js/app.js:3195`

現在 `updateFrpTotals()` の御見積金額は「定価合計 − 出精値引き」だが、正しくは「仕切合計 − 出精値引き」。

- [ ] **Step 1: `updateFrpTotals` の grandTotal を修正する**

`app.js` 3195行 を以下に変更:

```javascript
// 変更前
const grandTotal   = Math.max(0, priceTotal - discount);

// 変更後
const grandTotal   = Math.max(0, shikiriTotal - discount);
```

- [ ] **Step 2: 手動確認**

FRPモードでアイテム（価格: 定価1,000,000 / A価600,000）を追加し、御見積金額に 600,000 が表示されること。出精値引き 50,000 を入力すると 550,000 になること。

- [ ] **Step 3: コミット**

```
git add mitumori001/app/js/app.js
git commit -m "fix: FRP UI御見積金額を仕切合計ベースに修正"
```

---

## Task 2: バグ修正 — `FRP_SORYO_NOTES` 区分1/2/3 に注意文を追加

**Files:**
- Modify: `mitumori001/app/js/app.js:2628`

参考見積②③より、混載便（区分1/2/3）でも「※現場直送不可...」を品名欄に表示することが確認された。

- [ ] **Step 1: `FRP_SORYO_NOTES` を修正する**

`app.js` 2628行 を以下に変更:

```javascript
// 変更前
const FRP_SORYO_NOTES = {
  1: '', 2: '', 3: '',
  4: '',

// 変更後
const FRP_SORYO_NOTES = {
  1: '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります。',
  2: '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります。',
  3: '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります。',
  4: '',
```

- [ ] **Step 2: 手動確認**

送料区分1/2/3のアイテムを追加すると、テーブルの注意文行に「※現場直送不可...」が表示されること。区分4は注意文なしのまま。

- [ ] **Step 3: コミット**

```
git add mitumori001/app/js/app.js
git commit -m "fix: FRP 混載便（区分1/2/3）に現場直送不可注意文を追加"
```

---

## Task 3: バグ修正 — PDF の御見積金額計算・列位置

**Files:**
- Modify: `mitumori001/app/js/pdf-generator.js:1248-1270`

`buildFrpDetailPages` で、出精値引き・御見積金額が定価合計列（col5）に表示されているが、仕切合計列（col7）に表示すべき。また grandTotal が `frpPriceTotal - frpDiscount` になっているバグも修正する。

8列構成: `[No, 品名, 数量, 単位, 定価単価(col4), 定価合計(col5), 仕切単価(col6), 仕切合計(col7)]`
インデックス: 0〜7 の 8セル

- [ ] **Step 1: `buildFrpDetailPages` 内の出精値引き・御見積金額行を修正する**

`pdf-generator.js` の1248〜1270行目を以下に置き換える:

```javascript
    // 出精値引き行
    if (frpDiscount > 0) {
      rows.push([
        { text: '', border: [true, false, false, true], fillColor: '#fff' },
        { text: '出精値引き', alignment: 'center', colSpan: 4,
          border: [false, false, false, true], fillColor: '#fff' },
        { text: '' }, { text: '' }, { text: '' },
        { text: '', border: [false, false, false, true], fillColor: '#fff' },    // 定価合計: 空
        { text: '', border: [false, false, false, true], fillColor: '#fff' },    // 仕切単価: 空
        { text: `▲ ${fmt(frpDiscount)}`, alignment: 'right',                    // 仕切合計列に表示
          border: [false, false, true, true], fillColor: '#fff' },
      ]);
      const grandTotal = Math.max(0, frpShikiriTotal - frpDiscount);             // 仕切合計ベース
      rows.push([
        { text: '', border: [true, false, false, true], fillColor: '#dce8f7' },
        { text: '御見積金額（税別）', alignment: 'center', bold: true, colSpan: 4,
          border: [false, false, false, true], fillColor: '#dce8f7' },
        { text: '' }, { text: '' }, { text: '' },
        { text: '', border: [false, false, false, true], fillColor: '#dce8f7' }, // 定価合計: 空
        { text: '', border: [false, false, false, true], fillColor: '#dce8f7' }, // 仕切単価: 空
        { text: fmt(grandTotal), alignment: 'right', bold: true,                 // 仕切合計列に表示
          border: [false, false, true, true], fillColor: '#dce8f7' },
      ]);
    }
```

- [ ] **Step 2: 手動確認**

FRPモードで定価1,000,000/A価600,000のアイテムを追加し、出精値引き50,000でPDFを出力する。以下を確認:
- 合計行: 定価合計列に1,000,000、仕切合計列に600,000が表示される
- 出精値引き行: 仕切合計列に▲50,000が表示される（定価合計列は空）
- 御見積金額行: 仕切合計列に550,000が表示される（定価合計列は空）

- [ ] **Step 3: コミット**

```
git add mitumori001/app/js/pdf-generator.js
git commit -m "fix: FRP PDF 出精値引き・御見積金額を仕切合計列へ・計算修正"
```

---

## Task 4: PDF構成の修正 — buildCoverPage にFRPアイテム全展開

**Files:**
- Modify: `mitumori001/app/js/pdf-generator.js:363-366`（COL_WIDTHS/COLS定義）
- Modify: `mitumori001/app/js/pdf-generator.js:372-399`（ヘッダー行）
- Modify: `mitumori001/app/js/pdf-generator.js:413-440`（mirrorEntries生成）
- Modify: `mitumori001/app/js/pdf-generator.js:474-488`（FRPアイテム行生成）
- Modify: `mitumori001/app/js/pdf-generator.js:601-824`（合計行）
- Modify: `mitumori001/app/js/pdf-generator.js:285-315`（buildPdfPages呼び出し）

現在の鏡ページは「FRP機器一式 1行」だが、参考見積に合わせてfrpItems全行を展開する。buildFrpDetailPages（page 2）は廃止してpageBreakも除去する。

**`buildCoverPage` に渡す追加引数:** `frpShowZuban: data.frpShowZuban !== false, frpDiscount: data.frpDiscount || 0`

- [ ] **Step 1: `buildCoverPage` の引数に `frpShowZuban` / `frpDiscount` を追加する**

`pdf-generator.js` 323行目の関数シグネチャを変更:

```javascript
// 変更前
function buildCoverPage({ quoteNoStr, dateStr, branch, data, sectionTotals,
  grandTotal, discount, discountEnabled, quoteCategory, deliveryPrice, materialCost, laborCost, legalWelfare, legalRate, anzenCost, buhanDiscTotal = 0,
  mainRate, pdfPriceMode, dairiTotal, showUchiwake, showProductCode = false,
  frpMode, frpItems, frpAB, frpPriceTotal, frpShikiriTotal }) {

// 変更後
function buildCoverPage({ quoteNoStr, dateStr, branch, data, sectionTotals,
  grandTotal, discount, discountEnabled, quoteCategory, deliveryPrice, materialCost, laborCost, legalWelfare, legalRate, anzenCost, buhanDiscTotal = 0,
  mainRate, pdfPriceMode, dairiTotal, showUchiwake, showProductCode = false,
  frpMode, frpItems, frpAB, frpPriceTotal, frpShikiriTotal,
  frpShowZuban = true, frpDiscount = 0 }) {
```

- [ ] **Step 2: COL_WIDTHS と COLS の定義にFRP分岐を追加する**

`pdf-generator.js` 363〜366行目を以下に置き換える:

```javascript
    const COL_WIDTHS = frpMode
      ? [22, '*', 25, 20, 45, 45, 50, 50]
      : (showProductCode
        ? (useDairi ? [22, '*', 50, 24, 30, 52, 58, 52, 58] : [22, '*', 50, 36, 30, 58, 58])
        : (useDairi ? [22, '*', 24, 30, 52, 58, 52, 58] : [22, '*', 36, 30, 58, 58]));
    const COLS = frpMode ? 8 : (useDairi ? (showProductCode ? 9 : 8) : (showProductCode ? 7 : 6));
```

- [ ] **Step 3: ヘッダー行にFRP専用8列を追加する**

`pdf-generator.js` 372〜399行目（`tableRows.push(useDairi ? [...]`）の **前** に以下を挿入する:

```javascript
    // FRPモード専用ヘッダー行
    if (frpMode) {
      tableRows.push([
        { text: 'No',       style: 'tableHeader' },
        { text: '品　　　名', style: 'tableHeader' },
        { text: '数量',     style: 'tableHeader' },
        { text: '単位',     style: 'tableHeader' },
        { text: '定価単価', style: 'tableHeader' },
        { text: '定価合計', style: 'tableHeader' },
        { text: '仕切単価', style: 'tableHeader' },
        { text: '仕切合計', style: 'tableHeader' },
      ]);
    } else
```

`tableRows.push(useDairi ? [...]` の行頭に `} else` の `{` を繋げる形にする（既存の `tableRows.push(` を `{` で囲んで else 節に入れる）。

具体的には、372行目の `tableRows.push(useDairi ? [` を `tableRows.push(useDairi ? [` のままにして、上記の `if (frpMode) { ... } else {` ブロックで包み、399行目の `]));` の後に `}` を追加する。

- [ ] **Step 4: mirrorEntries の FRP処理を変更する**

`pdf-generator.js` 438〜440行目（FRPのelse節）を以下に変更:

```javascript
    } else {
      // FRPモード: frpItemsの各行をエントリとして追加
      frpItems.forEach(item => {
        mirrorEntries.push({ type: 'frpItem', item });
        if (item.soryoNote) mirrorEntries.push({ type: 'frpNote', text: item.soryoNote });
        (item.specs || []).forEach(spec => mirrorEntries.push({ type: 'frpSpec', text: spec }));
      });
    }
```

- [ ] **Step 5: 第2パスの FRP行生成を変更する**

`pdf-generator.js` 476〜488行目（`if (entry.type === 'frp') {`）を以下に置き換える:

```javascript
      if (entry.type === 'frpItem') {
        const item = entry.item;
        const shikiri = frpAB === 'A' ? (Number(item.priceA) || 0) : (Number(item.priceB) || 0);
        const qty = Number(item.qty) || 1;
        const priceTotal   = (Number(item.price) || 0) * qty;
        const shikiriTotal = shikiri * qty;
        const nameParts = [];
        if (item.hinmei)  nameParts.push({ text: item.hinmei,  bold: true, fontSize: itemFs });
        if (item.itemnum) nameParts.push({ text: item.itemnum, fontSize: Math.max(6, itemFs - 1), color: '#333' });
        if (frpShowZuban && item.zuban)
          nameParts.push({ text: `【図番:${item.zuban}】`, fontSize: Math.max(5.5, itemFs - 1.5), color: '#555' });
        const nameCell = nameParts.length > 0 ? { stack: nameParts } : { text: item.name || '', bold: true, fontSize: itemFs };
        tableRows.push([
          { text: String(rowNo++), alignment: 'center', fontSize: itemFs },
          nameCell,
          { text: String(qty),         alignment: 'center', fontSize: itemFs },
          { text: item.unit || '',      alignment: 'center', fontSize: itemFs },
          { text: fmt(item.price) || '',alignment: 'right',  fontSize: itemFs },
          { text: fmt(priceTotal),      alignment: 'right',  fontSize: itemFs },
          { text: fmt(shikiri) || '',   alignment: 'right',  fontSize: itemFs },
          { text: fmt(shikiriTotal),    alignment: 'right',  fontSize: itemFs },
        ]);
        return;
      }
      if (entry.type === 'frpNote') {
        tableRows.push([
          { text: '', border: [true, false, false, false], fontSize: itemFs },
          { text: `  ${entry.text}`, fontSize: Math.max(6, itemFs - 1.5), color: '#c00', colSpan: 7,
            border: [false, false, true, false] },
          { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
        ]);
        return;
      }
      if (entry.type === 'frpSpec') {
        tableRows.push([
          { text: '', border: [true, false, false, false], fontSize: itemFs },
          { text: `　${entry.text}`, fontSize: Math.max(6, itemFs - 1), color: '#555', colSpan: 7,
            border: [false, false, true, false] },
          { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
        ]);
        return;
      }
```

また、既存の `if (entry.type === 'frp') {` ブロック（476〜488行）は上記で置き換えるため削除する。

変数 `rowNo` を第1パスの前（473行付近）に宣言:
```javascript
    let rowNo = 1;  // FRPアイテムの連番カウンター
    mirrorEntries.forEach(entry => {
```

- [ ] **Step 6: FRP専用合計行を追加する**

`pdf-generator.js` 601行目付近（`const spanMid = COLS - 2;` の後、`if (useDairiColumns) {` の前）に以下を追加:

```javascript
    // FRPモード専用合計行
    if (frpMode) {
      tableRows.push([
        { text: '', border: [true, true, false, false], fillColor: '#e8f0f8' },
        { text: '合　　計', alignment: 'center', bold: true, fontSize: itemFs, colSpan: 4,
          border: [false, true, false, false], fillColor: '#e8f0f8' },
        { text: '' }, { text: '' }, { text: '' },
        { text: fmt(frpPriceTotal),   alignment: 'right', bold: true, fontSize: itemFs,
          border: [false, true, false, false], fillColor: '#e8f0f8' },
        { text: '', border: [false, true, false, false], fillColor: '#e8f0f8' },
        { text: fmt(frpShikiriTotal), alignment: 'right', bold: true, fontSize: itemFs,
          border: [false, true, true, false], fillColor: '#e8f0f8' },
      ]);
      if (frpDiscount > 0) {
        tableRows.push([
          { text: '', border: [true, false, false, false], fillColor: '#fff' },
          { text: '出精値引き', alignment: 'center', fontSize: itemFs, colSpan: 4,
            border: [false, false, false, false], fillColor: '#fff' },
          { text: '' }, { text: '' }, { text: '' },
          { text: '', border: [false, false, false, false], fillColor: '#fff' },
          { text: '', border: [false, false, false, false], fillColor: '#fff' },
          { text: `▲ ${fmt(frpDiscount)}`, alignment: 'right', fontSize: itemFs, noWrap: true,
            border: [false, false, true, false], fillColor: '#fff' },
        ]);
        const grandFrp = Math.max(0, frpShikiriTotal - frpDiscount);
        tableRows.push([
          { text: '', border: [true, false, false, false], fillColor: '#dce8f7' },
          { text: '御見積金額（税別）', alignment: 'center', bold: true, fontSize: itemFs, colSpan: 4,
            border: [false, false, false, false], fillColor: '#dce8f7' },
          { text: '' }, { text: '' }, { text: '' },
          { text: '', border: [false, false, false, false], fillColor: '#dce8f7' },
          { text: '', border: [false, false, false, false], fillColor: '#dce8f7' },
          { text: fmt(grandFrp), alignment: 'right', bold: true, fontSize: itemFs,
            border: [false, false, true, false], fillColor: '#dce8f7' },
        ]);
      }
    } else if (useDairiColumns) {
      // ← 既存の if (useDairiColumns) を else if に変更
```

- [ ] **Step 7: FRPモードでは枠外文言を buildCoverPage の戻り値末尾に追加する**

`buildCoverPage` の `return [...]` 部分（925行付近）の末尾（ `]` の直前）に以下を追加:

```javascript
      // FRPモード: 枠外文言を鏡ページ末尾に追加
      ...(frpMode && data.frpFooterText ? [{
        text: data.frpFooterText,
        fontSize: 8,
        color: '#444',
        margin: [0, 12, 0, 0],
        lineHeight: 1.5,
        preserveLeadingSpaces: true,
      }] : []),
```

- [ ] **Step 8: `buildPdfPages` の FRP呼び出しを修正する**

`pdf-generator.js` 285〜315行目を以下に変更:

```javascript
        // buildCoverPage に frpShowZuban と frpDiscount を追加
        ...buildCoverPage({
          quoteNoStr, dateStr, branch,
          data, sectionTotals, grandTotal, discount, discountEnabled, quoteCategory,
          deliveryPrice, materialCost, laborCost, legalWelfare, legalRate, anzenCost,
          buhanDiscTotal: data.buhanDiscTotal || 0,
          mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal,
          showUchiwake,
          showProductCode: data.showProductCodeCover,
          frpMode, frpItems, frpAB, frpPriceTotal, frpShikiriTotal,
          frpShowZuban: data.frpShowZuban !== false,
          frpDiscount:  data.frpDiscount || 0,
        }),

        // FRPモードでは鏡のみ（pageBreak・明細なし）
        ...(!frpMode && data.printDetail !== false ? [
          { text: '', pageBreak: 'after' },
          ...(quoteCategory.includes('工事')
            ? (data.printMode === 'simple'
                ? buildKoujiSummaryDetailPages({ sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, discount, discountEnabled: data.discountEnabled !== false })
                : buildKoujiDetailPages({ quoteNoStr, sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, showSubtotalBoth: data.showSubtotalBoth, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, discount, discountEnabled: data.discountEnabled !== false }))
            : (data.printMode === 'simple'
                ? buildBuppanSagyoSummaryDetailPages({ sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, quoteCategory })
                : buildBuppanSagyoDetailPages({ quoteNoStr, sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, showSubtotalBoth: data.showSubtotalBoth, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, quoteCategory }))
          ),
        ] : []),
```

- [ ] **Step 9: displayPrice をFRPモードで frpShikiriTotal に変更する**

`pdf-generator.js` 357〜358行目付近（`displayPrice` の計算）:

```javascript
// 変更前
    const displayPrice = isTeika ? grandTotal : discountStylePrice;

// 変更後
    const displayPrice = frpMode ? frpShikiriTotal : (isTeika ? grandTotal : discountStylePrice);
```

- [ ] **Step 10: 手動確認**

FRPモードでアイテムを2件追加してPDFを出力する。以下を確認:
- 鏡（1ページ目）に全アイテムが展開されて表示される（「FRP機器一式」ではない）
- 送料注意文・仕様補足も鏡に表示される
- 合計行・出精値引き行・御見積金額行が鏡の末尾に表示される
- 2ページ目が出ない（pageBreakなし）
- 枠外文言が1ページ目末尾に表示される
- 鏡ヘッダーの総価格（御見積金額）が仕切合計と一致する

- [ ] **Step 11: コミット**

```
git add mitumori001/app/js/pdf-generator.js
git commit -m "feat: FRP PDF buildCoverPageにアイテム全展開・pageBreak廃止"
```

---

## Task 5: 送料自動追加機能

**Files:**
- Modify: `mitumori001/app/js/app.js:2627`（FRP_SORYO_NOTES の後）

製品追加時（`addFrpItem`）に、送料区分（soryoKubun）から送料行を自動生成して frpItems に追加する。

- [ ] **Step 1: 送料テーブル定数を追加する**

`app.js` の `FRP_SORYO_NOTES` 定数（2627行付近）の後に追加:

```javascript
  // 混載便固定金額（全国共通）
  const FRP_SORYO_KONZAI = {
    1:  11000,
    2:  17000,
    3:  22000,
    44: 28000,  // 区分44 混載切替時
  };

  // チャーター便 地域別金額
  const FRP_SORYO_CHARTER = {
    saitama:  { '4t': 118000, '6t': 133000, '10t': 157000 },
    ibaraki:  { '4t': 133000, '6t': 149000, '10t': 175000 },
    tochigi:  { '4t': 118000, '6t': 133000, '10t': 157000 },
    gunma:    { '4t': 110000, '6t': 124000, '10t': 147000 },
    chiba:    { '4t': 125000, '6t': 142000, '10t': 164000 },
  };

  // 所課コード → 地域キー（関東確定。他は要追加）
  const FRP_DEPT_REGION = {
    '28': 'saitama',  // さいたま営業所
    '32': 'chiba',    // 南関東営業所
  };

  // 地域キー → 都道府県名（日本語）
  const FRP_DEPT_PREFECTURE = {
    saitama: '埼玉',
    ibaraki: '茨城',
    tochigi: '栃木',
    gunma:   '群馬',
    chiba:   '千葉',
  };

  // 送料区分 → 車種名
  function frpSoryoVehicle(kubun) {
    if (kubun === 60)  return '6tユニック車';
    if (kubun === 100) return '10t平車';
    return '4tユニック車';
  }

  // 送料行オブジェクトを生成する
  function makeFrpSoryoItem(soryoKubun) {
    const isKonzai = [1, 2, 3].includes(soryoKubun);
    const region   = FRP_DEPT_REGION[state.shoka] || null;
    const pref     = (region && FRP_DEPT_PREFECTURE[region]) || '';

    let price   = 0;
    let itemnum = '';
    let note    = '';

    if (isKonzai) {
      price   = FRP_SORYO_KONZAI[soryoKubun] || 0;
      const prefStr = pref ? `(${pref}県内送り) ` : '';
      itemnum = `混載便／1台あたり${prefStr}※時間指定不可`;
      note    = '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります。';
    } else {
      const vehicle = frpSoryoVehicle(soryoKubun);
      const vKey    = vehicle.includes('6t') ? '6t' : vehicle.includes('10t') ? '10t' : '4t';
      const prefStr = pref ? `${pref}県内送り` : '送り先要確認';
      price   = (region && FRP_SORYO_CHARTER[region]) ? (FRP_SORYO_CHARTER[region][vKey] || 0) : 0;
      itemnum = `チャーター便【${vehicle}】${prefStr}`;
    }

    return {
      id:        state.nextFrpId++,
      type:      'soryo',
      shubetsu:  '送料',
      chubunrui: '',
      kashira:   '',
      hinmei:    '送料',
      itemnum,
      zuban:     '',
      qty:       1,
      unit:      '式',
      price,
      priceA:    price,  // 送料は仕切=定価（掛率なし）
      priceB:    price,
      soryoKubun,
      soryoNote: note,
      specs:     [],
    };
  }
```

- [ ] **Step 2: `addFrpItem` に送料行自動追加を追加する**

`app.js` の `addFrpItem` 関数内の `state.frpItems.push(item);` の後に追加:

```javascript
    state.frpItems.push(item);

    // 製品の場合のみ、送料行を自動追加（soryoKubun が設定されている場合）
    if (item.type === 'product' && item.soryoKubun) {
      const soryoItem = makeFrpSoryoItem(item.soryoKubun);
      state.frpItems.push(soryoItem);
    }
```

- [ ] **Step 3: 手動確認**

区分2の製品を追加すると:
- 製品行の直後に「送料」行が自動追加される
- 送料の `itemnum` が「混載便／1台あたり(埼玉県内送り) ※時間指定不可」（所課28の場合）
- 送料の `price` / `priceA` / `priceB` が 17,000

区分44の製品を追加すると:
- 送料の `itemnum` が「チャーター便【4tユニック車】埼玉県内送り」
- 送料の `price` が 118,000（さいたまの場合）

オプション部品を追加しても送料行は自動追加されないこと。

- [ ] **Step 4: コミット**

```
git add mitumori001/app/js/app.js
git commit -m "feat: FRP 送料行自動追加機能（区分別・地域別）"
```

---

## 最終確認チェックリスト

- [ ] 御見積金額（UI）= 仕切合計 − 出精値引き になっている
- [ ] 混載便（区分1/2/3）アイテムに「※現場直送不可...」注意文が表示される
- [ ] PDF 出精値引き行が仕切合計列に表示される
- [ ] PDF 御見積金額が `frpShikiriTotal - frpDiscount` で計算される
- [ ] PDF 鏡ページに全アイテムが展開されて表示される（FRP機器一式ではない）
- [ ] PDF 2ページ目が出ない（FRPモードでは1ページ構成）
- [ ] 製品追加後に送料行が自動追加される
- [ ] チャーター便の場合、所課に応じた金額が自動計算される
- [ ] ビルド（zet pack）でエラーが出ないこと
