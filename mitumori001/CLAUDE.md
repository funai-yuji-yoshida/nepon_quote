# ネポン見積ウィジェット 開発メモ

## 印刷オプションの仕様（app.js / index.html）

### 表示ルール（カテゴリ別）

| オプション | 要素ID | 工事 | 物販 | 作業 |
|-----------|--------|------|------|------|
| 鏡のみ印刷（ラジオ） | `printCoverGroup` | 表示 | 表示 | 表示 |
| 鏡＋明細印刷（ラジオ） | `printDetailOption` | 表示 | 表示 | 表示 |
| 内訳印刷（チェック） | `naiyakuPrintGroup` | 表示 | **非表示** | 表示 |

- `printCoverGroup` と `printDetailOption` は**ラジオボタン**（`name="printPageMode"`）で排他選択。
- **「工事は常に明細印刷」という思い込みで `printDetail` を強制 `true` にしないこと**（過去デグレの原因）。
- FRP モードのみ `printDetail` を強制 `true` にする例外あり。

### buildPdfData での読み取り

```javascript
printCover:  cb.checked  // printCoverPage ラジオの checked 値
printDetail: cb.checked  // printDetailPages ラジオの checked 値（FRP時のみ強制true）
showUchiwake: cb.checked // printNaiyaku チェックボックスの checked 値（物販時は false 固定）
```

## PDF生成の主要関数（pdf-generator.js）

| 関数名 | 用途 |
|--------|------|
| `buildCoverPage` | 表紙（鏡）生成 |
| `buildKoujiDetailPages` | 工事明細ページ（全明細行） |
| `buildKoujiSummaryDetailPages` | 工事明細ページ（集計版） |
| `buildBuppanSagyoDetailPages` | 物販・作業明細ページ（全明細行） |
| `buildBuppanSagyoSummaryDetailPages` | 物販・作業明細ページ（集計版） |

### dairiモード（代理店価格）の列構成

- **表紙（鏡）**: 8列 `[22,'*',30,24,44,44,44,50]`
  - No. / 項目 / 数量 / 単位 / 単価 / 合計 / 仕切単価 / 仕切合計
- **明細ページ**: 8列 `[20,'*',28,24,44,44,44,50]`
  - No. / 項目 / 数量 / 単位 / 単価 / 合計 / 仕切単価 / 仕切合計
- **定価モード**: 6列 `[22,'*',36,30,58,58]`（表紙・明細共通）

## CRMマスター変更後の動作確認チェックリスト

CRMの管材・電材・機器・標準項・工事費マスターをインポート更新した後は、必ず以下を確認すること。

### 管材・電材（カテゴリドロップダウン）

カテゴリマッチは `KANZAI_CATEGORIES` / `DENZAI_CATEGORIES` の `prefixes` と品名の**前方一致**で行う。
品名の先頭部分が変わった場合は `prefixes` の更新が必要。

| 確認手順 | 確認内容 |
|---|---|
| 管材タブ → カテゴリを選択 | 品名・型式ドロップダウンにアイテムが表示されるか |
| 電材タブ → カテゴリを選択 | 品名・型式ドロップダウンにアイテムが表示されるか |
| 各カテゴリで1件追加 | 明細行に正しく追加されるか（品名・単価・原価） |

### 機器（テキスト検索 + カテゴリドロップダウン）

| 確認手順 | 確認内容 |
|---|---|
| 機器タブ → カテゴリを選択 | 品名ドロップダウンにアイテムが表示されるか |
| 機器タブ → テキスト検索 | 検索結果が表示されるか |
| 1件追加 | 明細行に正しく追加されるか |

### 工事費（標準項）

| 確認手順 | 確認内容 |
|---|---|
| 標準項タブ → 型式を選択 | 関連する工事費行が表示されるか |
| 1件追加 | 明細行に正しく追加されるか（工単価・工原価） |

### 共通

- PDF鏡ページが1ページに収まるか（物販・工事それぞれ）
- 工事カテゴリで機器タブが表示されるか、物販カテゴリで非表示になるか

## PDF自動縮小機能（2026-08-09 実装）

### 概要

明細が複数ページにわたる場合に、自動で縮小して1ページに収める機能。ユーザーがチェックボックスで有効/無効を制御できる。

