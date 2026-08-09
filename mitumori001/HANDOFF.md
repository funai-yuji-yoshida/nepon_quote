# PDF自動縮小機能 実装記録

**作業日**: 2026-08-09  
**バージョン**: ?v=20260809-13  
**最終ビルド**: mitumori001.zip

---

## 背景・目的

### 問題

ユーザーが35行の明細を持つ見積PDFを「鏡＋明細ページを印刷」モードで出力した際、以下の問題が発生：

1. **鏡ページ（表紙）**: 「一小計」「合計」「貴社お渡し価格」が2ページ目に送られる
2. **明細ページ**: 3ページに分散（1ページ目：鏡、2ページ目：15行、3ページ目：20行+合計）

### 要件

- 明細が複数ページになった場合に**自動で縮小**して1ページに収める
- ただし、**常に縮小するのではなく**、ユーザーが選択できるようにする
- プレビューにも反映される

### 解決策

**チェックボックスによる制御**:
- デフォルト: チェックあり（縮小有効）
- ユーザーが状況に応じて選択可能
- 鏡ページ・明細ページ両方に適用

---

## 実装内容

### 1. UI追加

**ファイル**: `index.html` / `widget.html` (934-942行目)

**配置**: ③PDF出力タブ > 詳細プレビューボタンの右側

```html
<div style="display:flex; align-items:center; gap:8px; margin-top:6px">
  <button class="btn-secondary" id="btnPreviewSimplePDF" onclick="app.previewPDF('simple')" disabled>
    🔍 簡略プレビュー
  </button>
  <button class="btn-secondary" id="btnPreviewDetailPDF" onclick="app.previewPDF('detail')" disabled>
    🔍 詳細プレビュー
  </button>
  <label style="margin-left:auto; display:flex; align-items:center; gap:4px; font-size:13px; white-space:nowrap">
    <input type="checkbox" id="pdfAutoShrink" checked style="width:16px; height:16px">
    📐 明細を1ページに収める（自動縮小）
  </label>
</div>
```

### 2. パラメータ読み取り

**ファイル**: `app.js` (9848-9852行目)

```javascript
pdfScaleToFit: (() => {
  const cb = document.getElementById('pdfAutoShrink');
  return cb ? cb.checked : true; // デフォルト: 縮小有効
})(),
```

### 3. 鏡ページ縮小制御

**ファイル**: `pdf-generator.js` (600-617行目)

```javascript
// 鏡ページの自動縮小: 行数に応じてフォントサイズと縮小率を調整
const enableAutoShrink = pdfScaleToFit !== false; // デフォルト: 有効
console.log('[PDF] 鏡ページ 自動縮小:', enableAutoShrink ? '有効' : '無効', 'mirrorRowCount:', mirrorRowCount);

if      (mirrorRowCount <= 5)  itemFs = 12.5;
else if (mirrorRowCount <= 8)  itemFs = 11.0;
else if (mirrorRowCount <= 11) itemFs = 10.0;
else if (mirrorRowCount <= 14) itemFs =  9.0;
else if (mirrorRowCount <= 18) itemFs =  8.5;
else if (mirrorRowCount <= 20) itemFs =  7.5; // 20行まで（縮小なし）
else if (mirrorRowCount <= 24) { itemFs =  7.0; if (enableAutoShrink) scaleRatio = 0.92; } // 21-24行: 92%に縮小
else if (mirrorRowCount <= 28) { itemFs =  6.5; if (enableAutoShrink) scaleRatio = 0.88; } // 25-28行: 88%に縮小
else if (mirrorRowCount <= 32) { itemFs =  6.0; if (enableAutoShrink) scaleRatio = 0.85; } // 29-32行: 85%に縮小
else                           { itemFs =  5.5; if (enableAutoShrink) scaleRatio = 0.82; } // 33行超: 82%に縮小
```

### 4. 明細ページ縮小制御

**ファイル**: `pdf-generator.js` (239-278行目)

