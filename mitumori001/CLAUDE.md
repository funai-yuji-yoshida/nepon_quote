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

- **表紙（鏡）**: 7列 `[22,'*',30,24,46,46,50]`
  - No. / 項目 / 数量 / 単位 / 単価 / 仕切単価 / 仕切金額
- **明細ページ**: 8列 `[20,'*',28,24,44,44,44,50]`
  - No. / 項目 / 数量 / 単位 / 単価 / 合計 / 仕切単価 / 仕切合計
- **定価モード**: 6列 `[22,'*',36,30,58,58]`（表紙・明細共通）
