# 所課マスタ テンプレート機能拡張 設計仕様書

作成日: 2026-07-01

---

## 背景・目的

各所課ごとに見積テンプレートを使いまわせるようにするため、既存のテンプレート機能（CustomModule8）を段階的に拡張する。

デグレ防止のため、以下を厳守する：
- 既存テンプレート（sectionsのみ）は変更なく引き続き動作すること
- 依頼された変更箇所のみを修正し、他のコード・UI・スタイルには触れない

---

## 実装フェーズ

| フェーズ | 内容 | 状態 |
|---|---|---|
| **Phase 1** | テンプレートに説明文を追加 ＋ プレビュー機能 | **今回実装** |
| Phase 2 | 商品セット（複数品目を1クリックで追加） | 後日 |
| Phase 3 | 関連商品提案（商品追加時にセット候補を提示） | 後日 |

---

## Phase 1 詳細設計

### 概要

テンプレートの保存JSON に説明文（見積条件・備考欄）を含められるよう拡張する。また読み込みダイアログにプレビュー機能を追加する。

---

### 1. 保存JSONの拡張

#### 現在

```json
{
  "sections": [...]
}
```

#### 変更後

```json
{
  "sections": [...],
  "remarks":        "特記事項テキスト",
  "deliveryTerm":   "受注後 約○週間",
  "deliveryMethod": "弊社渡し",
  "paymentTerm":    "月末締め翌月末払い",
  "validDays":      30
}
```

- `remarks` / `deliveryTerm` / `deliveryMethod` / `paymentTerm` / `validDays` はすべて任意フィールド
- 既存テンプレート（これらのフィールドを持たないもの）はそのまま読み込み可能（後方互換性を維持）
- 明細行の仕様補足（`specLines`）はすでに `sections` 内に含まれるため追加対応不要

#### 取得元

| JSONフィールド | 取得元 |
|---|---|
| `remarks` | `state.remarks` |
| `deliveryTerm` | `getValue('deliveryTerm')` |
| `deliveryMethod` | `getValue('deliveryMethod')` |
| `paymentTerm` | `getValue('paymentTerm')` |
| `validDays` | `getValue('validDays')` |

---

### 2. 保存ダイアログの変更（index.html + app.js）

#### UI変更（index.html）

`tplSaveModal` のフォームに「含める項目」チェックボックスを追加する。

```html
<div class="modal-form-row">
  <label>含める項目</label>
  <div>
    <label>
      <input type="checkbox" id="tplSaveIncludeConditions" checked>
      見積条件（納期・納入条件・支払条件・有効日数）
    </label>
    <label>
      <input type="checkbox" id="tplSaveIncludeRemarks" checked>
      鏡の備考欄
    </label>
  </div>
</div>
```

#### ロジック変更（app.js: `execTemplateSave`）

保存時に、チェック状態に応じてJSONに追加フィールドを含める。

```javascript
const includeConditions = document.getElementById('tplSaveIncludeConditions')?.checked;
const includeRemarks    = document.getElementById('tplSaveIncludeRemarks')?.checked;

const payload = { sections: state.sections };
if (includeConditions) {
  payload.deliveryTerm   = getValue('deliveryTerm')   || '';
  payload.deliveryMethod = getValue('deliveryMethod') || '';
  payload.paymentTerm    = getValue('paymentTerm')    || '';
  payload.validDays      = Number(getValue('validDays')) || 0;
}
if (includeRemarks) {
  payload.remarks = state.remarks || '';
}

const apiData = {
  Name:    name,
  field17: type,
  field21: deptId ? { id: deptId } : undefined,
  JSON:    JSON.stringify(payload),
};
```

---

### 3. 読み込みダイアログの変更

#### 3-1. テンプレート一覧の変更（index.html + app.js）

各テンプレート行に **「▶ 詳細」** トグルボタンを追加する。クリックで展開・折りたたみ。

