/**
 * ネポン 御見積書ウィジェット
 * メインアプリケーションロジック
 *
 * Zoho CRM Quotes モジュール用ウィジェット
 * 自動採番: CQR[連番]-[改訂番号5桁]
 */

const app = (() => {

  // ── 状態 ──────────────────────────────────────────────────────
  // ── 列表示設定 ───────────────────────────────────────────────────
  const COL_DEFS = [
    { col: 'col-name',          label: '品名',      always: true },
    { col: 'col-calc-cat',      label: 'カテゴリ',  def: true  },
    { col: 'col-spec',          label: '型番・規格', def: true  },
    { col: 'col-qty',           label: '数量',      always: true },
    { col: 'col-unit',          label: '単位',      always: true },
    { col: 'col-price',         label: '単価',      def: true  },
    { col: 'col-amount',        label: '金額',      always: true },
    { col: 'col-labor-check',   label: '労務',      def: true  },
    { col: 'col-dairi-rate',    label: '掛率',      def: false },
    { col: 'col-dairi',         label: '代理店価格', def: false },
    { col: 'col-genka',         label: '原価',      def: false },
    { col: 'col-genka-amount',  label: '原価合計',  def: false },
    { col: 'col-gensui-kubun',  label: '減衰区分',  def: false },
    { col: 'col-koji-category', label: '工事カテゴリ', def: false },
    { col: 'col-gensui-a',      label: '減衰A',     def: false },
    { col: 'col-gensui-b',      label: '減衰B',     def: false },
    { col: 'col-houdan',        label: '歩単',      def: false },
    { col: 'col-houkou-kubun',  label: '歩工区分',  def: false },
    { col: 'col-houkou-goukei', label: '歩工合計',  def: false },
    { col: 'col-houkou',        label: '歩工',      def: false },
  ];
  let colState = {};

  function initColVisibility() {
    const saved = localStorage.getItem('nepon_col_visibility');
    if (saved) { try { colState = JSON.parse(saved); } catch(e) {} }
    COL_DEFS.forEach(c => {
      if (c.always) { colState[c.col] = true; return; }
      if (colState[c.col] === undefined) colState[c.col] = c.def !== false;
    });
    applyColVisibility();
  }

  function applyColVisibility() {
    let style = document.getElementById('colVisibilityStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'colVisibilityStyle';
      document.head.appendChild(style);
    }
    style.textContent = COL_DEFS
      .filter(c => !c.always && !colState[c.col])
      .map(c => `.items-table .${c.col} { display: none; }`)
      .join('\n');
  }

  function toggleColDropdown() {
    const dd = document.getElementById('colDropdown');
    if (!dd) return;
    if (dd.style.display !== 'none') { dd.style.display = 'none'; return; }
    dd.innerHTML = COL_DEFS.filter(c => !c.always).map(c => `
      <label class="col-dd-item">
        <input type="checkbox" ${colState[c.col] ? 'checked' : ''}
               onchange="app.setColVisibility('${c.col}', this.checked)">
        ${c.label}
      </label>
    `).join('');
    dd.style.display = 'block';
    setTimeout(() => {
      document.addEventListener('click', function closeDd(e) {
        const wrap = document.querySelector('.col-dropdown-wrap');
        if (!wrap || !wrap.contains(e.target)) {
          dd.style.display = 'none';
          document.removeEventListener('click', closeDd);
        }
      });
    }, 0);
  }

  function setColVisibility(col, visible) {
    colState[col] = visible;
    localStorage.setItem('nepon_col_visibility', JSON.stringify(colState));
    applyColVisibility();
  }

  // ── 見積外工事マスタリスト ──────────────────────────────────────
  const EXCLUSION_MASTER = [
    'ポイラ室建屋工事',
    'ポイラ室の給排水・給排気設備工事',
    'ポイラ付近までの給排水工事',
    '機械室までの給排水工事',
    '膨張タンクへの給水配管工事',
    '燃料設備全ての工事',
    '機器設備全ての工事',
    'LPG燃料設備全ての工事',
    '油タンク設備工事',
    '油配管設備工事',
    '油配管埋設工事',
    '防油堤及びタンク基礎工事',
    '機器関係の基礎工事',
    '放熱配管材料及び取付工事',
    '配管用ピット工事',
    '埋設配管用掘削・埋め戻し工事',
    '道路横断掘小補強工事',
    '掘削時の残土処理',
    '各機器の電源制御配線工事',
    '各機器の電源制御・センサ配線工事',
    '各機器の電源制御線・制御盤取付工事',
    '各機器の制御配線工事',
    '各機器の電源制御線工事',
    '各機器の電源・制御・センサ配線工事',
    '各機器の電源・制御線・制御盤取付工事',
    '各機器の制御線工事',
    '温度制設備工事',
    '温度制御設備工事',
    '電気設備機器及び配線工事',
    'クラウド通信・遠隔制御の月額利用料',
    'クラウド通信の月額利用料',
    '遠隔制御(MC)の月額利用料',
    '遠隔制御(CGC)の月額利用料',
    '溫風暖房設備',
    '温風暖房・炭酸ガス・複合環境設備',
    'ネポンファンの取付金具及び取付工事',
    '機械周り配管工事',
    '温室内配管工事',
    '栽培ベッドへのポリ管敷設工事',
    '温風ポリダクト敷設工事',
    '放熱管敷設工事',
    '放熱管材料及び敷設工事',
    '不整地・沈下によるレール架台調整費用',
    '梱包用残材処理',
    '廃棄物処理費用',
    '作業用電気使用料',
    '作業用仮設工事',
    '躯体の孔明け補修工事',
    '暖房用熱源設備工事',
    '試運転用燃料・電気使用料',
    '試運転用燃料・水・電気使用料',
    '図面作成に関わる一切',
    '消防申請関連の一切',
    '見積記載以外の機器・設備工事',
    '消費税及び地方税',
  ];

  // ── 大項目カテゴリマスタ ──────────────────────────────────────────
  const SECTION_CATEGORIES = [
    { label: '主要項目', items: [
      '温室内暖房設備工事', '温室内配管設備工事', '温室内設備工事',
      '温室内温風暖房設備工事', '温風暖房設備工事',
      '主要機器機材設備工事', '温室空間冷房設備工事',
    ]},
    { label: '機器関連項目', items: [
      '循環扇設備工事', 'CO2施用設備工事', 'グリーンパッケージ設備工事',
      '誰でもヒーポン設備工事', '天窓関連設備機器', '温度制御設備機器',
      '複合環境制御機器', 'アグリネット設備機器', 'アグリネット設備工事',
      'グリーンソーラ及びグリーンソーラ廻り設備工事',
    ]},
    { label: '温水関連項目', items: [
      '配管設備工事', 'ボイラ及びボイラ回り設備工事', 'ボイラ室内設備工事',
      'ボイラ回り設備工事', '機械室内設備工事',
      '地中メイン配管設備工事', 'メイン配管設備工事',
    ]},
    { label: 'その他項目', items: [
      '土壌蒸気殺菌装置', '圃場蒸気殺菌装置', '地中放熱管設備工事',
      'ベット配管設備工事', '養液加温設備工事', '養液冷暖設備工事',
    ]},
    { label: '油・諸経費項目', items: [
      'オイルタンク及びオイル配管設備工事', 'オイルタンク設備工事',
      'オイル配管設備工事', '地下オイルタンク設備工事',
      '消火器・標識設備工事', '諸 経 費',
    ]},
  ];

  // ── 人工単価（固定） ─────────────────────────────────────────────
  const RODO_TANKA = 47500;  // 人工単価（労務費計算用）
  const RODO_GENKA = 29400;  // 人工原価

  // ── 減衰計算係数 ──────────────────────────────────────────────────
  // calcCategory の値に対応する係数 A, b
  // 一般機工（デフォルト）: A=2, b=0.15
  // エロフィン工事: A=1.2, b=0.11
  const GENSUI_DEFAULT  = { A: 2,   b: 0.15 };
  const GENSUI_EROFIN   = { A: 1.2, b: 0.11 };

  function getGensuiParam(calcCategory) {
    if (calcCategory && calcCategory.includes('エロフィン')) return GENSUI_EROFIN;
    return GENSUI_DEFAULT;
  }

  /**
   * 減衰計算
   * calcCategory でグループ化し、各行の houkouGoukei（按分後歩工）を更新。
   * 行の金額は変更しない（金額 = 定価 × 数量）。
   * 戻り値: 全グループの減衰後歩工合計（労務費計算に使用）
   *
   * d = Σ(qty × 歩単)
   * 減衰率 = MIN(1.0, INT(A × (d/b)^(-0.3) × 100 + 0.5) / 100)
   * 歩工合計(total) = INT(d × 減衰率 × 100 + 0.5) / 100
   */
  function calcGensui() {
    const summaryRows = [];
    let totalReducedHoukou = 0;

    // houkouDirect > 0 のアイテム: field16の直接値を使用（減衰計算スキップ）
    state.sections.forEach(sec => {
      sec.items.forEach(item => {
        if ((Number(item.houkouDirect) || 0) <= 0) return;
        item.houkouGoukei = Number(item.houkouDirect);
        totalReducedHoukou += item.houkouGoukei;
      });
    });

    // houdan > 0 かつ houkouDirect <= 0 のアイテムを減衰区分（gensuiKubun）でグループ化
    // gensuiKubun 未設定の場合は calcCategory にフォールバック（後方互換）
    const groups = {};
    state.sections.forEach(sec => {
      sec.items.forEach(item => {
        if ((Number(item.houdan) || 0) <= 0) return;
        if ((Number(item.houkouDirect) || 0) > 0) return; // 直接値アイテムはスキップ
        const key = item.gensuiKubun || item.calcCategory || '_default';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });
    });

    Object.values(groups).forEach(items => {
      // d = 累計歩工（Σ qty × 歩単）
      const d = items.reduce((sum, it) =>
        sum + (Number(it.qty) || 1) * (Number(it.houdan) || 0), 0);
      if (d <= 0) return;

      let rate;
      if (!state.gensuiEnabled) {
        rate = 1.0; // 減衰計算オフ: 減衰なし
      } else {
        // アイテムに gensuiA/gensuiB が設定されていればそれを使用、なければ従来係数にフォールバック
        const fallback = getGensuiParam(items[0].calcCategory);
        const A = (items[0].gensuiA > 0) ? items[0].gensuiA : fallback.A;
        const b = (items[0].gensuiB > 0) ? items[0].gensuiB : fallback.b;
        // 減衰率 = MIN(1.0, INT(A × (d/b)^(-0.3) × 100 + 0.5) / 100)
        rate = Math.min(1.0,
          Math.floor(A * Math.pow(d / b, -0.3) * 100 + 0.5) / 100);
      }

      // 歩工合計（グループ全体）= INT(d × 減衰率 × 100 + 0.5) / 100
      const houkouTotal = Math.floor(d * rate * 100 + 0.5) / 100;
      totalReducedHoukou += houkouTotal;

      summaryRows.push({
        category: items[0].kojiCategory || items[0].calcCategory || items[0].gensuiKubun || '（未分類）',
        d, rate,
        before: Math.round(d * 100) / 100,
        after:  houkouTotal,
        saving: 0,
      });

      // 各行の houkouGoukei を按分して更新（行の金額は変えない）
      items.forEach(item => {
        const itemD = (Number(item.qty) || 1) * (Number(item.houdan) || 0);
        item.houkouGoukei = Math.floor(houkouTotal * (itemD / d) * 100 + 0.5) / 100;
      });
    });

    // サマリーテーブルを更新
    const summaryEl = document.getElementById('gensuiSummary');
    const tbody     = document.getElementById('gensuiSummaryBody');
    if (summaryEl && tbody) {
      if (summaryRows.length === 0) {
        summaryEl.style.display = 'none';
      } else {
        summaryEl.style.display = '';
        tbody.innerHTML = summaryRows.map(r => `
          <tr>
            <td>${r.category}</td>
            <td>${r.d.toFixed(2)}</td>
            <td class="${r.rate < 1.0 ? 'gensui-rate-reduced' : 'gensui-rate-full'}">${r.rate.toFixed(2)}</td>
            <td>${r.before.toFixed(2)}</td>
            <td>${r.after.toFixed(2)}</td>
          </tr>
        `).join('');
      }
    }

    return totalReducedHoukou;
  }

  /**
   * セクション内の④工事費単価を再計算する
   * ④工事費〜④工事費の間にある houdan > 0 の行を対象に減衰計算し
   * unitPrice / genka / amount を更新する
   */
  function recalcKoujihiInSection(section) {
    let group = [];

    section.items.forEach(item => {
      if (item.calcCategory === '④工事費') {
        if (group.length > 0) {
          // houkouDirect > 0 の行はその値を直接使用
          const directTotal = group
            .filter(i => (Number(i.houkouDirect) || 0) > 0)
            .reduce((sum, i) => sum + Number(i.houkouDirect), 0);

          // 減衰計算対象行を算出（④工事費自身にgensuiA/Bがあれば全体に適用、なければ各行のA/Bでサブグループ計算）
          const calcGroup = group.filter(i => (Number(i.houkouDirect) || 0) <= 0);
          let calcTotal = 0;
          if (calcGroup.length > 0) {
            if (item.gensuiA > 0 && item.gensuiB > 0) {
              // ④工事費行に減衰区分が設定されている場合、そのA/Bをグループ全体に適用
              const d = calcGroup.reduce((sum, i) =>
                sum + (Number(i.qty) || 1) * (Number(i.houdan) || 0), 0);
              if (d > 0) {
                const rate = state.gensuiEnabled
                  ? Math.min(1.0, Math.floor(item.gensuiA * Math.pow(d / item.gensuiB, -0.3) * 100 + 0.5) / 100)
                  : 1.0;
                calcTotal = Math.floor(d * rate * 100 + 0.5) / 100;
              }
            } else {
              // 各行のgensuiKubun/A/Bでサブグループ化して個別計算
              const subGroups = {};
              calcGroup.forEach(i => {
                const key = i.gensuiKubun || i.calcCategory || '_default';
                if (!subGroups[key]) subGroups[key] = [];
                subGroups[key].push(i);
              });
              Object.values(subGroups).forEach(subItems => {
                const d = subItems.reduce((sum, i) =>
                  sum + (Number(i.qty) || 1) * (Number(i.houdan) || 0), 0);
                if (d <= 0) return;
                const fallback = getGensuiParam(subItems[0].calcCategory);
                const A = (subItems[0].gensuiA > 0) ? subItems[0].gensuiA : fallback.A;
                const b = (subItems[0].gensuiB > 0) ? subItems[0].gensuiB : fallback.b;
                const rate = state.gensuiEnabled
                  ? Math.min(1.0, Math.floor(A * Math.pow(d / b, -0.3) * 100 + 0.5) / 100)
                  : 1.0;
                calcTotal += Math.floor(d * rate * 100 + 0.5) / 100;
              });
            }
          }
          const houkouTotal = Math.floor((directTotal + calcTotal) * 100 + 0.5) / 100;
          if (houkouTotal > 0) {
            item.unitPrice    = Math.round(RODO_TANKA * houkouTotal / 1000) * 1000;
            item.genka        = Math.round(RODO_GENKA  * houkouTotal / 1000) * 1000;
            item.amount       = item.unitPrice * (Number(item.qty) || 1);
            item.houkouGoukei = houkouTotal;
            item.houkouDirect = houkouTotal; // calcGensui が上書きしないよう同期
          }
        }
        group = [];
      } else if ((Number(item.houdan) || 0) > 0) {
        group.push(item);
      }
    });
  }

  /** カテゴリ名からカテゴリを逆引き */
  function findSectionCategory(name) {
    for (const cat of SECTION_CATEGORIES) {
      if (cat.items.includes(name)) return cat.label;
    }
    return '';
  }

  /** カテゴリ選択セレクトの選択肢を構築 */
  function buildCategorySelect(catSel) {
    catSel.innerHTML = '<option value="">― カテゴリ ―</option>';
    SECTION_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.label;
      opt.textContent = cat.label;
      catSel.appendChild(opt);
    });
  }

  /**
   * カテゴリに応じた datalist を生成し input の list 属性に紐づける
   * カテゴリ未選択時は全件表示
   */
  function updateNameDatalist(catSel, nameInput) {
    const block   = nameInput.closest('.section-block');
    const nameSel = block?.querySelector('.section-name-select');
    const cat     = SECTION_CATEGORIES.find(c => c.label === catSel.value);

    // section-name-select は常に非表示（datalist 方式に統一）
    if (nameSel) nameSel.style.display = 'none';
    nameInput.style.display = '';

    // datalist を生成して候補を提供（自由入力は常に可能）
    const listId = nameInput.id ? `dl-${nameInput.id}` : `dl-${Math.random().toString(36).slice(2)}`;
    let dl = document.getElementById(listId);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = listId;
      nameInput.parentNode.appendChild(dl);
      nameInput.setAttribute('list', listId);
    }
    const items = cat ? cat.items : SECTION_CATEGORIES.flatMap(c => c.items);
    dl.innerHTML = items.map(n => `<option value="${n}">`).join('');
  }

  let state = {
    quoteId:      null,   // ZohoCRM の Quote レコードID
    quoteNumber:  null,   // Zoho自動採番 Quote_Number (整数)
    seqNo:        '',     // 見積番号（フル形式: CD-32-32-80-0001-0001）
    revision:     1,      // 改訂番号（後方互換用）
    koujiCategory:  '',   // 工事カテゴリ (CD/CE/CK/CP/CQ/CQX)
    createDeptCode: '',   // 作成所課コード
    createDeptName: '',   // 作成所課名
    siteDeptCode:   '',   // 現場所課コード
    siteDeptName:   '',   // 現場所課名
    kikaShita:      '80', // 期下二桁
    seqNumber:      0,    // 連番（整数）
    edaban:         '01',   // 枝番（2桁）
    customerName:   '',
    projectName:    '',
    projectName2:   '',  // 件名2行目（field8）
    projectName3:   '',  // 件名3行目（field7）
    ownerName:      '',
    quoteCategory:  '',  // 見積区分（field63）: 物販 / 作業（100万以下） / 工事（100万超）
    date:         new Date(),
    submitDate:   null,  // 見積提出日（field64）
    deliveryTerm:   'お打ち合わせ願います',
    deliveryMethod: 'お打ち合わせ願います',
    paymentTerm:    'お打ち合わせ願います',
    validDays:      '見積期限は60日限りです。期限後のご用命の節は一応ご照会願います。',
    remarks:        '',
    discount:       0,
    deliveryPrice:  0,
    laborCost:      null,   // null = 自動計算
    anzenCost:      0,      // 安全衛生経費（手動入力）
    legalWelfareRate: 14.6,
    mainRate:        null,  // 代理店掛率（main_rate）
    itemRate:        null,  // 製品掛率（item_rate）
    partsRate:       null,  // 部品掛率（parts_rate）
    purchaseRate:    null,  // 仕入れ品掛率（purchase_rate）
    currentUserId:   null,  // ログイン中のZohoユーザーID
    currentUserName: '',
    branchKey:    'honbu',
    exclusions:   [],       // 見積外工事（選択・編集済み）
    sections:     [],       // { id, no, name, items[] }
    nextSectionId: 1,
    nextItemId:    1,
    products:       [],       // 商品マスタ（Zoho Products から取得）
    koujihi:        [],       // 工事費マスタ（CustomModule1 から取得）
    kanzai:         [],       // 管材マスタ（CustomModule18 から取得）
    denzai:         [],       // 電材マスタ（CustomModule19 から取得）
    pendingKanzai:  null,     // 管材選択済み・追加待ち
    pendingDenzai:  null,     // 電材選択済み・追加待ち
    searchResults:  [],       // 直近の検索結果（クリック時に参照）
    pendingProduct:  null,     // 検索で選択済み・追加待ちの商品
    savedJson:       null,     // CRM に保存済みの見積JSON
    subformRowIds:   [],       // 前回保存時の LinkingModule1 行ID（重複防止用）
    templateDepts:   [],       // 所課マスタ（DepartmentsList）
    templateList:    [],       // 所課別商品マスタ（CustomModule8）
    selectedTemplateId: null,  // 読み込みモーダルで選択中のテンプレートID
    shoka:           '',       // Quotes.field15（所課）の名前
    frpMode:     false,   // FRPモードフラグ
    frpAB:       'A',     // 'A' or 'B'
    frpItems:    [],      // FRP行リスト
    nextFrpId:   1,       // FRP行ID連番
    gensuiEnabled: false, // 減衰計算オン/オフ
  };

  let zohoReady = false;

  // ── 初期化 ────────────────────────────────────────────────────

  function init() {
    initColVisibility();

    // 今日の日付をセット
    const today = new Date();
    document.getElementById('quoteDate').value = formatDateInput(today);

    // イベント: 数量・単価 → 金額 自動計算
    document.getElementById('sectionsContainer').addEventListener('input', onItemInput);
    document.getElementById('sectionsContainer').addEventListener('change', onItemInput);

    // イベント: 値引き額・労務費・法定福利費率 変更 → 即時再計算
    document.getElementById('discountAmount').addEventListener('input', updateOutput);
    document.getElementById('laborCost').addEventListener('input', updateOutput);
    document.getElementById('anzenCost').addEventListener('input', updateOutput);
    document.getElementById('legalWelfareRate').addEventListener('input', updateOutput);

    document.addEventListener('click', e => {
      if (!e.target.closest('.product-search-group')) {
        ['productDropdown', 'kanzaiDropdown', 'denzaiDropdown'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });
      }
    });

    // 見積外工事チェックリスト構築
    buildExclusionUI();

    // FRP検索入力イベント
    const frpInput = document.getElementById('frpSearchInput');
    if (frpInput) {
      let frpSearchTimer;
      frpInput.addEventListener('input', () => {
        clearTimeout(frpSearchTimer);
        frpSearchTimer = setTimeout(() => searchFrp(frpInput.value.trim()), 300);
      });
      frpInput.addEventListener('blur', () => {
        setTimeout(hideFrpDropdown, 200);
      });
    }

    // フォント初期化
    initFont();

    // Zoho SDK 初期化
    ZOHO.embeddedApp.on('PageLoad', async (data) => {
      zohoReady = true;
      // ウィジェットポップアップサイズを 1200×800 に設定
      try { ZOHO.CRM.UI.Resize({ height: '800', width: '1200' }); } catch (_) {}
      try {
        await loadFromCRM(data);
      } catch (e) {
        console.error('CRM読み込みエラー:', e);
        showToast('CRMデータの読み込みに失敗しました', 'warn');
      } finally {
        hideLoading();
      }
    });
    ZOHO.embeddedApp.init();

    // Zoho SDK が5秒以内に応答しない場合はローディングを解除
    setTimeout(() => {
      if (!zohoReady) {
        hideLoading();
        showToast('Zoho SDK タイムアウト - デモモードで起動します', 'warn');
        loadDemoData();
      }
    }, 5000);
  }

  // ── フォント初期化 ────────────────────────────────────────────

  async function initFont() {
    const el = document.getElementById('fontStatus');
    el.textContent = '⏳ 日本語フォント読み込み中... (初回は数秒かかります)';
    el.className = 'font-status';

    const ok = await QuotationPDF.init();
    if (ok) {
      el.textContent = '✅ フォント読み込み完了 - PDF生成可能です';
      el.className = 'font-status ok';
      document.getElementById('btnGeneratePDF').disabled = false;
    } else {
      el.innerHTML = '⚠️ フォント読み込み失敗 - <a href="https://fonts.google.com/noto/specimen/Noto+Sans+JP" target="_blank">NotoSansJP-Regular.ttf</a> を widget/fonts/ に配置してください';
      el.className = 'font-status err';
      // フォントなしでも生成を許可（英数字は表示される）
      document.getElementById('btnGeneratePDF').disabled = false;
    }
  }

  // ── Zoho CRM データ読み込み ───────────────────────────────────

  async function loadFromCRM(pageData) {
    const entityId = pageData?.EntityId;
    if (!entityId) { loadDemoData(); return; }

    // EntityId は配列で返ることがある → 最初の要素を文字列として取得
    state.quoteId = Array.isArray(entityId) ? String(entityId[0]) : String(entityId);

    // Quote レコード取得
    const res = await ZOHO.CRM.API.getRecord({ Entity: 'Quotes', RecordID: entityId });
    const quote = res?.data?.[0];
    if (!quote) { loadDemoData(); return; }


    // 基本情報
    state.quoteNumber     = quote.Quote_Number || null;
    state.customerName    = quote.Account_Name?.name || quote.Account_Name || '';
    state.projectName     = quote.Subject || '';
    state.ownerName       = quote.Owner?.name || '';
    state.quoteCategory   = quote.field63 || '';
    state.shoka           = quote.field15?.name || (typeof quote.field15 === 'string' ? quote.field15 : '') || '';
    state.deliveryPrice = Number(quote.Grand_Total) || 0;

    // カスタムフィールドから読み込み
    state.seqNo    = quote.field55 || '';
    state.revision = Number(quote.field56) || 1;
    // 採番コンポーネントを seqNo から復元（形式: CD-32-32-80-0001-0001）
    if (state.seqNo && state.seqNo.includes('-')) {
      const parts = state.seqNo.split('-');
      if (parts.length >= 6) {
        state.koujiCategory  = parts[0];
        state.createDeptCode = parts[1];
        state.siteDeptCode   = parts[2];
        state.kikaShita      = parts[3];
        state.seqNumber      = Number(parts[4]) || 0;
        state.edaban         = String(parts[5] || '01').slice(-2).padStart(2, '0');
      }
    }
    state.deliveryTerm   = quote.field6  || state.deliveryTerm;
    state.deliveryMethod = quote.field51 || state.deliveryMethod;
    state.paymentTerm    = quote.field57 || state.paymentTerm;
    state.validDays      = quote.field58 || state.validDays;
    state.remarks        = quote.field59 || '';
    state.discount       = Number(quote.field61) || 0;  // 値引き額
    state.submitDate     = quote.field64 ? new Date(quote.field64) : null; // 見積提出日
    state.projectName2   = quote.field8  || '';  // 件名2行目
    state.projectName3   = quote.field7  || '';  // 件名3行目
    state.mainRate    = quote.main_rate    != null ? Number(quote.main_rate)    : null;
    state.itemRate    = quote.item_rate    != null ? Number(quote.item_rate)    : null;
    state.partsRate   = quote.parts_rate   != null ? Number(quote.parts_rate)   : null;
    state.purchaseRate = quote.purchase_rate != null ? Number(quote.purchase_rate) : null;

    // JSON カスタムフィールドから復元（セクション構造・全明細）
    const savedJson = quote.JSON || '';
    if (savedJson) {
      try {
        const parsed = JSON.parse(savedJson);
        state.sections      = parsed.sections     || [];
        state.deliveryPrice = parsed.deliveryPrice || state.deliveryPrice;
        state.laborCost     = parsed.laborCost     || null;
        state.anzenCost     = parsed.anzenCost     || 0;
        state.exclusions    = parsed.exclusions    || [];
        state.remarks       = parsed.remarks        || state.remarks;
        state.discount      = parsed.discount       || state.discount;
        // JSONに保存済みのサブフォーム行IDを復元（保存時に③で書き直している）
        if (parsed.subformRowIds?.length) {
          state.subformRowIds = parsed.subformRowIds;
          console.log('【サブフォームID復元】 JSON:', state.subformRowIds.length, '件', state.subformRowIds);
        }
        // FRPモード復元
        if (parsed.frpMode) {
          state.frpMode    = true;
          state.frpAB      = parsed.frpAB || 'A';
          state.frpItems   = parsed.frpItems || [];
          state.nextFrpId  = state.frpItems.length > 0
            ? Math.max(...state.frpItems.map(i => i.id || 0)) + 1
            : 1;
        }
        renumberSections();
        // ID重複を防ぐため nextId をロード済み最大値+1 に更新
        const maxSecId  = Math.max(0, ...state.sections.map(s => s.id || 0));
        const maxItemId = Math.max(0, ...state.sections.flatMap(s => (s.items || []).map(i => i.id || 0)));
        state.nextSectionId = maxSecId  + 1;
        state.nextItemId    = maxItemId + 1;
      } catch (e) { console.warn('見積JSON解析失敗:', e); }
    }

    // 所課マスタを先取得（営業所セレクト構築に必要）
    await loadDepartments();

    // フォームに反映
    applyStateToForm();

    // その他マスタを取得（並列）
    loadProducts();
    loadKoujihi();
    loadKanzai();
    loadDenzai();
    loadCurrentUser();

    showToast('CRMデータを読み込みました');
  }

  /** デモデータ（SDK未接続時） */
  function loadDemoData() {
    state.customerName  = '株式会社大仙';
    state.projectName   = '某300坪温室暖房設備工事';
    state.ownerName     = '池田';
    state.seqNo         = '166';
    state.revision      = 1;
    state.deliveryPrice = 2480000;
    state.laborCost     = 280366;

    applyStateToForm();
    showToast('デモデータで起動しました（Zoho未接続）', 'warn');
  }

  /** 状態をフォームへ反映 */
  function applyStateToForm() {
    setValue('customerName',    state.customerName);
    setValue('projectName',     state.projectName);
    setValue('projectName2',    state.projectName2);
    setValue('projectName3',    state.projectName3);
    // 件名2・3行目の表示切り替え
    const pn2Row = document.getElementById('projectName2Row');
    const pn3Row = document.getElementById('projectName3Row');
    if (pn2Row) pn2Row.style.display = state.projectName2 ? '' : 'none';
    if (pn3Row) pn3Row.style.display = state.projectName3 ? '' : 'none';
    // 見積提出日
    if (state.submitDate) {
      setValue('quoteDate', formatDateInput(state.submitDate));
    }
    setValue('ownerName',       state.ownerName);
    // 掛率パネルを更新（input に値をセット）
    const setRateEl = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v != null ? v : '';
    };
    setRateEl('rateMain',     state.mainRate);
    setRateEl('rateItem',     state.itemRate);
    setRateEl('rateParts',    state.partsRate);
    setRateEl('ratePurchase', state.purchaseRate);
    // 見積区分表示
    const catEl = document.getElementById('quoteCategoryDisplay');
    if (catEl) catEl.textContent = state.quoteCategory || '―';
    // 値引き額ラベル切り替え（工事を含む場合→出精値引き）
    const isKouji = (state.quoteCategory || '').includes('工事');
    const discountLabelEl = document.getElementById('discountLabel');
    if (discountLabelEl) {
      discountLabelEl.textContent = isKouji ? '出精値引き' : '値引き額';
    }
    // 明細印刷オプション: 工事以外（物販・作業）のとき表示
    const printDetailOption = document.getElementById('printDetailOption');
    if (printDetailOption) {
      printDetailOption.style.display = isKouji ? 'none' : '';
    }
    // 内訳印刷オプション: 工事・作業のとき表示、物販は非表示
    const isBuhan = (state.quoteCategory || '').includes('物販');
    const isSagyo = (state.quoteCategory || '').includes('作業');
    const naiyakuGrp = document.getElementById('naiyakuPrintGroup');
    if (naiyakuGrp) naiyakuGrp.style.display = (isKouji || isSagyo) ? '' : 'none';
    // 採番コンポーネントをフォームに反映
    const koujiCatEl = document.getElementById('koujiCategory');
    if (koujiCatEl) koujiCatEl.value = state.koujiCategory || '';
    const createDeptEl = document.getElementById('createDept');
    if (createDeptEl && state.createDeptCode) createDeptEl.value = state.createDeptCode;
    const siteDeptEl = document.getElementById('siteDept');
    if (siteDeptEl && state.siteDeptCode) siteDeptEl.value = state.siteDeptCode;
    const kikaShitaEl = document.getElementById('kikaShita');
    if (kikaShitaEl) kikaShitaEl.value = state.kikaShita || '80';
    const edabanEl = document.getElementById('edaban');
    if (edabanEl) edabanEl.value = state.edaban || '01';
    updateQuoteNoBadge();
    setValue('discountAmount',  state.discount || '');
    setValue('laborCost',       state.laborCost || '');
    setValue('anzenCost',       state.anzenCost || '');
    setValue('legalWelfareRate',state.legalWelfareRate);
    setValue('deliveryTerm',    state.deliveryTerm);
    setValue('deliveryMethod',  state.deliveryMethod);
    setValue('paymentTerm',     state.paymentTerm);
    setValue('validDays',       state.validDays);
    setValue('remarks',         state.remarks);

    // 営業所設定: 工事→営業サービス本部固定、物販・作業→所課（field15）を使用
    const branchSel = document.getElementById('branchSelect');
    const branchCustom = document.getElementById('branchCustomInput');
    if (!isKouji && state.shoka) {
      const matchedDept = state.templateDepts.find(d => d.name === state.shoka);
      if (matchedDept) {
        if (branchSel) branchSel.value = `crm_${matchedDept.id}`;
        setValue('branchName',    matchedDept.name);
        setValue('branchPostal',  matchedDept.postal);
        setValue('branchAddress', matchedDept.address);
        setValue('branchTel',     matchedDept.tel);
        setValue('branchFax',     matchedDept.fax);
        if (branchCustom) branchCustom.style.display = '';
      } else {
        if (branchSel) branchSel.value = 'other';
        setValue('branchName', state.shoka);
        if (branchCustom) branchCustom.style.display = '';
      }
    } else {
      if (branchSel) branchSel.value = 'honbu';
      if (branchCustom) branchCustom.style.display = 'none';
    }

    applyExclusionsToForm();
    updateQuoteNoBadge();
    renderSections();
    updateOutput();
    // FRPモードUI適用
    if (state.frpMode) {
      applyFrpModeUI();
      renderFrpItems();
      updateFrpTotals();
    }
  }

  // ── 見積外工事 ────────────────────────────────────────────────

  /** チェックリストUIを構築（init時に1回呼ぶ） */
  // ── 見積外工事 プリセット ────────────────────────────────────

  const EXCLUSION_PRESETS = {
    mizukei: [
      'ポイラ室建屋工事',
      'ポイラ室の給排水・給排気設備工事',
      'ポイラ付近までの給排水工事',
      '防油堤及びタンク基礎工事',
      '機器関係の基礎工事',
      '埋設配管用掘削・埋め戻し工事',
      '各機器の電源制御線・制御盤取付工事',
      '廃棄物処理費用',
      '作業用電気使用料',
      '試運転用燃料・水・電気使用料',
      '見積記載以外の機器・設備工事',
    ],
    fuukei: [
      '防油堤及びタンク基礎工事',
      '機器関係の基礎工事',
      '各機器の制御配線工事',
      '各機器の電源・制御線・制御盤取付工事',
      '温風ポリダクト敷設工事',
      '廃棄物処理費用',
      '作業用電気使用料',
      '躯体の孔明け補修工事',
      '試運転用燃料・電気使用料',
      '消防申請関連の一切',
      '見積記載以外の機器・設備工事',
      '消費税及び地方税',
    ],
  };

  /**
   * プリセットを適用する
   * @param {'mizukei'|'fuukei'|'general'} preset
   */
  function applyExclusionPreset(preset) {
    // 全チェック解除
    document.querySelectorAll('.excl-check:checked').forEach(c => {
      c.checked = false;
      const editEl = document.querySelector(`.excl-edit[data-index="${c.dataset.index}"]`);
      if (editEl) editEl.style.display = 'none';
    });

    if (preset === 'general') {
      // 一般: 全解除のまま（全項目から自由選択）
      updateExclusionCount();
      showToast('全項目から選択できます');
      return;
    }

    const targets = EXCLUSION_PRESETS[preset] || [];

    // EXCLUSION_MASTERの各項目を前方一致またはユニコード正規化で照合
    targets.forEach(target => {
      const normTarget = target.replace(/[ﾎﾞ]/g, '').toLowerCase();
      const idx = EXCLUSION_MASTER.findIndex(m => {
        const normM = m.replace(/[ﾎﾞ]/g, '').toLowerCase();
        return normM === normTarget ||
               m.includes(target.slice(0, 6)) ||
               target.includes(m.slice(0, 6));
      });
      if (idx !== -1) {
        const cb = document.querySelector(`.excl-check[data-index="${idx}"]`);
        if (cb && !cb.checked) {
          cb.checked = true;
          const editEl = document.querySelector(`.excl-edit[data-index="${idx}"]`);
          if (editEl) editEl.style.display = 'block';
        }
      }
    });

    updateExclusionCount();
    const label = preset === 'mizukei' ? '水系1軍' : '風系1軍';
    showToast(`${label} のプリセットを適用しました`);
  }

  function buildExclusionUI() {
    const container = document.getElementById('exclusionList');
    if (!container) return;
    container.innerHTML = EXCLUSION_MASTER.map((item, i) => `
      <div class="excl-row" id="excl-row-${i}">
        <label class="excl-label">
          <input type="checkbox" class="excl-check" data-index="${i}"
                 onchange="app.onExclusionChange(this)">
          <span class="excl-text">${item}</span>
        </label>
        <input type="text" class="excl-edit" data-index="${i}"
               value="${item}" style="display:none"
               oninput="app.updateExclusionCount()">
      </div>
    `).join('');
    updateExclusionCount();
  }

  /** チェック状態変更 */
  function onExclusionChange(cb) {
    const i = cb.dataset.index;
    const editEl = document.querySelector(`.excl-edit[data-index="${i}"]`);
    if (editEl) editEl.style.display = cb.checked ? 'block' : 'none';
    updateExclusionCount();
  }

  /** カウンター更新・15件超でuncheckedを無効化 */
  function updateExclusionCount() {
    const checks = document.querySelectorAll('.excl-check');
    const checked = [...checks].filter(c => c.checked).length;
    const countEl = document.getElementById('exclusionCount');
    if (countEl) {
      countEl.textContent = `${checked}/15`;
      countEl.className = 'exclusion-count' + (checked >= 15 ? ' over' : '');
    }
    const limit = checked >= 15;
    checks.forEach(c => { if (!c.checked) c.disabled = limit; });
  }

  /** DOM から state.exclusions を収集 */
  function collectExclusions() {
    const result = [];
    document.querySelectorAll('.excl-check:checked').forEach(cb => {
      const i = cb.dataset.index;
      const editEl = document.querySelector(`.excl-edit[data-index="${i}"]`);
      result.push(editEl ? (editEl.value.trim() || EXCLUSION_MASTER[i]) : EXCLUSION_MASTER[i]);
    });
    state.exclusions = result;
  }

  /** state.exclusions をフォームのチェック状態に反映 */
  function applyExclusionsToForm() {
    if (!state.exclusions || state.exclusions.length === 0) return;
    // まず全チェック解除
    document.querySelectorAll('.excl-check').forEach(cb => {
      cb.checked = false;
      const editEl = document.querySelector(`.excl-edit[data-index="${cb.dataset.index}"]`);
      if (editEl) editEl.style.display = 'none';
    });
    state.exclusions.forEach(text => {
      // マスタから最も近いindexを探す（完全一致 → 前方一致 → 0番目）
      let idx = EXCLUSION_MASTER.indexOf(text);
      if (idx === -1) idx = EXCLUSION_MASTER.findIndex(m => text.startsWith(m.slice(0, 5)));
      if (idx === -1) {
        // マスタにない文字列 → 最初の未使用行に追加
        const freeCheck = document.querySelector('.excl-check:not(:checked)');
        if (freeCheck) {
          idx = Number(freeCheck.dataset.index);
        }
      }
      if (idx >= 0) {
        const cb = document.querySelector(`.excl-check[data-index="${idx}"]`);
        const editEl = document.querySelector(`.excl-edit[data-index="${idx}"]`);
        if (cb) { cb.checked = true; }
        if (editEl) { editEl.value = text; editEl.style.display = 'block'; }
      }
    });
    updateExclusionCount();
  }

  // ── 全件ページネーション取得 ──────────────────────────────────

  async function fetchAllRecords(entity, sortBy) {
    const all = [];
    let page = 1;
    while (true) {
      const res = await ZOHO.CRM.API.getAllRecords({
        Entity:   entity,
        sort_by:  sortBy,
        per_page: 200,
        page:     page,
      });
      const data = res?.data || [];
      all.push(...data);
      // more_records が false または取得数が 200 未満なら終了
      if (!res?.info?.more_records || data.length < 200) break;
      page++;
      if (page > 50) break;   // 最大 10,000 件で安全打ち切り
    }
    return all;
  }

  // ── 商品マスタ（Zoho Products）────────────────────────────────
  // 件数が多いため起動時全件読み込みは行わず、入力時にAPIで都度検索する

  function loadProducts() {
    state.products = []; // 互換性のため空配列を保持
  }

  // デバウンス用タイマー
  let _productSearchTimer = null;

  /** 商品検索（入力のたびに Zoho API を叩く。400ms デバウンス付き） */
  function searchProducts(query) {
    const dd = document.getElementById('productDropdown');
    clearTimeout(_productSearchTimer);
    if (!query || query.length < 2) { dd.style.display = 'none'; return; }
    dd.innerHTML = '<div style="padding:8px 12px;color:#888;font-size:12px;">検索中...</div>';
    dd.style.display = 'block';
    _productSearchTimer = setTimeout(() => _execProductSearch(query), 400);
  }

  async function _execProductSearch(query) {
    const dd = document.getElementById('productDropdown');
    try {
      let products = [];
      if (zohoReady) {
        const q = query.trim();
        if (!q) { dd.style.display = 'none'; return; }
        // word 検索: モジュールの全テキストフィールド（Product_Name・Product_Code・field2 等）を横断検索
        const res = await ZOHO.CRM.API.searchRecord({
          Entity: 'Products', Type: 'word',
          Query: q, page: 1, per_page: 25,
        });
        products = (res?.data || []).map(p => ({
          id:     p.id,
          name:   p.Product_Name  || '',
          code:   p.Product_Code  || '',
          model:  p.field2        || '',
          price:  Number(p.Unit_Price) || 0,
          cost:   Number(p.field1)      || 0,  // 標準原価（field1）
          source: 'product',
        }));
      }
      if (products.length === 0) { dd.style.display = 'none'; return; }
      state.searchResults = products;
      dd.innerHTML = products.map((item, idx) => `
        <div class="product-item" data-idx="${idx}">
          <div style="flex:1;min-width:0">
            <div class="p-name"><span class="p-badge product">商品</span>${escHtml(item.name)}</div>
            <div class="p-code">${escHtml([item.model, item.code].filter(Boolean).join(' / '))}</div>
          </div>
          <div class="p-price">¥${item.price.toLocaleString('ja-JP')}</div>
        </div>`).join('');
      dd.querySelectorAll('.product-item').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          const product = state.searchResults[Number(el.dataset.idx)];
          if (product) selectProduct(product);
        });
      });
      dd.style.display = 'block';
    } catch (e) {
      console.error('商品検索エラー:', e);
      dd.style.display = 'none';
    }
  }

  // ── 工事費マスタ（CustomModule1）────────────────────────────────

  async function loadKoujihi() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule1', 'Name');
      state.koujihi = data.map(k => ({
        id:           k.id,
        name:         k.Name    || '',
        code:         k.field11 || '',   // 商品コード
        model:        k.field5  || '',   // 型式
        price:        Number(k.field6)  || 0,     // 工単価
        cost:         Number(k.field7)  || 0,     // 工原価
        category:     k.field8  || '',
        unit:         k.field9  || '式',
        order:        Number(k.field12) || 9999,  // 順番（型式内表示順）
        calcCategory: k.field13 || '',            // 算出カテゴリ
        qty:          Number(k.field4)  || 1,             // 数量
        houdan:       parseFloat(k.field14) || 0,   // 歩単（小数型）
        houkouKubun:  k.field15 || '',            // 歩工区分
        houkouDirect: parseFloat(k.field16) || 0, // 直接歩工値
        gensuiKubun:  k.field17 || '',            // 減衰区分（1〜8）
        gensuiA:      parseFloat(k.A)  || 0,      // 減衰係数A
        gensuiB:      parseFloat(k.B)  || 0,      // 減衰係数B
        kojiCategory: k.field18 || '',            // 工事カテゴリー名
        source:       'koujihi',
      }));
      console.log(`工事費マスタ ${state.koujihi.length} 件読み込み`);
      buildStandardModelSelect();
    } catch (e) {
      console.warn('工事費マスタ取得失敗:', e);
    }
  }

  // ── 管材マスタ（CustomModule18）────────────────────────────────

  async function loadKanzai() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule18', 'Name');
      state.kanzai = data.map(r => ({
        id:     r.id,
        name:   r.Name    || '',
        model:  r.field2  || '',   // 型式
        unit:   r.field   || '個', // 単位
        price:  Number(r.field1) || 0,  // 価格
        cost:   Number(r.field3) || 0,  // 原価
        houdan: parseFloat(r.field4) || 0, // 歩単
        code:   r.field5  || '',   // 品番
        source: 'kanzai',
      }));
      console.log(`管材マスタ ${state.kanzai.length} 件読み込み`);
    } catch (e) {
      console.warn('管材マスタ取得失敗:', e);
    }
  }

  // ── 電材マスタ（CustomModule19）────────────────────────────────

  async function loadDenzai() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule19', 'Name');
      state.denzai = data.map(r => ({
        id:     r.id,
        name:   r.Name    || '',
        model:  r.field1  || '',   // 型式
        unit:   r.field3  || '個', // 単位
        price:  Number(r.field) || 0,   // 価格
        cost:   Number(r.field2) || 0,  // 原価
        houdan: parseFloat(r.field4) || 0, // 歩単
        note:   r.field5  || '',   // 備考
        source: 'denzai',
      }));
      console.log(`電材マスタ ${state.denzai.length} 件読み込み`);
    } catch (e) {
      console.warn('電材マスタ取得失敗:', e);
    }
  }

  /** 全角→半角正規化（英数字・記号・スペース除去） */
  function normalize(s) {
    return String(s || '')
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[－ー‐−]/g, '-')
      .replace(/　/g, ' ')
      .toLowerCase();
  }

  /** 工事費1件をセクションに追加する共通処理 */
  function addKoujihiItem(section, k) {
    const item = createItem();
    item.productId    = null;
    item.name         = k.name;
    item.spec         = k.model || '';
    item.qty          = k.qty   || 1;
    item.unit         = k.unit  || '式';
    item.kouTanka     = k.price || 0;  // 工事商品単価を保存
    item.unitPrice    = k.price || 0;
    item.amount       = item.unitPrice * item.qty;
    item.calcCategory   = k.calcCategory  || '';
    item.includeInLabor = (item.calcCategory === '④工事費');
    item.genka        = k.cost         || 0;
    item.houdan       = k.houdan       || 0;
    item.houkouKubun  = k.houkouKubun  || '';
    item.houkouDirect = k.houkouDirect || 0;
    item.gensuiKubun  = k.gensuiKubun  || '';
    item.gensuiA      = k.gensuiA      || 0;
    item.gensuiB      = k.gensuiB      || 0;
    item.kojiCategory = k.kojiCategory || '';
    section.items.push(item);
  }

  /** 標準項: 型式の一覧をセレクトボックスに構築 */
  function buildStandardModelSelect() {
    const sel  = document.getElementById('standardModelSelect');
    const hint = document.getElementById('standardHint');
    if (!sel) return;

    // 型式が存在するレコードから重複なしリストを作成
    // （型式ごとにorderが最小のものを代表として並び替え）
    const modelMap = new Map(); // model -> min order
    state.koujihi.forEach(k => {
      if (!k.model || !k.model.trim()) return;
      const m = k.model.trim();
      const cur = modelMap.get(m);
      if (cur === undefined || k.order < cur) modelMap.set(m, k.order);
    });

    // 型式名をアルファベット順に並べる
    const models = [...modelMap.keys()].sort((a, b) => a.localeCompare(b, 'ja'));

    // セレクトを再構築（最初のオプションは残す）
    while (sel.options.length > 1) sel.remove(1);
    models.forEach(m => {
      const count = state.koujihi.filter(k => k.model && k.model.trim() === m).length;
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `${m}（${count}件）`;
      sel.appendChild(opt);
    });

    if (hint) hint.textContent = `${models.length} 型式`;
    console.log(`標準項: ${models.length} 型式を構築`);
  }

  /** ③追加ボタン: 選択中の型式を指定セクションへ追加 */
  function execStandardAdd() {
    const model = document.getElementById('standardModelSelect')?.value || '';
    if (!model) {
      showToast('① 型式を選択してください', 'warn');
      return;
    }

    // セクションが無ければ追加
    if (state.sections.length === 0) addSection();

    // 追加先セクションを取得
    const targetVal = document.getElementById('standardTargetSection')?.value || 'last';
    let targetSection;
    if (targetVal === 'last') {
      targetSection = state.sections[state.sections.length - 1];
    } else {
      const targetId = Number(targetVal);
      targetSection = state.sections.find(s => s.id === targetId) || state.sections[state.sections.length - 1];
    }

    // 末尾の空行があれば削除
    const lastItem = targetSection.items[targetSection.items.length - 1];
    if (lastItem && !lastItem.name && !lastItem.spec && !lastItem.unitPrice && !lastItem.amount) {
      targetSection.items.pop();
    }

    // 型式に一致するものを field12（順番）でソートして一括追加
    const matched = state.koujihi
      .filter(k => k.model && k.model.trim() === model.trim())
      .sort((a, b) => a.order - b.order);

    if (matched.length === 0) {
      showToast(`型式「${model}」の工事費が見つかりません`, 'warn');
      return;
    }

    matched.forEach(k => addKoujihiItem(targetSection, k));
    renderSections();
    updateOutput();
    showToast(`No.${targetSection.no}「${targetSection.name || '無題'}」に ${matched.length} 件追加しました`);
  }

  // ── カテゴリタブ切り替え ─────────────────────────────────────

  let currentCat = 'product';

  function switchCatTab(cat) {
    currentCat = cat;
    document.querySelectorAll('.cat-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    ['product', 'kanzai', 'denzai', 'standard'].forEach(c => {
      const panel = document.getElementById(`catPanel-${c}`);
      if (panel) panel.style.display = c === cat ? '' : 'none';
    });
  }

  function execCatAdd() {
    // 共通セレクトの値を各隠しセレクトに同期
    const val = document.getElementById('commonTargetSection')?.value || 'last';
    ['productTargetSection', 'kanzaiTargetSection', 'denzaiTargetSection', 'standardTargetSection'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.value = val;
    });
    if (currentCat === 'product')   execProductAdd();
    else if (currentCat === 'kanzai')  execMaterialAdd('kanzai');
    else if (currentCat === 'denzai')  execMaterialAdd('denzai');
    else if (currentCat === 'standard') execStandardAdd();
  }

  /** 追加先セクションセレクトを更新（セクション追加・削除時に呼ぶ） */
  function updateTargetSectionSelect() {
    ['standardTargetSection', 'productTargetSection', 'kanzaiTargetSection', 'denzaiTargetSection', 'commonTargetSection'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const cur = sel.value;
      while (sel.options.length > 0) sel.remove(0);
      state.sections.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `No.${s.no}`;
        sel.appendChild(opt);
      });
      const lastOpt = document.createElement('option');
      lastOpt.value = 'last';
      lastOpt.textContent = '最後';
      sel.appendChild(lastOpt);
      const isInitial = cur === 'last' && state.sections.length > 0;
      if (!isInitial && [...sel.options].some(o => o.value === cur)) {
        sel.value = cur;
      } else {
        sel.value = state.sections.length > 0 ? String(state.sections[0].id) : 'last';
      }
    });
  }

  /** 検索結果から選択 → 追加待ち状態にする（即時追加しない） */
  function selectProduct(product) {
    document.getElementById('productDropdown').style.display = 'none';
    if (!product) return;

    // 選択内容を表示してボタン有効化
    state.pendingProduct = product;
    const searchInput = document.getElementById('productSearch');
    if (searchInput) searchInput.value = product.name;

    const btn = document.getElementById('btnProductAdd');
    if (btn) {
      btn.disabled = false;
      btn.classList.add('active');
    }
  }

  /** 「追加」ボタン押下 → 選択済み商品をセクションに追加 */
  function execProductAdd() {
    const product = state.pendingProduct;
    if (!product) { showToast('商品を検索して選択してください', 'warn'); return; }

    // セクションが無ければ追加
    if (state.sections.length === 0) addSection();

    // 追加先セクション決定
    const targetVal = (document.getElementById('productTargetSection') || {}).value || 'last';
    let targetSection;
    if (targetVal === 'last') {
      targetSection = state.sections[state.sections.length - 1];
    } else {
      const targetId = Number(targetVal);
      targetSection = state.sections.find(s => s.id === targetId) || state.sections[state.sections.length - 1];
    }

    // 末尾の空行があれば削除
    const lastItem = targetSection.items[targetSection.items.length - 1];
    if (lastItem && !lastItem.name && !lastItem.spec && !lastItem.unitPrice && !lastItem.amount) {
      targetSection.items.pop();
    }

    if (product.source === 'product') {
      // ── 商品マスタ: 商品1行 + 同型式の工事費を追加 ──────────────
      const item = createItem();
      item.productId = product.id;
      item.name      = product.name;
      item.spec      = product.code;
      item.unit      = '式';
      item.unitPrice = product.price;
      item.amount    = product.price;
      item.genka     = product.cost || 0;   // 標準原価（field1）
      targetSection.items.push(item);

      if (product.code) {
        const matched = state.koujihi
          .filter(k => k.model && normalize(k.model) === normalize(product.code))
          .sort((a, b) => a.order - b.order);
        matched.forEach(k => addKoujihiItem(targetSection, k));
        if (matched.length > 0) showToast(`No.${targetSection.no} に ${product.name} と工事費 ${matched.length} 件を追加しました`);
        else showToast(`No.${targetSection.no} に ${product.name} を追加しました`);
      }
    } else {
      // ── 工事費マスタ: 同型式を field12順で全件追加 ────────────────
      const model   = product.model ? normalize(product.model) : '';
      const matched = model
        ? state.koujihi
            .filter(k => k.model && normalize(k.model) === model)
            .sort((a, b) => a.order - b.order)
        : [product];

      matched.forEach(k => addKoujihiItem(targetSection, k));
      showToast(`No.${targetSection.no} に型式 ${product.model || product.name} の工事費 ${matched.length} 件を追加しました`);
    }

    // リセット
    state.pendingProduct = null;
    const searchInput = document.getElementById('productSearch');
    if (searchInput) searchInput.value = '';
    const btn = document.getElementById('btnProductAdd');
    if (btn) { btn.disabled = true; btn.classList.remove('active'); }

    renderSections();
    updateOutput();
  }

  // ── 管材・電材 検索・追加 ─────────────────────────────────────

  function buildMaterialDropdown(items, ddEl, query) {
    if (!query || query.length < 1) { ddEl.style.display = 'none'; return []; }
    const q = normalize(query);
    const filtered = items.filter(r =>
      normalize(r.name).includes(q) ||
      normalize(r.model).includes(q) ||
      normalize(r.code || '').includes(q)
    ).slice(0, 25);

    if (filtered.length === 0) { ddEl.style.display = 'none'; return []; }

    ddEl.innerHTML = filtered.map((item, idx) => `
      <div class="product-item" data-idx="${idx}">
        <div style="flex:1;min-width:0">
          <div class="p-name">${escHtml(item.name)}</div>
          <div class="p-code">${escHtml(item.model || '')}${item.code ? ' / ' + escHtml(item.code) : ''}</div>
        </div>
        <div class="p-price">¥${item.price.toLocaleString('ja-JP')}</div>
      </div>`).join('');
    ddEl.style.display = 'block';
    return filtered;
  }

  function searchKanzai(query) {
    const dd = document.getElementById('kanzaiDropdown');
    state._kanzaiResults = buildMaterialDropdown(state.kanzai, dd, query);
    dd.querySelectorAll('.product-item').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const item = state._kanzaiResults[Number(el.dataset.idx)];
        if (!item) return;
        state.pendingKanzai = item;
        document.getElementById('kanzaiSearch').value = item.name;
        const btn = document.getElementById('btnKanzaiAdd');
        if (btn) { btn.disabled = false; btn.classList.add('active'); }
        dd.style.display = 'none';
      });
    });
  }

  function searchDenzai(query) {
    const dd = document.getElementById('denzaiDropdown');
    state._denzaiResults = buildMaterialDropdown(state.denzai, dd, query);
    dd.querySelectorAll('.product-item').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const item = state._denzaiResults[Number(el.dataset.idx)];
        if (!item) return;
        state.pendingDenzai = item;
        document.getElementById('denzaiSearch').value = item.name;
        const btn = document.getElementById('btnDenzaiAdd');
        if (btn) { btn.disabled = false; btn.classList.add('active'); }
        dd.style.display = 'none';
      });
    });
  }

  function addMaterialItem(section, m) {
    const item = createItem();
    item.name      = m.name;
    item.spec      = m.model || m.code || '';
    item.unit      = m.unit  || '個';
    item.unitPrice = m.price || 0;
    item.amount    = (m.price || 0) * (item.qty || 1);
    item.genka     = m.cost  || 0;
    item.houdan    = m.houdan || 0;
    section.items.push(item);
  }

  function execMaterialAdd(type) {
    const isKanzai = type === 'kanzai';
    const pending  = isKanzai ? state.pendingKanzai : state.pendingDenzai;
    const searchId = isKanzai ? 'kanzaiSearch' : 'denzaiSearch';
    const btnId    = isKanzai ? 'btnKanzaiAdd' : 'btnDenzaiAdd';
    const targetId = isKanzai ? 'kanzaiTargetSection' : 'denzaiTargetSection';

    if (!pending) { showToast('アイテムを検索して選択してください', 'warn'); return; }
    if (state.sections.length === 0) addSection();

    const targetVal = (document.getElementById(targetId) || {}).value || 'last';
    let targetSection;
    if (targetVal === 'last') {
      targetSection = state.sections[state.sections.length - 1];
    } else {
      const id = Number(targetVal);
      targetSection = state.sections.find(s => s.id === id) || state.sections[state.sections.length - 1];
    }

    const lastItem = targetSection.items[targetSection.items.length - 1];
    if (lastItem && !lastItem.name && !lastItem.spec && !lastItem.unitPrice && !lastItem.amount) {
      targetSection.items.pop();
    }

    addMaterialItem(targetSection, pending);
    showToast(`No.${targetSection.no} に ${pending.name} を追加しました`);

    if (isKanzai) state.pendingKanzai = null;
    else          state.pendingDenzai = null;

    const searchEl = document.getElementById(searchId);
    if (searchEl) searchEl.value = '';
    const btn = document.getElementById(btnId);
    if (btn) { btn.disabled = true; btn.classList.remove('active'); }

    renderSections();
    updateOutput();
  }

  // ── FRP見積モード ──────────────────────────────────────────────

  function switchFrpMode() {
    const entering = !state.frpMode;
    const hasData  = entering
      ? (state.sections.length > 0 && state.sections.some(s => s.items.some(i => i.name)))
      : state.frpItems.length > 0;

    if (hasData) {
      const msg = entering
        ? '通常モードのデータが消えます。FRPモードに切り替えますか？'
        : 'FRPモードのデータが消えます。通常モードに戻しますか？';
      if (!confirm(msg)) return;
    }

    if (entering) {
      state.frpMode   = true;
      state.frpItems  = [];
      state.nextFrpId = 1;
    } else {
      state.frpMode  = false;
      state.frpItems = [];
    }

    applyFrpModeUI();
    updateOutput();
  }

  function setFrpAB(ab) {
    state.frpAB = ab;
    document.getElementById('btnFrpA').classList.toggle('active', ab === 'A');
    document.getElementById('btnFrpB').classList.toggle('active', ab === 'B');
    renderFrpItems();
    updateFrpTotals();
    updateOutput();
  }

  function applyFrpModeUI() {
    const frpOn = state.frpMode;

    const frpContainer      = document.getElementById('frpContainer');
    const sectionsContainer = document.getElementById('sectionsContainer');
    const noSectionsMsg     = document.getElementById('noSectionsMsg');
    const itemsToolbar      = document.querySelector('#tab-items .items-toolbar');
    const gensuiSummary     = document.getElementById('gensuiSummary');

    if (frpContainer)      frpContainer.style.display      = frpOn ? '' : 'none';
    if (sectionsContainer) sectionsContainer.style.display = frpOn ? 'none' : '';
    if (noSectionsMsg)     noSectionsMsg.style.display     = frpOn ? 'none' : '';
    if (itemsToolbar)      itemsToolbar.style.display      = frpOn ? 'none' : '';
    if (gensuiSummary)     gensuiSummary.style.display     = frpOn ? 'none' : '';

    const btn   = document.getElementById('btnFrpMode');
    const label = document.getElementById('frpModeLabel');
    if (btn) {
      btn.textContent = frpOn ? 'FRPモードを終了' : 'FRP見積モードに切り替え';
      btn.classList.toggle('active', frpOn);
    }
    if (label) label.style.display = frpOn ? '' : 'none';

    if (frpOn) {
      document.getElementById('btnFrpA')?.classList.toggle('active', state.frpAB === 'A');
      document.getElementById('btnFrpB')?.classList.toggle('active', state.frpAB === 'B');
    }
  }

  async function searchFrp(keyword) {
    if (!keyword || keyword.length < 1) {
      hideFrpDropdown();
      return;
    }
    try {
      let results = [];
      if (zohoReady) {
        const res = await ZOHO.CRM.API.searchRecord({
          Entity: 'FRP',
          Type: 'word',
          Query: keyword,
        });
        results = res?.data || [];
      }
      showFrpDropdown(results, keyword);
    } catch (e) {
      console.warn('FRP検索エラー:', e);
      hideFrpDropdown();
    }
  }

  function showFrpDropdown(results, keyword) {
    const dd = document.getElementById('frpSearchDropdown');
    if (!dd) return;
    if (results.length === 0) {
      dd.innerHTML = '<div class="frp-search-item" style="color:#888;">候補なし</div>';
    } else {
      dd.innerHTML = results.map((r, i) => `
        <div class="frp-search-item" data-idx="${i}">
          <span class="frp-search-item-name">${escHtml(r.Name || '')}</span>
          <span class="frp-search-item-num">${escHtml(r.itemnum || '')}</span>
        </div>
      `).join('');
      dd.querySelectorAll('.frp-search-item[data-idx]').forEach(el => {
        el.addEventListener('click', () => {
          const r = results[Number(el.dataset.idx)];
          addFrpItem(r);
          hideFrpDropdown();
          const inp = document.getElementById('frpSearchInput');
          if (inp) inp.value = '';
        });
      });
    }
    dd.style.display = '';
  }

  function hideFrpDropdown() {
    const dd = document.getElementById('frpSearchDropdown');
    if (dd) dd.style.display = 'none';
  }

  function addFrpItem(record) {
    const specs = [];
    for (let i = 1; i <= 9; i++) {
      const v = record[`spec${i}`] || '';
      if (v.trim()) specs.push(v.trim());
    }
    const item = {
      id:      state.nextFrpId++,
      frpId:   record.id || '',
      name:    record.Name    || '',
      itemnum: record.itemnum || '',
      qty:     1,
      unit:    record.unit    || '',
      price:   Number(record.price) || 0,
      priceA:  Number(record.A)     || 0,
      priceB:  Number(record.B)     || 0,
      specs,
    };
    state.frpItems.push(item);
    renderFrpItems();
    updateFrpTotals();
    updateOutput();
  }

  function removeFrpItem(itemId) {
    state.frpItems = state.frpItems.filter(i => i.id !== itemId);
    renderFrpItems();
    updateFrpTotals();
    updateOutput();
  }

  function renderFrpItems() {
    const tbody = document.getElementById('frpItemsTbody');
    if (!tbody) return;

    const shikiriKey = state.frpAB === 'A' ? 'priceA' : 'priceB';
    const rows = [];

    state.frpItems.forEach((item, idx) => {
      const shikiri      = item[shikiriKey] || 0;
      const priceTotal   = item.price  * (Number(item.qty) || 1);
      const shikiriTotal = shikiri     * (Number(item.qty) || 1);
      const displayName  = `${escHtml(item.name)} ${escHtml(item.itemnum)}`.trim();

      rows.push(`
        <tr class="frp-item-row" data-frp-id="${item.id}">
          <td class="frp-col-no" style="text-align:center">${idx + 1}</td>
          <td class="frp-col-name frp-item-name">${displayName}</td>
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
            <button onclick="app.removeFrpItem(${item.id})" style="color:#c00;background:none;border:none;cursor:pointer;font-size:14px;">✕</button>
          </td>
        </tr>
      `);

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

    // 数量入力イベント
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

  function updateFrpTotals() {
    const shikiriKey   = state.frpAB === 'A' ? 'priceA' : 'priceB';
    const priceTotal   = state.frpItems.reduce((s, i) => s + i.price * (Number(i.qty) || 1), 0);
    const shikiriTotal = state.frpItems.reduce((s, i) => s + (i[shikiriKey] || 0) * (Number(i.qty) || 1), 0);

    const ptEl = document.getElementById('frpPriceTotal');
    const stEl = document.getElementById('frpShikiriTotal');
    if (ptEl) ptEl.textContent = '¥' + priceTotal.toLocaleString('ja-JP');
    if (stEl) stEl.textContent = '¥' + shikiriTotal.toLocaleString('ja-JP');
  }

  function fmtFrp(n) {
    if (n === null || n === undefined || n === '') return '';
    const num = Number(n);
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('ja-JP');
  }

  // ── 自動採番 ─────────────────────────────────────────────────

  async function autoNumber() {
    const btn          = document.getElementById('btnAutoNumber');
    const categoryEl   = document.getElementById('koujiCategory');
    const createDeptEl = document.getElementById('createDept');
    const siteDeptEl   = document.getElementById('siteDept');
    const kikaShitaEl  = document.getElementById('kikaShita');
    const edabanEl     = document.getElementById('edaban');

    const category      = categoryEl?.value   || '';
    const createCode    = createDeptEl?.value || '';
    const siteCode      = siteDeptEl?.value   || '';
    const kikaShita     = String(kikaShitaEl?.value || '80').padStart(2, '0');
    const edaban        = String(edabanEl?.value || '01').padStart(2, '0');

    if (!category || !createCode || !siteCode) {
      showToast('工事カテゴリ・作成所課・現場所課を選択してください', 'warn');
      return;
    }

    btn.disabled = true;
    btn.textContent = '採番中...';

    try {
      // 採番管理キー: {期下二桁}-{カテゴリ}-{作成所課コード}
      const counterKey = `${kikaShita}-${category}-${createCode}`;
      let newSeq   = 1;
      let recordId = null;

      if (zohoReady) {
        const res = await ZOHO.CRM.API.searchRecord({
          Entity: 'CustomModule21',
          Type:   'criteria',
          Query:  `(Name:equals:${counterKey})`,
        });
        const records = res?.data || [];
        if (records.length > 0) {
          recordId = records[0].id;
          newSeq   = (Number(records[0].number) || 0) + 1;
        }

        if (recordId) {
          await ZOHO.CRM.API.updateRecord({
            Entity:  'CustomModule21',
            APIData: { id: recordId, number: newSeq },
          });
        } else {
          await ZOHO.CRM.API.insertRecord({
            Entity:  'CustomModule21',
            APIData: { Name: counterKey, number: newSeq },
          });
        }
      }

      const seqStr  = String(newSeq).padStart(4, '0');
      const quoteNo = `${category}-${createCode}-${siteCode}-${kikaShita}-${seqStr}-${edaban}`;

      state.seqNo         = quoteNo;
      state.seqNumber     = newSeq;
      state.koujiCategory = category;
      state.createDeptCode = createCode;
      state.createDeptName = createDeptEl?.options[createDeptEl.selectedIndex]?.dataset?.name || '';
      state.siteDeptCode  = siteCode;
      state.siteDeptName  = siteDeptEl?.options[siteDeptEl.selectedIndex]?.dataset?.name || '';
      state.kikaShita     = kikaShita;
      state.edaban        = edaban;

      updateQuoteNoBadge();
      showToast(`採番完了: ${quoteNo}`);
    } catch (e) {
      const msg = e?.message || JSON.stringify(e);
      showToast('採番に失敗しました: ' + msg, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔢 採番する';
    }
  }

  // ── セクション操作 ────────────────────────────────────────────

  function addSection() {
    const section = {
      id:     state.nextSectionId++,
      no:     state.sections.length + 1,
      name:   '',
      secQty: 1,
      items:  [],
    };
    // 最初の行を1つ追加
    section.items.push(createItem());
    state.sections.push(section);
    renderSections();
    updateOutput();
    document.getElementById('noSectionsMsg').style.display = 'none';
    const newBlock = document.querySelector(`[data-section-id="${section.id}"]`);
    if (newBlock) newBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function removeSection(btn) {
    const block = btn.closest('.section-block');
    const id    = Number(block.dataset.sectionId);
    if (!confirm('このセクションを削除しますか？')) return;
    state.sections = state.sections.filter(s => s.id !== id);
    renumberSections();
    renderSections();
    updateOutput();
  }

  function moveSectionUp(btn) {
    const block = btn.closest('.section-block');
    const id    = Number(block.dataset.sectionId);
    const idx   = state.sections.findIndex(s => s.id === id);
    if (idx <= 0) return;
    [state.sections[idx - 1], state.sections[idx]] = [state.sections[idx], state.sections[idx - 1]];
    renumberSections();
    renderSections();
  }

  function moveSectionDown(btn) {
    const block = btn.closest('.section-block');
    const id    = Number(block.dataset.sectionId);
    const idx   = state.sections.findIndex(s => s.id === id);
    if (idx < 0 || idx >= state.sections.length - 1) return;
    [state.sections[idx], state.sections[idx + 1]] = [state.sections[idx + 1], state.sections[idx]];
    renumberSections();
    renderSections();
  }

  function renumberSections() {
    state.sections.forEach((s, i) => { s.no = i + 1; });
  }

  // ── 明細行操作 ────────────────────────────────────────────────

  function createItem() {
    return {
      id: state.nextItemId++, productId: null,
      name: '', spec: '', qty: 1, unit: '式', unitPrice: null, amount: 0,
      includeInLabor: false,  // 労務費に含めるか（null=auto: ④工事費なら true）
      dairiRate: null,  // null = グローバル main_rate を使用
      calcCategory: '',
      kouTanka:    0,   // 工単価（マスタから、減衰再計算用）
      houdan: 0,        // 歩単（マスタから）
      houkouKubun: '',  // 歩工区分（マスタから）
      houkouGoukei: 0,  // 歩工合計（減衰計算結果 or 手動上書き）
      houkouDirect: 0,  // 直接歩工値（field16 > 0 なら減衰計算をスキップして使用）
      gensuiKubun:  '',  // 減衰区分（field17: 1〜8）
      gensuiA:      0,   // 減衰係数A（field A）
      gensuiB:      0,   // 減衰係数B（field B）
      kojiCategory: '',  // 工事カテゴリー名（field18）
      specLines: [],    // 仕様行（テキストのみ）
    };
  }

  function addItem(btn) {
    const block = btn.closest('.section-block');
    const id    = Number(block.dataset.sectionId);
    const sec   = state.sections.find(s => s.id === id);
    if (sec) {
      sec.items.push(createItem());
      renderSection(sec, block);
      updateSectionSubtotal(block);
    }
  }

  function applyBulkRate(btn) {
    const block = btn.closest('.section-block');
    const rateInput = block.querySelector('.section-rate-input');
    const rate = parseFloat(rateInput.value);
    if (isNaN(rate) || rate <= 0) {
      showToast('有効な掛率を入力してください（例: 0.8）', 'warn');
      return;
    }
    const secId = Number(block.dataset.sectionId);
    const sec   = state.sections.find(s => s.id === secId);
    if (!sec) return;

    sec.items.forEach(item => {
      if (item.unitPrice != null && item.unitPrice !== '') {
        item.unitPrice = Math.round(Number(item.unitPrice) * rate);
        item.amount    = Math.round(item.unitPrice * (Number(item.qty) || 1));
      }
      item.dairiRate = rate;
    });

    renderSection(sec, block);
    updateSectionSubtotal(block);
    updateOutput();
    showToast(`掛率 ${rate} を適用しました`);
  }

  function applyGlobalRate() {
    const mainRateVal    = parseFloat(document.getElementById('rateMain')?.value);
    const itemRateVal    = parseFloat(document.getElementById('rateItem')?.value);
    const partsRateVal   = parseFloat(document.getElementById('rateParts')?.value);
    const purchaseRateVal= parseFloat(document.getElementById('ratePurchase')?.value);

    if (isNaN(mainRateVal) || mainRateVal <= 0) {
      showToast('代理店掛率を入力してください', 'warn');
      return;
    }

    // stateに反映
    state.mainRate    = mainRateVal;
    state.itemRate    = !isNaN(itemRateVal)    ? itemRateVal    : state.itemRate;
    state.partsRate   = !isNaN(partsRateVal)   ? partsRateVal   : state.partsRate;
    state.purchaseRate= !isNaN(purchaseRateVal) ? purchaseRateVal: state.purchaseRate;

    // 全明細行の dairiRate を更新
    state.sections.forEach(sec => {
      sec.items.forEach(item => {
        item.dairiRate = mainRateVal;
      });
    });

    // 全セクションの表示を再描画
    const container = document.getElementById('sectionsContainer');
    state.sections.forEach(sec => {
      const block = container?.querySelector(`[data-section-id="${sec.id}"]`);
      if (block) {
        renderSection(sec, block);
        updateSectionSubtotal(block);
      }
    });

    updateOutput();
    showToast(`代理店掛率 ${mainRateVal} を全明細に反映しました`);
  }

  function removeItem(btn) {
    const row   = btn.closest('.item-row');
    const itemId = Number(row.dataset.itemId);
    const block = btn.closest('.section-block');
    const secId = Number(block.dataset.sectionId);
    const sec   = state.sections.find(s => s.id === secId);
    if (sec) {
      sec.items = sec.items.filter(i => i.id !== itemId);
      // アイテム行・仕様行・追加ボタン行をまとめて削除
      const tbody = block.querySelector('.items-tbody');
      tbody.querySelectorAll(`[data-item-id="${itemId}"]`).forEach(r => r.remove());
      updateSectionSubtotal(block);
      updateOutput();
    }
  }

  function moveItemUp(btn) {
    const block  = btn.closest('.section-block');
    const secId  = Number(block.dataset.sectionId);
    const sec    = state.sections.find(s => s.id === secId);
    const itemId = Number(btn.closest('.item-row').dataset.itemId);
    if (!sec) return;
    const idx = sec.items.findIndex(i => i.id === itemId);
    if (idx <= 0) return;
    [sec.items[idx - 1], sec.items[idx]] = [sec.items[idx], sec.items[idx - 1]];
    renderSection(sec, block);
    updateOutput();
  }

  function moveItemDown(btn) {
    const block  = btn.closest('.section-block');
    const secId  = Number(block.dataset.sectionId);
    const sec    = state.sections.find(s => s.id === secId);
    const itemId = Number(btn.closest('.item-row').dataset.itemId);
    if (!sec) return;
    const idx = sec.items.findIndex(i => i.id === itemId);
    if (idx < 0 || idx >= sec.items.length - 1) return;
    [sec.items[idx], sec.items[idx + 1]] = [sec.items[idx + 1], sec.items[idx]];
    renderSection(sec, block);
    updateOutput();
  }

  /** 数量・単価変更 → 金額自動計算 */
  function onItemInput(e) {
    const row = e.target.closest('.item-row');
    if (!row) return;

    const block = e.target.closest('.section-block');
    const secId = Number(block.dataset.sectionId);
    const itemId = Number(row.dataset.itemId);
    const sec   = state.sections.find(s => s.id === secId);
    if (!sec) return;
    const item = sec.items.find(i => i.id === itemId);
    if (!item) return;

    // フォームから状態を更新
    const nameEl   = row.querySelector('.item-name');
    const specEl   = row.querySelector('.item-spec');
    const qtyEl    = row.querySelector('.item-qty');
    const unitEl   = row.querySelector('.item-unit');
    const priceEl  = row.querySelector('.item-price');
    const amountEl = row.querySelector('.item-amount');

    item.name      = nameEl?.value   || '';
    item.spec      = specEl?.value   || '';
    item.qty       = Number(qtyEl?.value)   || 0;
    item.unit      = unitEl?.value   || '式';

    item.unitPrice = priceEl?.value ? Number(priceEl.value.replace(/,/g, '')) : null;

    // qty が変わった houdan > 0 の行がある場合、セクション内の④工事費を再計算
    if (e.target === qtyEl && (Number(item.houdan) || 0) > 0) {
      recalcKoujihiInSection(sec);
      // 再計算結果を DOM に反映
      const block2 = e.target.closest('.section-block');
      sec.items.forEach(koItem => {
        if (koItem.calcCategory !== '④工事費') return;
        const koRow = block2?.querySelector(`[data-item-id="${koItem.id}"]`);
        if (!koRow) return;
        const koPriceEl   = koRow.querySelector('.item-price');
        const koAmountEl  = koRow.querySelector('.item-amount');
        const koGoukeiEl  = koRow.querySelector('.item-houkou-goukei');
        const koHoukouEl  = koRow.querySelector('.item-houkou');
        const koDairiEl   = koRow.querySelector('.item-dairi');
        if (koPriceEl  && koPriceEl  !== document.activeElement) koPriceEl.value  = koItem.unitPrice || '';
        if (koAmountEl && koAmountEl !== document.activeElement) koAmountEl.value = koItem.amount    || '';
        if (koGoukeiEl && koGoukeiEl !== document.activeElement) {
          koGoukeiEl.value = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
        }
        if (koHoukouEl) {
          koHoukouEl.textContent = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
        }
        if (koDairiEl) {
          const rate = koItem.dairiRate ?? state.mainRate;
          const amt  = Number(koItem.amount) || 0;
          koDairiEl.textContent = (rate != null && amt) ? Math.round(amt * rate).toLocaleString('ja-JP') : '';
        }
      });
    }

    // 金額自動計算（数量×単価 が入力されている場合）
    if (item.unitPrice !== null && item.qty) {
      item.amount = item.unitPrice * item.qty;
      if (amountEl) amountEl.value = item.amount.toLocaleString('ja-JP');
    } else if (e.target === amountEl) {
      item.amount = Number((amountEl?.value || '').replace(/,/g, '')) || 0;
    }

    // 算出カテゴリ変更 → includeInLabor を自動更新
    const calcCatEl = row.querySelector('.item-calc-cat');
    if (calcCatEl) {
      item.calcCategory = calcCatEl.value || '';
      if (e.target === calcCatEl) {
        item.includeInLabor = (item.calcCategory === '④工事費');
        const laborCheckEl2 = row.querySelector('.item-labor-check');
        if (laborCheckEl2) laborCheckEl2.checked = item.includeInLabor;
      }
    }

    // 労務費チェックボックス
    const laborCheckEl = row.querySelector('.item-labor-check');
    if (laborCheckEl) item.includeInLabor = laborCheckEl.checked;

    // 代理店掛率（行ごとに設定可能、空欄 = グローバル main_rate を使用）
    const dairiRateEl = row.querySelector('.item-dairi-rate');
    if (dairiRateEl) {
      const rateVal = dairiRateEl.value.trim();
      item.dairiRate = rateVal !== '' ? Number(rateVal) : null;
      const effectiveRate = item.dairiRate ?? state.mainRate;
      const dairiEl = row.querySelector('.item-dairi');
      if (dairiEl) {
        const amt = Number(item.amount) || 0;
        dairiEl.textContent = (effectiveRate != null && amt) ? Math.round(amt * effectiveRate).toLocaleString('ja-JP') : '';
      }
    }

    // 原価（手動入力可）→ state に反映
    const genkaInputEl = row.querySelector('.item-genka');
    if (genkaInputEl) item.genka = Number(genkaInputEl.value) || 0;

    // 減衰A・減衰B（手動入力可）→ state に反映
    const gensuiAInputEl = row.querySelector('.item-gensui-a');
    const gensuiBInputEl = row.querySelector('.item-gensui-b');
    if (gensuiAInputEl) item.gensuiA = parseFloat(gensuiAInputEl.value) || 0;
    if (gensuiBInputEl) item.gensuiB = parseFloat(gensuiBInputEl.value) || 0;

    // 歩工合計（手動上書き）を読み取り、歩工を再計算して表示
    const goukeiEl = row.querySelector('.item-houkou-goukei');
    const houkouEl = row.querySelector('.item-houkou');
    if (goukeiEl) {
      const inputVal = parseFloat(goukeiEl.value);
      if (!isNaN(inputVal)) item.houkouGoukei = inputVal;
    }

    // 歩工合計を手動入力した場合の再計算
    if (e.target.classList.contains('item-houkou-goukei')) {
      const goukei = Number(item.houkouGoukei) || 0;
      // calcGensui に上書きされないよう houkouDirect に同期
      item.houkouDirect = goukei;
      // 歩工 span を更新
      if (houkouEl) houkouEl.textContent = goukei ? goukei.toFixed(2) : '';

      if (item.calcCategory === '④工事費') {
        // ④工事費行を直接編集：歩工合計 → 単価・金額を再計算
        if (goukei > 0) {
          item.unitPrice = Math.round(RODO_TANKA * goukei / 1000) * 1000;
          item.genka     = Math.round(RODO_GENKA  * goukei / 1000) * 1000;
        }
        item.amount = (item.unitPrice || 0) * (Number(item.qty) || 1);
        if (priceEl)  priceEl.value  = item.unitPrice ? item.unitPrice.toLocaleString('ja-JP') : '';
        if (amountEl) amountEl.value = item.amount ? item.amount.toLocaleString('ja-JP') : '';
        const dairiEl2 = row.querySelector('.item-dairi');
        if (dairiEl2) {
          const rate = item.dairiRate ?? state.mainRate;
          dairiEl2.textContent = (rate != null && item.amount)
            ? Math.round(item.amount * rate).toLocaleString('ja-JP') : '';
        }
      } else if ((Number(item.houdan) || 0) > 0) {
        // houdan行の歩工合計を手動変更 → セクション内の④工事費を再計算してDOM更新
        recalcKoujihiInSection(sec);
        const block2 = e.target.closest('.section-block');
        sec.items.forEach(koItem => {
          if (koItem.calcCategory !== '④工事費') return;
          const koRow = block2?.querySelector(`[data-item-id="${koItem.id}"]`);
          if (!koRow) return;
          const koPriceEl   = koRow.querySelector('.item-price');
          const koAmountEl  = koRow.querySelector('.item-amount');
          const koGoukeiEl  = koRow.querySelector('.item-houkou-goukei');
          const koHoukouEl  = koRow.querySelector('.item-houkou');
          const koDairiEl   = koRow.querySelector('.item-dairi');
          if (koPriceEl  && koPriceEl  !== document.activeElement) koPriceEl.value  = koItem.unitPrice ? koItem.unitPrice.toLocaleString('ja-JP') : '';
          if (koAmountEl && koAmountEl !== document.activeElement) koAmountEl.value = koItem.amount ? koItem.amount.toLocaleString('ja-JP') : '';
          if (koGoukeiEl && koGoukeiEl !== document.activeElement) {
            koGoukeiEl.value = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
          }
          if (koHoukouEl) {
            koHoukouEl.textContent = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
          }
          if (koDairiEl) {
            const rate = koItem.dairiRate ?? state.mainRate;
            const amt  = Number(koItem.amount) || 0;
            koDairiEl.textContent = (rate != null && amt) ? Math.round(amt * rate).toLocaleString('ja-JP') : '';
          }
        });
      }
    } else if (houkouEl) {
      const goukei = Number(item.houkouGoukei) || 0;
      const raw = goukei > 0 ? goukei : (Number(item.qty) * (Number(item.houdan) || 0));
      houkouEl.textContent = raw ? raw.toFixed(2) : '';
    }

    // 原価・原価合計 DOM 同期（④工事費の歩工再計算で genka が変わった場合も含む）
    const genkaInputEl2 = row.querySelector('.item-genka');
    const genkaAmtEl2   = row.querySelector('.item-genka-amount');
    if (genkaInputEl2 && genkaInputEl2 !== document.activeElement) {
      genkaInputEl2.value = item.genka ? item.genka : '';
    }
    const genkaAmt2 = (item.genka || 0) * (Number(item.qty) || 1);
    if (genkaAmtEl2) genkaAmtEl2.textContent = genkaAmt2 ? genkaAmt2.toLocaleString('ja-JP') : '';

    // 減衰区分 変更 → マスタから工事カテゴリ・減衰A・減衰B を自動セット
    if (e.target.classList.contains('item-gensui-kubun')) {
      const kubun  = e.target.value;
      item.gensuiKubun = kubun;
      const master = state.koujihi.find(k => k.gensuiKubun === kubun);
      if (master) {
        item.gensuiA      = master.gensuiA;
        item.gensuiB      = master.gensuiB;
        item.kojiCategory = master.kojiCategory;
      } else {
        item.gensuiA = 0; item.gensuiB = 0; item.kojiCategory = '';
      }
      const kojiCatEl2  = row.querySelector('.item-koji-category');
      const gensuiAEl2  = row.querySelector('.item-gensui-a');
      const gensuiBEl2  = row.querySelector('.item-gensui-b');
      if (kojiCatEl2) kojiCatEl2.textContent = item.kojiCategory || '';
      if (gensuiAEl2) gensuiAEl2.value = item.gensuiA ? item.gensuiA : '';
      if (gensuiBEl2) gensuiBEl2.value = item.gensuiB ? item.gensuiB : '';
    }

    // 減衰A・B・区分 変更 → セクション内の④工事費を再計算
    const isGensuiChange = e.target.classList.contains('item-gensui-kubun')
      || e.target.classList.contains('item-gensui-a')
      || e.target.classList.contains('item-gensui-b');
    if (isGensuiChange) {
      recalcKoujihiInSection(sec);
      const block2 = e.target.closest('.section-block');
      sec.items.forEach(koItem => {
        if (koItem.calcCategory !== '④工事費') return;
        const koRow = block2?.querySelector(`[data-item-id="${koItem.id}"]`);
        if (!koRow) return;
        const koPriceEl   = koRow.querySelector('.item-price');
        const koAmountEl  = koRow.querySelector('.item-amount');
        const koGoukeiEl  = koRow.querySelector('.item-houkou-goukei');
        const koHoukouEl  = koRow.querySelector('.item-houkou');
        const koDairiEl   = koRow.querySelector('.item-dairi');
        if (koPriceEl  && koPriceEl  !== document.activeElement) koPriceEl.value  = koItem.unitPrice ? koItem.unitPrice.toLocaleString('ja-JP') : '';
        if (koAmountEl && koAmountEl !== document.activeElement) koAmountEl.value = koItem.amount    ? koItem.amount.toLocaleString('ja-JP')    : '';
        if (koGoukeiEl && koGoukeiEl !== document.activeElement) koGoukeiEl.value = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
        if (koHoukouEl) koHoukouEl.textContent = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
        if (koDairiEl) {
          const rate = koItem.dairiRate ?? state.mainRate;
          const amt  = Number(koItem.amount) || 0;
          koDairiEl.textContent = (rate != null && amt) ? Math.round(amt * rate).toLocaleString('ja-JP') : '';
        }
      });
    }

    updateSectionSubtotal(block);
    updateOutput();
  }

  // ── レンダリング ──────────────────────────────────────────────

  function renderSections() {
    const container = document.getElementById('sectionsContainer');
    const noMsg     = document.getElementById('noSectionsMsg');

    updateTargetSectionSelect();

    if (state.sections.length === 0) {
      container.innerHTML = '';
      noMsg.style.display = 'block';
      return;
    }
    noMsg.style.display = 'none';

    // 既存DOMを再利用（IDで照合）
    const existingIds = new Set([...container.querySelectorAll('.section-block')].map(b => Number(b.dataset.sectionId)));
    const newIds      = new Set(state.sections.map(s => s.id));

    // 削除
    existingIds.forEach(id => {
      if (!newIds.has(id)) container.querySelector(`[data-section-id="${id}"]`)?.remove();
    });

    // 追加・更新（順序を保つ）
    state.sections.forEach(sec => {
      let block = container.querySelector(`[data-section-id="${sec.id}"]`);
      if (!block) {
        block = createSectionDOM(sec);
        container.appendChild(block);
      }
      // 番号とタイトル更新
      block.querySelector('.section-no').textContent = sec.no;
      const catSel   = block.querySelector('.section-cat-select');
      const nameInput = block.querySelector('.section-name-input');
      if (catSel && catSel !== document.activeElement && nameInput !== document.activeElement) {
        const catLabel = findSectionCategory(sec.name);
        if (catSel.value !== catLabel) {
          catSel.value = catLabel;
          updateNameDatalist(catSel, nameInput);
        }
        if (nameInput.value !== (sec.name || '')) nameInput.value = sec.name || '';
      }

      const secQtyInput = block.querySelector('.section-qty-input');
      if (secQtyInput && secQtyInput !== document.activeElement) {
        const qv = String(Number(sec.secQty) || 1);
        if (secQtyInput.value !== qv) secQtyInput.value = qv;
      }

      renderSection(sec, block);
    });

    // 順序修正
    state.sections.forEach((sec, idx) => {
      const block = container.querySelector(`[data-section-id="${sec.id}"]`);
      if (block && container.children[idx] !== block) {
        container.insertBefore(block, container.children[idx]);
      }
    });
  }

  function createSectionDOM(sec) {
    const tmpl  = document.getElementById('sectionTemplate');
    const clone = tmpl.content.cloneNode(true);
    const block = clone.querySelector('.section-block');
    block.dataset.sectionId = sec.id;

    const catSel    = block.querySelector('.section-cat-select');
    const nameInput = block.querySelector('.section-name-input');

    // カテゴリ選択肢を構築
    buildCategorySelect(catSel);

    // 初期 datalist（全件）
    updateNameDatalist(catSel, nameInput);

    // カテゴリ変更 → datalist を絞り込み
    catSel.addEventListener('change', () => {
      updateNameDatalist(catSel, nameInput);
      // カテゴリが変わったら名前もリセット
      const s = state.sections.find(s => s.id === sec.id);
      if (s && !SECTION_CATEGORIES.find(c => c.label === catSel.value)?.items.includes(s.name)) {
        nameInput.value = '';
        s.name = '';
      }
    });

    // 大項目名入力（テキスト）→ state 更新 ＋ 折りたたみ表示を即時反映
    nameInput.addEventListener('input', () => {
      const s = state.sections.find(s => s.id === sec.id);
      if (s) {
        s.name = nameInput.value;
        updateCollapsedInfo(sec.id, block);
      }
    });

    // 式数入力 → state 更新
    const secQtyInput = block.querySelector('.section-qty-input');
    if (secQtyInput) {
      secQtyInput.addEventListener('input', () => {
        const s = state.sections.find(s => s.id === sec.id);
        if (s) {
          s.secQty = Math.max(1, Number(secQtyInput.value) || 1);
          updateSectionSubtotal(block);
        }
      });
    }

    // 折りたたみトグル
    const toggleBtn = block.querySelector('.section-toggle');
    toggleBtn.addEventListener('click', () => {
      block.classList.toggle('collapsed');
      updateCollapsedInfo(sec.id, block);
    });

    return block;
  }

  function renderSection(sec, block) {
    const tbody = block.querySelector('.items-tbody');

    // 既存の仕様行・追加ボタン行を一旦クリア
    tbody.querySelectorAll('.spec-line-row').forEach(r => r.remove());

    const existingIds = new Set([...tbody.querySelectorAll('.item-row')].map(r => Number(r.dataset.itemId)));
    const newIds      = new Set(sec.items.map(i => i.id));

    // 削除
    existingIds.forEach(id => {
      if (!newIds.has(id)) tbody.querySelector(`.item-row[data-item-id="${id}"]`)?.remove();
    });

    // 追加・更新
    sec.items.forEach(item => {
      let row = tbody.querySelector(`.item-row[data-item-id="${item.id}"]`);
      if (!row) {
        row = createItemRowDOM(item);
        tbody.appendChild(row);
      } else if (!row.dataset.dragReady) {
        row.draggable = true;
        attachDragEvents(row);
        row.dataset.dragReady = '1';
      }
      // フォーカス中の行は上書きしない
      if (![...row.querySelectorAll('input,select')].some(el => el === document.activeElement)) {
        row.querySelector('.item-name').value   = item.name;
        row.querySelector('.item-spec').value   = item.spec;
        row.querySelector('.item-qty').value    = item.qty;
        row.querySelector('.item-unit').value   = item.unit;
        row.querySelector('.item-price').value  = item.unitPrice != null ? Number(item.unitPrice).toLocaleString('ja-JP') : '';
        row.querySelector('.item-amount').value = item.amount ? Number(item.amount).toLocaleString('ja-JP') : '';
      }
      // 算出カテゴリドロップダウンを常に同期
      const calcCatEl = row.querySelector('.item-calc-cat');
      if (calcCatEl && calcCatEl !== document.activeElement) {
        calcCatEl.value = item.calcCategory || '';
      }
      // data属性にも保持（保存・読み込み時に利用）
      row.dataset.calcCategory = item.calcCategory || '';

      // 労務費チェックボックス
      const laborCheckEl = row.querySelector('.item-labor-check');
      if (laborCheckEl) laborCheckEl.checked = !!item.includeInLabor;

      // 代理店掛率入力欄
      const dairiRateEl = row.querySelector('.item-dairi-rate');
      if (dairiRateEl && dairiRateEl !== document.activeElement) {
        dairiRateEl.value       = item.dairiRate != null ? item.dairiRate : '';
        dairiRateEl.placeholder = state.mainRate != null ? String(state.mainRate) : '掛率';
      }
      // 代理店価格の反映（行ごとの掛率、未設定時はグローバル main_rate）
      const dairiEl = row.querySelector('.item-dairi');
      if (dairiEl) {
        const effectiveRate = item.dairiRate ?? state.mainRate;
        const amt  = Number(item.amount) || 0;
        dairiEl.textContent = (effectiveRate != null && amt) ? Math.round(amt * effectiveRate).toLocaleString('ja-JP') : '';
      }

      // 原価・原価合計の反映
      const genkaEl       = row.querySelector('.item-genka');
      const genkaAmtEl    = row.querySelector('.item-genka-amount');
      const genka    = Number(item.genka) || 0;
      const genkaAmt = genka * (Number(item.qty) || 1);
      if (genkaEl    && genkaEl    !== document.activeElement) genkaEl.value = genka ? genka : '';
      if (genkaAmtEl) genkaAmtEl.textContent = genkaAmt ? genkaAmt.toLocaleString('ja-JP') : '';

      // 減衰区分・工事カテゴリ・減衰A・減衰B の反映
      const gensuiKubunEl  = row.querySelector('.item-gensui-kubun');
      const kojiCatEl      = row.querySelector('.item-koji-category');
      const gensuiAEl      = row.querySelector('.item-gensui-a');
      const gensuiBEl      = row.querySelector('.item-gensui-b');
      if (gensuiKubunEl && gensuiKubunEl !== document.activeElement) gensuiKubunEl.value = item.gensuiKubun || '';
      if (kojiCatEl)     kojiCatEl.textContent = item.kojiCategory || '';
      if (gensuiAEl && gensuiAEl !== document.activeElement) gensuiAEl.value = item.gensuiA ? item.gensuiA : '';
      if (gensuiBEl && gensuiBEl !== document.activeElement) gensuiBEl.value = item.gensuiB ? item.gensuiB : '';

      // 歩単・歩工区分・歩工合計・歩工（計算）の反映
      const houdanEl      = row.querySelector('.item-houdan');
      const kubunEl       = row.querySelector('.item-houkou-kubun');
      const goukeiEl      = row.querySelector('.item-houkou-goukei');
      const houkouDispEl  = row.querySelector('.item-houkou');
      const houdanNum = Number(item.houdan) || 0;
      if (houdanEl) houdanEl.textContent = houdanNum !== 0 ? houdanNum.toFixed(2) : '';
      if (kubunEl)  kubunEl.textContent  = item.houkouKubun || '';
      if (goukeiEl && goukeiEl !== document.activeElement) {
        goukeiEl.value = item.houkouGoukei || '';
      }
      if (houkouDispEl) {
        const goukei = Number(item.houkouGoukei) || 0;
        const raw = goukei > 0 ? goukei : (Number(item.qty) * houdanNum);
        houkouDispEl.textContent = raw ? raw.toFixed(2) : '';
      }
    });

    // 順序修正＋仕様行を各アイテム行の直後に挿入
    const fragment = document.createDocumentFragment();
    sec.items.forEach(item => {
      const itemRow = tbody.querySelector(`.item-row[data-item-id="${item.id}"]`);
      if (itemRow) fragment.appendChild(itemRow);
      // 仕様行
      (item.specLines || []).forEach((line, idx) => {
        fragment.appendChild(createSpecLineRowDOM(item.id, idx, line));
      });
    });
    tbody.appendChild(fragment);

    updateSectionSubtotal(block);
    updateCollapsedInfo(sec.id, block);
  }

  function updateCollapsedInfo(secId, block) {
    const info = block.querySelector('.section-collapsed-info');
    if (!info) return;
    const s = state.sections.find(s => s.id === secId);
    if (!s) return;
    const count    = s.items.filter(i => i.name || i.unitPrice).length;
    const subtotal = s.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const nameStr = s.name ? `${s.name}　` : '';
    info.textContent = `${nameStr}${count}行　小計: ¥${subtotal.toLocaleString('ja-JP')}`;
  }

  function createItemRowDOM(item) {
    const tmpl  = document.getElementById('itemRowTemplate');
    const clone = tmpl.content.cloneNode(true);
    const row   = clone.querySelector('.item-row');
    row.dataset.itemId  = item.id;
    row.dataset.dragReady = '1';
    attachDragEvents(row);
    return row;
  }

  let dragSrcRow = null;

  function attachDragEvents(row) {
    row.addEventListener('dragstart', e => {
      dragSrcRow = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', row.dataset.itemId);
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      row.closest('.items-tbody')?.querySelectorAll('.item-row').forEach(r => {
        r.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      dragSrcRow = null;
    });
    row.addEventListener('dragover', e => {
      if (!dragSrcRow || dragSrcRow === row) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = row.getBoundingClientRect();
      const isTop = e.clientY < rect.top + rect.height / 2;
      row.closest('.items-tbody')?.querySelectorAll('.item-row').forEach(r => {
        r.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      row.classList.add(isTop ? 'drag-over-top' : 'drag-over-bottom');
    });
    row.addEventListener('drop', e => {
      if (!dragSrcRow || dragSrcRow === row) return;
      e.preventDefault();
      const tbody = row.closest('.items-tbody');
      const block = row.closest('.section-block');
      const secId = Number(block.dataset.sectionId);
      const sec   = state.sections.find(s => s.id === secId);
      if (!sec) return;

      const srcId  = Number(dragSrcRow.dataset.itemId);
      const dstId  = Number(row.dataset.itemId);
      const srcIdx = sec.items.findIndex(i => i.id === srcId);
      const dstIdx = sec.items.findIndex(i => i.id === dstId);
      if (srcIdx === -1 || dstIdx === -1) return;

      const rect  = row.getBoundingClientRect();
      const isTop = e.clientY < rect.top + rect.height / 2;
      const [removed] = sec.items.splice(srcIdx, 1);
      const insertAt  = srcIdx < dstIdx
        ? (isTop ? dstIdx - 1 : dstIdx)
        : (isTop ? dstIdx     : dstIdx + 1);
      sec.items.splice(insertAt, 0, removed);

      renderSection(sec, block);
      updateSectionSubtotal(block);
      updateOutput();
    });
  }

  function createSpecLineRowDOM(itemId, lineIdx, text) {
    const tr = document.createElement('tr');
    tr.className = 'spec-line-row';
    tr.dataset.itemId  = itemId;
    tr.dataset.lineIdx = lineIdx;
    const safeText = (text || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    tr.innerHTML = `
      <td class="spec-line-td" colspan="12">
        <input type="text" class="spec-line-input" placeholder="仕様テキストを入力..."
               value="${safeText}" oninput="app.onSpecLineInput(this)">
      </td>
      <td class="spec-line-del-td">
        <button class="btn-icon btn-danger" onclick="app.removeSpecLine(this)" title="削除">✕</button>
      </td>`;
    return tr;
  }

  function createSpecAddRowDOM(itemId) {
    const tr = document.createElement('tr');
    tr.className = 'spec-add-row';
    tr.dataset.itemId = itemId;
    tr.innerHTML = `
      <td colspan="13" class="spec-add-td">
        <button class="btn-spec-add" onclick="app.addSpecLine(this)">＋ 仕様追加</button>
        <button class="btn-spec-template" onclick="app.showSpecTemplateMenu(this)">📋 テンプレート</button>
      </td>`;
    return tr;
  }

  // ── 仕様行 操作 ───────────────────────────────────────────────

  function onSpecLineInput(input) {
    const row   = input.closest('.spec-line-row');
    const itemId  = Number(row.dataset.itemId);
    const lineIdx = Number(row.dataset.lineIdx);
    const sec = state.sections.find(s => s.items.some(i => i.id === itemId));
    if (!sec) return;
    const item = sec.items.find(i => i.id === itemId);
    if (item && item.specLines) item.specLines[lineIdx] = input.value;
  }

  function addSpecLine(btn) {
    const addRow = btn.closest('.item-row');
    const block  = btn.closest('.section-block');
    const itemId = Number(addRow.dataset.itemId);
    const sec = state.sections.find(s => s.items.some(i => i.id === itemId));
    if (!sec) return;
    const item = sec.items.find(i => i.id === itemId);
    if (!item) return;
    if (!Array.isArray(item.specLines)) item.specLines = [];
    item.specLines.push('');
    renderSection(sec, block);
    // 新しい行にフォーカス
    setTimeout(() => {
      const inputs = block.querySelectorAll(`.spec-line-row[data-item-id="${itemId}"] .spec-line-input`);
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, 30);
  }

  function removeSpecLine(btn) {
    const row    = btn.closest('.spec-line-row');
    const block  = btn.closest('.section-block');
    const itemId  = Number(row.dataset.itemId);
    const lineIdx = Number(row.dataset.lineIdx);
    const sec = state.sections.find(s => s.items.some(i => i.id === itemId));
    if (!sec) return;
    const item = sec.items.find(i => i.id === itemId);
    if (!item || !item.specLines) return;
    item.specLines.splice(lineIdx, 1);
    renderSection(sec, block);
    updateOutput();
  }

  // ── 仕様テンプレート ──────────────────────────────────────────

  async function loadCurrentUser() {
    if (!zohoReady) return;
    try {
      const res = await ZOHO.CRM.CONFIG.getCurrentUser();
      const user = res?.users?.[0];
      if (user) {
        state.currentUserId   = user.id;
        state.currentUserName = user.full_name || '';
      }
    } catch(e) { console.warn('getCurrentUser error:', e); }
  }

  async function showSpecTemplateMenu(btn) {
    const addRow = btn.closest('.item-row');
    const itemId = Number(addRow.dataset.itemId);
    const sec = state.sections.find(s => s.items.some(i => i.id === itemId));
    if (!sec) return;
    const item = sec.items.find(i => i.id === itemId);
    if (!item) return;
    const block = btn.closest('.section-block');

    // 既存メニューを閉じる
    document.querySelectorAll('.spec-template-menu').forEach(m => m.remove());

    // メニュー生成・配置
    const menu = document.createElement('div');
    menu.className = 'spec-template-menu';
    menu.innerHTML = '<div class="stm-loading">🔍 検索中...</div>';
    document.body.appendChild(menu);
    const btnRect = btn.getBoundingClientRect();
    menu.style.left = btnRect.left + 'px';
    menu.style.top  = (btnRect.bottom + 4) + 'px';

    // CRM からテンプレート検索
    let templates = [];
    if (zohoReady) {
      try {
        const productName = (item.name || '').trim();
        const res = productName
          ? await ZOHO.CRM.API.searchRecord({
              Entity: 'SpecModule', Type: 'word',
              Query: productName, page: 1, per_page: 25,
            })
          : null;
        const all = res?.data || [];
        // ログインユーザーのものだけ表示
        templates = state.currentUserId
          ? all.filter(t => t.Owner?.id === state.currentUserId)
          : all;
      } catch(e) { console.warn('テンプレート検索エラー:', e); }
    }

    // メニューHTML
    let html = '';
    if (templates.length > 0) {
      html += '<div class="stm-title">保存済みテンプレート</div>';
      templates.forEach(t => {
        const enc = encodeURIComponent(t.SpecDetails || '');
        html += `<div class="stm-item">
          <span class="stm-name">${t.Name || '（無題）'}</span>
          <button class="stm-apply-btn" data-spec="${enc}">適用</button>
        </div>`;
      });
      html += '<div class="stm-divider"></div>';
    } else {
      html += '<div class="stm-none">テンプレートがありません</div>';
    }
    html += '<button class="stm-save-btn">💾 現在の仕様を保存</button>';
    menu.innerHTML = html;

    menu.querySelectorAll('.stm-apply-btn').forEach(applyBtn => {
      applyBtn.addEventListener('click', e => {
        e.stopPropagation();
        const specText = decodeURIComponent(applyBtn.dataset.spec);
        applySpecTemplate(itemId, specText, block);
        menu.remove();
      });
    });
    menu.querySelector('.stm-save-btn').addEventListener('click', async e => {
      e.stopPropagation();
      await saveSpecTemplate(item);
      menu.remove();
    });

    // 外側クリックで閉じる
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  }

  function applySpecTemplate(itemId, specText, block) {
    const sec = state.sections.find(s => s.items.some(i => i.id === itemId));
    if (!sec) return;
    const item = sec.items.find(i => i.id === itemId);
    if (!item) return;
    item.specLines = specText.split('\n').map(l => l.trim()).filter(l => l);
    renderSection(sec, block);
    updateOutput();
  }

  async function saveSpecTemplate(item) {
    if (!zohoReady) { showToast('Zoho未接続', 'warn'); return; }
    const lines = (item.specLines || []).filter(l => (l || '').trim());
    if (!lines.length) { showToast('仕様行がありません', 'warn'); return; }
    const productName = item.name || '（無題）';
    const specText    = lines.join('\n');
    try {
      // 同名テンプレートを検索（自分のもの）
      const res = await ZOHO.CRM.API.searchRecord({
        Entity: 'SpecModule', Type: 'word',
        Query: productName, page: 1, per_page: 10,
      });
      const existing = (res?.data || []).find(t =>
        t.Name === productName &&
        (!state.currentUserId || t.Owner?.id === state.currentUserId)
      );
      if (existing) {
        if (!confirm(`「${productName}」のテンプレートが既にあります。上書きしますか？`)) return;
        await ZOHO.CRM.API.updateRecord({
          Entity: 'SpecModule',
          APIData: { id: existing.id, SpecDetails: specText },
          Trigger: [],
        });
        showToast('テンプレートを更新しました');
      } else {
        await ZOHO.CRM.API.insertRecord({
          Entity: 'SpecModule',
          APIData: { Name: productName, SpecDetails: specText },
          Trigger: [],
        });
        showToast('テンプレートを保存しました');
      }
    } catch(e) {
      console.error('テンプレート保存エラー:', e);
      showToast('テンプレート保存に失敗しました', 'err');
    }
  }

  // ── 所課別商品マスタ テンプレート機能 ────────────────────────────

  async function loadDepartments() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('DepartmentsList', 'Name');
      state.templateDepts = data.map(d => ({
        id:      d.id,
        code:    d.field1 || '',
        name:    d.Name   || '',
        fax:     d.FAX    || '',
        address: d.field3 || '',
        tel:     d.field4 || '',
        postal:  d.field6 || '',
      }));
      populateBranchSelect();
      populateDeptSelects();
      populateQuoteDeptSelects();
    } catch (e) { console.warn('loadDepartments error:', e); }
  }

  function populateBranchSelect() {
    const sel = document.getElementById('branchSelect');
    if (!sel) return;
    // 既存の CRM オプションを削除
    Array.from(sel.options).forEach(o => { if (o.dataset.crm) o.remove(); });
    // 「その他」の直前に所課エントリを挿入
    const otherOpt = sel.querySelector('option[value="other"]');
    state.templateDepts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = `crm_${d.id}`;
      opt.textContent = d.name;
      opt.dataset.crm = '1';
      sel.insertBefore(opt, otherOpt);
    });
  }

  function populateQuoteDeptSelects() {
    const opts = '<option value="">― 選択 ―</option>' +
      state.templateDepts
        .filter(d => d.code)
        .map(d => `<option value="${escHtml(d.code)}" data-name="${escHtml(d.name)}">${escHtml(d.code)}：${escHtml(d.name)}</option>`)
        .join('');
    const createEl = document.getElementById('createDept');
    const siteEl   = document.getElementById('siteDept');
    if (createEl) { createEl.innerHTML = opts; if (state.createDeptCode) createEl.value = state.createDeptCode; }
    if (siteEl)   { siteEl.innerHTML   = opts; if (state.siteDeptCode)   siteEl.value   = state.siteDeptCode; }
  }

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

  function populateDeptSelects() {
    const opts = '<option value="">― 選択 ―</option>' +
      state.templateDepts.map(d => `<option value="${d.id}">${escHtml(d.name)}</option>`).join('');
    const saveEl = document.getElementById('tplSaveDept');
    const filterEl = document.getElementById('tplFilterDept');
    if (saveEl) saveEl.innerHTML = opts;
    if (filterEl) filterEl.innerHTML = '<option value="">― 所課で絞り込み ―</option>' +
      state.templateDepts.map(d => `<option value="${d.id}">${escHtml(d.name)}</option>`).join('');
  }

  async function showTemplateSaveDialog() {
    if (!zohoReady) { showToast('Zoho未接続', 'warn'); return; }
    if (state.sections.length === 0) { showToast('保存する明細がありません', 'warn'); return; }
    if (state.templateDepts.length === 0) await loadDepartments();
    populateDeptSelects();
    const el = document.getElementById('tplSaveModal');
    if (el) el.style.display = 'flex';
  }

  async function execTemplateSave() {
    const name = (document.getElementById('tplSaveName')?.value || '').trim();
    if (!name) { showToast('テンプレート名を入力してください', 'warn'); return; }
    const type   = (document.getElementById('tplSaveType')?.value || '').trim();
    const deptId = document.getElementById('tplSaveDept')?.value || '';
    const deptName = deptId
      ? (state.templateDepts.find(d => d.id === deptId)?.name || '')
      : '';

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
          kojiCategory: item.kojiCategory,
          specLines: item.specLines,
        })),
      })),
    });

    try {
      const apiData = { Name: name, JSON: tplData };
      if (type) apiData.field17 = type;
      if (deptId) apiData.field21 = { id: deptId, name: deptName };

      // 同名テンプレートを確認
      const existing = state.templateList.find(t => t.name === name);
      if (existing) {
        if (!confirm(`「${name}」は既に存在します。上書きしますか？`)) return;
        await ZOHO.CRM.API.updateRecord({
          Entity: 'CustomModule8', APIData: { id: existing.id, ...apiData }, Trigger: [],
        });
        Object.assign(existing, { type, deptId, deptName });
        showToast('テンプレートを更新しました');
      } else {
        const res = await ZOHO.CRM.API.insertRecord({
          Entity: 'CustomModule8', APIData: apiData, Trigger: [],
        });
        const newId = res?.data?.[0]?.details?.id;
        if (newId) state.templateList.push({ id: newId, name, type, deptId, deptName });
        showToast('テンプレートを保存しました');
      }
      document.getElementById('tplSaveModal').style.display = 'none';
    } catch (e) {
      console.error('テンプレート保存エラー:', e);
      showToast('保存に失敗しました', 'err');
    }
  }

  async function showTemplateLoadDialog() {
    if (!zohoReady) { showToast('Zoho未接続', 'warn'); return; }
    const loadModal = document.getElementById('tplLoadModal');
    if (!loadModal) return;

    if (state.templateDepts.length === 0) await loadDepartments();
    populateDeptSelects();

    document.getElementById('tplFilterDept').value = '';
    document.getElementById('tplFilterType').value = '';
    document.getElementById('tplFilterName').value = '';
    state.selectedTemplateId = null;
    document.getElementById('btnTplLoad').disabled = true;

    loadModal.style.display = 'flex';
    const listEl = document.getElementById('tplList');
    listEl.innerHTML = '<div class="tpl-loading">読み込み中...</div>';

    await loadAllTemplates();
    filterTemplates();
  }

  function filterTemplates() {
    const deptId = document.getElementById('tplFilterDept')?.value || '';
    const typeQ  = (document.getElementById('tplFilterType')?.value || '').trim().toLowerCase();
    const nameQ  = (document.getElementById('tplFilterName')?.value || '').trim().toLowerCase();

    let filtered = state.templateList;
    if (deptId) filtered = filtered.filter(t => t.deptId === deptId);
    if (typeQ)  filtered = filtered.filter(t => t.type.toLowerCase().includes(typeQ));
    if (nameQ)  filtered = filtered.filter(t => t.name.toLowerCase().includes(nameQ));

    const listEl = document.getElementById('tplList');
    if (!listEl) return;

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="tpl-none">テンプレートが見つかりません</div>';
      return;
    }

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
  }

  function selectTemplate(id) {
    state.selectedTemplateId = id;
    document.getElementById('btnTplLoad').disabled = false;
    document.querySelectorAll('.tpl-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.tplId === id);
      const radio = el.querySelector('input[type=radio]');
      if (radio) radio.checked = el.dataset.tplId === id;
    });
  }

  async function execTemplateLoad() {
    if (!state.selectedTemplateId) { showToast('テンプレートを選択してください', 'warn'); return; }
    const mode = document.querySelector('input[name="tplLoadMode"]:checked')?.value || 'add';

    // CRM からテンプレートJSON取得
    let tplData;
    try {
      const res = await ZOHO.CRM.API.getRecord({
        Entity: 'CustomModule8', RecordID: state.selectedTemplateId,
      });
      const record = res?.data?.[0];
      if (!record?.JSON) { showToast('テンプレートデータが空です', 'warn'); return; }
      tplData = JSON.parse(record.JSON);
    } catch (e) {
      console.error('テンプレート読み込みエラー:', e);
      showToast('読み込みに失敗しました', 'err');
      return;
    }

    const tplSections = tplData?.sections || [];
    if (tplSections.length === 0) { showToast('セクションがありません', 'warn'); return; }

    if (mode === 'replace') {
      if (state.sections.length > 0 && !confirm('現在の明細をすべて削除して読み込みますか？')) return;
      state.sections = [];
      state.nextSectionId = 1;
      state.nextItemId    = 1;
    }

    tplSections.forEach(tplSec => {
      const section = {
        id:    state.nextSectionId++,
        no:    state.sections.length + 1,
        name:  tplSec.name || '',
        cat:   tplSec.cat  || '',
        items: [],
      };
      (tplSec.items || []).forEach(tplItem => {
        const item = createItem();
        item.name       = tplItem.name       || '';
        item.spec       = tplItem.spec       || '';
        item.qty        = tplItem.qty        ?? 1;
        item.unit       = tplItem.unit       || '式';
        item.unitPrice  = tplItem.unitPrice  ?? null;
        item.amount     = tplItem.amount     ?? 0;
        item.genka      = tplItem.genka      ?? 0;
        item.includeInLabor = tplItem.includeInLabor ?? false;
        item.dairiRate  = tplItem.dairiRate  ?? null;
        item.calcCategory  = tplItem.calcCategory  || '';
        item.houdan        = tplItem.houdan        ?? 0;
        item.houkouDirect  = tplItem.houkouDirect  ?? 0;
        item.houkouKubun   = tplItem.houkouKubun   || '';
        item.gensuiKubun   = tplItem.gensuiKubun   || '';
        item.gensuiA       = tplItem.gensuiA       || 0;
        item.gensuiB       = tplItem.gensuiB       || 0;
        item.kojiCategory  = tplItem.kojiCategory  || '';
        item.specLines     = Array.isArray(tplItem.specLines) ? [...tplItem.specLines] : [];
        section.items.push(item);
      });
      if (section.items.length === 0) section.items.push(createItem());
      state.sections.push(section);
    });

    renumberSections();
    renderSections();
    updateOutput();
    document.getElementById('tplLoadModal').style.display = 'none';
    showToast(`テンプレートを${mode === 'replace' ? '置き換え' : '追加'}しました`);
    document.getElementById('noSectionsMsg').style.display = 'none';
  }

  function updateSectionSubtotal(block) {
    const secId  = Number(block.dataset.sectionId);
    const sec    = state.sections.find(s => s.id === secId);
    if (!sec) return;
    const subtotal = sec.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const secQty   = Math.max(1, Number(sec.secQty) || 1);
    const el = block.querySelector('.subtotal-val');
    if (el) el.textContent = '¥' + subtotal.toLocaleString('ja-JP');

    // 代理店価格小計（掛率が設定されている行がある場合のみ表示）
    const globalRate = state.mainRate;
    const hasDairiRate = globalRate != null || sec.items.some(i => i.dairiRate != null);
    const dairiWrap = block.querySelector('.dairi-subtotal-wrap');
    const dairiVal  = block.querySelector('.dairi-subtotal-val');
    if (dairiWrap && dairiVal) {
      if (hasDairiRate) {
        const dairiSubtotal = sec.items.reduce((sum, i) => {
          const rate = i.dairiRate ?? globalRate;
          return sum + (rate != null ? Math.round((Number(i.amount) || 0) * rate) : 0);
        }, 0);
        dairiVal.textContent = '¥' + dairiSubtotal.toLocaleString('ja-JP');
        dairiWrap.style.display = '';
      } else {
        dairiWrap.style.display = 'none';
      }
    }

    // 式数合計（secQty > 1 のときのみ表示）
    const qtyWrap  = block.querySelector('.sec-qty-total-wrap');
    const qtyNum   = block.querySelector('.sec-qty-num');
    const qtyTotal = block.querySelector('.sec-qty-total-val');
    if (qtyWrap && qtyNum && qtyTotal) {
      if (secQty > 1) {
        qtyNum.textContent   = secQty;
        qtyTotal.textContent = '¥' + (subtotal * secQty).toLocaleString('ja-JP');
        qtyWrap.style.display = '';
      } else {
        qtyWrap.style.display = 'none';
      }
    }

    updateOutput();
  }

  // ── PDF出力タブ 更新 ──────────────────────────────────────────

  function updateOutput() {
    readFormToState();

    // FRPモード時は専用合計を使用
    if (state.frpMode) {
      const shikiriKey   = state.frpAB === 'A' ? 'priceA' : 'priceB';
      const frpItemsSafe     = state.frpItems || [];
      const frpPriceTotal    = frpItemsSafe.reduce((s, i) => s + i.price * (Number(i.qty)||1), 0);
      const frpShikiriTotal  = frpItemsSafe.reduce((s, i) => s + (i[shikiriKey]||0) * (Number(i.qty)||1), 0);
      state.deliveryPrice    = frpShikiriTotal;
      state.dairiTotal       = frpShikiriTotal;

      setText('basicGrandTotal',   frpPriceTotal.toLocaleString('ja-JP'));
      setText('basicDairiTotal',   frpShikiriTotal.toLocaleString('ja-JP'));
      setText('basicDeliveryPrice', frpShikiriTotal.toLocaleString('ja-JP'));
      setText('basicGenkaTotal',   '0');
      setText('basicAraRi',        '0');
      setText('basicAraRiRate',    '―');

      const rowDairi = document.getElementById('rowDairiTotal');
      if (rowDairi) rowDairi.style.display = '';
      const dpHidden = document.getElementById('deliveryPrice');
      if (dpHidden) dpHidden.value = frpShikiriTotal;
      const pdfModeGrp = document.getElementById('pdfPriceModeGroup');
      if (pdfModeGrp) pdfModeGrp.style.display = '';

      setText('sum-quoteNo',   state.seqNo || '（未採番）');
      setText('sum-date',      formatDisplayDate(new Date(getValue('quoteDate') || Date.now())));
      setText('sum-customer',  getValue('customerName') || '-');
      setText('sum-project',   getValue('projectName')  || '-');
      setText('sum-sections',  frpItemsSafe.length + '件');
      setText('sum-total',     '¥' + frpPriceTotal.toLocaleString('ja-JP'));
      setText('sum-dairi',     '¥' + frpShikiriTotal.toLocaleString('ja-JP'));
      setText('sum-discount',  '¥0');
      setText('sum-delivery',  '¥' + frpShikiriTotal.toLocaleString('ja-JP'));
      setText('sum-material',  '―');
      setText('sum-labor',     '―');
      setText('sum-welfare',   '―');
      setText('sum-anzen',     '―');
      const sumDairiRow = document.getElementById('sum-dairi-row');
      if (sumDairiRow) sumDairiRow.style.display = '';

      setText('grandTotalDisplay', '¥' + frpPriceTotal.toLocaleString('ja-JP'));
      updateQuoteNoBadge();
      return; // 通常の集計処理をスキップ
    }

    // 減衰計算: 各行の houkouGoukei を更新し、全グループの減衰後歩工合計を取得
    const totalReducedHoukou = calcGensui();

    // DOM に歩工合計を反映
    const container = document.getElementById('sectionsContainer');
    state.sections.forEach(sec => {
      const block = container?.querySelector(`[data-section-id="${sec.id}"]`);
      if (!block) return;

      sec.items.forEach(item => {
        const row = block.querySelector(`[data-item-id="${item.id}"]`);
        if (!row) return;

        // 歩工合計の表示更新
        const hasHoudan = (Number(item.houdan) || 0) > 0;
        const hasDirect = (Number(item.houkouDirect) || 0) > 0;
        if (hasHoudan || hasDirect) {
          const goukeiEl = row.querySelector('.item-houkou-goukei');
          const houkouEl = row.querySelector('.item-houkou');
          if (goukeiEl && goukeiEl !== document.activeElement) {
            goukeiEl.value = item.houkouGoukei ? item.houkouGoukei.toFixed(2) : '';
          }
          if (houkouEl) {
            houkouEl.textContent = item.houkouGoukei ? item.houkouGoukei.toFixed(2) : '';
          }
        }

        // ④工事費行の単価・金額を DOM に反映（減衰計算オン/オフ切替後など）
        if (item.calcCategory === '④工事費') {
          const priceEl  = row.querySelector('.item-price');
          const amountEl = row.querySelector('.item-amount');
          if (priceEl  && priceEl  !== document.activeElement) priceEl.value  = item.unitPrice ? item.unitPrice.toLocaleString('ja-JP') : '';
          if (amountEl && amountEl !== document.activeElement) amountEl.value = item.amount    ? item.amount.toLocaleString('ja-JP')    : '';
        }
      });

      // セクション小計・代理店価格小計を直接更新
      // （updateSectionSubtotal は内部で updateOutput を呼ぶため、ここでは直接更新する）
      const secSubtotal = sec.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const secQtyVal   = Math.max(1, Number(sec.secQty) || 1);
      const subtotalEl  = block.querySelector('.subtotal-val');
      if (subtotalEl) subtotalEl.textContent = '¥' + secSubtotal.toLocaleString('ja-JP');
      const hasDairiRate2 = state.mainRate != null || sec.items.some(i => i.dairiRate != null);
      const dairiWrap2 = block.querySelector('.dairi-subtotal-wrap');
      const dairiVal2  = block.querySelector('.dairi-subtotal-val');
      if (dairiWrap2 && dairiVal2) {
        if (hasDairiRate2) {
          const dairiSub2 = sec.items.reduce((sum, i) => {
            const r = i.dairiRate ?? state.mainRate;
            return sum + (r != null ? Math.round((Number(i.amount) || 0) * r) : 0);
          }, 0);
          dairiVal2.textContent = '¥' + (dairiSub2 * secQtyVal).toLocaleString('ja-JP');
          dairiWrap2.style.display = '';
        } else {
          dairiWrap2.style.display = 'none';
        }
      }
      const qtyWrap2  = block.querySelector('.sec-qty-total-wrap');
      const qtyNum2   = block.querySelector('.sec-qty-num');
      const qtyTotal2 = block.querySelector('.sec-qty-total-val');
      if (qtyWrap2 && qtyNum2 && qtyTotal2) {
        if (secQtyVal > 1) {
          qtyNum2.textContent   = secQtyVal;
          qtyTotal2.textContent = '¥' + (secSubtotal * secQtyVal).toLocaleString('ja-JP');
          qtyWrap2.style.display = '';
        } else {
          qtyWrap2.style.display = 'none';
        }
      }
    });

    const sections     = state.sections;
    const grandTotal   = sections.reduce((sum, s) => {
      const secQty  = Math.max(1, Number(s.secQty) || 1);
      const subtotal = s.items.reduce((ss, i) => ss + (Number(i.amount) || 0), 0);
      return sum + subtotal * secQty;
    }, 0);

    // 代理店価格合計（main_rate が設定されている場合のみ・行ごとの掛率優先）
    const mainRate = state.mainRate;
    const dairiTotal = mainRate != null
      ? sections.reduce((sum, s) => {
          const secQty = Math.max(1, Number(s.secQty) || 1);
          const dairiSubtotal = s.items.reduce((ss, i) => {
            const rate = i.dairiRate ?? mainRate;
            return ss + Math.round((Number(i.amount) || 0) * rate);
          }, 0);
          return sum + dairiSubtotal * secQty;
        }, 0)
      : null;
    state.dairiTotal = dairiTotal;

    // 値引き額（手入力）→ 貴社お渡し価格 = 代理店価格合計（or 明細合計） - 値引き額
    const discount      = Number(getValue('discountAmount')) || 0;
    const deliveryPrice = Math.max(0, (dairiTotal != null ? dairiTotal : grandTotal) - discount);

    // state に反映（saveToCRM/buildPdfData で使用）
    state.discount      = discount;
    state.deliveryPrice = deliveryPrice;

    // 原価合計
    const genkaTotal = sections.reduce((sum, s) => {
      const secQty = Math.max(1, Number(s.secQty) || 1);
      const sGenka = s.items.reduce((ss, i) => {
        const genka = Number(i.genka) || 0;
        const qty   = Number(i.qty)   || 1;
        return ss + genka * qty;
      }, 0);
      return sum + sGenka * secQty;
    }, 0);

    // ①基本情報の表示を更新
    const araRi     = deliveryPrice - genkaTotal;
    const araRiRate = deliveryPrice > 0 ? (araRi / deliveryPrice * 100) : null;

    setText('basicGrandTotal',   grandTotal.toLocaleString('ja-JP'));
    setText('basicGenkaTotal',   genkaTotal.toLocaleString('ja-JP'));
    setText('basicAraRi',        araRi.toLocaleString('ja-JP'));
    setText('basicAraRiRate',    araRiRate != null ? araRiRate.toFixed(1) : '―');
    // 代理店価格合計行の表示切替
    const rowDairi = document.getElementById('rowDairiTotal');
    if (rowDairi) rowDairi.style.display = dairiTotal != null ? '' : 'none';
    setText('basicDairiTotal', dairiTotal != null ? dairiTotal.toLocaleString('ja-JP') : '0');
    setText('basicDeliveryPrice', deliveryPrice.toLocaleString('ja-JP'));
    // PDF価格モード選択の表示切替
    const pdfModeGrp = document.getElementById('pdfPriceModeGroup');
    if (pdfModeGrp) pdfModeGrp.style.display = dairiTotal != null ? '' : 'none';
    const dpHidden = document.getElementById('deliveryPrice');
    if (dpHidden) dpHidden.value = deliveryPrice;

    const legalRate    = (Number(getValue('legalWelfareRate')) || 14.6) / 100;
    // 工事費合計 = 労務チェック行の代理店価格合計（掛率適用後）
    const koujihi = state.sections.reduce((sum, s) =>
      sum + s.items.reduce((ss, i) => {
        if (!i.includeInLabor) return ss;
        const r = i.dairiRate ?? state.mainRate;
        const amt = Number(i.amount) || 0;
        return ss + (r != null ? Math.round(amt * r) : amt);
      }, 0), 0);
    // 労務費 = 手入力優先、なければ逆算（工事費 ÷ (1 + 法定福利費率)）
    const manualLaborCost = Number(getValue('laborCost')) || 0;
    const laborCost    = manualLaborCost > 0
      ? manualLaborCost
      : Math.round(koujihi / (1 + legalRate));
    const legalWelfare = manualLaborCost > 0
      ? Math.round(manualLaborCost * legalRate)
      : koujihi - laborCost;
    const anzenCost    = Number(getValue('anzenCost')) || 0;
    const materialCost = deliveryPrice - koujihi - anzenCost;

    const quoteNoStr   = state.seqNo || '（未採番）';
    setText('sum-quoteNo',    quoteNoStr);
    setText('sum-date',       formatDisplayDate(new Date(getValue('quoteDate') || Date.now())));
    setText('sum-customer',   getValue('customerName') || '-');
    setText('sum-project',    getValue('projectName')  || '-');
    setText('sum-sections',   sections.length);
    setText('sum-total',      '¥' + grandTotal.toLocaleString('ja-JP'));
    const sumDairiRow = document.getElementById('sum-dairi-row');
    if (sumDairiRow) sumDairiRow.style.display = dairiTotal != null ? '' : 'none';
    setText('sum-dairi',      dairiTotal != null ? '¥' + dairiTotal.toLocaleString('ja-JP') : '¥0');
    setText('sum-discount',   discount > 0 ? '¥' + discount.toLocaleString('ja-JP') : '¥0');
    setText('sum-delivery',   '¥' + deliveryPrice.toLocaleString('ja-JP'));
    setText('sum-material',   '¥' + Math.max(0, materialCost).toLocaleString('ja-JP'));
    setText('sum-labor',      '¥' + laborCost.toLocaleString('ja-JP'));
    setText('sum-welfare',    '¥' + legalWelfare.toLocaleString('ja-JP'));
    setText('sum-welfare-label', `　3) 法定福利費(${(legalRate * 100).toFixed(1)}%)`);
    setText('sum-anzen',      '¥' + anzenCost.toLocaleString('ja-JP'));
    setText('grandTotalDisplay', '¥' + grandTotal.toLocaleString('ja-JP'));

    updateQuoteNoBadge();
  }

  function updateQuoteNoBadge() {
    const badge   = document.getElementById('quoteNoBadge');
    const display = document.getElementById('quoteNoDisplay');
    const text    = state.seqNo || '採番待ち';
    if (badge)   badge.textContent   = text;
    if (display) display.textContent = state.seqNo || '（未採番）';
  }

  /** フォーム値を state へ読み込む */
  function readFormToState() {
    // seqNo は採番ボタンで確定するため readFormToState では読まない
    state.customerName   = getValue('customerName');
    state.projectName    = getValue('projectName');
    state.projectName2   = getValue('projectName2') || '';
    state.projectName3   = getValue('projectName3') || '';
    state.ownerName      = getValue('ownerName');
    state.deliveryTerm   = getValue('deliveryTerm');
    state.deliveryMethod = getValue('deliveryMethod');
    state.paymentTerm    = getValue('paymentTerm');
    state.validDays      = getValue('validDays') || '';
    state.remarks        = getValue('remarks') || '';
    state.discount       = Number(getValue('discountAmount')) || 0;
    state.laborCost      = getValue('laborCost') ? Number(getValue('laborCost')) : null;
    state.anzenCost      = Number(getValue('anzenCost')) || 0;
    state.legalWelfareRate = Number(getValue('legalWelfareRate')) || 14.6;
    state.branchKey      = getValue('branchSelect');
    const dateVal = getValue('quoteDate');
    state.submitDate = dateVal ? new Date(dateVal) : null;
    state.date = state.submitDate || new Date();
  }

  // ── PDF 生成 ─────────────────────────────────────────────────

  async function generatePDF() {
    readFormToState();

    if (!state.seqNo) {
      if (!confirm('見積番号が未設定です。このまま生成しますか？')) return;
    }

    const btn = document.getElementById('btnGeneratePDF');
    btn.disabled = true;
    btn.textContent = '⏳ 生成中...';
    const statusEl = document.getElementById('pdfStatus');
    statusEl.textContent = '';

    try {
      const data = buildPdfData();
      const blob = await QuotationPDF.getBlob(data);
      const quoteNo = data.quoteNoStr || data.seqNo || '未採番';
      const fname   = `御見積書_${quoteNo}_${data.customerName || ''}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      statusEl.textContent = '✅ PDFをダウンロードしました';
      showToast('PDF生成完了');
    } catch (e) {
      console.error('PDF生成エラー:', e);
      statusEl.textContent = '❌ PDF生成失敗: ' + e.message;
      alert('PDF生成失敗: ' + e.message);
      showToast('PDF生成に失敗しました', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = '📄 PDF生成・ダウンロード';
    }
  }

  /** PDF 生成用データオブジェクトを組み立てる */
  function buildPdfData() {
    collectExclusions();
    return {
      seqNo:           state.seqNo,
      quoteNoStr:      state.seqNo || '（未採番）',
      revision:        state.revision,
      date:            state.submitDate || state.date,
      customerName:    state.customerName,
      projectName:     state.projectName,
      projectName2:    state.projectName2 || undefined,
      projectName3:    state.projectName3 || undefined,
      ownerName:       state.ownerName,
      deliveryTerm:    state.deliveryTerm,
      deliveryMethod:  state.deliveryMethod,
      paymentTerm:     state.paymentTerm,
      validDays:       state.validDays,
      deliveryPrice:   state.deliveryPrice,
      laborCost:       (() => {
        const koujihi = state.sections.reduce((sum, s) =>
          sum + s.items.reduce((ss, i) => {
            if (!i.includeInLabor) return ss;
            const r = i.dairiRate ?? state.mainRate;
            const amt = Number(i.amount) || 0;
            return ss + (r != null ? Math.round(amt * r) : amt);
          }, 0), 0);
        const rate = (Number(state.legalWelfareRate) || 14.6) / 100;
        return state.laborCost != null
          ? state.laborCost
          : Math.round(koujihi / (1 + rate));
      })(),
      anzenCost:       state.anzenCost || 0,
      legalWelfareRate: state.legalWelfareRate,
      branchKey:       state.branchKey,
      branchName:      getValue('branchName')    || undefined,
      branchPostal:    getValue('branchPostal')  || undefined,
      branchAddress:   getValue('branchAddress') || undefined,
      branchTel:       getValue('branchTel')     || undefined,
      branchFax:       getValue('branchFax')     || undefined,
      branchNote:      getValue('branchNote')    || undefined,
      sections:        state.sections,
      exclusions:      state.exclusions.length > 0 ? state.exclusions : undefined,
      remarks:         state.remarks || undefined,
      discount:        state.discount || undefined,
      quoteCategory:   state.quoteCategory || '',
      printDetail:     (() => {
        const isKouji = (state.quoteCategory || '').includes('工事');
        if (isKouji || state.frpMode) return true; // 工事・FRPは常に明細印刷
        const cb = document.getElementById('printDetailPages');
        return cb ? cb.checked : true;
      })(),
      dairiTotal:      state.dairiTotal != null ? state.dairiTotal : undefined,
      mainRate:        state.mainRate   != null ? state.mainRate   : undefined,
      pdfPriceMode:    (() => {
        const radios = document.getElementsByName('pdfPriceMode');
        for (const r of radios) { if (r.checked) return r.value; }
        return 'teika';
      })(),
      showUchiwake:     (() => {
        const cat = state.quoteCategory || '';
        if (cat.includes('物販')) return false;
        if (cat.includes('作業')) {
          const cb = document.getElementById('printNaiyaku');
          return cb ? cb.checked : true;
        }
        return true; // 工事は常に表示
      })(),
      frpMode:   state.frpMode  || false,
      frpAB:     state.frpAB    || 'A',
      frpItems:  state.frpMode ? (state.frpItems || []) : undefined,
    };
  }

  // ── CRM 保存 ─────────────────────────────────────────────────

  async function saveToCRM() {
    const statusEl = document.getElementById('saveStatus');
    if (!zohoReady || !state.quoteId) {
      statusEl.textContent = '⚠️ ZohoCRM に接続されていません（zohoReady=' + zohoReady + ', quoteId=' + state.quoteId + '）';
      showToast('ZohoCRM に接続されていません', 'warn');
      return;
    }
    const btn = document.getElementById('btnSaveToCRM');
    btn.disabled = true;
    statusEl.textContent = '⏳ 保存中...';

    try {
      readFormToState();
      console.log('保存開始 quoteId:', state.quoteId, 'sections:', state.sections.length);

      collectExclusions();
      const jsonStr = JSON.stringify({
        sections:      state.sections,
        deliveryPrice: state.deliveryPrice,
        laborCost:     state.laborCost,
        seqNo:         state.seqNo,
        revision:      state.revision,
        exclusions:    state.exclusions,
        remarks:        state.remarks        || undefined,
        discount:       state.discount       || undefined,
        subformRowIds:  state.subformRowIds?.length ? state.subformRowIds : undefined,
        // FRP
        frpMode:       state.frpMode  || undefined,
        frpAB:         state.frpMode ? state.frpAB : undefined,
        frpItems:      state.frpMode && state.frpItems.length ? state.frpItems : undefined,
      });

      // field60/61/62 用に金額を再計算
      const saveGrandTotal    = state.sections.reduce((sum, s) =>
        sum + s.items.reduce((ss, i) => ss + (Number(i.amount) || 0), 0), 0);
      const saveDiscount      = state.discount || 0;
      const saveDairiTotal    = state.dairiTotal;
      const saveDeliveryPrice = Math.max(0, (saveDairiTotal != null ? saveDairiTotal : saveGrandTotal) - saveDiscount);

      const apiData = {
        id:      state.quoteId,
        JSON:    jsonStr,
        field55: state.seqNo      ? String(state.seqNo)      : undefined,
        field56: state.revision   ? Number(state.revision)   : undefined,
        field6:  state.deliveryTerm,
        field51: state.deliveryMethod,
        field57: state.paymentTerm,
        field58: state.validDays,
        field59: state.remarks    || undefined,
        field60: saveGrandTotal,    // 明細合計（定価）
        field61: saveDiscount,      // 値引き額（0も明示的に送信）
        field62: saveDeliveryPrice, // 貴社お渡し価格
        field64: state.submitDate ? formatDateInput(state.submitDate) : undefined, // 見積提出日
        field8:  state.projectName2 || undefined, // 件名2行目
        field7:  state.projectName3 || undefined, // 件名3行目
        // サブフォームは後続の処理で deleteRecord + updateRecord で個別処理
        // ここでは挿入データのみ準備する
        _subformCurrentItems: state.sections.flatMap(sec =>
          sec.items.filter(item => item.name || item.unitPrice)
        ),
      };
      // undefined のキーを除去
      Object.keys(apiData).forEach(k => { if (apiData[k] === undefined) delete apiData[k]; });

      console.log('【保存内容】', {
        quoteId:        state.quoteId,
        seqNo:          apiData.field55,
        revision:       apiData.field56,
        grandTotal:     apiData.field60,
        discount:       apiData.field61,
        deliveryPrice:  apiData.field62,
        deliveryTerm:   apiData.field6,
        deliveryMethod: apiData.field51,
        paymentTerm:    apiData.field57,
        validDays:      apiData.field58,
        jsonLen:        jsonStr.length,
        subformCount: apiData.LinkingModule1?.length || 0,
        subformSample: apiData.LinkingModule1?.slice(0, 2),
      });

      // ① まずサブフォームなしで基本フィールドを保存
      const apiDataMain = Object.assign({}, apiData);
      delete apiDataMain.LinkingModule1;
      const updateRes = await ZOHO.CRM.API.updateRecord({
        Entity:  'Quotes',
        APIData: apiDataMain,
        Trigger: [],
      });
      console.log('updateRecord(main) response:', JSON.stringify(updateRes));

      const resData = updateRes?.data?.[0];
      if (resData?.code !== 'SUCCESS') {
        const apiName = resData?.details?.api_name || '';
        const msg = apiName
          ? `フィールド "${apiName}" が見つかりません`
          : (resData?.message || JSON.stringify(resData));
        statusEl.textContent = '⚠️ ' + msg;
        showToast('保存に問題があります', 'warn');
        console.warn('CRM main保存レスポンス:', JSON.stringify(updateRes));
        return;
      }

      // ② サブフォームを deleteRecord で旧行削除 → updateRecord で新規挿入
      const currentItems = apiData._subformCurrentItems || [];
      delete apiData._subformCurrentItems;
      const oldIds = state.subformRowIds || [];

      // ②-a 旧行を LinkingModule1 レコードとして直接削除
      if (oldIds.length > 0) {
        await ZOHO.CRM.API.deleteRecord({
          Entity:   'LinkingModule1',
          RecordID: oldIds,
        });
        state.subformRowIds = [];
      }

      // ②-b 現在の明細を新規挿入
      let newIds = [];
      if (currentItems.length > 0) {
        const insertRows = currentItems.map(item => ({
          quoteType:    item.name              || '',
          Product_Code: item.spec              || '',
          quantity:     Number(item.qty)       || 1,
          Usage_Unit:   item.unit              || '式',
          Unit_Price:   Number(item.unitPrice) || 0,
          field10:      Number(item.amount)    || 0,
        }));
        const insRes = await ZOHO.CRM.API.updateRecord({
          Entity:  'Quotes',
          APIData: { id: state.quoteId, LinkingModule1: insertRows },
          Trigger: [],
        });
        const insData = insRes?.data?.[0];
        if (insData?.code === 'SUCCESS') {
          newIds = (insData?.details?.LinkingModule1 || [])
            .filter(r => r.status === 'success')
            .map(r => r.id)
            .filter(Boolean);
        } else {
          console.warn('サブフォーム挿入失敗:', JSON.stringify(insData));
        }
      }

      // ③ 新しいIDをJSONに書き直して保存（次回削除のため）
      state.subformRowIds = newIds;
      const updatedJson = JSON.stringify({
        sections:      state.sections,
        deliveryPrice: state.deliveryPrice,
        laborCost:     state.laborCost,
        seqNo:         state.seqNo,
        revision:      state.revision,
        exclusions:    state.exclusions,
        remarks:       state.remarks   || undefined,
        discount:      state.discount  || undefined,
        subformRowIds: newIds.length   ? newIds : undefined,
      });
      await ZOHO.CRM.API.updateRecord({
        Entity:  'Quotes',
        APIData: { id: state.quoteId, JSON: updatedJson },
        Trigger: [],
      });
      statusEl.textContent = '✅ 保存しました（' + new Date().toLocaleTimeString('ja-JP') + '）';
      showToast('CRMに保存しました');
    } catch (e) {
      const errData = e?.data?.[0];
      const msg = errData
        ? JSON.stringify(errData)
        : (e?.message || String(e) || 'Unknown error');
      statusEl.textContent = '❌ 保存失敗: ' + msg;
      showToast('保存失敗: ' + msg, 'err');
      console.error('saveToCRM error full:', JSON.stringify(e?.data || e, null, 2));
    } finally {
      btn.disabled = false;
    }
  }

  // ── タブ切り替え ──────────────────────────────────────────────

  function goToTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    if (tabName === 'output') updateOutput();
    if (tabName === 'summary') renderSummaryTable();
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => goToTab(btn.dataset.tab));
  });

  // ── 見積まとめ（集計表）─────────────────────────────────────────

  const SUMMARY_CATEGORIES = {
    '①': '①配管部材',
    '②': '②支持具・雑部材',
    '③': '③配線部材',
    '④': '④工事費',
  };
  const SUMMARY_ORDER = ['①', '②', '③', '④'];

  function renderSummaryTable() {
    const container = document.getElementById('summaryTableContainer');
    if (!container) return;

    if (state.sections.length === 0) {
      container.innerHTML = '<p style="color:#888;padding:16px;">明細データがありません。②見積明細でデータを入力してください。</p>';
      return;
    }

    let grandTotal = 0;
    let html = '';

    state.sections.forEach(sec => {
      const catTotals = {};
      const normalItems = [];

      (sec.items || []).forEach(item => {
        const prefix = (item.calcCategory || '').trim().charAt(0);
        if (SUMMARY_CATEGORIES[prefix]) {
          catTotals[prefix] = (catTotals[prefix] || 0) + (Number(item.amount) || 0);
        } else {
          normalItems.push(item);
        }
      });

      const secTotal = (sec.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
      grandTotal += secTotal;

      html += `<div class="summary-section-block">
        <div class="summary-section-header">No.${sec.no}　${escHtml(sec.name || '')}</div>
        <table class="summary-detail-table">
          <thead><tr><th>項目</th><th>数量</th><th>単位</th><th>単価</th><th>金額</th></tr></thead>
          <tbody>`;

      normalItems.forEach(item => {
        html += `<tr>
          <td>${escHtml(item.name || '')}</td>
          <td class="num">${item.qty || 1}</td>
          <td class="center">${escHtml(item.unit || '式')}</td>
          <td class="num">${item.unitPrice ? Number(item.unitPrice).toLocaleString('ja-JP') : ''}</td>
          <td class="num">${(Number(item.amount) || 0).toLocaleString('ja-JP')}</td>
        </tr>`;
      });

      SUMMARY_ORDER.forEach(prefix => {
        const amount = catTotals[prefix];
        if (!amount) return;
        html += `<tr class="summary-cat-row">
          <td>${escHtml(SUMMARY_CATEGORIES[prefix])}</td>
          <td class="num">1</td>
          <td class="center">式</td>
          <td class="num"></td>
          <td class="num">${amount.toLocaleString('ja-JP')}</td>
        </tr>`;
      });

      html += `</tbody>
          <tfoot><tr class="summary-subtotal">
            <td colspan="4" class="center">小　計</td>
            <td class="num">${secTotal.toLocaleString('ja-JP')}</td>
          </tr></tfoot>
        </table>
      </div>`;
    });

    html += `<div class="summary-grand-total">
      合　計　<span>¥${grandTotal.toLocaleString('ja-JP')}</span>
    </div>`;

    container.innerHTML = html;
  }

  function generateSummaryPDF() {
    const data = buildPdfData();
    QuotationPDF.downloadSummary(data);
  }

  // ── 営業所切り替え ────────────────────────────────────────────

  function onBranchChange() {
    const val = getValue('branchSelect');
    const customDiv = document.getElementById('branchCustomInput');
    if (val === 'honbu') {
      if (customDiv) customDiv.style.display = 'none';
    } else if (val.startsWith('crm_')) {
      const deptId = val.replace('crm_', '');
      const dept = state.templateDepts.find(d => String(d.id) === deptId);
      if (dept) {
        setValue('branchName',    dept.name);
        setValue('branchPostal',  dept.postal);
        setValue('branchAddress', dept.address);
        setValue('branchTel',     dept.tel);
        setValue('branchFax',     dept.fax);
      }
      if (customDiv) customDiv.style.display = '';
    } else {
      // other: 手入力
      setValue('branchName',    '');
      setValue('branchPostal',  '');
      setValue('branchAddress', '');
      setValue('branchTel',     '');
      setValue('branchFax',     '');
      if (customDiv) customDiv.style.display = '';
    }
  }

  // ── ユーティリティ ────────────────────────────────────────────

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(date) {
    if (isNaN(date)) return '-';
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.style.display = 'none';
  }

  function showToast(msg, type = 'info') {
    const colors = { info: '#1a4d8f', warn: '#856404', err: '#c0392b' };
    const div = document.createElement('div');
    div.textContent = msg;
    Object.assign(div.style, {
      position: 'fixed', bottom: '70px', right: '16px',
      background: colors[type] || '#333', color: '#fff',
      padding: '8px 14px', borderRadius: '6px',
      fontSize: '12px', zIndex: '200',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      opacity: '1', transition: 'opacity 0.5s',
    });
    document.body.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; }, 2500);
    setTimeout(() => div.remove(), 3100);
  }

  function onGensuiToggle() {
    const cb = document.getElementById('gensuiEnabled');
    state.gensuiEnabled = cb ? cb.checked : true;
    // 全セクションの④工事費を再計算してDOMに反映
    const container = document.getElementById('sectionsContainer');
    state.sections.forEach(sec => {
      recalcKoujihiInSection(sec);
      const block = container?.querySelector(`[data-section-id="${sec.id}"]`);
      if (!block) return;
      sec.items.forEach(koItem => {
        if (koItem.calcCategory !== '④工事費') return;
        const koRow = block.querySelector(`[data-item-id="${koItem.id}"]`);
        if (!koRow) return;
        const koPriceEl  = koRow.querySelector('.item-price');
        const koAmountEl = koRow.querySelector('.item-amount');
        const koGoukeiEl = koRow.querySelector('.item-houkou-goukei');
        const koHoukouEl = koRow.querySelector('.item-houkou');
        if (koPriceEl)  koPriceEl.value  = koItem.unitPrice ? koItem.unitPrice.toLocaleString('ja-JP') : '';
        if (koAmountEl) koAmountEl.value = koItem.amount    ? koItem.amount.toLocaleString('ja-JP')    : '';
        if (koGoukeiEl) koGoukeiEl.value = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
        if (koHoukouEl) koHoukouEl.textContent = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
      });
    });
    updateOutput();
  }

  // ── 公開API ───────────────────────────────────────────────────

  return {
    init,
    // タブ
    goToTab,
    // セクション
    addSection,
    removeSection,
    moveSectionUp,
    moveSectionDown,
    // カテゴリタブ
    switchCatTab,
    execCatAdd,
    // 明細行
    addItem,
    removeItem,
    moveItemUp,
    moveItemDown,
    applyBulkRate,
    applyGlobalRate,
    // 商品検索
    searchProducts,
    selectProduct,
    // 管材・電材検索
    searchKanzai,
    searchDenzai,
    execMaterialAdd,
    // 採番
    autoNumber,
    // 営業所
    onBranchChange,
    // 標準項
    execStandardAdd,
    execProductAdd,
    // 見積外工事
    onExclusionChange,
    updateExclusionCount,
    applyExclusionPreset,
    // PDF
    generatePDF,
    generateSummaryPDF,
    // 貴社お渡し価格リセット
    resetDeliveryPrice: () => {
      const el = document.getElementById('deliveryPrice');
      if (el) el.value = '';
      updateOutput();
    },
    // 仕様行
    addSpecLine,
    removeSpecLine,
    onSpecLineInput,
    showSpecTemplateMenu,
    // 列表示
    toggleColDropdown,
    setColVisibility,
    // テンプレート
    showTemplateSaveDialog,
    execTemplateSave,
    showTemplateLoadDialog,
    filterTemplates,
    selectTemplate,
    execTemplateLoad,
    // CRM保存
    saveToCRM,
    // FRPモード
    switchFrpMode, setFrpAB,
    removeFrpItem,
    // 減衰計算オン/オフ
    onGensuiToggle,
  };

})();

// ── 起動 ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.app = app;
  document.getElementById('btnAutoNumber').addEventListener('click', () => app.autoNumber());
  app.init();
});