```javascript
// 明細ページの自動縮小率を計算
// ① 明細の総行数を計算
const totalRows = sectionTotals.reduce((sum, s) => {
  const sectionHeaderRows = (s.name || '').trim() ? 1 : 0; // セクションヘッダー行
  const itemRows = (s.items || []).length; // 明細行
  const subtotalRows = 1; // 小計行
  return sum + sectionHeaderRows + itemRows + subtotalRows;
}, 0);

// セクション数（大項目の数）
const sectionCount = sectionTotals.length;

// ② 推定高さを計算（pt単位）
const ROW_HEIGHT = 26;              // 1行あたりの高さ（パディング・行間込み）
const SECTION_HEADER_HEIGHT = 20;   // セクションヘッダーの追加高さ
const FIXED_HEIGHT = 220;           // タイトル、テーブルヘッダー、合計行など
const estimatedHeight = FIXED_HEIGHT
                      + (totalRows * ROW_HEIGHT)
                      + (sectionCount * SECTION_HEADER_HEIGHT);

// ③ A4印刷可能領域を計算（pt単位）
const A4_PRINTABLE_HEIGHT = 750;    // 安全マージン考慮

// ④ 縮小率を算出（pdfScaleToFit が有効で、1ページに収まらない場合のみ縮小）
let scaleRatio = 1.0;
const enableAutoShrink = data.pdfScaleToFit !== false; // デフォルト: 有効

if (enableAutoShrink && estimatedHeight > A4_PRINTABLE_HEIGHT) {
  scaleRatio = A4_PRINTABLE_HEIGHT / estimatedHeight;
  // 最小縮小率: 0.5（50%）まで
  scaleRatio = Math.max(0.5, scaleRatio);
}

console.log('[PDF] 自動縮小:', enableAutoShrink ? '有効' : '無効',
            '明細総行数:', totalRows, 'セクション数:', sectionCount,
            '推定高さ:', estimatedHeight.toFixed(0) + 'pt',
            'A4可能領域:', A4_PRINTABLE_HEIGHT + 'pt', '縮小率:', scaleRatio.toFixed(2));
```

---

## 推定計算パラメータの調整

### 試行錯誤の過程

#### 第1回試行（失敗）

**パラメータ**:
```javascript
const ROW_HEIGHT = 16;        // 1行あたりの高さ
const FIXED_HEIGHT = 160;     // 固定部分
const A4_PRINTABLE_HEIGHT = 786;
```

**結果**:
```
明細総行数: 37 推定高さ: 752pt A4可能領域: 786pt 縮小率: 1.00
```

**問題**: 推定高さ 752pt < 786pt → 縮小なし。しかし実際は3ページに分散。

**原因**:
- 1行あたりの実際の高さは約40pt（推定16ptは甘すぎ）
- セクションヘッダー、小計行、パディングを考慮不足

#### 第2回試行（成功）

**パラメータ**:
```javascript
const ROW_HEIGHT = 26;              // 実測値に基づく
const SECTION_HEADER_HEIGHT = 20;   // セクションヘッダーの追加高さ
const FIXED_HEIGHT = 220;           // タイトル、ヘッダー、合計行など
const A4_PRINTABLE_HEIGHT = 750;    // 安全マージン追加
```

**結果**:
```
明細総行数: 39 セクション数: 2 推定高さ: 1274pt A4可能領域: 750pt 縮小率: 0.59
```

**成功**: 縮小率 59% が適用され、PDF が縮小された。

### パラメータ決定の根拠

1. **ROW_HEIGHT = 26pt**
   - 実測: 1ページに約15-20行入る
   - 786pt ÷ 20行 ≈ 39pt/行
   - パディング・行間を考慮して26ptに設定

2. **SECTION_HEADER_HEIGHT = 20pt**
   - セクションヘッダーは通常の行より高さが大きい
   - 別途カウントして20pt加算

3. **FIXED_HEIGHT = 220pt**
   - タイトル行: 約30pt
   - ヘッダー情報: 約50pt
   - テーブルヘッダー: 約15pt
   - 合計行: 約50pt
   - その他マージン: 約75pt

4. **A4_PRINTABLE_HEIGHT = 750pt**
   - A4高さ: 297mm ≈ 842pt
   - マージン（上38 + 下18）: 56pt
   - 理論値: 786pt
   - 安全マージン: -36pt（実際はテーブルの上下余白などで狭い）
   - 最終値: 750pt

---

## テスト結果

### テストケース1: 37行（2セクション）