**展開時に表示する情報：**
- 大項目名と含まれる行数
- 各大項目の品名（先頭3件。超過分は「他○行」と表示）
- 見積条件（テンプレートにフィールドがある場合のみ）
- 備考欄（テンプレートにフィールドがある場合のみ）

**表示例：**
```
○ 温室暖房標準        暖房  名古屋  [▶ 詳細]
  ▼ 展開時 ──────────────────────────────
  【大項目】機器（3行）/ 工事費（5行）
  　・SBM150WLT　1台
  　・温水配管工事一式　1式
  　・（他6行）
  【見積条件】納期：受注後約6週間
  【備考】温室暖房設備一式
```

プレビューはすでにメモリ上にある `state.templateList` のJSONを展開して表示するため、追加のCRM通信は不要。

#### 3-2. 読み込みオプションの変更（index.html + app.js）

読み込み実行前に「復元する項目」チェックボックスを表示する。テンプレートにその項目が含まれない場合はグレーアウト（disabled）する。

```html
<div class="tpl-restore-options">
  <label>
    <input type="checkbox" id="tplRestoreConditions" checked>
    見積条件を復元
  </label>
  <label>
    <input type="checkbox" id="tplRestoreRemarks" checked>
    備考欄を復元
  </label>
</div>
```

選択されたテンプレートが変わるたびに、チェックボックスの `disabled` 状態を更新する。

#### 3-3. 読み込みロジックの変更（app.js: `execTemplateLoad`）

```javascript
const restoreConditions = document.getElementById('tplRestoreConditions')?.checked;
const restoreRemarks    = document.getElementById('tplRestoreRemarks')?.checked;

// sections は既存ロジックで処理（変更なし）

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
```

---

### 4. テンプレート一覧のメモリ変更（app.js: `loadAllTemplates`）

現在の `templateList` はタイトルのみ保持している。プレビュー表示のためにJSONの中身もメモリに保持する。

#### 現在

```javascript
state.templateList = data.filter(r => r.JSON).map(r => ({
  id:       r.id,
  name:     r.Name || '',
  type:     r.field17 || '',
  deptId:   r.field21?.id   || '',
  deptName: r.field21?.name || '',
}));
```

#### 変更後

```javascript
state.templateList = data.filter(r => r.JSON).map(r => {
  let parsed = null;
  try { parsed = JSON.parse(r.JSON); } catch(e) {}
  return {
    id:       r.id,
    name:     r.Name || '',
    type:     r.field17 || '',
    deptId:   r.field21?.id   || '',
    deptName: r.field21?.name || '',
    data:     parsed,  // ← 追加：プレビュー・読み込みに使用
  };
});
```

---

### 5. 変更ファイル一覧

| ファイル | 変更箇所 |
|---|---|
| `mitumori001/app/index.html` | `tplSaveModal`（含める項目チェックボックス追加） |
| `mitumori001/app/index.html` | `tplLoadModal`（復元する項目・詳細ボタン追加） |
| `mitumori001/app/js/app.js` | `loadAllTemplates`（`data`フィールド追加） |
| `mitumori001/app/js/app.js` | `execTemplateSave`（含める項目をJSONに追加） |
| `mitumori001/app/js/app.js` | `execTemplateLoad`（復元する項目の反映） |
| `mitumori001/app/js/app.js` | テンプレート一覧描画（詳細トグル追加） |

**変更しないファイル：**  
`pdf-generator.js` およびその他すべてのファイル

---

### 6. デグレ防止チェックリスト

- [ ] 既存テンプレート（`sections`のみのJSON）が正常に読み込めること
- [ ] 「含める項目」を何もチェックしない場合、従来と同じ動作になること
- [ ] 「復元する項目」チェックボックスが、テンプレートに該当フィールドがない場合にdisabledになること
- [ ] 詳細ボタンを押さなくてもテンプレートの読み込みが正常に機能すること
- [ ] 物販・工事・作業・FRPいずれのモードでも保存・読み込みが動作すること
