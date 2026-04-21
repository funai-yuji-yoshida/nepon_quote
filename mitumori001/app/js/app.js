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

    // houdan > 0 かつ houkouDirect <= 0 のアイテムを calcCategory でグループ化
    const groups = {};
    state.sections.forEach(sec => {
      sec.items.forEach(item => {
        if ((Number(item.houdan) || 0) <= 0) return;
        if ((Number(item.houkouDirect) || 0) > 0) return; // 直接値アイテムはスキップ
        const key = item.calcCategory || '_default';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });
    });

    Object.values(groups).forEach(items => {
      // d = 累計歩工（Σ qty × 歩単）
      const d = items.reduce((sum, it) =>
        sum + (Number(it.qty) || 1) * (Number(it.houdan) || 0), 0);
      if (d <= 0) return;

      const { A, b } = getGensuiParam(items[0].calcCategory);

      // 減衰率 = MIN(1.0, INT(A × (d/b)^(-0.3) × 100 + 0.5) / 100)
      const rate = Math.min(1.0,
        Math.floor(A * Math.pow(d / b, -0.3) * 100 + 0.5) / 100);

      // 歩工合計（グループ全体）= INT(d × 減衰率 × 100 + 0.5) / 100
      const houkouTotal = Math.floor(d * rate * 100 + 0.5) / 100;
      totalReducedHoukou += houkouTotal;

      summaryRows.push({
        category: items[0].calcCategory || '（未分類）',
        d, rate,
        before: Math.round(d * 100) / 100,
        after:  houkouTotal,
        saving: Math.round((d - houkouTotal) * 100) / 100,
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
            <td class="${r.saving > 0 ? 'gensui-saving' : ''}">${r.saving > 0 ? '▼ ' + r.saving.toFixed(2) : '―'}</td>
          </tr>
        `).join('');
      }
    }

    return totalReducedHoukou;
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
    const block      = nameInput.closest('.section-block');
    const nameSel    = block?.querySelector('.section-name-select');
    const cat        = SECTION_CATEGORIES.find(c => c.label === catSel.value);

    if (cat && nameSel) {
      // カテゴリ選択時 → select に切り替え
      nameSel.innerHTML = '<option value="">― 選択 ―</option>';
      cat.items.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        nameSel.appendChild(opt);
      });
      nameSel.style.display = '';
      nameInput.style.display = 'none';
    } else {
      // カテゴリ未選択 → text input に切り替え
      if (nameSel) nameSel.style.display = 'none';
      nameInput.style.display = '';
    }
  }

  let state = {
    quoteId:      null,   // ZohoCRM の Quote レコードID
    quoteNumber:  null,   // Zoho自動採番 Quote_Number (整数)
    seqNo:        '',     // CQR の連番部分（ユーザー入力 or 自動採番）
    revision:     1,      // 改訂番号
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
    state.deliveryPrice = Number(quote.Grand_Total) || 0;

    // カスタムフィールドから読み込み
    state.seqNo          = quote.field55 || '';
    state.revision       = Number(quote.field56) || 1;
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
        state.exclusions    = parsed.exclusions    || [];
        state.remarks       = parsed.remarks        || state.remarks;
        state.discount      = parsed.discount       || state.discount;
        // JSONに保存済みのサブフォーム行IDを復元（保存時に③で書き直している）
        if (parsed.subformRowIds?.length) {
          state.subformRowIds = parsed.subformRowIds;
          console.log('【サブフォームID復元】 JSON:', state.subformRowIds.length, '件', state.subformRowIds);
        }
        renumberSections();
        // ID重複を防ぐため nextId をロード済み最大値+1 に更新
        const maxSecId  = Math.max(0, ...state.sections.map(s => s.id || 0));
        const maxItemId = Math.max(0, ...state.sections.flatMap(s => (s.items || []).map(i => i.id || 0)));
        state.nextSectionId = maxSecId  + 1;
        state.nextItemId    = maxItemId + 1;
      } catch (e) { console.warn('見積JSON解析失敗:', e); }
    }

    // フォームに反映
    applyStateToForm();

    // 商品マスタ・工事費マスタを取得
    loadProducts();
    loadKoujihi();
    loadKanzai();
    loadDenzai();
    loadCurrentUser();
    loadDepartments();

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
    // 掛率パネルを更新
    const fmtRate = v => v != null ? v : '―';
    const setRateEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = fmtRate(v); };
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
    setValue('quoteSeqNo',      state.seqNo);
    setValue('quoteRevision',   state.revision);
    setValue('discountAmount',  state.discount || '');
    setValue('laborCost',       state.laborCost || '');
    setValue('legalWelfareRate',state.legalWelfareRate);
    setValue('deliveryTerm',    state.deliveryTerm);
    setValue('deliveryMethod',  state.deliveryMethod);
    setValue('paymentTerm',     state.paymentTerm);
    setValue('validDays',       state.validDays);
    setValue('remarks',         state.remarks);

    applyExclusionsToForm();
    updateQuoteNoBadge();
    renderSections();
    updateOutput();
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
        houdan:       parseFloat(k.field14) || 0,   // 歩単（小数型）
        houkouKubun:  k.field15 || '',            // 歩工区分
        houkouDirect: parseFloat(k.field16) || 0, // 歩工区分（小数）= 直接歩工値
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
    item.unit         = k.unit  || '式';
    item.kouTanka     = k.price || 0;  // 工事商品単価を保存
    // field16（歩工直接値）がある場合: 人工費 = 工単価 × 歩工
    // ない場合: 金額 = 工単価 × 数量
    const direct = k.houkouDirect || 0;
    item.unitPrice    = direct > 0 ? (k.price || 0) * direct : (k.price || 0);
    item.amount       = item.unitPrice * (item.qty || 1);
    item.calcCategory   = k.calcCategory  || '';
    item.includeInLabor = (item.calcCategory === '④工事費');
    item.houdan       = k.houdan       || 0;
    item.houkouKubun  = k.houkouKubun  || '';
    item.houkouDirect = k.houkouDirect || 0;
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

  /** 追加先セクションセレクトを更新（セクション追加・削除時に呼ぶ） */
  function updateTargetSectionSelect() {
    ['standardTargetSection', 'productTargetSection', 'kanzaiTargetSection', 'denzaiTargetSection'].forEach(id => {
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

  // ── 自動採番 ─────────────────────────────────────────────────

  async function autoNumber() {
    const btn = document.getElementById('btnAutoNumber');
    btn.disabled = true;
    btn.textContent = '採番中...';

    try {
      let maxSeq = 0;

      if (zohoReady) {
        // 最近200件の見積を取得し field_seq_no の最大値を探す
        // ※ Quote_Number は Zoho 内部 ID（18桁）のため使用しない
        const res = await ZOHO.CRM.API.getAllRecords({
          Entity:     'Quotes',
          sort_by:    'Created_Time',
          sort_order: 'desc',
          per_page:   200,
        });
        const list = res?.data || [];

        list.forEach(q => {
          const seq = Number(q.field55) || 0;
          if (seq > maxSeq) maxSeq = seq;
        });

        // field55 が全レコード未設定なら件数ベースで採番
        if (maxSeq === 0) maxSeq = list.length;
      }

      state.seqNo    = maxSeq + 1;
      state.revision = 1;
      setValue('quoteSeqNo',    state.seqNo);
      setValue('quoteRevision', state.revision);
      updateQuoteNoBadge();
      showToast(`採番完了: CQR${state.seqNo}-00001`);
    } catch (e) {
      const msg = e?.message || JSON.stringify(e);
      showToast('採番に失敗しました: ' + msg, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔢 自動採番';
    }
  }

  // ── セクション操作 ────────────────────────────────────────────

  function addSection() {
    const section = {
      id:    state.nextSectionId++,
      no:    state.sections.length + 1,
      name:  '',
      items: [],
    };
    // 最初の行を1つ追加
    section.items.push(createItem());
    state.sections.push(section);
    renderSections();
    updateOutput();
    document.getElementById('noSectionsMsg').style.display = 'none';
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
    item.unitPrice = priceEl?.value  ? Number(priceEl.value.replace(/,/g, '')) : null;

    // 金額自動計算（数量×単価 が入力されている場合）
    if (item.unitPrice !== null && item.qty) {
      item.amount = item.unitPrice * item.qty;
      if (amountEl) amountEl.value = item.amount.toLocaleString('ja-JP');
    } else if (e.target === amountEl) {
      item.amount = Number((amountEl?.value || '').replace(/,/g, '')) || 0;
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

    // 歩工合計（手動上書き）を読み取り、歩工を再計算して表示
    const goukeiEl = row.querySelector('.item-houkou-goukei');
    const houkouEl = row.querySelector('.item-houkou');
    if (goukeiEl) item.houkouGoukei = parseFloat(goukeiEl.value) || 0;
    if (houkouEl) {
      const goukei = Number(item.houkouGoukei) || 0;
      const raw = goukei > 0 ? goukei : (Number(item.qty) * (Number(item.houdan) || 0));
      houkouEl.textContent = raw ? raw.toFixed(2) : '';
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
      const nameSel2 = block.querySelector('.section-name-select');
      if (catSel && catSel !== document.activeElement && nameInput !== document.activeElement && nameSel2 !== document.activeElement) {
        const catLabel = findSectionCategory(sec.name);
        if (catSel.value !== catLabel) {
          catSel.value = catLabel;
          updateNameDatalist(catSel, nameInput);
        }
        // select表示中は select に値をセット、非表示中は input に
        if (nameSel2 && nameSel2.style.display !== 'none') {
          if (nameSel2.value !== (sec.name || '')) nameSel2.value = sec.name || '';
        } else {
          if (nameInput.value !== (sec.name || '')) nameInput.value = sec.name || '';
        }
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

    // 大項目名入力（テキスト）→ state 更新
    nameInput.addEventListener('input', () => {
      const s = state.sections.find(s => s.id === sec.id);
      if (s) s.name = nameInput.value;
    });

    // 大項目名選択（select）→ state 更新
    const nameSel = block.querySelector('.section-name-select');
    nameSel.addEventListener('change', () => {
      const s = state.sections.find(s => s.id === sec.id);
      if (s) s.name = nameSel.value;
    });

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
      // 算出カテゴリバッジを常に更新
      const badge = row.querySelector('.calc-cat-badge');
      if (badge) {
        if (item.calcCategory) {
          badge.textContent = item.calcCategory;
          badge.style.display = '';
        } else {
          badge.style.display = 'none';
        }
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
      if (genkaEl)    genkaEl.textContent    = genka    ? genka.toLocaleString('ja-JP')    : '';
      if (genkaAmtEl) genkaAmtEl.textContent = genkaAmt ? genkaAmt.toLocaleString('ja-JP') : '';

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
    info.textContent = `${count}行　小計: ¥${subtotal.toLocaleString('ja-JP')}`;
  }

  function createItemRowDOM(item) {
    const tmpl  = document.getElementById('itemRowTemplate');
    const clone = tmpl.content.cloneNode(true);
    const row   = clone.querySelector('.item-row');
    row.dataset.itemId = item.id;
    return row;
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
      state.templateDepts = data.map(d => ({ id: d.id, name: d.Name || '' }));
    } catch (e) { console.warn('loadDepartments error:', e); }
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
        name: sec.name,
        cat:  sec.cat || '',
        items: sec.items.map(item => ({
          name: item.name, spec: item.spec, qty: item.qty, unit: item.unit,
          unitPrice: item.unitPrice, amount: item.amount, genka: item.genka,
          includeInLabor: item.includeInLabor,
          dairiRate: item.dairiRate, calcCategory: item.calcCategory,
          houdan: item.houdan, houkouDirect: item.houkouDirect,
          houkouKubun: item.houkouKubun, specLines: item.specLines,
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

    updateOutput();
  }

  // ── PDF出力タブ 更新 ──────────────────────────────────────────

  function updateOutput() {
    readFormToState();

    // 減衰計算: 各行の houkouGoukei を更新し、全グループの減衰後歩工合計を取得
    const totalReducedHoukou = calcGensui();

    // 減衰計算後の工事費行を DOM に反映（プログラム更新→イベント未発火）
    const container = document.getElementById('sectionsContainer');
    state.sections.forEach(sec => {
      const block = container?.querySelector(`[data-section-id="${sec.id}"]`);
      if (!block) return;
      // 歩工合計の表示のみ更新（金額は onItemInput で管理）
      sec.items.forEach(item => {
        const hasHoudan = (Number(item.houdan) || 0) > 0;
        const hasDirect = (Number(item.houkouDirect) || 0) > 0;
        if (!hasHoudan && !hasDirect) return;
        const row = block.querySelector(`[data-item-id="${item.id}"]`);
        if (!row) return;
        const goukeiEl = row.querySelector('.item-houkou-goukei');
        const houkouEl = row.querySelector('.item-houkou');
        if (goukeiEl && goukeiEl !== document.activeElement) {
          goukeiEl.value = item.houkouGoukei ? item.houkouGoukei.toFixed(2) : '';
        }
        if (houkouEl) {
          houkouEl.textContent = item.houkouGoukei ? item.houkouGoukei.toFixed(2) : '';
        }
      });
    });

    const sections     = state.sections;
    const grandTotal   = sections.reduce((sum, s) =>
      sum + s.items.reduce((ss, i) => ss + (Number(i.amount) || 0), 0), 0);

    // 代理店価格合計（main_rate が設定されている場合のみ・行ごとの掛率優先）
    const mainRate = state.mainRate;
    const dairiTotal = mainRate != null
      ? sections.reduce((sum, s) =>
          sum + s.items.reduce((ss, i) => {
            const rate = i.dairiRate ?? mainRate;
            return ss + Math.round((Number(i.amount) || 0) * rate);
          }, 0), 0)
      : null;
    state.dairiTotal = dairiTotal;

    // 値引き額（手入力）→ 貴社お渡し価格 = 代理店価格合計（or 明細合計） - 値引き額
    const discount      = Number(getValue('discountAmount')) || 0;
    const deliveryPrice = Math.max(0, (dairiTotal != null ? dairiTotal : grandTotal) - discount);

    // state に反映（saveToCRM/buildPdfData で使用）
    state.discount      = discount;
    state.deliveryPrice = deliveryPrice;

    // ①基本情報の表示を更新
    setText('basicGrandTotal',   grandTotal.toLocaleString('ja-JP'));
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
    // 労務費 = 手入力 OR includeInLabor チェックが入った行の金額合計
    const autoLaborCost = state.sections.reduce((sum, s) =>
      sum + s.items.reduce((ss, i) =>
        ss + (i.includeInLabor ? (Number(i.amount) || 0) : 0), 0), 0);
    const laborCost    = Number(getValue('laborCost')) || autoLaborCost;
    const legalWelfare = Math.round(laborCost * legalRate);
    const materialCost = deliveryPrice - laborCost - legalWelfare;

    const seqNo        = getValue('quoteSeqNo');
    const revision     = getValue('quoteRevision') || 1;
    const quoteNoStr   = seqNo ? `CQR${seqNo}-${String(revision).padStart(5, '0')}` : '（未採番）';

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
    setText('grandTotalDisplay', '¥' + grandTotal.toLocaleString('ja-JP'));

    updateQuoteNoBadge();
  }

  function updateQuoteNoBadge() {
    const seqNo   = getValue('quoteSeqNo');
    const revision = getValue('quoteRevision') || 1;
    const badge   = document.getElementById('quoteNoBadge');
    badge.textContent = seqNo
      ? `CQR${seqNo}-${String(revision).padStart(5, '0')}`
      : '採番待ち';
  }

  /** フォーム値を state へ読み込む */
  function readFormToState() {
    state.seqNo          = getValue('quoteSeqNo');
    state.revision       = Number(getValue('quoteRevision'))   || 1;
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
      QuotationPDF.download(data);
      statusEl.textContent = '✅ PDFをダウンロードしました';
      showToast('PDF生成完了');
    } catch (e) {
      console.error('PDF生成エラー:', e);
      statusEl.textContent = '❌ PDF生成失敗: ' + e.message;
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
      laborCost:       state.laborCost != null
        ? state.laborCost
        : state.sections.reduce((sum, s) =>
            sum + s.items.reduce((ss, i) =>
              ss + (i.includeInLabor ? (Number(i.amount) || 0) : 0), 0), 0),
      legalWelfareRate: state.legalWelfareRate,
      branchKey:       state.branchKey,
      sections:        state.sections,
      exclusions:      state.exclusions.length > 0 ? state.exclusions : undefined,
      remarks:         state.remarks || undefined,
      discount:        state.discount || undefined,
      quoteCategory:   state.quoteCategory || '',
      printDetail:     (() => {
        const isKouji = (state.quoteCategory || '').includes('工事');
        if (isKouji) return true; // 工事は常に明細印刷
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
    document.getElementById('branchCustomInput').style.display = val === 'other' ? 'block' : 'none';
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
    // 明細行
    addItem,
    removeItem,
    moveItemUp,
    moveItemDown,
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
  };

})();

// ── 起動 ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.app = app;
  document.getElementById('btnAutoNumber').addEventListener('click', () => app.autoNumber());
  app.init();
});