### UI仕様

**配置**: ③PDF出力タブ > 詳細プレビューボタンの右側

```
[🔍 簡略プレビュー] [🔍 詳細プレビュー]  ☑ 📐 明細を1ページに収める（自動縮小）
```

- **要素ID**: `pdfAutoShrink`
- **デフォルト**: `checked`（縮小有効）
- **影響範囲**: 鏡ページ・明細ページ両方、プレビュー・印刷・ダウンロードすべてに反映

### 縮小ロジック

#### 鏡ページ（buildCoverPage）

**行数ベース自動縮小**:

| 行数 | フォントサイズ | 縮小率 | 
|------|---------------|--------|
| 1-20行 | 7.5～12.5pt | 100%（縮小なし） |
| 21-24行 | 7.0pt | 92% |
| 25-28行 | 6.5pt | 88% |
| 29-32行 | 6.0pt | 85% |
| 33行以上 | 5.5pt | 82% |

- `pdfScaleToFit` が `false` の場合、20行超でも縮小率 = 1.0（縮小なし）

#### 明細ページ（buildDocDefinition）

**推定高さベース自動縮小**:

```javascript
// パラメータ（実測値に基づく調整済み）
const ROW_HEIGHT = 26;              // 1行あたりの高さ（pt）
const SECTION_HEADER_HEIGHT = 20;   // セクションヘッダーの追加高さ（pt）
const FIXED_HEIGHT = 220;           // タイトル、ヘッダー、合計行など（pt）
const A4_PRINTABLE_HEIGHT = 750;    // A4印刷可能領域（pt）

// 推定高さ計算
totalRows = 明細行数 + セクションヘッダー行数 + 小計行数
estimatedHeight = FIXED_HEIGHT + (totalRows × ROW_HEIGHT) + (sectionCount × SECTION_HEADER_HEIGHT)

// 縮小率算出
if (pdfScaleToFit && estimatedHeight > A4_PRINTABLE_HEIGHT) {
  scaleRatio = A4_PRINTABLE_HEIGHT / estimatedHeight
  scaleRatio = Math.max(0.5, scaleRatio) // 最小50%
} else {
  scaleRatio = 1.0 // 縮小なし
}
```

### 実装ファイル

| ファイル | 変更内容 |
|---------|---------|
| `index.html` / `widget.html` | チェックボックスUI追加（934-942行目） |
| `app.js` | `pdfScaleToFit` パラメータの読み取り（9848-9852行目） |
| `pdf-generator.js` | 鏡ページ縮小制御（600-617行目）、明細ページ縮小制御（239-278行目） |

### コンソールログ

**チェックあり**の場合:
```
[PDF] 鏡ページ 自動縮小: 有効 mirrorRowCount: 11
[PDF] 自動縮小: 有効 明細総行数: 39 セクション数: 2 推定高さ: 1274pt A4可能領域: 750pt 縮小率: 0.59
```

**チェックなし**の場合:
```
[PDF] 鏡ページ 自動縮小: 無効 mirrorRowCount: 11
[PDF] 自動縮小: 無効 明細総行数: 39 セクション数: 2 推定高さ: 1274pt A4可能領域: 750pt 縮小率: 1.00
```

### 推定計算パラメータの調整履歴

**初期値**（不十分だった）:
- `ROW_HEIGHT = 16pt` → 実際は約40pt/行
- `FIXED_HEIGHT = 160pt` → 不足
- `A4_PRINTABLE_HEIGHT = 786pt` → 余裕なし

**調整後**（実測ベース）:
- `ROW_HEIGHT = 26pt` → 実測値に近づけた
- `FIXED_HEIGHT = 220pt` → タイトル、ヘッダー、合計行を考慮
- `A4_PRINTABLE_HEIGHT = 750pt` → 安全マージン追加
- セクションヘッダーと小計行を別途カウント

### 注意点

1. **推定計算は概算**: pdfmakeの実際のページ分割とは完全には一致しない
2. **行の高さは可変**: 長いテキストの折り返しにより実際の高さは変動する
3. **最小縮小率50%**: これ以上縮小すると可読性が損なわれる
4. **フォント非対応時の考慮**: `fontLoaded` が false の場合、フォールバックフォントで高さが変わる可能性