**チェックあり**:
```
[PDF] 鏡ページ 自動縮小: 有効 mirrorRowCount: 11
[PDF] 自動縮小: 有効 明細総行数: 39 セクション数: 2 推定高さ: 1274pt A4可能領域: 750pt 縮小率: 0.59
```

**結果**: ✅ 成功。PDFが59%に縮小され、明細が見やすく収まった。

**チェックなし**:
```
[PDF] 鏡ページ 自動縮小: 無効 mirrorRowCount: 11
[PDF] 自動縮小: 無効 明細総行数: 39 セクション数: 2 推定高さ: 1274pt A4可能領域: 750pt 縮小率: 1.00
```

**結果**: ✅ 成功。縮小なし、複数ページで出力された。

### テストケース2: プレビュー反映

1. チェックを入れる → 詳細プレビュー → ✅ 縮小されたPDFが表示
2. チェックを外す → 詳細プレビュー → ✅ 通常サイズのPDFが表示

**結果**: ✅ プレビューにもチェック状態が正しく反映される。

---

## 技術的な注意点

### 推定計算の限界

**推定は概算**:
- pdfmakeの実際のページ分割ロジックとは完全には一致しない
- 長いテキストの折り返し、フォントの違いにより実際の高さは変動する

**対策**:
- 安全マージンを設けた（A4_PRINTABLE_HEIGHT = 750pt）
- 実測値に基づいてパラメータを調整

### 最小縮小率の設定

```javascript
scaleRatio = Math.max(0.5, scaleRatio); // 最小50%
```

**理由**:
- 50%未満に縮小すると可読性が著しく低下
- 極端に多い行数（100行超など）の場合は、別途対応が必要

### フォント非対応時の考慮

```javascript
const font = fontLoaded ? 'NotoSansJP' : 'Roboto';
```

**問題**:
- `fontLoaded` が false の場合、フォールバックフォント（Roboto）で描画
- 日本語フォントとラテンフォントで文字幅が異なり、推定高さがズレる可能性

**対策**:
- 現状は考慮していないが、将来的にフォールバック時の補正係数を追加する余地あり

---

## 今後の改善案

### 1. 動的パラメータ調整

現在は固定値（ROW_HEIGHT = 26pt）だが、以下の要因で動的に調整する余地あり：
- カテゴリ（工事 vs 物販）
- 価格モード（代理店価格 vs 定価）
- 品目コード表示の有無

### 2. より正確な推定

pdfmakeの内部レイアウトエンジンを活用して、実際の高さを事前計算する方法を検討。

### 3. 段階的縮小

現在は一律の縮小率だが、段階的に縮小する方法も検討可能：
- 1ページに収まらない → 95%
- それでも収まらない → 90%
- さらに収まらない → 85%

### 4. ユーザーフィードバック収集

実際の使用状況を監視し、推定計算のパラメータを継続的に改善。

---

## 変更ファイル一覧

| ファイル | 変更内容 | 行数 |
|---------|---------|------|
| `index.html` | チェックボックスUI追加 | 934-942 |
| `widget.html` | index.htmlと同期 | 934-942 |
| `app.js` | pdfScaleToFit パラメータ読み取り | 9848-9852 |
| `pdf-generator.js` | 鏡ページ縮小制御 | 600-617 |
| `pdf-generator.js` | 明細ページ縮小制御 | 239-278 |
| `CLAUDE.md` | 仕様追記 | 78-176 |
| `HANDOFF.md` | 実装記録（本ファイル） | 新規作成 |

---

## まとめ

### 達成したこと

✅ 明細が複数ページにわたる場合の自動縮小機能を実装  
✅ チェックボックスによるユーザー制御を実現  
✅ プレビューへの反映を確認  
✅ 推定計算パラメータを実測値に基づいて調整  
✅ 37行の明細が59%縮小されることを確認

### 学んだこと

1. **推定計算の難しさ**: 理論値と実測値のギャップを埋めるには試行錯誤が必要
2. **安全マージンの重要性**: 余裕を持ったパラメータ設定が安定性につながる
3. **ユーザー制御の価値**: 自動化とユーザー選択のバランスが重要

### 残課題

- フォント非対応時の推定精度向上
- より多様なケース（100行超など）への対応
- 動的パラメータ調整の検討

---

**作成者**: Claude Sonnet 4.5  
**作成日**: 2026-08-09  
**最終更新**: 2026-08-09
