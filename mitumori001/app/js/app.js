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
    { col: 'col-calc-cat',      label: 'カテゴリ',  def: true,  buhanDef: false },
    { col: 'col-spec',          label: '型番・規格', def: true  },
    { col: 'col-product-code', label: '商品コード', def: false },
    { col: 'col-qty',           label: '数量',      always: true },
    { col: 'col-unit',          label: '単位',      always: true },
    { col: 'col-price',         label: '単価',      def: true  },
    { col: 'col-amount',        label: '金額',      always: true },
    { col: 'col-labor-check',   label: '労務',      def: true,  buhanDef: false },
    { col: 'col-dairi-rate',    label: '掛率',        def: false, buhanDef: true },
    { col: 'col-price-rank',    label: 'SABC価格',    def: false, buhanDef: true },
    { col: 'col-dairi-unit',    label: '代理店単価',  def: false, buhanDef: true },
    { col: 'col-final-dairi',    label: '最終代理店単価', def: false, sagyo: true },
    { col: 'col-dairi',          label: '代理店価格',  def: false, buhanDef: true },
    { col: 'col-buhan-discount', label: '値引き',      def: false, disabled: true },
    { col: 'col-hanbaika',       label: '販売価格',    def: false, disabled: true },
    { col: 'col-genka',         label: '原価',      def: false, buhanDef: true },
    { col: 'col-genka-amount',  label: '原価合計',  def: false, buhanDef: true },
    { col: 'col-bikou',         label: '備考',      def: false },
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

  function colStorageKey() {
    return (state.quoteCategory || '').includes('物販')
      ? 'nepon_col_visibility_buhan'
      : 'nepon_col_visibility';
  }

  function initColVisibility() {
    const isBuhan = (state.quoteCategory || '').includes('物販');
    const saved = localStorage.getItem(colStorageKey());
    colState = {};
    if (saved) { try { colState = JSON.parse(saved); } catch(e) {} }
    COL_DEFS.forEach(c => {
      if (c.always) { colState[c.col] = true; return; }
      if (colState[c.col] === undefined) {
        colState[c.col] = isBuhan && c.buhanDef !== undefined ? c.buhanDef !== false : c.def !== false;
      }
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
    const isSagyo = (state.quoteCategory || '').includes('作業');
    const isBuhan = (state.quoteCategory || '').includes('物販');
    style.textContent = COL_DEFS
      .filter(c => !c.always && (c.disabled || !colState[c.col] || (c.sagyo && !isSagyo) || (c.buhan && !isBuhan)))
      .map(c => `.items-table .${c.col} { display: none; }`)
      .join('\n');
  }

  function toggleColDropdown() {
    const dd = document.getElementById('colDropdown');
    if (!dd) return;
    if (dd.style.display !== 'none') { dd.style.display = 'none'; return; }
    const isSagyoDd = (state.quoteCategory || '').includes('作業');
    const isBuhanDd = (state.quoteCategory || '').includes('物販');
    dd.innerHTML = COL_DEFS.filter(c => !c.always && !c.disabled && (!c.sagyo || isSagyoDd) && (!c.buhan || isBuhanDd)).map(c => `
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
    localStorage.setItem(colStorageKey(), JSON.stringify(colState));
    applyColVisibility();
  }

  // ── 列幅リサイズ ────────────────────────────────────────────────
  const COL_RESIZE_KEY = 'nepon_col_widths';

  function initColResize() {
    const container = document.getElementById('sectionsContainer');
    if (!container) return;

    // テーブルが動的生成されるたびにハンドルを追加
    const observer = new MutationObserver(() => {
      document.querySelectorAll('.items-table thead th').forEach(th => {
        if (th.querySelector('.col-resizer')) return;
        const colClass = Array.from(th.classList).find(c => c.startsWith('col-'));
        if (!colClass) return;
        const handle = document.createElement('div');
        handle.className = 'col-resizer';
        th.appendChild(handle);
      });
    });
    observer.observe(container, { childList: true, subtree: true });

    // イベント委譲でドラッグ開始
    container.addEventListener('mousedown', e => {
      if (!e.target.classList.contains('col-resizer')) return;
      const th = e.target.parentElement;
      const colClass = Array.from(th.classList).find(c => c.startsWith('col-'));
      if (!colClass) return;
      _startColResize(e, th, colClass);
    });

    _loadColWidths();
  }

  function _startColResize(e, th, colClass) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = th.offsetWidth;
    const handle = e.target;
    handle.classList.add('is-resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(ev) {
      const newW = Math.max(30, startW + (ev.clientX - startX));
      _applyColWidth(colClass, newW);
    }
    function onUp() {
      handle.classList.remove('is-resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      _saveColWidths();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function _applyColWidth(colClass, width) {
    let style = document.getElementById('colResizeStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'colResizeStyle';
      document.head.appendChild(style);
    }
    const rules = _parseResizeRules(style.textContent);
    rules[colClass] = width;
    style.textContent = Object.entries(rules)
      .map(([cls, w]) => `.items-table .${cls} { width: ${w}px !important; min-width: ${w}px !important; }`)
      .join('\n');
  }

  function _parseResizeRules(css) {
    const rules = {};
    const re = /\.items-table \.(col-[\w-]+)\s*\{[^}]*width:\s*(\d+)px/g;
    let m;
    while ((m = re.exec(css)) !== null) rules[m[1]] = parseInt(m[2]);
    return rules;
  }

  function _saveColWidths() {
    const style = document.getElementById('colResizeStyle');
    if (!style) return;
    localStorage.setItem(COL_RESIZE_KEY, JSON.stringify(_parseResizeRules(style.textContent)));
  }

  function _loadColWidths() {
    const saved = localStorage.getItem(COL_RESIZE_KEY);
    if (!saved) return;
    try {
      const rules = JSON.parse(saved);
      let style = document.getElementById('colResizeStyle');
      if (!style) {
        style = document.createElement('style');
        style.id = 'colResizeStyle';
        document.head.appendChild(style);
      }
      style.textContent = Object.entries(rules)
        .map(([cls, w]) => `.items-table .${cls} { width: ${w}px !important; min-width: ${w}px !important; }`)
        .join('\n');
    } catch(e) {}
  }

  function resetColWidths() {
    localStorage.removeItem(COL_RESIZE_KEY);
    const style = document.getElementById('colResizeStyle');
    if (style) style.textContent = '';
  }

  // ── FRPテーブル列幅リサイズ ──────────────────────────────────────
  const FRP_COL_RESIZE_KEY = 'nepon_frp_col_widths';

  function initFrpColResize() {
    document.querySelectorAll('.frp-table thead th').forEach(th => {
      if (th.querySelector('.col-resizer')) return;
      const colClass = Array.from(th.classList).find(c => c.startsWith('frp-col-'));
      if (!colClass) return;
      const handle = document.createElement('div');
      handle.className = 'col-resizer';
      th.appendChild(handle);
    });
    const frpContainer = document.getElementById('frpContainer');
    if (frpContainer) {
      frpContainer.addEventListener('mousedown', e => {
        if (!e.target.classList.contains('col-resizer')) return;
        const th = e.target.parentElement;
        const colClass = Array.from(th.classList).find(c => c.startsWith('frp-col-'));
        if (!colClass) return;
        _startFrpColResize(e, th, colClass);
      });
    }
    _loadFrpColWidths();
  }

  function _startFrpColResize(e, th, colClass) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = th.offsetWidth;
    const handle = e.target;
    handle.classList.add('is-resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    function onMove(ev) {
      const newW = Math.max(30, startW + (ev.clientX - startX));
      _applyFrpColWidth(colClass, newW);
    }
    function onUp() {
      handle.classList.remove('is-resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      _saveFrpColWidths();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function _applyFrpColWidth(colClass, width) {
    let style = document.getElementById('colFrpResizeStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'colFrpResizeStyle';
      document.head.appendChild(style);
    }
    const rules = _parseFrpResizeRules(style.textContent);
    rules[colClass] = width;
    style.textContent = Object.entries(rules)
      .map(([cls, w]) => `.frp-table .${cls} { width: ${w}px !important; min-width: ${w}px !important; }`)
      .join('\n');
  }

  function _parseFrpResizeRules(css) {
    const rules = {};
    const re = /\.frp-table \.(frp-col-[\w-]+)\s*\{[^}]*width:\s*(\d+)px/g;
    let m;
    while ((m = re.exec(css)) !== null) rules[m[1]] = parseInt(m[2]);
    return rules;
  }

  function _saveFrpColWidths() {
    const style = document.getElementById('colFrpResizeStyle');
    if (!style) return;
    localStorage.setItem(FRP_COL_RESIZE_KEY, JSON.stringify(_parseFrpResizeRules(style.textContent)));
  }

  function _loadFrpColWidths() {
    const saved = localStorage.getItem(FRP_COL_RESIZE_KEY);
    if (!saved) return;
    try {
      const rules = JSON.parse(saved);
      let style = document.getElementById('colFrpResizeStyle');
      if (!style) {
        style = document.createElement('style');
        style.id = 'colFrpResizeStyle';
        document.head.appendChild(style);
      }
      style.textContent = Object.entries(rules)
        .map(([cls, w]) => `.frp-table .${cls} { width: ${w}px !important; min-width: ${w}px !important; }`)
        .join('\n');
    } catch(e) {}
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

  // 初期チェック必須の見積外工事項目（解除可能）
  const EXCLUSION_MANDATORY = new Set([
    '見積記載以外の機器・設備工事',
    '消費税及び地方税',
  ]);

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
  // 減衰区分番号 → { A, b }（手入力・標準項以外のフォールバック）
  const GENSUI_KUBUN_PARAMS = {
    '1': { A: 2,   b: 0.15 },
    '2': { A: 2.3, b: 0.13 },
    '3': { A: 2.3, b: 0.11 },
    '4': { A: 2.3, b: 0.15 },
    '5': { A: 1.2, b: 0.11 },
  };
  const GENSUI_DEFAULT  = { A: 2,   b: 0.15 };
  const GENSUI_EROFIN   = { A: 1.2, b: 0.11 };

  // 工事項目マスタ（工事区分 → 工事名称・減衰区分）
  const KOUJI_DATA = [
    { kubun: '機械工事', items: [
      { name: '同上搬入据付工事',         gensuiKubun: '1' },
      { name: '同上架台工事',             gensuiKubun: '1' },
      { name: '同上架台及び機器据付工事', gensuiKubun: '1' },
      { name: '同上架台及び据付工事',     gensuiKubun: '1' },
      { name: '同上取付工事',             gensuiKubun: '1' },
      { name: '同上塗装補修工事',         gensuiKubun: '1' },
      { name: '同上基礎工事',             gensuiKubun: '1' },
      { name: '同上組立取付工事',         gensuiKubun: '1' },
      { name: '機器搬入据付工事',         gensuiKubun: '1' },
      { name: '機器取付工事',             gensuiKubun: '1' },
      { name: '機器架台及び据付工事',     gensuiKubun: '1' },
      { name: '機器架台工事',             gensuiKubun: '1' },
      { name: '機器基礎工事',             gensuiKubun: '1' },
      { name: '煙突支持取付工事',         gensuiKubun: '1' },
      { name: '煙突取付工事',             gensuiKubun: '1' },
      { name: '煙道・煙突取付工事',       gensuiKubun: '1' },
      { name: '煙道保温工事',             gensuiKubun: '1' },
      { name: 'ｴﾛﾌｨﾝ取付工事',           gensuiKubun: '5' },
      { name: '支持金具取付工事',         gensuiKubun: '1' },
      { name: '防油堤及びﾀﾝｸ基礎工事',   gensuiKubun: '1' },
      { name: '矩体の孔明け補修工事',     gensuiKubun: '1' },
      { name: '孔明け補修工事',           gensuiKubun: '1' },
      { name: 'ﾀﾞｸﾄ敷設工事',            gensuiKubun: '1' },
      { name: '消耗品雑材',               gensuiKubun: '1' },
    ]},
    { kubun: '配管工事', items: [
      { name: '機械室配管工事費',         gensuiKubun: '4' },
      { name: '屋外配管工事費',           gensuiKubun: '2' },
      { name: '架空配管工事費',           gensuiKubun: '2' },
      { name: '温室内配管工事費',         gensuiKubun: '3' },
      { name: '排水配管工事費',           gensuiKubun: '2' },
      { name: '養液ﾍﾞｯﾄ配管工事費',      gensuiKubun: '2' },
      { name: '養液ﾀﾝｸ内配管工事費',     gensuiKubun: '2' },
      { name: 'ﾍﾞｯﾄ放熱管敷設工事費',    gensuiKubun: '4' },
      { name: '冷媒配管工事費',           gensuiKubun: '2' },
      { name: '配管継手類',               gensuiKubun: '2' },
      { name: '配管工事費',               gensuiKubun: '2' },
      { name: '配管支持具',               gensuiKubun: '2' },
      { name: '消耗品雑材',               gensuiKubun: '2' },
      { name: 'ｴﾛﾌｨﾝ取付工事費',         gensuiKubun: '5' },
      { name: 'ﾍﾞｯﾄ放熱管敷設工事費(2)', gensuiKubun: '2' },
      { name: '冷媒配管工事費(2)',         gensuiKubun: '4' },
      { name: '排水配管工事費(2)',         gensuiKubun: '2' },
      { name: '機器回り配管工事費',       gensuiKubun: '4' },
      { name: '保温工事費',               gensuiKubun: '2' },
      { name: '保温工事費(材工共)',        gensuiKubun: '2' },
      { name: '埋設配管保温工事費',       gensuiKubun: '2' },
      { name: '埋設配管防蝕工事費',       gensuiKubun: '2' },
      { name: '埋設配管補強工事費',       gensuiKubun: '2' },
      { name: '配管塗装工事',             gensuiKubun: '2' },
      { name: '孔明け補修工事',           gensuiKubun: '2' },
      { name: '埋設配管掘削・埋め戻し工事', gensuiKubun: '2' },
      { name: '埋設配管掘削工事',         gensuiKubun: '2' },
      { name: '埋設配管埋め戻し工事',     gensuiKubun: '2' },
    ]},
    { kubun: '雑工', items: [
      { name: '機材運搬費',               gensuiKubun: '1' },
      { name: '試運転調整費',             gensuiKubun: '5' },
      { name: '現場諸経費',               gensuiKubun: '5' },
      { name: '機材小運搬費',             gensuiKubun: '5' },
      { name: '現場立会い検査費',         gensuiKubun: '5' },
      { name: '消防関連打合せ費用',       gensuiKubun: '5' },
      { name: '大気汚染防止法関連打合せ費用', gensuiKubun: '5' },
      { name: '消防立会い検査費',         gensuiKubun: '5' },
      { name: 'タンク水張り検査費',       gensuiKubun: '5' },
      { name: '防油堤・基礎工事費',       gensuiKubun: '5' },
      { name: '油水分離槽工事',           gensuiKubun: '5' },
      { name: '道路横断補強工事',         gensuiKubun: '5' },
      { name: '塗装補修工事',             gensuiKubun: '5' },
      { name: '躯体補修工事',             gensuiKubun: '5' },
      { name: '掘削工事費',               gensuiKubun: '5' },
      { name: '残土処理工事',             gensuiKubun: '5' },
      { name: '機械室建屋工事',           gensuiKubun: '5' },
      { name: '消耗品雑材',               gensuiKubun: '5' },
    ]},
  ];

  function getGensuiParam(calcCategory, gensuiKubun) {
    if (gensuiKubun && GENSUI_KUBUN_PARAMS[gensuiKubun]) return GENSUI_KUBUN_PARAMS[gensuiKubun];
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
    // ただし④工事費行でhoudan>0のもの（自己完結型）は後続ループで処理するため除外
    state.sections.forEach(sec => {
      const secQty = Math.max(1, Number(sec.secQty) || 1);
      sec.items.forEach(item => {
        if ((Number(item.houkouDirect) || 0) <= 0) return;
        if (item.calcCategory === '④工事費' && (Number(item.houdan) || 0) > 0) return;
        item.houkouGoukei = Number(item.houkouDirect);
        totalReducedHoukou += item.houkouGoukei * secQty;
        // ④工事費かつhoudan=0でhoukouDirectが設定されている行はここでサマリーに追加
        if (item.calcCategory === '④工事費') {
          const dDirect = item.houkouGoukei * secQty;
          summaryRows.push({
            category: item.kojiCategory || item.name || '④工事費',
            d: dDirect, rate: 1.0,
            before: dDirect, after: dDirect,
          });
        }
      });
    });

    // セクション内で④工事費ごとにグループ化し、各④工事費のgensuiEnabledを使用
    state.sections.forEach(sec => {
      const secQty = Math.max(1, Number(sec.secQty) || 1);
      let group = [];
      sec.items.forEach(item => {
        if (item.calcCategory === '④工事費') {
          if (group.length > 0 && (Number(item.houdan) || 0) > 0) {
            // ④工事費が自身の歩単を持つ場合は自己完結型として扱う（グループ前行を無視）
            const d = (Number(item.qty) || 1) * (Number(item.houdan) || 0);
            if (d > 0) {
              let rate = 1.0;
              if (item.gensuiEnabled && item.gensuiA > 0 && item.gensuiB > 0) {
                rate = Math.min(1.0, Math.floor(item.gensuiA * Math.pow(d / item.gensuiB, -0.3) * 100 + 0.5) / 100);
              }
              const houkouTotal = Math.floor(d * rate * 100 + 0.5) / 100;
              item.houkouGoukei = houkouTotal;
              totalReducedHoukou += houkouTotal * secQty;
              summaryRows.push({
                category: item.name || item.calcCategory || '④工事費',
                d: d * secQty, rate,
                before: Math.round(d * secQty * 100) / 100,
                after:  houkouTotal * secQty,
              });
            }
          } else if (group.length > 0) {
            const d = group.reduce((sum, i) =>
              sum + (Number(i.qty) || 1) * (Number(i.houdan) || 0), 0);
            if (d > 0) {
              let rate;
              if (!item.gensuiEnabled) {
                rate = 1.0;
              } else if (item.gensuiA > 0 && item.gensuiB > 0) {
                rate = Math.min(1.0,
                  Math.floor(item.gensuiA * Math.pow(d / item.gensuiB, -0.3) * 100 + 0.5) / 100);
              } else {
                const fallback = getGensuiParam(group[0].calcCategory, group[0].gensuiKubun);
                const A = (group[0].gensuiA > 0) ? group[0].gensuiA : fallback.A;
                const b = (group[0].gensuiB > 0) ? group[0].gensuiB : fallback.b;
                rate = Math.min(1.0,
                  Math.floor(A * Math.pow(d / b, -0.3) * 100 + 0.5) / 100);
              }
              const houkouTotal = Math.floor(d * rate * 100 + 0.5) / 100;
              totalReducedHoukou += houkouTotal * secQty;
              summaryRows.push({
                category: item.kojiCategory || item.calcCategory || item.gensuiKubun || '（未分類）',
                d: d * secQty, rate,
                before: Math.round(d * secQty * 100) / 100,
                after:  houkouTotal * secQty,
              });
              group.forEach(gi => {
                const itemD = (Number(gi.qty) || 1) * (Number(gi.houdan) || 0);
                gi.houkouGoukei = Math.floor(houkouTotal * (itemD / d) * 100 + 0.5) / 100;
              });
            }
          } else if ((Number(item.houdan) || 0) > 0) {
            // 自己完結型④工事費行（工事タブで追加、houdan を自身で持つ）
            const d = (Number(item.qty) || 1) * (Number(item.houdan) || 0);
            if (d > 0) {
              let rate = 1.0;
              if (item.gensuiEnabled && item.gensuiA > 0 && item.gensuiB > 0) {
                rate = Math.min(1.0, Math.floor(item.gensuiA * Math.pow(d / item.gensuiB, -0.3) * 100 + 0.5) / 100);
              }
              const houkouTotal = Math.floor(d * rate * 100 + 0.5) / 100;
              item.houkouGoukei = houkouTotal;
              totalReducedHoukou += houkouTotal * secQty;
              summaryRows.push({
                category: item.name || item.calcCategory || '④工事費',
                d: d * secQty, rate,
                before: Math.round(d * secQty * 100) / 100,
                after:  houkouTotal * secQty,
              });
            }
          }
          group = [];
        } else if ((Number(item.houdan) || 0) > 0 && (Number(item.houkouDirect) || 0) <= 0
            && item.calcCategory !== '⑥配管材料' && item.calcCategory !== '⑦支持具・雑材費') {
          group.push(item);
        }
      });
      // セクション末尾に④がない場合のフラッシュ（標準項以外・手入力 houdan>0 行を houdan×qty で直接計算）
      if (group.length > 0) {
        group.forEach(gi => {
          const itemD = (Number(gi.qty) || 1) * (Number(gi.houdan) || 0);
          if (itemD > 0) {
            gi.houkouGoukei = Math.floor(itemD * 100 + 0.5) / 100;
            totalReducedHoukou += gi.houkouGoukei * secQty;
            summaryRows.push({
              category: gi.kojiCategory || gi.gensuiKubun || gi.name || gi.calcCategory || '（その他）',
              d: itemD * secQty, rate: 1.0,
              before: Math.round(itemD * secQty * 100) / 100,
              after:  gi.houkouGoukei * secQty,
            });
          }
        });
        group = [];
      }
    });

    // ⑤その他: 自身の houdan×qty を人工数として自己完結型の減衰計算
    state.sections.forEach(sec => {
      const secQty = Math.max(1, Number(sec.secQty) || 1);
      sec.items.forEach(item => {
        if (item.calcCategory !== '⑤その他') return;
        // houdan>0なら常にhoudan×qtyから再計算（gensuiEnabled変更に追従）
        const rawD = (Number(item.qty) || 1) * (Number(item.houdan) || 0);
        const d = rawD > 0 ? rawD : (Number(item.houkouDirect) || 0);
        if (d <= 0) return;
        let rate = 1.0;
        if (item.gensuiEnabled && item.gensuiA > 0 && item.gensuiB > 0) {
          rate = Math.min(1.0, Math.floor(item.gensuiA * Math.pow(d / item.gensuiB, -0.3) * 100 + 0.5) / 100);
        }
        const houkouTotal = Math.floor(d * rate * 100 + 0.5) / 100;
        item.houkouGoukei = houkouTotal;
        totalReducedHoukou += houkouTotal * secQty;
        summaryRows.push({
          category: item.name || '⑤その他',
          d: d * secQty, rate,
          before: Math.round(d * secQty * 100) / 100,
          after:  houkouTotal * secQty,
        });
      });
    });

    // ⑥配管材料・⑦支持具・雑材費: ⑤その他と同様の自己完結型減衰計算
    ['⑥配管材料', '⑦支持具・雑材費'].forEach(targetCat => {
      state.sections.forEach(sec => {
        const secQty = Math.max(1, Number(sec.secQty) || 1);
        sec.items.forEach(item => {
          if (item.calcCategory !== targetCat) return;
          const rawD = (Number(item.qty) || 1) * (Number(item.houdan) || 0);
          const d = rawD > 0 ? rawD : (Number(item.houkouDirect) || 0);
          if (d <= 0) return;
          let rate = 1.0;
          if (item.gensuiEnabled && item.gensuiA > 0 && item.gensuiB > 0) {
            rate = Math.min(1.0, Math.floor(item.gensuiA * Math.pow(d / item.gensuiB, -0.3) * 100 + 0.5) / 100);
          }
          const houkouTotal = Math.floor(d * rate * 100 + 0.5) / 100;
          item.houkouGoukei = houkouTotal;
          totalReducedHoukou += houkouTotal * secQty;
          summaryRows.push({
            category: item.name || targetCat,
            d: d * secQty, rate,
            before: Math.round(d * secQty * 100) / 100,
            after:  houkouTotal * secQty,
          });
        });
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
        const totalBefore = summaryRows.reduce((s, r) => s + r.before, 0);
        const totalAfter  = summaryRows.reduce((s, r) => s + r.after,  0);
        tbody.innerHTML = summaryRows.map(r => `
          <tr>
            <td>${r.category}</td>
            <td>${r.d.toFixed(2)}</td>
            <td class="${r.rate < 1.0 ? 'gensui-rate-reduced' : 'gensui-rate-full'}">${r.rate.toFixed(2)}</td>
            <td>${r.before.toFixed(2)}</td>
            <td>${r.after.toFixed(2)}</td>
          </tr>
        `).join('') + `
          <tr class="gensui-summary-total">
            <td colspan="3">合計</td>
            <td>${totalBefore.toFixed(2)}</td>
            <td>${totalAfter.toFixed(2)}</td>
          </tr>
        `;
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
        if (group.length > 0 && (Number(item.houdan) || 0) > 0) {
          // ④工事費が自身の歩単を持つ場合は自己完結型として扱う（グループ前行を無視）
          const rawD = (Number(item.qty) || 1) * (Number(item.houdan) || 0);
          if (rawD > 0) {
            let rate = 1.0;
            if (item.gensuiEnabled && item.gensuiA > 0 && item.gensuiB > 0) {
              rate = Math.min(1.0, Math.floor(item.gensuiA * Math.pow(rawD / item.gensuiB, -0.3) * 100 + 0.5) / 100);
            }
            const houkouTotal = Math.floor(rawD * rate * 100 + 0.5) / 100;
            if (!item._unitPriceManual) item.unitPrice = Math.round(RODO_TANKA * houkouTotal / 1000) * 1000;
            if (!item._genkaManual)     item.genka     = Math.round(RODO_GENKA  * houkouTotal / 1000) * 1000;
            item.amount       = item.unitPrice * (Number(item.qty) || 1);
            item.houkouGoukei = houkouTotal;
            item.houkouDirect = houkouTotal;
          }
        } else if (group.length > 0) {
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
                const rate = item.gensuiEnabled
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
                const fallback = getGensuiParam(subItems[0].calcCategory, subItems[0].gensuiKubun);
                const A = (subItems[0].gensuiA > 0) ? subItems[0].gensuiA : fallback.A;
                const b = (subItems[0].gensuiB > 0) ? subItems[0].gensuiB : fallback.b;
                const rate = item.gensuiEnabled
                  ? Math.min(1.0, Math.floor(A * Math.pow(d / b, -0.3) * 100 + 0.5) / 100)
                  : 1.0;
                calcTotal += Math.floor(d * rate * 100 + 0.5) / 100;
              });
            }
          }
          const houkouTotal = Math.floor((directTotal + calcTotal) * 100 + 0.5) / 100;
          if (houkouTotal > 0) {
            if (!item._unitPriceManual) item.unitPrice = Math.round(RODO_TANKA * houkouTotal / 1000) * 1000;
            if (!item._genkaManual)     item.genka     = Math.round(RODO_GENKA  * houkouTotal / 1000) * 1000;
            item.amount       = item.unitPrice * (Number(item.qty) || 1);
            item.houkouGoukei = houkouTotal;
            item.houkouDirect = houkouTotal; // calcGensui が上書きしないよう同期
          }
        } else if ((Number(item.houdan) || 0) > 0) {
          // 自己完結型④工事費行（工事タブで追加、houdan を自身で持つ）
          const rawD = (Number(item.qty) || 1) * (Number(item.houdan) || 0);
          if (rawD > 0) {
            let rate = 1.0;
            if (item.gensuiEnabled && item.gensuiA > 0 && item.gensuiB > 0) {
              rate = Math.min(1.0, Math.floor(item.gensuiA * Math.pow(rawD / item.gensuiB, -0.3) * 100 + 0.5) / 100);
            }
            const houkouTotal = Math.floor(rawD * rate * 100 + 0.5) / 100;
            if (!item._unitPriceManual) item.unitPrice = Math.round(RODO_TANKA * houkouTotal / 1000) * 1000;
            if (!item._genkaManual)     item.genka     = Math.round(RODO_GENKA  * houkouTotal / 1000) * 1000;
            item.amount       = item.unitPrice * (Number(item.qty) || 1);
            item.houkouGoukei = houkouTotal;
            item.houkouDirect = houkouTotal;
          }
        }
        group = [];
      } else if (item.calcCategory === '⑤その他') {
        // ⑤その他: houdan>0なら常にhoudan×qtyから再計算（gensuiEnabled変更に追従）
        const rawD = (Number(item.qty) || 1) * (Number(item.houdan) || 0);
        const d = rawD > 0 ? rawD : (Number(item.houkouDirect) || 0);
        if (d > 0) {
          let rate = 1.0;
          if (item.gensuiEnabled && item.gensuiA > 0 && item.gensuiB > 0) {
            rate = Math.min(1.0, Math.floor(item.gensuiA * Math.pow(d / item.gensuiB, -0.3) * 100 + 0.5) / 100);
          }
          const houkouTotal = Math.floor(d * rate * 100 + 0.5) / 100;
          if (!item._unitPriceManual) item.unitPrice = Math.round(RODO_TANKA * houkouTotal / 1000) * 1000;
          if (!item._genkaManual)     item.genka     = Math.round(RODO_GENKA  * houkouTotal / 1000) * 1000;
          item.amount       = item.unitPrice;
          item.houkouGoukei = houkouTotal;
          item.houkouDirect = houkouTotal;
        }
      } else if (item.calcCategory === '⑥配管材料' || item.calcCategory === '⑦支持具・雑材費') {
        // ⑥⑦: ⑤その他と同様の自己完結型計算
        const rawD = (Number(item.qty) || 1) * (Number(item.houdan) || 0);
        const d = rawD > 0 ? rawD : (Number(item.houkouDirect) || 0);
        if (d > 0) {
          let rate = 1.0;
          if (item.gensuiEnabled && item.gensuiA > 0 && item.gensuiB > 0) {
            rate = Math.min(1.0, Math.floor(item.gensuiA * Math.pow(d / item.gensuiB, -0.3) * 100 + 0.5) / 100);
          }
          const houkouTotal = Math.floor(d * rate * 100 + 0.5) / 100;
          if (!item._unitPriceManual) item.unitPrice = Math.round(RODO_TANKA * houkouTotal / 1000) * 1000;
          if (!item._genkaManual)     item.genka     = Math.round(RODO_GENKA  * houkouTotal / 1000) * 1000;
          item.amount       = item.unitPrice;
          item.houkouGoukei = houkouTotal;
          item.houkouDirect = houkouTotal;
        }
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
   * カテゴリに応じて nameInput に紐づくドロップダウン候補リストを更新する
   * カテゴリ未選択時は全件表示
   */
  function updateNameDatalist(catSel, nameInput) {
    const cat   = SECTION_CATEGORIES.find(c => c.label === catSel.value);
    const items = cat ? cat.items : SECTION_CATEGORIES.flatMap(c => c.items);
    nameInput._ddItems = items;
  }

  // ── 単位ピッカー（シングルトン floating dropdown） ───────────
  const _unitPicker = (() => {
    const UNITS = ['式','個','本','m','㎡','㎥','台','基','セット','組','ユニット','ダース','巻','缶','リットル','袋','kg','トン','a','ha','面','車'];
    const dd = document.createElement('div');
    dd.className = 'unit-picker-dd';
    document.body.appendChild(dd);
    let _input = null;

    dd.addEventListener('mousedown', e => {
      const item = e.target.closest('.unit-picker-item');
      if (item && _input) {
        _input.value = item.dataset.unit;
        _input.dispatchEvent(new Event('input', { bubbles: true }));
        hide();
      }
    });
    document.addEventListener('click', e => {
      if (!dd.contains(e.target) && !e.target.closest('.btn-unit-pick')) hide();
    });

    function hide() { dd.style.display = 'none'; _input = null; }

    return {
      toggle(btn) {
        const input = btn.previousElementSibling;
        if (dd.style.display !== 'none' && _input === input) { hide(); return; }
        _input = input;
        dd.innerHTML = UNITS.map(u =>
          `<div class="unit-picker-item" data-unit="${u}">${u}</div>`
        ).join('');
        const rect = btn.getBoundingClientRect();
        dd.style.left = rect.left + 'px';
        dd.style.top  = (rect.bottom + 2) + 'px';
        dd.style.display = 'block';
      },
    };
  })();

  function toggleUnitDropdown(btn) { _unitPicker.toggle(btn); }
  // ──────────────────────────────────────────────────────────────

  // グローバルシングルトンドロップダウン（overflow:hidden を escape するため body に配置）
  const _nameDd = (() => {
    const dd = document.createElement('div');
    dd.className = 'section-name-dropdown';
    dd.style.cssText = 'position:fixed;display:none;z-index:9999';
    document.body.appendChild(dd);
    // 候補クリック → _onSelect コールバックで state 更新
    dd.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.dd-item');
      if (!item || !dd._input) return;
      e.preventDefault();
      dd._input.value = item.dataset.value;
      dd.style.display = 'none';
      if (dd._onSelect) dd._onSelect(item.dataset.value);
      dd._input.focus();
    });
    // 画面スクロール/リサイズで位置を追従
    const reposition = () => {
      if (dd.style.display === 'none' || !dd._input) return;
      const r = dd._input.getBoundingClientRect();
      dd.style.top   = r.bottom + 'px';
      dd.style.left  = r.left  + 'px';
      dd.style.width = r.width + 'px';
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return dd;
  })();

  /** カスタムドロップダウンを開く（filter: 絞り込み文字列、onSelect: 選択時コールバック） */
  function openNameDropdown(nameInput, filter, onSelect) {
    const items   = nameInput._ddItems || [];
    const q       = (filter || '').trim().toLowerCase();
    const matched = q ? items.filter(n => n.toLowerCase().includes(q)) : items;
    if (matched.length === 0) { _nameDd.style.display = 'none'; return; }
    _nameDd._input    = nameInput;
    _nameDd._onSelect = onSelect || null;
    _nameDd.innerHTML = matched
      .map(n => `<div class="dd-item" data-value="${n}">${n}</div>`)
      .join('');
    const r = nameInput.getBoundingClientRect();
    _nameDd.style.top   = r.bottom + 'px';
    _nameDd.style.left  = r.left   + 'px';
    _nameDd.style.width = r.width  + 'px';
    _nameDd.style.display = 'block';
  }

  // 送料マスタ表示順（CustomModule33 field4 選択項目名の並び順）
  const SORYO_ORDER = [
    '混載・通常１','混載・通常２','混載・通常３',
    '混載・中１','混載・中２（○○県）','混載・中３（○○県）',
    '混載・特殊１','混載・特殊２','混載・特殊３','混載・特殊４',
    '混載・特殊・離島１','混載・特殊・離島２',
    '４ｔ（平）・１','４ｔ（平）・２','４ｔ（平）・３','４ｔ（平）・４',
    '４ｔ（U）・１','４ｔ（U）・２','４ｔ（U）・３','４ｔ（U）・４','４ｔ（U）・５','４ｔ（U）・６',
  ];

  // 型式 → 配送区分番号（送料関連シートより）
  const FRP_HAISOU_KUBUN = {
    'CRK50-02B': 2, 'CRK50-02C': 2,
    'CRK50-04B': 2, 'CRK50-04C': 2,
    'CRK50-06B': 3, 'CRK50-06C': 3, 'CRK50-06D': 3,
    'CRK50-07B': 3, 'CRK50-07C': 3, 'CRK50-07D': 3,
    'CRK50-10B': 3, 'CRK50-10C': 3, 'CRK50-10D': 3, 'CRK50-10E': 3,
    'CRK50-12B': 3, 'CRK50-12C': 3, 'CRK50-12D': 3, 'CRK50-12E': 3,
    'CRK50-15B': 44,'CRK50-15C': 44,'CRK50-15D': 44,'CRK50-15E': 44,
    'CRK50-17B': 44,'CRK50-17C': 44,'CRK50-17D': 44,'CRK50-17E': 44,
    'CRK50-18B': 44,'CRK50-18C': 44,'CRK50-18D': 44,'CRK50-18E': 44,
    'CRK50-22B': 44,'CRK50-22C': 44,'CRK50-22D': 44,'CRK50-22E': 44,
    'CRK50-26B': 44,'CRK50-26C': 40,'CRK50-26D': 40,'CRK50-26E': 40,
    'CRY50-10C': 3, 'CRY50-13C': 3, 'CRY50-16C': 3,
    'CRY50-20C': 40,'CRY50-24C': 40,'CRY50-26C': 40,
    // 便槽・簡易水洗・横型直下（NYU2系）
    'NYU2-5': 2, 'NYU2-9': 2, 'NYU2-10': 2,
    'NYU2-13': 3, 'NYU2-16': 3, 'NYU2-18': 3, 'NYU2-21': 3,
    'NYU2-25': 40, 'NYU2-31': 40,
    // 便槽・簡易水洗・横型横引き（NYU4系）
    'NYU4-5': 2, 'NYU4-9': 2, 'NYU4-10': 2,
    'NYU4-13': 3, 'NYU4-16': 3, 'NYU4-18': 3, 'NYU4-21': 3,
    'NYU4-25': 40, 'NYU4-31': 40,
    // 便槽・簡易水洗・横型横引き2連（NYU48系）
    'NYU48-5': 2, 'NYU48-9': 2, 'NYU48-10': 2,
    'NYU48-13': 3, 'NYU48-16': 3, 'NYU48-18': 3, 'NYU48-21': 3,
    'NYU48-25': 40, 'NYU48-31': 40,
    // 便槽・簡易水洗・横型横引き3連（NYU・T系）
    'NYU・T-9': 2,
    'NYU・T-13': 3, 'NYU・T-16': 3, 'NYU・T-18': 3, 'NYU・T-21': 3,
    'NYU・T-25': 40, 'NYU・T-31': 40,
    // 便槽・縦型横引き（NKU4系）
    'NKU4-3': 2, 'NKU4-5': 2, 'NKU4-8': 2,
    'NKU4-10': 3, 'NKU4-13': 3, 'NKU4-15': 3, 'NKU4-18': 3,
    // 便槽・縦型横引き2連（NKU48系）
    'NKU48-3': 2, 'NKU48-5': 2, 'NKU48-8': 2,
    'NKU48-10': 3, 'NKU48-13': 3, 'NKU48-15': 3, 'NKU48-18': 3,
    // 便槽・縦型直下（NKS2系）
    'NKS2-3': 2, 'NKS2-5': 2, 'NKS2-8': 2,
    'NKS2-10': 3, 'NKS2-13': 3, 'NKS2-15': 3, 'NKS2-18': 3,
    // 受水槽・横型小型（JY系）
    'JY-5': 2, 'JY-9': 2, 'JY-10': 2,
    'JY-13': 3, 'JY-16': 3, 'JY-18': 3, 'JY-21': 3,
    'JY-25': 40, 'JY-31': 40,
    // 排水槽・小型（OY系）
    'OY-5': 2, 'OY-9': 2, 'OY-10': 2,
    'OY-13': 3, 'OY-16': 3, 'OY-18': 3, 'OY-21': 3,
    'OY-25': 40, 'OY-31': 40,
    // 大型横型Φ1300（TPY-13系）
    'TPY-25W-13': 40,'TPY-30W-13': 40,'TPY-35W-13': 40,'TPY-40W-13': 40,'TPY-45W-13': 40,'TPY-50W-13': 40,
    'TPY-60W-13': 60,
    'TPY-70W-13': 100,'TPY-80W-13': 100,
    // 大型横型Φ1600（TPY-16系）
    'TPY-30W-16': 40,'TPY-40W-16': 40,'TPY-50W-16': 40,'TPY-60W-16': 40,'TPY-70W-16': 40,'TPY-80W-16': 40,'TPY-90W-16': 40,
    'TPY-100W-16': 60,
    'TPY-120W-16': 100,'TPY-130W-16': 100,
    // 大型横型Φ2000（TPY-20系）
    'TPY-50W-20': 40,'TPY-60W-20': 40,'TPY-70W-20': 40,'TPY-80W-20': 40,'TPY-90W-20': 40,'TPY-100W-20': 40,'TPY-130W-20': 40,
    'TPY-150W-20': 60,
    'TPY-180W-20': 100,'TPY-200W-20': 100,'TPY-250W-20': 100,
    // 受水槽・特殊Φ1200（TJY-12系）
    'TJY-2000-12': 3,
    'TJY-2500-12': 40,'TJY-3000-12': 40,'TJY-4000-12': 40,'TJY-5000-12': 40,'TJY-6000-12': 40,
    // 受水槽・特殊Φ1300（TJY-13系）
    'TJY-2000-13': 3,
    'TJY-2500-13': 40,'TJY-3000-13': 40,'TJY-4000-13': 40,'TJY-5000-13': 40,'TJY-6000-13': 40,
    'TJY-7000-13': 60,'TJY-8000-13': 60,
    'TJY-9000-13': 100,'TJY-10000-13': 100,
    // 受水槽・特殊Φ1600（TJY-16系）
    'TJY-3000-16': 40,'TJY-4000-16': 40,'TJY-5000-16': 40,'TJY-6000-16': 40,'TJY-7000-16': 40,'TJY-8000-16': 40,'TJY-9000-16': 40,'TJY-10000-16': 40,
    'TJY-12000-16': 60,
    'TJY-13000-16': 100,'TJY-15000-16': 100,
    // 受水槽・特殊Φ2000（TJY-20系）
    'TJY-9000-20': 40,'TJY-10000-20': 40,'TJY-13000-20': 40,'TJY-15000-20': 40,
    'TJY-20000-20': 100,'TJY-25000-20': 100,'TJY-28000-20': 100,
    // 排水槽・Φ1200（TOY-12系）
    'TOY-2000-12': 3,
    'TOY-2500-12': 40,'TOY-3000-12': 40,'TOY-4000-12': 40,'TOY-5000-12': 40,'TOY-6000-12': 40,
    // 排水槽・Φ1300（TOY-13系）
    'TOY-2000-13': 3,
    'TOY-2500-13': 40,'TOY-3000-13': 40,'TOY-4000-13': 40,'TOY-5000-13': 40,'TOY-6000-13': 40,
    'TOY-7000-13': 60,'TOY-8000-13': 60,
    'TOY-9000-13': 100,'TOY-10000-13': 100,
    // 排水槽・Φ1600（TOY-16系）
    'TOY-3000-16': 40,'TOY-4000-16': 40,'TOY-5000-16': 40,'TOY-6000-16': 40,'TOY-7000-16': 40,'TOY-8000-16': 40,'TOY-9000-16': 40,'TOY-10000-16': 40,
    'TOY-12000-16': 60,
    'TOY-13000-16': 100,'TOY-15000-16': 100,
    // 排水槽・Φ2000（TOY-20系）
    'TOY-9000-20': 40,'TOY-10000-20': 40,'TOY-13000-20': 40,'TOY-15000-20': 40,
    'TOY-20000-20': 100,'TOY-25000-20': 100,'TOY-28000-20': 100,
  };

  // 混載便区分 → 送料マスタ選択項目名
  const FRP_KONZAI_SORYO_NAME = {
    1: '混載・通常１', 2: '混載・通常２', 3: '混載・通常３',
    4: '混載・中１',   5: '混載・中２（○○県）', 6: '混載・中３（○○県）',
    7: '混載・特殊１', 8: '混載・特殊２',         9: '混載・特殊３',
  };

  // チャーター便：区分 → 車種キー
  const FRP_CHARTER_VEHICLE = { 40: 't4', 44: 't4', 60: 't6', 100: 't10' };

  // チャーター便地域名（7地域）
  const FRP_CHARTER_REGIONS = ['○○県', '●●県', '△△県', '××県', '□□県', '◇◇県', '◆◆県'];

  // チャーター便金額テーブル（送料関連シートより）
  const FRP_CHARTER_PRICE = {
    t4:  [135000, 120000, 120000, 115000, 125000, 138000, 135000],
    t6:  [150000, 135000, 135000, 125000, 136000, 155000, 153000],
    t10: [178000, 164000, 164000, 158000, 169000, 182000, 180000],
  };

  /** カスタムドロップダウンを閉じる */
  function closeNameDropdown(nameInput) {
    if (_nameDd._input === nameInput) _nameDd.style.display = 'none';
  }

  const FRP_AREA_RATES = [
    { code:'Y100', area:'株式会社YUASA（茨城）',              p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:60, opt2:60 },
    { code:'Y100', area:'株式会社YUASA（栃木）',              p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:60, opt2:60 },
    { code:'Y100', area:'株式会社YUASA（埼玉）',              p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:60, opt2:60 },
    { code:'Y100', area:'株式会社YUASA（群馬）',              p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:60, opt2:60 },
    { code:'Y100', area:'株式会社YUASA（千葉）',              p1:52, p2:52, b1:52, b2:52, b3:52, w1:52, w2:52, opt:65, opt2:65 },
    { code:'F408', area:'冨士機材株式会社（茨城）',           p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:60, opt2:60 },
    { code:'F408', area:'冨士機材株式会社（栃木）',           p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:60, opt2:60 },
    { code:'F408', area:'冨士機材株式会社（埼玉）',           p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:60, opt2:60 },
    { code:'F408', area:'冨士機材株式会社（群馬）',           p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:60, opt2:60 },
    { code:'F408', area:'冨士機材株式会社（千葉）',           p1:52, p2:52, b1:52, b2:52, b3:52, w1:52, w2:52, opt:65, opt2:65 },
    { code:'F408', area:'橋本総業株式会社（茨城）',           p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:60, opt2:60 },
    { code:'F408', area:'橋本総業株式会社（栃木）',           p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:60, opt2:60 },
    { code:'F408', area:'橋本総業株式会社（埼玉）',           p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:60, opt2:60 },
    { code:'F408', area:'橋本総業株式会社（群馬）',           p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:60, opt2:60 },
    { code:'F408', area:'橋本総業株式会社（千葉）',           p1:52, p2:52, b1:52, b2:52, b3:52, w1:52, w2:52, opt:65, opt2:65 },
    { code:'Y001', area:'株式会社山善（茨城）',               p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:60, opt2:60 },
    { code:'Y001', area:'株式会社山善（栃木）',               p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:60, opt2:60 },
    { code:'Y001', area:'株式会社山善（埼玉）',               p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:60, opt2:60 },
    { code:'Y001', area:'株式会社山善（群馬）',               p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:60, opt2:60 },
    { code:'Y001', area:'株式会社山善（千葉）',               p1:52, p2:52, b1:52, b2:52, b3:52, w1:52, w2:52, opt:65, opt2:65 },
    { code:'W001', area:'渡辺パイプ株式会社（茨城）',         p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:65, opt2:65 },
    { code:'W001', area:'渡辺パイプ株式会社（栃木）',         p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:65, opt2:65 },
    { code:'W001', area:'渡辺パイプ株式会社（埼玉）',         p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'W001', area:'渡辺パイプ株式会社（群馬）',         p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'W001', area:'渡辺パイプ株式会社（千葉）',         p1:52, p2:52, b1:52, b2:52, b3:52, w1:52, w2:52, opt:65, opt2:65 },
    { code:'K952', area:'株式会社小泉東関東（茨城）',         p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:65, opt2:65 },
    { code:'K952', area:'株式会社小泉東関東（栃木）',         p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:65, opt2:65 },
    { code:'K952', area:'株式会社小泉東関東（千葉）',         p1:55, p2:55, b1:55, b2:55, b3:55, w1:55, w2:55, opt:65, opt2:65 },
    { code:'K952', area:'株式会社小泉北関東（埼玉）',         p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'K952', area:'株式会社小泉北関東（群馬）',         p1:55, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'N038', area:'栃木サンケイ機器株式会社（栃木）',   p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:65, opt2:65 },
    { code:'S348', area:'株式会社進栄管材（茨城）',           p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:65, opt2:65 },
    { code:'M171', area:'丸八管材株式会社（茨城）',           p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:65, opt2:65 },
    { code:'S013', area:'株式会社三協機材 （茨城）',          p1:55, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:65, opt2:65 },
    { code:'KA72', area:'神奈川管材株式会社（千葉）',         p1:55, p2:55, b1:55, b2:55, b3:55, w1:55, w2:55, opt:65, opt2:65 },
    { code:'T075', area:'株式会社タカムラ（茨城）',           p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'T075', area:'株式会社タカムラ（栃木）',           p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'T075', area:'株式会社タカムラ（埼玉）',           p1:58, p2:53, b1:53, b2:53, b3:53, w1:53, w2:53, opt:65, opt2:65 },
    { code:'H052', area:'橋本産業株式会社（栃木）',           p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'H052', area:'橋本産業株式会社（千葉）',           p1:55, p2:55, b1:55, b2:55, b3:55, w1:55, w2:55, opt:65, opt2:65 },
    { code:'O282', area:'岡部バルブ工業株式会社（栃木）',     p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'O282', area:'岡部バルブ工業株式会社（埼玉）',     p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'O282', area:'岡部バルブ工業株式会社（千葉）',     p1:55, p2:55, b1:55, b2:55, b3:55, w1:55, w2:55, opt:65, opt2:65 },
    { code:'O282', area:'岡部バルブ工業株式会社（茨城）',     p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'S160', area:'有限会社サンキョー（茨城）',         p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'T987', area:'ジャパン建材株式会社（茨城）',       p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'T987', area:'ジャパン建材株式会社（栃木）',       p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'T987', area:'ジャパン建材株式会社（埼玉）',       p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'T987', area:'ジャパン建材株式会社（群馬）',       p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'T987', area:'ジャパン建材株式会社（千葉）',       p1:55, p2:55, b1:55, b2:55, b3:55, w1:55, w2:55, opt:65, opt2:65 },
    { code:'I257', area:'稲垣機材株式会社（埼玉）',           p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'A178', area:'浅野機材株式会社（埼玉）',           p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'A178', area:'浅野機材株式会社（栃木）',           p1:58, p2:48, b1:48, b2:48, b3:48, w1:48, w2:48, opt:65, opt2:65 },
    { code:'A178', area:'浅野機材株式会社（千葉）',           p1:55, p2:55, b1:55, b2:55, b3:55, w1:55, w2:55, opt:65, opt2:65 },
    { code:'A178', area:'浅野機材株式会社（群馬）',           p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'A178', area:'浅野機材株式会社（茨城）',           p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
    { code:'A178', area:'浅野商事株式会社（千葉）',           p1:55, p2:55, b1:55, b2:55, b3:55, w1:55, w2:55, opt:65, opt2:65 },
    { code:'A178', area:'浅野商事株式会社（栃木）',           p1:58, p2:50, b1:50, b2:50, b3:50, w1:50, w2:50, opt:65, opt2:65 },
  ];

  const FRP_HINSHU_OPTIONS = [
    { key: 'p1',  label: 'ポンプアップ槽【槽のみ】' },
    { key: 'p2',  label: 'ポンプアップ槽' },
    { key: 'b1',  label: '簡易水洗専用便槽' },
    { key: 'b2',  label: '無臭便槽' },
    { key: 'b3',  label: 'くみ取り排水槽' },
    { key: 'w1',  label: '小型埋設受水槽' },
    { key: 'w2',  label: '特殊受水槽' },
    { key: 'opt',  label: 'オプション部品' },
    { key: 'opt2', label: 'オプション２' },
  ];

  let state = {
    quoteId:      null,   // ZohoCRM の Quote レコードID
    quoteNumber:  null,   // Zoho自動採番 Quote_Number (整数)
    seqNo:        '',     // 見積番号（フル形式: CD-32-32-80-0001-0001）
    revision:     1,      // 改訂番号（後方互換用）
    koujiCategory:  '',   // 工事カテゴリ (CD/CE/CK/CP/CQ/CQX)
    createDeptCode: '',   // 作成所課コード
    createDeptName: '',   // 作成所課名
    deptRecordId:   null, // DepartmentsList レコードID（遅延解決）
    siteDeptCode:   '',   // 現場所課コード
    siteDeptName:   '',   // 現場所課名
    kikaShita:      '80', // 期下二桁
    seqNumber:      0,    // 連番（整数）
    edaban:         '1',    // 枝番
    seqNoHistory:   [],   // 採番undoスタック（保存前のみ有効）
    customerName:   '',
    customerHonorific: '御中', // 取引先敬称（field4）
    contactName:    '',  // 顧客担当者（Contact_Name）
    contactHonorific: '様', // 連絡先敬称（field3）
    projectName:    '',
    projectName2:   '',  // 件名2行目（field8）
    projectName3:   '',  // 件名3行目（field7）
    ownerName:      '',
    updaterName:    '',  // 更新者（field68）
    shochoName:     '',  // 所長名（手動入力）
    quoteCategory:  '',  // 見積区分（field63）: 物販 / 作業（100万以下） / 工事（100万超）
    date:         new Date(),
    submitDate:   null,  // 見積提出日（field64）
    deliveryTerm:   'お打ち合わせ願います',
    deliveryMethod: 'お打ち合わせ願います',
    paymentTerm:    'お打ち合わせ願います',
    validDays:      '見積期限は60日限りです。期限後のご用命の節は一応ご照会願います。',
    remarks:        '',
    discount:        0,
    adjustAmount:    0,
    baseAdjustAmount: 0,
    waribikiAmount:  0,
    discountEnabled: true,
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
    buppanStandard: [],       // 物販標準項マスタ（CustomModule26 から取得）
    eiseiCache:     [],       // 衛生マスタ（CustomModule30 から取得）
    kiki:           [],       // 工事用機器リスト（CustomModule23 から取得）
    pendingKanzai:  null,     // 管材選択済み・追加待ち
    pendingDenzai:  null,     // 電材選択済み・追加待ち
    pendingKiki:    null,     // 機器選択済み・追加待ち
    searchResults:  [],       // 直近の検索結果（クリック時に参照）
    pendingProduct:  null,     // 検索で選択済み・追加待ちの商品
    savedJson:       null,     // CRM に保存済みの見積JSON
    subformRowIds:   [],       // 前回保存時の LinkingModule1 行ID（重複防止用）
    templateDepts:   [],       // 所課マスタ（DepartmentsList）
    templateList:    [],       // 所課別商品マスタ（CustomModule8）
    setProductList:  [],       // セット商品リスト（CustomModule8 isSetProduct:true）
    selectedTemplateId:   null,  // 読み込みモーダルで選択中のテンプレートID
    selectedSetProductId: null,  // セット商品モーダルで選択中のID
    shoka:           '',       // Quotes.field15（所課）の名前
    shokaId:         null,     // Quotes.field15（所課）のルックアップID
    frpMode:     false,   // FRPモードフラグ
    frpAB:       'A',     // 'A' or 'B'
    frpItems:    [],      // FRP行リスト
    nextFrpId:   1,       // FRP行ID連番
    frpHz:       '50Hz',  // Hz設定（設定画面で変更可）
    frpDiscount: 0,       // 出精値引き（円）
    frpFooterSections:  null,  // 枠外文言セクション（loadFrpSettingsで初期化）
    _frpSettingsRaw:    null,  // quote.FRP_JSON の parse 結果
    frpShowZuban:  true,  // 図番印刷ON/OFF
    frpShowSpecs:  false, // 仕様印刷ON/OFF
    frpCache:      null,  // FRPモジュール全件キャッシュ
    customerAccountId: null, // Quote.Account_Name.id（Account_Number取得用）
    frpDealerCode: null,     // 代理店コード（Account_Number 上4桁）
    frpArea:       null,     // 選択中エリア名
    frpAreaRates:  [],       // FRP掛率マスタ（CRM FRP1 から動的ロード）
    soryoMaster:   [],       // 送料マスタ（CRM CustomModule33 から動的ロード）
    roundingEnabled: false,    // 切り上げ表示モード
    remarkTableEnabled: false, // 缶体温度設定テーブルを備考下に追加
    _thresholdSide: null,  // 閾値判定キャッシュ（'over'|'under'|null）
  };

  let isDirty = false;
  let _skipThresholdCheck = false; // onMainRateInput 中はカテゴリ閾値チェックをスキップ

  let _machineSpecSectionId     = null;
  let _machineSpecModel         = null;
  let _machineSpecSearchResults = [];
  let _machineSpecTimer         = null;
  let _localSpecKeys            = new Set(); // machine-specs.json の型式キー（半角）

  let zohoReady = false;

  // ── 初期化 ────────────────────────────────────────────────────

  // 全角→半角（型式の突合用）
  function _toHW(str) {
    if (!str) return '';
    return String(str)
      .replace(/[Ａ-Ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[ａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[－−]/g, '-')
      .trim();
  }

  function init() {
    initColVisibility();
    initColResize();
    initFrpColResize();
    // machine-specs.json を非同期で読み込み（商品検索の仕様アイコン用）
    fetch('data/machine-specs.json')
      .then(r => r.json())
      .then(data => { _localSpecKeys = new Set(Object.keys(data)); })
      .catch(() => {});

    // 今日の日付をセット
    const today = new Date();
    document.getElementById('quoteDate').value = formatDateInput(today);

    // イベント: 数量・単価 → 金額 自動計算
    document.getElementById('sectionsContainer').addEventListener('input', onItemInput);
    document.getElementById('sectionsContainer').addEventListener('change', onItemInput);
    // 代理店単価フィールドのフォーカスアウト時に確実にstateへ反映（change未発火の補完）
    document.addEventListener('focusout', function(e) {
      const el = e.target;
      if (!el.classList.contains('item-dairi-unit')) return;
      if (!el.dataset.dirty) return;
      delete el.dataset.dirty;
      const row = el.closest('.item-row');
      if (!row) return;
      const block = el.closest('.section-block');
      if (!block) return;
      const sec = state.sections.find(s => s.id === Number(block.dataset.sectionId));
      if (!sec) return;
      const item = sec.items.find(i => i.id === Number(row.dataset.itemId));
      if (!item) return;
      const raw = el.value.replace(/,/g, '').trim();
      if (raw === '') {
        item.dairiUnitPrice = null;
        item._dairiManual = false;
        el.classList.remove('is-manual');
        const lock = row.querySelector('.btn-dairi-unit-lock');
        if (lock) lock.style.display = 'none';
      } else {
        const num = Number(raw) || 0;
        item.dairiUnitPrice = num;
        item._dairiManual = true;
        el.classList.add('is-manual');
        const lock = row.querySelector('.btn-dairi-unit-lock');
        if (lock) lock.style.display = '';
      }
    });

    // イベント: 値引き額・労務費・法定福利費率 変更 → 即時再計算
    document.getElementById('discountAmount').addEventListener('input', function () {
      const val = Number(this.value) || 0;
      const warnEl = document.getElementById('adjNegWarn');
      if (warnEl) warnEl.style.display = val < 0 ? '' : 'none';
      state.baseAdjustAmount = val;
      updateOutput();
    });
    document.getElementById('chkDiscountEnabled').addEventListener('change', function () {
      state.discountEnabled = this.checked;
      const amountEl = document.getElementById('discountAmount');
      if (amountEl) {
        amountEl.disabled = !this.checked;
        if (!this.checked) { amountEl.value = ''; state.discount = 0; }
      }
      updateOutput();
    });
    document.getElementById('laborCost').addEventListener('input', updateOutput);
    document.getElementById('anzenCost').addEventListener('input', updateOutput);
    document.getElementById('legalWelfareRate').addEventListener('input', updateOutput);

    document.addEventListener('click', e => {
      if (!e.target.closest('.product-search-group')) {
        ['productDropdown', 'kikiDropdown', 'kanzaiDropdown', 'denzaiDropdown'].forEach(id => {
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

    // 品目コード表示位置グループの表示/非表示制御
    const _pcCoverCb = document.getElementById('printProductCodeCover');
    if (_pcCoverCb) {
      _pcCoverCb.addEventListener('change', () => {
        const grp = document.getElementById('productCodeCoverPositionGroup');
        if (grp) grp.style.display = _pcCoverCb.checked ? '' : 'none';
      });
    }
    const _pcCb = document.getElementById('printProductCode');
    if (_pcCb) {
      _pcCb.addEventListener('change', () => {
        const grp = document.getElementById('productCodePositionGroup');
        if (grp) grp.style.display = _pcCb.checked ? '' : 'none';
      });
    }

    // 未保存警告: 入力・変更・ページ離脱を監視
    document.addEventListener('input',  markDirty);
    document.addEventListener('change', markDirty);
    window.addEventListener('beforeunload', e => {
      if (isDirty || _needsAdjustUpdate()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // ヘッダー閉じるボタン: 未保存なら確認ダイアログを表示
    document.getElementById('btnCloseWidget')?.addEventListener('click', () => {
      if (isDirty || _needsAdjustUpdate()) {
        const ok = confirm('未保存の変更があります。\nCRMに保存せずに閉じてよいですか？');
        if (!ok) return;
      }
      window.close();
    });

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
      const s = document.getElementById('btnSimplePDF'); if (s) s.disabled = false;
      const d = document.getElementById('btnDetailPDF'); if (d) d.disabled = false;
      const ps = document.getElementById('btnPreviewSimplePDF'); if (ps) ps.disabled = false;
      const pd = document.getElementById('btnPreviewDetailPDF'); if (pd) pd.disabled = false;
      const ec = document.getElementById('btnExportCsv'); if (ec) ec.disabled = false;
      const ee = document.getElementById('btnExportExcel'); if (ee) ee.disabled = false;
    } else {
      el.innerHTML = '⚠️ フォント読み込み失敗 - <a href="https://fonts.google.com/noto/specimen/Noto+Sans+JP" target="_blank">NotoSansJP-Regular.ttf</a> を widget/fonts/ に配置してください';
      el.className = 'font-status err';
      // フォントなしでも生成を許可（英数字は表示される）
      const s = document.getElementById('btnSimplePDF'); if (s) s.disabled = false;
      const d = document.getElementById('btnDetailPDF'); if (d) d.disabled = false;
      const ps = document.getElementById('btnPreviewSimplePDF'); if (ps) ps.disabled = false;
      const pd = document.getElementById('btnPreviewDetailPDF'); if (pd) pd.disabled = false;
      const ec = document.getElementById('btnExportCsv'); if (ec) ec.disabled = false;
      const ee = document.getElementById('btnExportExcel'); if (ee) ee.disabled = false;
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
    state.customerName       = quote.Account_Name?.name || quote.Account_Name || '';
    state.customerAccountId  = quote.Account_Name?.id  || null;
    state.customerHonorific = quote.field4 || '御中';
    state.contactName     = quote.Contact_Name?.name || quote.Contact_Name || '';
    state.contactHonorific = quote.field3 || '様';
    state.projectName     = quote.Subject || '';
    state.ownerName       = quote.Owner?.name || '';
    state.updaterName     = quote.field68?.name || quote.field68 || '';
    state.quoteCategory   = quote.field63 || '';
    state._thresholdSide  = null; // カテゴリ変更ダイアログを初回ロード時に出さない
    state.shoka           = quote.field15?.name || (typeof quote.field15 === 'string' ? quote.field15 : '') || '';
    state.shokaId         = quote.field15?.id   || null;
    state.deliveryPrice = Number(quote.Grand_Total) || 0;

    // カスタムフィールドから読み込み
    state.seqNo        = quote.field55 || '';
    state.revision     = Number(quote.field56) || 1;
    state.seqNoHistory = [];
    // 採番コンポーネントを seqNo から復元
    if (state.seqNo && state.seqNo.includes('-')) {
      const parts = state.seqNo.split('-');
      if (parts.length >= 6) {
        // 旧形式: CD-32-32-80-0001-0001
        state.koujiCategory  = parts[0];
        state.createDeptCode = parts[1];
        state.siteDeptCode   = parts[2];
        state.kikaShita      = parts[3];
        state.seqNumber      = Number(parts[4]) || 0;
        state.edaban         = String(parseInt(parts[5]) || 1);
      } else if (parts.length === 2) {
        // 新形式: CD3232-8000011
        const m = parts[0].match(/^([A-Z]+)(\d{2})(\d{2})$/);
        if (m) {
          state.koujiCategory  = m[1];
          state.createDeptCode = m[2];
          state.siteDeptCode   = m[3];
          state.kikaShita      = parts[1].substring(0, 2);
          state.seqNumber      = parseInt(parts[1].substring(2, 6)) || 0;
          state.edaban         = String(parseInt(parts[1].substring(6)) || 1);
        }
      }
    }
    // 工事採番コード（CD/CE/CK/CP/CQ）が誤混入している物販・作業見積のみクリア
    const _KOUJI_PREFIXES = ['CD','CE','CK','CP','CQ'];
    if (state.seqNo && _KOUJI_PREFIXES.some(p => state.seqNo.startsWith(p))
        && !(state.quoteCategory || '').includes('工事')) {
      state.seqNo        = '';
      state.koujiCategory  = '';
      state.createDeptCode = '';
      state.siteDeptCode   = '';
      state.kikaShita      = '80';
      state.seqNumber      = 0;
      state.edaban         = '1';
    }
    // Quotes.field15（所課）の名前でDEPT_LISTを逆引きしてcreateDepCodeをセット（field15を優先）
    if (state.shoka) {
      const deptEntry = DEPT_LIST.find(d => d.name === state.shoka);
      if (deptEntry) state.createDeptCode = deptEntry.code;
    }
    state.deliveryTerm   = quote.field6  || state.deliveryTerm;
    state.deliveryMethod = quote.field51 || state.deliveryMethod;
    state.paymentTerm    = quote.field57 || state.paymentTerm;
    state.validDays      = quote.field58 || state.validDays;
    state.remarks        = quote.field59 || '';
    state.adjustAmount   = Number(quote.field61) || 0;  // 調整額
    state.discount       = 0;  // 出精値引きは再計算
    state.submitDate     = quote.field64 ? new Date(quote.field64) : null; // 見積提出日
    state.projectName2   = quote.field8  || '';  // 件名2行目
    state.projectName3   = quote.field7  || '';  // 件名3行目
    state.mainRate    = quote.main_rate    != null ? Number(quote.main_rate)    : 1.0;
    state.itemRate    = quote.item_rate    != null ? Number(quote.item_rate)    : null;
    state.partsRate   = quote.parts_rate   != null ? Number(quote.parts_rate)   : null;
    state.purchaseRate = quote.purchase_rate != null ? Number(quote.purchase_rate) : null;

    // JSON カスタムフィールドから復元（セクション構造・全明細）
    // FRP設定JSONをstateに保持（loadFrpSettings()で参照）
    try { state._frpSettingsRaw = quote.FRP_JSON ? JSON.parse(quote.FRP_JSON) : null; }
    catch (e) { state._frpSettingsRaw = null; }

    const savedJson = (quote.JSON || '') + (quote.JSON2 || '');
    if (savedJson) {
      try {
        const parsed = JSON.parse(savedJson);
        state.sections      = parsed.sections     || [];
        // isNetsukiMain 行で productCode が未保存の場合、spec（品番）から補完
        state.sections.forEach(sec => {
          (sec.items || []).forEach(item => {
            if (item.isNetsukiMain && !item.productCode && item.spec) {
              item.productCode = item.spec;
            }
          });
        });
        // dairiRate=nullの既存行はmainRateを継承するため補正不要
        state.deliveryPrice = parsed.deliveryPrice || state.deliveryPrice;
        state.laborCost     = parsed.laborCost     || null;
        state.anzenCost     = parsed.anzenCost     || 0;
        state.exclusions    = parsed.exclusions    || [];
        state.remarks       = parsed.remarks        || state.remarks;
        state.adjustAmount  = parsed.adjustAmount ?? parsed.discount ?? state.adjustAmount;
        state.discount      = 0;  // 出精値引きは再計算
        // JSONに保存済みのサブフォーム行IDを復元（保存時に③で書き直している）
        if (parsed.subformRowIds?.length) {
          state.subformRowIds = parsed.subformRowIds;
          console.log('【サブフォームID復元】 JSON:', state.subformRowIds.length, '件', state.subformRowIds);
        }
        // 切り上げモード復元
        state.roundingEnabled  = parsed.roundingEnabled  || false;
        // 缶体温度設定テーブル復元
        state.remarkTableEnabled = parsed.remarkTableEnabled || false;
        const remarkTableCb = document.getElementById('remarkTableEnabled');
        if (remarkTableCb) remarkTableCb.checked = state.remarkTableEnabled;
        // 値引き額チェックボックス復元（作業時のみ保存される）
        if (parsed.discountEnabled === false) state.discountEnabled = false;
        // 所長名復元
        if (parsed.shochoName) state.shochoName = parsed.shochoName;
        // 営業所選択復元
        if (parsed.branchKey) state.branchKey = parsed.branchKey;
        // 採番復元（field55が空の場合はJSONからフォールバック）
        if (!state.seqNo && parsed.seqNo) state.seqNo = parsed.seqNo;
        // FRPモード復元
        if (parsed.frpMode) {
          state.frpMode    = true;
          state.frpAB      = parsed.frpAB || 'A';
          state.frpItems   = parsed.frpItems || [];
          state.nextFrpId  = state.frpItems.length > 0
            ? Math.max(...state.frpItems.map(i => i.id || 0)) + 1
            : 1;
          if (parsed.frpArea)       state.frpArea       = parsed.frpArea;
          if (parsed.frpDealerCode) state.frpDealerCode = parsed.frpDealerCode;
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
    markClean();
    const _roundBtn = document.getElementById('btnToggleRounding');
    if (_roundBtn) _roundBtn.classList.toggle('is-active', state.roundingEnabled);

    // その他マスタを取得（並列）
    loadProducts();
    loadKoujihi();
    loadKanzai();
    initKanzaiSelects();
    loadDenzai();
    initDenzaiSelects();
    loadBuppanStandard();
    loadEisei();
    loadKiki();
    loadCurrentUser();

    showToast('CRMデータを読み込みました');
  }

  /** デモデータ（SDK未接続時） */
  function loadDemoData() {
    state.frpAreaRates  = FRP_AREA_RATES;  // デモ時はハードコード定数を使用
    state.customerName  = '株式会社大仙';
    state.projectName   = '某300坪温室暖房設備工事';
    state.ownerName     = '池田';
    state.seqNo         = '166';
    state.revision      = 1;
    state.deliveryPrice = 2480000;
    state.laborCost     = 280366;

    applyStateToForm();
    markClean();
    showToast('デモデータで起動しました（Zoho未接続）', 'warn');
  }

  /** 状態をフォームへ反映 */
  function applyStateToForm() {
    setValue('customerName',    state.customerName);
    setValue('customerHonorific', state.customerHonorific || '御中');
    setValue('contactName',     state.contactName);
    setValue('contactHonorific', state.contactHonorific || '様');
    // 担当者名がある場合はデフォルトでチェックON
    const printContactNameEl = document.getElementById('printContactName');
    if (printContactNameEl && state.contactName) printContactNameEl.checked = true;
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
    setValue('updaterName',     state.updaterName);
    setValue('shochoName',      state.shochoName || '');
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
    if (catEl) catEl.value = state.quoteCategory || '';
    // 値引き額ラベル切り替え（工事を含む場合→出精値引き）
    const isKouji = (state.quoteCategory || '').includes('工事');
    // 農用・熱機タブは標準項サブボタン経由のみ（常時非表示）
    if (currentCat === 'kiki' || currentCat === 'netsuki') switchCatTab('standard');
    const discountLabelEl = document.getElementById('discountLabel');
    if (discountLabelEl) {
      discountLabelEl.textContent = '調整額';
    }
    // ─── 印刷オプション表示ルール ───────────────────────────────
    // 【工事・物販・作業 共通】
    //   printCoverGroup   (鏡のみ)    → 常時表示（ラジオボタン）
    //   printDetailOption (鏡+明細)   → 常時表示（ラジオボタン）
    //   ※ 上記2つはラジオボタンで排他選択。工事を含む全カテゴリに適用。
    //   ※ 「工事は常に明細印刷」という思い込みで非表示にしないこと。
    // 【工事・作業のみ】
    //   naiyakuPrintGroup (内訳)      → 表示
    // 【物販のみ】
    //   naiyakuPrintGroup             → 非表示
    // ────────────────────────────────────────────────────────────
    const printCoverGroup = document.getElementById('printCoverGroup');
    if (printCoverGroup) printCoverGroup.style.display = '';
    const printDetailOption = document.getElementById('printDetailOption');
    if (printDetailOption) {
      printDetailOption.style.display = '';
    }
    // 内訳印刷オプション: 工事・作業のとき表示、物販は非表示
    const isBuhan = (state.quoteCategory || '').includes('物販');
    const isSagyo = (state.quoteCategory || '').includes('作業');
    const naiyakuGrp = document.getElementById('naiyakuPrintGroup');
    if (naiyakuGrp) naiyakuGrp.style.display = (isKouji || isSagyo) ? '' : 'none';
    // 鏡に品目コードを印刷する: 工事は非表示（工事の鏡は品目行がないため）
    const pcCoverGrp = document.getElementById('printProductCodeCover')?.closest('.print-detail-option');
    if (pcCoverGrp) pcCoverGrp.style.display = isKouji ? 'none' : '';
    // カテゴリ別デフォルト印刷モード設定
    // 全カテゴリ: 鏡＋明細（HTML既定値）  作業: 内訳チェックON
    const chkNaiyaku  = document.getElementById('printNaiyaku');
    if (isSagyo) {
      if (chkNaiyaku)  chkNaiyaku.checked  = true;
    }
    const rowDiscountEl = document.getElementById('rowDiscount');
    if (rowDiscountEl) rowDiscountEl.style.display = '';
    // 作業のとき値引き額チェックボックスを表示
    const chkDiscEl  = document.getElementById('chkDiscountEnabled');
    const discAmtEl  = document.getElementById('discountAmount');
    if (chkDiscEl) {
      chkDiscEl.style.display = isSagyo ? '' : 'none';
      if (!isSagyo) { chkDiscEl.checked = true; state.discountEnabled = true; }
      if (discAmtEl) discAmtEl.disabled = isSagyo && !chkDiscEl.checked;
    }
    // 物販・作業: 工事カテゴリ・現場所課を非表示
    const hideMeisai = isBuhan || isSagyo;
    const rowKoujiCat = document.getElementById('rowKoujiCategory');
    const rowSiteDept = document.getElementById('rowSiteDept');
    if (rowKoujiCat) rowKoujiCat.style.display = hideMeisai ? 'none' : '';
    if (rowSiteDept) rowSiteDept.style.display  = hideMeisai ? 'none' : '';
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
    if (edabanEl) edabanEl.value = state.edaban || '1';
    const btnAutoEl  = document.getElementById('btnAutoNumber');
    const btnIncrEl  = document.getElementById('btnIncrSeqNo');
    const btnResetEl = document.getElementById('btnResetSeqNo');
    const btnClearEl = document.getElementById('btnClearSeqNo');
    if (btnAutoEl) {
      const locked = !!state.seqNo;
      btnAutoEl.disabled = locked;
      btnAutoEl.textContent = locked ? '採番済み' : '🔢 採番する';
      if (btnIncrEl)  btnIncrEl.style.display  = locked ? '' : 'none';
      if (btnResetEl) btnResetEl.style.display = locked ? '' : 'none';
      if (btnClearEl) btnClearEl.style.display = locked ? '' : 'none';
    }
    updateQuoteNoBadge();
    updateUndoSeqBtn();
    // 値引き額チェックボックス反映（作業時）
    const chkDiscEl2 = document.getElementById('chkDiscountEnabled');
    const discAmtEl2 = document.getElementById('discountAmount');
    if (chkDiscEl2) {
      chkDiscEl2.checked = state.discountEnabled !== false;
      if (discAmtEl2) discAmtEl2.disabled = !chkDiscEl2.checked;
    }
    setValue('discountAmount',  state.discountEnabled !== false ? (state.adjustAmount || '') : '');
    state.baseAdjustAmount = state.adjustAmount || 0;
    setValue('laborCost',       state.laborCost || '');
    setValue('anzenCost',       state.anzenCost || '');
    setValue('legalWelfareRate',state.legalWelfareRate);
    setValue('deliveryTerm',    state.deliveryTerm);
    setValue('deliveryMethod',  state.deliveryMethod);
    setValue('paymentTerm',     state.paymentTerm);
    setValue('validDays',       state.validDays);
    setValue('remarks',         state.remarks);

    // 営業所設定: JSON保存済みのbranchKeyを優先、なければ所課（field15）から判定
    const branchSel = document.getElementById('branchSelect');
    const branchCustom = document.getElementById('branchCustomInput');
    if (state.branchKey && state.branchKey !== 'honbu') {
      // JSONから復元した営業所選択を反映
      if (branchSel) branchSel.value = state.branchKey;
      onBranchChange();
    } else if (!isKouji && state.shoka) {
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
    initColVisibility();
    renderSections();
    updateOutput();
    // FRPモードUI適用
    if (state.frpMode) {
      loadFrpSettings();
      loadFrpCache();
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
      '消費税及び地方税',
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
      // 必須項目を再チェック
      EXCLUSION_MANDATORY.forEach(name => {
        const idx = EXCLUSION_MASTER.indexOf(name);
        if (idx === -1) return;
        const cb = document.querySelector(`.excl-check[data-index="${idx}"]`);
        if (cb) cb.checked = true;
        const editEl = document.querySelector(`.excl-edit[data-index="${idx}"]`);
        if (editEl) editEl.style.display = 'block';
      });
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
    container.innerHTML = EXCLUSION_MASTER.map((item, i) => {
      const mandatory = EXCLUSION_MANDATORY.has(item);
      return `
      <div class="excl-row" id="excl-row-${i}">
        <label class="excl-label">
          <input type="checkbox" class="excl-check" data-index="${i}"
                 ${mandatory ? 'checked' : ''}
                 onchange="app.onExclusionChange(this)">
          <span class="excl-text">${item}</span>
        </label>
        <input type="text" class="excl-edit" data-index="${i}"
               value="${item}" style="${mandatory ? '' : 'display:none'}"
               oninput="app.updateExclusionCount()">
      </div>
    `;
    }).join('');
    updateExclusionCount();
  }

  /** カスタム行を DOM に追加（内部共通処理） */
  function _appendCustomExclusionRow(value) {
    const container = document.getElementById('exclusionCustomList');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'excl-custom-row';
    row.innerHTML = `
      <button class="btn-excl-del" onclick="app.removeCustomExclusion(this)" title="削除">✕</button>
      <input type="text" class="excl-custom-input" placeholder="見積外工事の内容を入力"
             value="${value.replace(/"/g, '&quot;')}" oninput="app.updateExclusionCount()">
    `;
    container.appendChild(row);
  }

  /** 手入力行を追加 */
  function addCustomExclusion() {
    const checks = document.querySelectorAll('.excl-check');
    const checked = [...checks].filter(c => c.checked).length;
    const customCount = document.querySelectorAll('.excl-custom-row').length;
    if (checked + customCount >= 15) return;
    _appendCustomExclusionRow('');
    updateExclusionCount();
    // 追加した入力欄にフォーカス
    const inputs = document.querySelectorAll('.excl-custom-input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  /** 手入力行を削除 */
  function removeCustomExclusion(btn) {
    const row = btn.closest('.excl-custom-row');
    if (row) row.remove();
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
    const customCount = document.querySelectorAll('.excl-custom-row').length;
    const total = checked + customCount;
    const countEl = document.getElementById('exclusionCount');
    if (countEl) {
      countEl.textContent = `${total}/15`;
      countEl.className = 'exclusion-count' + (total >= 15 ? ' over' : '');
    }
    const limit = total >= 15;
    checks.forEach(c => { if (!c.checked) c.disabled = limit; });
    const addBtn = document.getElementById('btnAddCustomExcl');
    if (addBtn) addBtn.disabled = limit;
  }

  /** DOM から state.exclusions を収集 */
  function collectExclusions() {
    const result = [];
    document.querySelectorAll('.excl-check:checked').forEach(cb => {
      const i = cb.dataset.index;
      const editEl = document.querySelector(`.excl-edit[data-index="${i}"]`);
      result.push(editEl ? (editEl.value.trim() || EXCLUSION_MASTER[i]) : EXCLUSION_MASTER[i]);
    });
    document.querySelectorAll('.excl-custom-input').forEach(inp => {
      const v = inp.value.trim();
      if (v) result.push(v);
    });
    state.exclusions = result;
  }

  /** state.exclusions をフォームのチェック状態に反映 */
  function applyExclusionsToForm() {
    // カスタム行を全消去
    const customList = document.getElementById('exclusionCustomList');
    if (customList) customList.innerHTML = '';

    if (!state.exclusions || state.exclusions.length === 0) {
      updateExclusionCount();
      return;
    }
    // まず全チェック解除
    document.querySelectorAll('.excl-check').forEach(cb => {
      cb.checked = false;
      const editEl = document.querySelector(`.excl-edit[data-index="${cb.dataset.index}"]`);
      if (editEl) editEl.style.display = 'none';
    });
    state.exclusions.forEach(text => {
      // マスタから完全一致 → 前方一致で探す
      let idx = EXCLUSION_MASTER.indexOf(text);
      if (idx === -1) idx = EXCLUSION_MASTER.findIndex(m => text.startsWith(m.slice(0, 5)));
      if (idx >= 0) {
        const cb = document.querySelector(`.excl-check[data-index="${idx}"]`);
        const editEl = document.querySelector(`.excl-edit[data-index="${idx}"]`);
        if (cb) { cb.checked = true; }
        if (editEl) { editEl.value = text; editEl.style.display = 'block'; }
      } else {
        // マスタにない → カスタム行として追加
        _appendCustomExclusionRow(text);
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
        const raw = query.trim();
        if (!raw) { dd.style.display = 'none'; return; }
        // 半角→全角変換（CRMは全角で登録されているため、どちらで入力しても検索できるようにする）
        const q = raw
          .replace(/[A-Za-z]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0))
          .replace(/[0-9]/g,     c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0))
          .replace(/-/g, '－');
        // criteria starts_with 検索（word検索は部分一致しないケースがあるため）
        // Zoho は「－」「＿」をトークン区切りとして扱うため、トークン境界をまたぐ前方一致はヒットしない
        // 例: starts_with:AWH-1501S では AWH-1501SA_1 はヒットしない（1501SA≠1501S）
        // 対策1: 最後の区切り文字より前のプレフィックス（例: AWH）でも検索し、ローカルフィルタで絞る
        const lastDelimIdx = Math.max(q.lastIndexOf('－'), q.lastIndexOf('＿'));
        const qPrefix = lastDelimIdx > 0 ? q.slice(0, lastDelimIdx) : null;
        const qPrefixPart = qPrefix ? `or(Product_Name:starts_with:${qPrefix})` : '';
        // 対策2: 漢字⇔仮名の境界でも分割して前方一致（例: 煙突セット → 煙突）
        const _isKanji = c => c >= '一' && c <= '鿿';
        const _isKana  = c => c >= '぀' && c <= 'ヿ';
        const _jaBoundary = (() => {
          for (let i = 1; i < q.length; i++) {
            if ((_isKanji(q[i-1]) && _isKana(q[i])) || (_isKana(q[i-1]) && _isKanji(q[i]))) return i;
          }
          return -1;
        })();
        const qJaPrefix = _jaBoundary > 0 ? q.slice(0, _jaBoundary) : null;
        const qJaPrefixPart = (qJaPrefix && qJaPrefix !== qPrefix) ? `or(Product_Name:starts_with:${qJaPrefix})` : '';
        const nq   = normalize(q);
        const nRaw = normalize(raw);
        // ローカルフィルタ: 名前は「含む」、コード・型式は「前方一致」
        const matchesSearch = p =>
          normalize(p.Product_Name  || '').includes(nRaw) ||
          normalize(p.Product_Code  || '').startsWith(nRaw) ||
          normalize(p.field2        || '').startsWith(nRaw);
        const mapProduct = p => ({
          id:         p.id,
          name:       p.Product_Name  || '',
          denpyoName: p.field17       || '',   // 伝票名称（field17）
          code:       p.Product_Code  || '',
          model:      p.field2        || '',
          unit:       p.field4        || '',        // 単位（field4）
          price:  Number(p.Unit_Price) || 0,
          cost:   Number(p.field1)     || 0,   // 標準原価（field1）
          houdan: parseFloat(p.field12) || 0,  // 歩単（field12）
          priceS: Number(p.mp_PRICES)  || 0,   // S価格
          priceA: Number(p.mp_PRICEA)  || 0,   // A価格
          priceB: Number(p.mp_PRICEB)  || 0,   // B価格
          priceC: Number(p.mp_PRICEC)  || 0,   // C価格
          hasSpec:     !!(p.field13 && String(p.field13).trim()),
          specContent: p.field13 || '',
          source: 'product',
        });
        // 検索戦略:
        // 1. criteria: 名前前方一致（日本語境界・区切り記号プレフィックス対応）
        // 2. word: 全文検索（Zohoトークン分割でAND検索）
        // 3. kana: 漢字-仮名境界のカナ部分でword検索（「セット」など）
        // Product_Code / field2 は半角・全角どちらで登録されているか不明なため両方で検索する
        const _codeRawPart = raw !== q ? `or(Product_Code:starts_with:${raw})or(field2:starts_with:${raw})` : '';
        const _criteriaQuery = `((Product_Name:starts_with:${q})${qPrefixPart}${qJaPrefixPart}or(Product_Code:starts_with:${q})or(field2:starts_with:${q})${_codeRawPart})`;
        const kanaSuffix = qJaPrefix ? q.slice(qJaPrefix.length) : '';
        const [criteriaRes, wordRes, wordRawRes, kanaRes] = await Promise.all([
          ZOHO.CRM.API.searchRecord({
            Entity: 'Products', Type: 'criteria',
            Query: _criteriaQuery,
            page: 1, per_page: 100,
          }).catch(() => null),
          ZOHO.CRM.API.searchRecord({
            Entity: 'Products', Type: 'word',
            Query: q,
            page: 1, per_page: 100,
          }).catch(() => null),
          // 半角のまま word 検索（全角変換後と異なる場合のみ）
          raw !== q ? ZOHO.CRM.API.searchRecord({
            Entity: 'Products', Type: 'word',
            Query: raw,
            page: 1, per_page: 100,
          }).catch(() => null) : Promise.resolve(null),
          kanaSuffix ? ZOHO.CRM.API.searchRecord({
            Entity: 'Products', Type: 'word',
            Query: kanaSuffix,
            page: 1, per_page: 100,
          }).catch(() => null) : Promise.resolve(null),
        ]);
        const seen = new Set();
        const allData = [
          ...(criteriaRes?.data || []),
          ...(wordRes?.data || []),
          ...(wordRawRes?.data || []),
          ...(kanaRes?.data || []),
        ];
        const SORT_PRODUCTS_BY_PRICE = true; // false に戻すと元の順序
        products = allData.filter(p => {
          if (!matchesSearch(p)) return false;
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        }).map(mapProduct)
          .sort(SORT_PRODUCTS_BY_PRICE ? (a, b) => b.price - a.price : () => 0);
      }
      if (products.length === 0) { dd.style.display = 'none'; return; }
      state.searchResults = products;
      dd.innerHTML = products.map((item, idx) => `
        <div class="product-item" data-idx="${idx}">
          <div style="flex:1;min-width:0">
            <div class="p-name">
              <span class="p-badge product">商品</span>${item.hasSpec ? '<span class="p-badge spec">仕様</span>' : ''}${escHtml(item.name)}
            </div>
            <div class="p-code">${escHtml([...new Set([item.model, item.code])].filter(Boolean).join(' / '))}</div>
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
        kikoShiyou:   k.field19 || '',            // 機器仕様（field19）
        source:       'koujihi',
      }));
      console.log(`工事費マスタ ${state.koujihi.length} 件読み込み`);
      buildStandardModelSelect();
    } catch (e) {
      console.warn('工事費マスタ取得失敗:', e);
    }
  }

  // ── 管材カテゴリ定義（依存ドロップダウン用）─────────────────────
  // CRM CustomModule18 の field6 にカテゴリが格納されている。
  const KANZAI_CATEGORIES = [
    { label: '1.SGP鋼管' },
    { label: '2.STK鋼管' },
    { label: '3.ﾗｲﾆﾝｸﾞ鋼管' },
    { label: '4.ｽﾃﾝﾚｽ管・継手' },
    { label: '5.塩ﾋﾞ管・耐熱塩ビ管' },
    { label: '6.ﾎﾟﾘ管・ﾎﾟﾘﾌﾞﾃﾞﾝ管' },
    { label: '7.ｹﾞｰﾄ弁' },
    { label: '8.ﾁｬｯｷ弁' },
    { label: '9.ﾊﾞﾀﾌﾗｲ弁' },
    { label: '10.ｸﾞﾛｰﾌﾞ弁' },
    { label: '11.ﾏﾚｰﾌﾞﾙ弁' },
    { label: '12.ﾎﾞｰﾙ弁' },
    { label: '13.ｽﾄﾚｰﾅ' },
    { label: '14.電動弁･混合三方弁' },
    { label: '15.ﾌﾚｷｼﾞｮｲﾝﾄ' },
    { label: '16.伸縮継手・ﾊｲﾊﾟｰﾛｯｸ' },
    { label: '17.蒸気関連・落水防止弁' },
    { label: '18.温度・圧力計・空気抜弁' },
    { label: '19.油配管部材・ｷﾞﾔﾎﾟﾝﾌﾟ' },
    { label: '20.配管保温(材工)' },
    { label: '21.配管亀甲保温(材工)' },
    { label: '22.ﾊﾟｲﾌﾟｶﾞｰﾄﾞ･その他' },
  ];

  // ── 管材マスタ（CustomModule18）────────────────────────────────

  async function loadKanzai() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule18', 'Name');
      state.kanzai = data.map(r => ({
        id:       r.id,
        name:     r.Name    || '',
        model:    r.field2  || '',   // 型式
        unit:     r.field   || '個', // 単位
        price:    Number(r.field1) || 0,  // 価格
        cost:     Number(r.field3) || 0,  // 原価
        houdan:   parseFloat(r.field4) || 0, // 歩単
        code:     r.field5  || '',   // 品番
        category: r.field6  || '',   // カテゴリ
        source:   'kanzai',
      }));
      console.log(`管材マスタ ${state.kanzai.length} 件読み込み`);
    } catch (e) {
      console.warn('管材マスタ取得失敗:', e);
    }
  }

  // ── 電材カテゴリ定義（依存ドロップダウン用）─────────────────────
  // CRM CustomModule19 の field6 にカテゴリが格納されている。
  const DENZAI_CATEGORIES = [
    { label: '1.複合環境制御・ｱｸﾞﾘﾈｯﾄ' },
    { label: '2.天窓側窓関連' },
    { label: '3.周辺機器制御' },
    { label: '8.電線管（材工単価）' },
    { label: '9.電線（材工単価）' },
    { label: '10.遮断器（材工単価）' },
  ];

  // ── 電材マスタ（CustomModule19）────────────────────────────────

  async function loadDenzai() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule19', 'Name');
      state.denzai = data.map(r => ({
        id:       r.id,
        name:     r.Name    || '',
        model:    r.field1  || '',   // 型式
        unit:     r.field3  || '個', // 単位
        price:    Number(r.field) || 0,   // 価格
        cost:     Number(r.field2) || 0,  // 原価
        houdan:   parseFloat(r.field4) || 0, // 歩単
        note:     r.field5  || '',   // 備考
        category: r.field6  || '',   // カテゴリ
        source:   'denzai',
      }));
      console.log(`電材マスタ ${state.denzai.length} 件読み込み`);
    } catch (e) {
      console.warn('電材マスタ取得失敗:', e);
    }
  }

  // ── 物販標準項マスタ（CustomModule26）────────────────────────────

  async function loadBuppanStandard() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule26', 'Name');
      state.buppanStandard = data.map(r => ({
        id:       r.id,
        category: r.field6 || '',
        model:    r.field  || '',
        name:     r.field1 || '',
        hinban:   r.field2 || '',
        qty:      Number(r.field4) || 1,
        unit:     r.field3 || '式',
        order:    Number(r.field5) || 99,
        teika:    Number(r.field8)  || 0,
        shikiri:  Number(r.field7)  || 0,
        genka:    Number(r.field12) || 0,
        spec:     r.field9  || '',       // 熱機仕様
        shubetsu: r.field10 || '',       // 種別（熱機/農用/衛生）
      }));
      console.log(`物販標準項マスタ ${state.buppanStandard.length} 件読み込み`);
      buildBuppanCategorySelect();
      buildEiseiCategorySelect();
    } catch (e) {
      console.warn('物販標準項マスタ取得失敗:', e);
    }
  }

  function buildBuppanCategorySelect() {
    const catSel = document.getElementById('buppanStdCategorySelect');
    if (!catSel) return;
    const cats = [...new Set(
      state.buppanStandard
        .filter(r => r.shubetsu !== '衛生')
        .map(r => r.category)
        .filter(Boolean)
    )];
    while (catSel.options.length > 1) catSel.remove(1);
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      catSel.appendChild(opt);
    });
  }

  function onBuppanCatChange(cat) {
    const modelSel = document.getElementById('buppanStdModelSelect');
    if (!modelSel) return;
    while (modelSel.options.length > 1) modelSel.remove(1);
    const models = [...new Set(
      state.buppanStandard
        .filter(r => r.shubetsu !== '衛生' && r.category === cat)
        .map(r => r.model)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'ja'));
    models.forEach(model => {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      modelSel.appendChild(opt);
    });
    modelSel.value = '';
  }

  function buildEiseiCategorySelect() {
    const catSel = document.getElementById('eiseiCatSelect');
    if (!catSel) return;
    const cats = [...new Set(
      state.buppanStandard
        .filter(r => r.shubetsu === '衛生')
        .map(r => r.category)
        .filter(Boolean)
    )];
    while (catSel.options.length > 1) catSel.remove(1);
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      catSel.appendChild(opt);
    });
  }

  function onEiseiCatChange(cat) {
    const modelSel = document.getElementById('eiseiModelSelect');
    if (!modelSel) return;
    while (modelSel.options.length > 1) modelSel.remove(1);
    const models = [...new Set(
      state.buppanStandard
        .filter(r => r.shubetsu === '衛生' && r.category === cat)
        .map(r => r.model)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'ja'));
    models.forEach(model => {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      modelSel.appendChild(opt);
    });
    modelSel.value = '';
  }

  function execBuppanStandardAdd() {
    const model = document.getElementById('buppanStdModelSelect')?.value || '';
    if (!model) { showToast('型式を選択してください', 'warn'); return; }

    if (state.sections.length === 0) addSection();

    const targetVal = document.getElementById('netsukiTargetSection')?.value || 'last';
    let targetSection;
    if (targetVal === 'last') {
      targetSection = state.sections[state.sections.length - 1];
    } else {
      const targetId = Number(targetVal);
      targetSection = state.sections.find(s => s.id === targetId) || state.sections[state.sections.length - 1];
    }

    const lastItem = targetSection.items[targetSection.items.length - 1];
    if (lastItem && !lastItem.name && !lastItem.spec && !lastItem.unitPrice && !lastItem.amount) {
      targetSection.items.pop();
    }

    const matched = state.buppanStandard
      .filter(r => r.model === model)
      .sort((a, b) => a.order - b.order);

    if (matched.length === 0) {
      showToast(`型式「${model}」の標準項が見つかりません`, 'warn');
      return;
    }

    // 順番1に仕切価格（shikiri）があれば従来型、なければ新構造（SBM系）
    // 従来型(AWH/AWS/GD/GN等93型式): order=1にshikiriあり → order=1が本機
    // 新構造(SBM系): order=1にshikiriなし（0） → order=1がヘッダー, order=2が本機
    const order1Row = matched.find(r => r.order === 1);
    const isNetsukiStructure = !order1Row || !(order1Row.shikiri && order1Row.shikiri > 0);

    let mainItem = null;
    let headerHinban = '';  // order=1 の品番を order=2 に引き継ぐ
    matched.forEach(r => {
      if (isNetsukiStructure) {
        // ── 新構造（SBM系）──
        if (r.order === 1) {
          // 品名ヘッダー行（価格なし）
          headerHinban = r.hinban || '';
          const header = createItem();
          header.name            = r.name;
          header.qty             = '';
          header.unit            = '';
          header.isNetsukiHeader = true;
          targetSection.items.push(header);
        } else if (r.order === 2 && !mainItem) {
          // 本機行（価格・仕様あり）
          const hinban = r.hinban || headerHinban;  // order=2 になければ order=1 の品番を使用
          const item = createItem();
          item.isNetsukiMain = true;
          item.name           = r.name;
          item.spec           = r.model || '';
          item.productCode    = hinban;
          item.qty            = r.qty;
          item.unit           = r.unit;
          item.unitPrice      = r.teika  || null;
          item.amount         = (r.teika || 0) * r.qty;
          item.genka          = r.genka;
          item.dairiUnitPrice = null;
          if (r.spec) {
            const cleanedSpec = r.spec.split('\n')
              .map(l => l.split('\t').map(t => t.trim()).filter(t => t).join('　'))
              .filter(l => l).join('\n');
            item.model              = r.model || '';
            item.specMasterContent  = cleanedSpec;
            item.specMasterLoaded   = true;
            item.specMasterFromProducts = true;
            _applySpecToMachineSpec(item);
          }
          mainItem = item;
          targetSection.items.push(item);
        } else if (mainItem) {
          // order=3+: 付属品行（個別行として追加）
          const subItem = createItem();
          subItem.name           = r.name;
          subItem.spec           = r.model  || '';
          subItem.productCode    = r.hinban || '';
          subItem.qty            = r.qty;
          subItem.unit           = r.unit;
          subItem.unitPrice      = r.teika  || null;
          subItem.amount         = (r.teika || 0) * r.qty;
          subItem.genka          = r.genka;
          subItem.dairiUnitPrice = null;
          targetSection.items.push(subItem);
        }
      } else {
        // ── 旧構造（非SBM）──
        if (r.order === 1) {
          // 本機行（価格あり）
          const item = createItem();
          item.name           = r.name;
          item.spec           = r.model  || '';
          item.productCode    = r.hinban || '';
          item.qty            = r.qty;
          item.unit           = r.unit;
          item.unitPrice      = r.teika  || null;
          item.amount         = (r.teika || 0) * r.qty;
          item.genka          = r.genka;
          item.dairiUnitPrice = null;
          item.model          = model;
          item.printModel     = true;
          mainItem = item;
          targetSection.items.push(item);
        } else if (mainItem) {
          // 付属品行（個別行として追加）
          const subItem = createItem();
          subItem.name           = r.name;
          subItem.spec           = r.model  || '';
          subItem.productCode    = r.hinban || '';
          subItem.qty            = r.qty;
          subItem.unit           = r.unit;
          subItem.unitPrice      = r.teika  || null;
          subItem.amount         = (r.teika || 0) * r.qty;
          subItem.genka          = r.genka;
          subItem.dairiUnitPrice = null;
          targetSection.items.push(subItem);
        }
      }
    });

    markDirty();
    renderSections();
    updateOutput();
    showToast(`No.${targetSection.no} に ${model} を追加しました`);
  }

  // ── 備考プリセット ───────────────────────────────────────────
  const REMARK_PRESETS = [
    'ご指定納入日より納品が遅れる際には保管費用が発生する場合がございます。',
    '本見積書には、法定福利費を含んでおります。',
    '路線便の配達です。時間指定別途です。',
    '・路線便の配達です。時間指定別途です。\n・試運転調整費及び設定値変更作業等は費用別途です。\n・缶体設定温度（目安）は1～7段階のデジタル設定です。\n注記：\n・標高1000ｍを超える高地でご使用いただく場合は別途設定の切り替え（有償）が必要となります。\n・標高1500ｍを超える高地での使用は不具合が発生する可能性が高く、推奨いたしません。',
    '集合煙突NGです。本見積製品の煙突は1対1で施工をお願いします。',
    'バルブ類は含まれておりません。',
    '保温・ラッキングは含んでおりません。',
    '内部配管は現地施工にてお願いいたします。',
    'ソケット取付追加の場合は費用別途です。',
    '・記載以外の部品及び交換作業別途です。\n・点検作業は平日になります。夜間・休日作業別途です。\n・本見積書には、法定福利費が含まれています。\n・見積記載事項以外別途です。\n・消費税等別途です。',
    '・缶体燃焼室内部清掃作業別途です。',
  ];

  let _remarkPresetSelected = 0;

  function selectRemarkPreset(n) {
    _remarkPresetSelected = n;
    const text = REMARK_PRESETS[n - 1] || '';
    const preview = document.getElementById('remarkPreviewBox');
    if (preview) preview.textContent = text;
    document.querySelectorAll('.btn-remark-preset').forEach((btn, i) => {
      btn.classList.toggle('is-selected', i + 1 === n);
    });
  }

  function insertSelectedRemark() {
    const text = _remarkPresetSelected ? REMARK_PRESETS[_remarkPresetSelected - 1] : '';
    if (!text) { showToast('定型文を選択してください', 'warn'); return; }
    const el = document.getElementById('remarks');
    if (!el) return;
    const cur = el.value;
    el.value = cur ? cur + '\n' + text : text;
    el.dispatchEvent(new Event('input'));
  }

  async function execEiseiAdd() {
    const model = document.getElementById('eiseiModelSelect')?.value || '';
    if (!model) { showToast('型式を選択してください', 'warn'); return; }

    const matched = state.eiseiCache
      .filter(r => r.model === model)
      .sort((a, b) => a.order - b.order);

    if (matched.length === 0) {
      showToast(`型式「${model}」の衛生標準項が見つかりません`, 'warn');
      return;
    }

    if (state.sections.length === 0) addSection();
    const targetSection = state.sections[state.sections.length - 1];

    const lastItem = targetSection.items[targetSection.items.length - 1];
    if (lastItem && !lastItem.name && !lastItem.spec && !lastItem.unitPrice && !lastItem.amount) {
      targetSection.items.pop();
    }

    const mainRecord = matched.find(r => r.order === 1);
    if (!mainRecord) return;

    // 商品マスタから商品コード・価格を取得（半角→全角変換してProduct_Nameで検索）
    let productCode = '';
    let unitPrice   = null;
    let genka       = 0;
    let priceS      = 0;
    try {
      // 大文字小文字混在に対応: 全て大文字に統一してから全角変換
      const fwModel = model.toUpperCase()
        .replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0))
        .replace(/[0-9]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0))
        .replace(/-/g, '－');
      const res = await ZOHO.CRM.API.searchRecord({
        Entity: 'Products', Type: 'criteria',
        Query: `(Product_Name:equals:${fwModel})`,
        page: 1, per_page: 1,
      });
      if (res && res.data && res.data[0]) {
        const p    = res.data[0];
        productCode = p.Product_Code || '';
        unitPrice   = Number(p.Unit_Price) || null;
        genka       = Number(p.field1)     || 0;
        priceS      = Number(p.field)      || 0;   // 最低仕切
      }
    } catch(e) { /* 商品マスタに存在しない場合は空のまま */ }

    const item = createItem();
    item.name        = mainRecord.model;
    item.unit        = '式';
    item.spec        = '';
    item.productCode = productCode;
    item.qty         = 1;
    item.unitPrice   = unitPrice;
    item.amount      = unitPrice || 0;
    item.genka       = genka;
    item.priceS      = priceS;
    item.specLines   = matched
      .filter(r => r.order !== 1)
      .sort((a, b) => a.order - b.order)
      .map(r => r.name);
    targetSection.items.push(item);

    markDirty();
    renderSections();
    updateOutput();
    showToast(`No.${targetSection.no} に ${model} を追加しました`);
  }

  // ── 衛生マスタ（CustomModule30）────────────────────────────────

  async function loadEisei() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule30', 'field3');
      state.eiseiCache = data.map(r => ({
        id:     r.id,
        name:   r.Name    || '',  // 衛生名
        model:  r.field   || '',  // セット型式
        hinban: r.field1  || '',  // セット品番
        note:   r.field2  || '',  // 注意ポップ
        order:  Number(r.field3) || 99,  // 順番
        chu:    r.field4  || '',  // 中項目
        sho:    r.field5  || '',  // 小項目
      }));
      console.log(`衛生マスタ ${state.eiseiCache.length} 件読み込み`);
      buildEiseiChuSelect();
    } catch (e) {
      console.warn('衛生マスタ取得失敗:', e);
    }
  }

  function buildEiseiChuSelect() {
    const sel = document.getElementById('eiseiChuSelect');
    if (!sel) return;
    const chuList = [...new Set(
      state.eiseiCache.map(r => r.chu).filter(Boolean)
    )].reverse();
    while (sel.options.length > 1) sel.remove(1);
    chuList.forEach(chu => {
      const opt = document.createElement('option');
      opt.value = chu;
      opt.textContent = chu;
      sel.appendChild(opt);
    });
  }

  function onEiseiChuChange(chu) {
    const shoSel   = document.getElementById('eiseiShoSelect');
    const modelSel = document.getElementById('eiseiModelSelect');
    if (!shoSel || !modelSel) return;
    while (shoSel.options.length   > 1) shoSel.remove(1);
    while (modelSel.options.length > 1) modelSel.remove(1);
    shoSel.value   = '';
    modelSel.value = '';
    if (!chu) return;
    const shoList = [...new Set(
      state.eiseiCache.filter(r => r.chu === chu).map(r => r.sho).filter(Boolean)
    )].reverse();
    shoList.forEach(sho => {
      const opt = document.createElement('option');
      opt.value = sho;
      opt.textContent = sho;
      shoSel.appendChild(opt);
    });
  }

  function onEiseiShoChange(sho) {
    const modelSel = document.getElementById('eiseiModelSelect');
    if (!modelSel) return;
    while (modelSel.options.length > 1) modelSel.remove(1);
    modelSel.value = '';
    if (!sho) return;
    const models = [...new Set(
      state.eiseiCache
        .filter(r => r.sho === sho && r.order === 1)
        .map(r => r.model)
        .filter(Boolean)
    )].reverse();
    models.forEach(model => {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      modelSel.appendChild(opt);
    });
  }

  // ── 工事用機器リスト（CustomModule23）────────────────────────────

  async function loadKiki() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule23', 'Name');
      state.kiki = data.map(r => ({
        id:     r.id,
        name:   r.Name    || '',         // 品名
        code:   r.field1  || '',         // 品番
        model:  r.field2  || '',         // 型式
        unit:   r.field3  || '台',       // 単位
        price:  Number(r.price)  || 0,   // 小売価格
        cost:   Number(r.field4) || 0,   // 原価
        houdan: parseFloat(r.field5) || 0, // 歩単
        kubun:  r.field6  || '',         // 分類
        source: 'kiki',
      }));
      // 分類フィルターの選択肢を生成
      const kubunSet = [...new Set(state.kiki.map(r => r.kubun).filter(Boolean))].sort();
      const sel = document.getElementById('kikiKubunFilter');
      if (sel) {
        kubunSet.forEach(k => {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = k;
          sel.appendChild(opt);
        });
      }
      const kikiCatSel = document.getElementById('kikiCatSel');
      if (kikiCatSel) {
        while (kikiCatSel.options.length > 1) kikiCatSel.remove(1);
        kubunSet.forEach(k => {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = k;
          kikiCatSel.appendChild(opt);
        });
      }
      console.log(`工事用機器リスト ${state.kiki.length} 件読み込み`);
    } catch (e) {
      console.warn('工事用機器リスト取得失敗:', e);
    }
  }

  function searchKiki(query) {
    const dd = document.getElementById('kikiDropdown');
    const kubun = document.getElementById('kikiKubunFilter')?.value || '';
    let items = state.kiki;
    if (kubun) items = items.filter(r => r.kubun === kubun);
    let filtered;
    if (!query || query.length < 1) {
      if (!kubun) { dd.style.display = 'none'; state._kikiResults = []; return; }
      filtered = items.slice(0, 25);
    } else {
      const q = normalize(query);
      filtered = items.filter(r =>
        normalize(r.name).includes(q) ||
        normalize(r.code || '').includes(q) ||
        normalize(r.model || '').includes(q)
      ).slice(0, 25);
    }
    state._kikiResults = filtered;
    if (filtered.length === 0) { dd.style.display = 'none'; return; }
    dd.innerHTML = filtered.map((item, idx) => `
      <div class="product-item" data-idx="${idx}">
        <div style="flex:1;min-width:0">
          <div class="p-name">${escHtml(item.name)}</div>
          <div class="p-code">${escHtml(item.model || '')}${item.code ? ' | ' + escHtml(item.code) : ''}${item.kubun ? ' [' + escHtml(item.kubun) + ']' : ''}</div>
        </div>
        <div class="p-price">¥${item.price.toLocaleString('ja-JP')}</div>
      </div>`).join('');
    dd.style.display = 'block';
    dd.querySelectorAll('.product-item').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const item = state._kikiResults[Number(el.dataset.idx)];
        if (!item) return;
        state.pendingKiki = item;
        document.getElementById('kikiSearch').value = item.name;
        dd.style.display = 'none';
      });
    });
  }

  function execKikiAdd() {
    if (!state.pendingKiki) { showToast('機器を検索して選択してください', 'warn'); return; }
    if (state.sections.length === 0) addSection();
    const targetVal = (document.getElementById('kikiTargetSection') || {}).value || 'last';
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
    const m = state.pendingKiki;
    const item = createItem();
    item.name        = m.name;
    item.spec        = m.model || '';
    item.productCode = m.code  || '';
    item.unit        = m.unit  || '台';
    item.unitPrice = m.price || 0;
    item.amount    = (m.price || 0) * (item.qty || 1);
    item.genka     = m.cost  || 0;
    item.houdan    = m.houdan || 0;
    targetSection.items.push(item);
    showToast(`No.${targetSection.no} に ${m.name} を追加しました`);
    state.pendingKiki = null;
    const searchEl = document.getElementById('kikiSearch');
    if (searchEl) searchEl.value = '';
    markDirty();
    renderSections();
    updateOutput();
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
  function addKoujihiItem(section, k, includeSpecLines = false) {
    const item = createItem();
    item.productId    = null;
    item.name         = k.name;
    item.spec         = k.model || '';
    item.productCode  = k.code  || '';
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
    item.specLines    = (includeSpecLines && k.kikoShiyou)
      ? k.kikoShiyou.split('\n').map(l => l.trim()).filter(l => l)
      : [];
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
    const targetVal = document.getElementById('standardRowTargetSection')?.value || 'last';
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

    matched.forEach((k, idx) => addKoujihiItem(targetSection, k, idx === 0));
    markDirty();
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
    ['product', 'kiki', 'kanzai', 'denzai', 'standard', 'kouji', 'netsuki'].forEach(c => {
      const panel = document.getElementById(`catPanel-${c}`);
      if (panel) panel.style.display = c === cat ? '' : 'none';
    });
    [
      ['kanzaiRow',    'kanzai'],
      ['denzaiRow',    'denzai'],
      ['koujiRow',     'kouji'],
      ['kikiRow',      'kiki'],
    ].forEach(([id, c]) => {
      const el = document.getElementById(id);
      if (el) el.style.display = cat === c ? '' : 'none';
    });
    // 熱機・衛生・標準項の行はswitchStandardSubで制御。タブ切替時は常時非表示
    ['netsukiRow', 'standardRow', 'eiseiRow'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    // 標準項サブタブ行: 標準項タブ選択時のみ表示
    const standardSubRowEl = document.getElementById('standardSubRow');
    if (standardSubRowEl) standardSubRowEl.style.display = cat === 'standard' ? '' : 'none';
    // 標準項以外に切替時はサブタブのアクティブ状態をリセット
    if (cat !== 'standard') {
      document.getElementById('standardSubNetsuki')?.classList.remove('active');
      document.getElementById('standardSubStandard')?.classList.remove('active');
      document.getElementById('standardSubEisei')?.classList.remove('active');
    }
  }

  function switchStandardSub(sub) {
    document.getElementById('standardSubNetsuki')?.classList.toggle('active', sub === 'netsuki');
    document.getElementById('standardSubStandard')?.classList.toggle('active', sub === 'standard');
    document.getElementById('standardSubEisei')?.classList.toggle('active', sub === 'eisei');
    const netsukiRow = document.getElementById('netsukiRow');
    const standardRow = document.getElementById('standardRow');
    const eiseiRow = document.getElementById('eiseiRow');
    if (netsukiRow) netsukiRow.style.display = sub === 'netsuki' ? '' : 'none';
    if (standardRow) standardRow.style.display = sub === 'standard' ? '' : 'none';
    if (eiseiRow) eiseiRow.style.display = sub === 'eisei' ? '' : 'none';
  }

  function onKoujiKubunChange(kubun) {
    const nameSel = document.getElementById('koujiNameSelect');
    if (!nameSel) return;
    nameSel.innerHTML = '<option value="">― 工事名称を選択 ―</option>';
    const kubunData = KOUJI_DATA.find(k => k.kubun === kubun);
    if (!kubunData) return;
    kubunData.items.forEach(it => {
      const opt = document.createElement('option');
      opt.value = it.name;
      opt.textContent = `${it.name}（減衰${it.gensuiKubun}）`;
      opt.dataset.gensui = it.gensuiKubun;
      nameSel.appendChild(opt);
    });
  }

  function execKoujiAdd() {
    const kubunSel = document.getElementById('koujiKubunSelect');
    const nameSel  = document.getElementById('koujiNameSelect');
    const kubun    = kubunSel?.value || '';
    const name     = nameSel?.value  || '';
    if (!kubun || !name) {
      showToast('工事区分と工事名称を選択してください', 'warn');
      return;
    }

    const selOpt      = nameSel.options[nameSel.selectedIndex];
    const gensuiKubun = selOpt?.dataset?.gensui || '';

    if (state.sections.length === 0) addSection();
    const targetVal = document.getElementById('koujiRowTargetSection')?.value || 'last';
    const targetSection = targetVal === 'last'
      ? state.sections[state.sections.length - 1]
      : (state.sections.find(s => s.id === Number(targetVal)) || state.sections[state.sections.length - 1]);

    const lastItem = targetSection.items[targetSection.items.length - 1];
    if (lastItem && !lastItem.name && !lastItem.spec && !lastItem.unitPrice && !lastItem.amount) {
      targetSection.items.pop();
    }

    const item = createItem();
    item.name           = name;
    item.calcCategory   = '④工事費';
    item.includeInLabor = true;
    item.gensuiKubun    = gensuiKubun;
    const master = state.koujihi.find(k => k.gensuiKubun === gensuiKubun);
    if (master) { item.gensuiA = master.gensuiA; item.gensuiB = master.gensuiB; }

    targetSection.items.push(item);
    markDirty();
    renderSections();
    updateOutput();
    showToast(`「${name}」を追加しました`);
  }

  function execCatAdd() {
    // 共通セレクトの値を各隠しセレクトに同期
    const val = document.getElementById('commonTargetSection')?.value || 'last';
    ['productTargetSection', 'kikiTargetSection', 'kanzaiTargetSection', 'denzaiTargetSection', 'standardTargetSection'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.value = val;
    });
    if (currentCat === 'product')        execProductAdd();
    else if (currentCat === 'kiki')      execKikiAdd();
    else if (currentCat === 'kanzai')    execMaterialAdd('kanzai');
    else if (currentCat === 'denzai')    execMaterialAdd('denzai');
    else if (currentCat === 'standard')  execStandardAdd();
    else if (currentCat === 'kouji')     execKoujiAdd();
  }

  /** 追加先セクションセレクトを更新（セクション追加・削除時に呼ぶ） */
  function updateTargetSectionSelect() {
    ['standardTargetSection', 'productTargetSection', 'kikiTargetSection', 'kanzaiTargetSection', 'denzaiTargetSection', 'commonTargetSection', 'netsukiTargetSection', 'eiseiTargetSection', 'kanzaiRowTargetSection', 'denzaiRowTargetSection', 'kikiRowTargetSection', 'koujiRowTargetSection', 'standardRowTargetSection', 'setProductTargetSection'].forEach(id => {
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
      // ── 商品マスタ: 商品1行を追加 ────────────────────────────────
      const item = createItem();
      item.productId   = product.id;
      item.name        = product.name;
      item.denpyoName  = product.denpyoName || '';  // 伝票名称（印刷用）
      item.spec        = product.model || '';
      item.productCode = product.code;
      item.model       = product.model || '';
      item.productSpec = product.specContent || '';
      item.unit        = product.unit || '式';
      item.unitPrice = product.price;
      item.amount    = product.price;
      item.genka     = product.cost   || 0; // 標準原価（field1）
      item.houdan    = product.houdan || 0; // 歩単（field12）
      item.priceS    = product.priceS || 0;
      item.priceA    = product.priceA || 0;
      item.priceB    = product.priceB || 0;
      item.priceC    = product.priceC || 0;
      targetSection.items.push(item);
      showToast(`No.${targetSection.no} に ${product.name} を追加しました`);
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

    markDirty();
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

  // ── 管材依存ドロップダウン ────────────────────────────────────

  let _kanzaiFilteredRecords = [];

  function initKanzaiSelects() {
    const catSel = document.getElementById('kanzaiCatSel');
    if (!catSel) return;
    KANZAI_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.label;
      opt.textContent = cat.label;
      catSel.appendChild(opt);
    });
  }

  function onKanzaiCatChange(catLabel) {
    const itemSel = document.getElementById('kanzaiItemSel');
    if (!itemSel) return;
    itemSel.innerHTML = '<option value="">― 品名・型式を選択 ―</option>';
    itemSel.disabled  = true;
    _kanzaiFilteredRecords = [];
    state.pendingKanzai = null;
    if (!catLabel) return;
    if (!KANZAI_CATEGORIES.some(c => c.label === catLabel)) return;
    _kanzaiFilteredRecords = state.kanzai.filter(r => r.category === catLabel);
    _kanzaiFilteredRecords.forEach((r, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = r.name || '';
      itemSel.appendChild(opt);
    });
    if (_kanzaiFilteredRecords.length > 0) itemSel.disabled = false;
  }

  function onKanzaiItemChange(val) {
    state.pendingKanzai = null;
    if (val === '' || val === null || val === undefined) return;
    const idx = parseInt(val, 10);
    if (!isNaN(idx) && _kanzaiFilteredRecords[idx]) {
      state.pendingKanzai = _kanzaiFilteredRecords[idx];
    }
  }

  // ── 機器依存ドロップダウン ────────────────────────────────────

  let _kikiFilteredRecords = [];

  function onKikiCatChange(kubun) {
    const itemSel = document.getElementById('kikiItemSel');
    if (!itemSel) return;
    itemSel.innerHTML = '<option value="">― 品名・型式を選択 ―</option>';
    itemSel.disabled = true;
    _kikiFilteredRecords = [];
    state.pendingKiki = null;
    if (!kubun) return;
    _kikiFilteredRecords = state.kiki.filter(r => r.kubun === kubun);
    _kikiFilteredRecords.forEach((r, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = r.name || '';
      itemSel.appendChild(opt);
    });
    if (_kikiFilteredRecords.length > 0) itemSel.disabled = false;
  }

  function onKikiItemChange(val) {
    state.pendingKiki = null;
    if (val === '' || val === null || val === undefined) return;
    const idx = parseInt(val, 10);
    if (!isNaN(idx) && _kikiFilteredRecords[idx]) {
      state.pendingKiki = _kikiFilteredRecords[idx];
    }
  }

  function execKikiRowAdd() {
    const pending = state.pendingKiki;
    if (!pending) { showToast('品名・型式を選択してください', 'warn'); return; }
    if (state.sections.length === 0) addSection();

    const targetVal = document.getElementById('kikiRowTargetSection')?.value || 'last';
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

    state.pendingKiki = null;
    const itemSel = document.getElementById('kikiItemSel');
    if (itemSel) itemSel.value = '';
    markDirty();
    renderSections();
    updateOutput();
  }

  // ── 電材依存ドロップダウン ────────────────────────────────────

  let _denzaiFilteredRecords = [];

  function initDenzaiSelects() {
    const catSel = document.getElementById('denzaiCatSel');
    if (!catSel) return;
    DENZAI_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.label;
      opt.textContent = cat.label;
      catSel.appendChild(opt);
    });
  }

  function onDenzaiCatChange(catLabel) {
    const itemSel = document.getElementById('denzaiItemSel');
    if (!itemSel) return;
    itemSel.innerHTML = '<option value="">― 品名・型式を選択 ―</option>';
    itemSel.disabled  = true;
    _denzaiFilteredRecords = [];
    state.pendingDenzai = null;
    if (!catLabel) return;
    if (!DENZAI_CATEGORIES.some(c => c.label === catLabel)) return;
    _denzaiFilteredRecords = state.denzai.filter(r => r.category === catLabel);
    _denzaiFilteredRecords.forEach((r, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = r.name || '';
      itemSel.appendChild(opt);
    });
    if (_denzaiFilteredRecords.length > 0) itemSel.disabled = false;
  }

  function onDenzaiItemChange(val) {
    state.pendingDenzai = null;
    if (val === '' || val === null || val === undefined) return;
    const idx = parseInt(val, 10);
    if (!isNaN(idx) && _denzaiFilteredRecords[idx]) {
      state.pendingDenzai = _denzaiFilteredRecords[idx];
    }
  }

  function execDenzaiRowAdd() {
    const pending = state.pendingDenzai;
    if (!pending) { showToast('品名・型式を選択してください', 'warn'); return; }
    if (state.sections.length === 0) addSection();

    const targetVal = document.getElementById('denzaiRowTargetSection')?.value || 'last';
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

    state.pendingDenzai = null;
    const itemSel = document.getElementById('denzaiItemSel');
    if (itemSel) itemSel.value = '';
    markDirty();
    renderSections();
    updateOutput();
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
    item.name             = m.name;
    item.model            = m.model || '';
    item.spec             = m.model || m.code || '';
    item.productCode      = m.code  || '';
    item.unit             = m.unit  || '個';
    item.unitPrice        = m.price || 0;
    item.amount           = (m.price || 0) * (item.qty || 1);
    item.genka            = m.cost  || 0;
    item.houdan           = m.houdan || 0;
    item.machineSpecHidden = true;
    item.specMasterLoaded  = true;
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

    markDirty();
    renderSections();
    updateOutput();
  }

  function execKanzaiRowAdd() {
    const pending = state.pendingKanzai;
    if (!pending) { showToast('品名・型式を選択してください', 'warn'); return; }
    if (state.sections.length === 0) addSection();

    const targetVal = document.getElementById('kanzaiRowTargetSection')?.value || 'last';
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

    state.pendingKanzai = null;
    const itemSel = document.getElementById('kanzaiItemSel');
    if (itemSel) itemSel.value = '';
    markDirty();
    renderSections();
    updateOutput();
  }

  // ── 機器仕様追加 ────────────────────────────────────────────────

  function _parseSpecText(text) {
    if (!text) return [];
    return String(text).split('\n').map(l => l.trim()).filter(l => l).map(l => {
      const idx = l.indexOf('：');
      if (idx > -1) return { label: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim() };
      return { label: l, value: '' };
    });
  }

  function showMachineSpecModal(btn) {
    const block = btn.closest('.section-block');
    _machineSpecSectionId = Number(block.dataset.sectionId);
    _machineSpecModel = null;
    _machineSpecSearchResults = [];
    const modal = document.getElementById('machineSpecModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const inp = document.getElementById('machineSpecSearch');
    inp.value = '';
    document.getElementById('machineSpecResults').innerHTML = '';
    document.getElementById('machineSpecPreview').style.display = 'none';

    // セクション内の商品アイテム（型式あり）を全件取得してチップ表示
    const sec = state.sections.find(s => s.id === _machineSpecSectionId);
    const productItems = (sec ? sec.items : []).filter(it => it.productId && it.model);
    const chipsEl = document.getElementById('machineSpecProductChips');

    if (productItems.length === 0) {
      chipsEl.style.display = 'none';
      inp.focus();
    } else if (productItems.length === 1) {
      // 1件のみ → チップ非表示で即検索
      chipsEl.style.display = 'none';
      inp.value = productItems[0].model;
      document.getElementById('machineSpecResults').innerHTML =
        '<div class="machine-spec-no-result">検索中...</div>';
      _execMachineSpecSearch(productItems[0].model, true);
    } else {
      // 複数 → チップ一覧を表示して選択させる
      // data-model 属性にモデル名を格納し onclick では this のみ渡す（引用符エスケープ問題を回避）
      chipsEl.style.display = 'flex';
      chipsEl.innerHTML =
        `<span class="machine-spec-product-chips-label">セクション内の商品（クリックで検索）</span>` +
        productItems.map(it =>
          `<button class="machine-spec-chip" data-model="${escHtml(it.model)}" onclick="app._selectMachineSpecChip(this)">${escHtml(it.model)}</button>`
        ).join('');
      inp.focus();
    }
  }

  function _selectMachineSpecChip(chipEl) {
    const model = chipEl.dataset.model || '';
    document.querySelectorAll('.machine-spec-chip').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');
    const inp = document.getElementById('machineSpecSearch');
    inp.value = model;
    document.getElementById('machineSpecResults').innerHTML =
      '<div class="machine-spec-no-result">検索中...</div>';
    document.getElementById('machineSpecPreview').style.display = 'none';
    _execMachineSpecSearch(model, true);
  }

  function closeMachineSpecModal() {
    const modal = document.getElementById('machineSpecModal');
    if (modal) modal.style.display = 'none';
    clearTimeout(_machineSpecTimer);
  }

  // ── 機器仕様マスタ（CustomModule21）─────────────────────────────

  async function _resolveDeptRecordId() {
    if (state.deptRecordId || !zohoReady) return;
    if (!state.createDeptCode) return;
    try {
      const res = await ZOHO.CRM.API.searchRecord({
        Entity: 'DepartmentsList', Type: 'criteria',
        Query: `(Name:equals:${state.createDeptCode})`,
        page: 1, per_page: 1
      });
      const rec = res?.data?.[0];
      if (rec) state.deptRecordId = rec.id;
    } catch(e) { console.warn('DepartmentsList resolve error:', e); }
  }

  // 仕様テキストを {label,value}[] に変換して item.machineSpec にセット（印刷連動）
  function _applySpecToMachineSpec(item) {
    const text = item.specMasterContent || '';
    if (!text) return;
    const modelKey = (item.machineSpec && item.machineSpec.model) || item.model || item.spec || '';
    const specs = text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const i = line.indexOf('：');
      if (i > 0) return { label: line.slice(0, i), value: line.slice(i + 1) };
      const j = line.indexOf(':');
      if (j > 0) return { label: line.slice(0, j), value: line.slice(j + 1) };
      return { label: line, value: '' };
    });
    item.machineSpec = { model: modelKey, specs };
  }

  async function loadItemSpecMaster(item) {
    if (!item.productId || !zohoReady) { item.specMasterLoaded = true; return; }

    // 1. CustomModule21（所課別）を優先確認
    await _resolveDeptRecordId();
    try {
      const modelKey = item.model || item.spec || item.name || '';
      const nameKey  = state.createDeptCode ? `${modelKey}_${state.createDeptCode}` : modelKey;
      const res = await ZOHO.CRM.API.searchRecord({
        Entity: 'CustomModule21', Type: 'criteria',
        Query: `(Name:equals:${nameKey})`, page: 1, per_page: 1
      });
      const rec = res?.data?.[0];
      if (rec) {
        item.specMasterId          = rec.id;
        item.specMasterContent     = rec.spec || '';
        item.specMasterFromProducts = false;
        item.specMasterLoaded      = true;
        _applySpecToMachineSpec(item);
        return;
      }
    } catch(e) { /* fall through */ }

    // 2. CustomModule21 になければ Products field13（商品マスタ）をフォールバック
    if (item.productSpec === undefined) {
      try {
        const pRes = await ZOHO.CRM.API.getRecord({ Entity: 'Products', RecordID: item.productId });
        item.productSpec = pRes?.data?.[0]?.field13 || '';
      } catch(e) { item.productSpec = ''; }
    }

    item.specMasterId          = null;
    item.specMasterContent     = item.productSpec || null;
    item.specMasterFromProducts = !!(item.productSpec);
    item.specMasterLoaded      = true;
    if (item.specMasterContent) _applySpecToMachineSpec(item);
  }

  function createSpecMasterRowDOM(item) {
    const tr = document.createElement('tr');
    tr.className    = 'spec-master-row';
    tr.dataset.itemId = item.id;
    tr.innerHTML = `<td colspan="20" class="spm-cell">
      <span class="spm-loading">機器仕様 読込中...</span>
    </td>`;
    return tr;
  }

  function updateSpecMasterRow(itemId) {
    const row  = document.querySelector(`.spec-master-row[data-item-id="${itemId}"]`);
    if (!row) return;
    const item = state.sections.flatMap(s => s.items).find(i => i.id === itemId);
    if (!item) return;
    const cell = row.querySelector('.spm-cell');
    if (!item.specMasterLoaded) {
      cell.innerHTML = '<span class="spm-loading">機器仕様 読込中...</span>';
      return;
    }
    if (item.specMasterContent) {
      const preview = item.specMasterContent.length > 80
        ? item.specMasterContent.substring(0, 80) + '...' : item.specMasterContent;
      const btnLabel = item.specMasterFromProducts ? '所課用に編集' : '編集';
      const resetBtn = !item.specMasterFromProducts
        ? `<button class="spm-btn spm-reset-btn" onclick="app.resetToProductSpec(${itemId})">標準に戻す</button>`
        : '';
      const deptRefBtn = item.specMasterFromProducts && item.specMasterId
        ? `<button class="spm-btn spm-dept-btn" onclick="app.applyDeptSpec(${itemId})">所課仕様を参照</button>`
        : '';
      const hideBtn = item.machineSpecHidden
        ? `<button class="spm-btn spm-hide-btn spm-hidden-on" onclick="app.toggleMachineSpecHidden(${itemId})">印刷OFF</button>`
        : `<button class="spm-btn spm-hide-btn" onclick="app.toggleMachineSpecHidden(${itemId})">印刷ON</button>`;
      cell.innerHTML = `<span class="spm-label">機器仕様</span>
        <span class="spm-preview">${escHtml(preview)}</span>
        <button class="spm-btn spm-edit-btn" onclick="app.showSpecMasterModal(${itemId})">${btnLabel}</button>${deptRefBtn}${resetBtn}${hideBtn}`;
    } else {
      const _hasModelVal = !!item.model;
      const hideBtn2 = _hasModelVal
        ? (item.printModel === false
            ? `<button class="spm-btn spm-hide-btn spm-hidden-on" onclick="app.toggleModelPrint(${itemId})">型式　印刷OFF</button>`
            : `<button class="spm-btn spm-hide-btn" onclick="app.toggleModelPrint(${itemId})">型式　印刷ON</button>`)
        : '';
      cell.innerHTML = `<span class="spm-label">機器仕様</span>
        <span class="spm-none">未登録</span>
        <button class="spm-btn spm-new-btn" onclick="app.showSpecMasterModal(${itemId})">新規登録</button>${hideBtn2}`;
    }
  }

  function toggleMachineSpecHidden(itemId) {
    const item = state.sections.flatMap(s => s.items).find(i => i.id === itemId);
    if (!item) return;
    item.machineSpecHidden = !item.machineSpecHidden;
    updateSpecMasterRow(itemId);
    markDirty();
  }

  function toggleModelPrint(itemId) {
    const item = state.sections.flatMap(s => s.items).find(i => i.id === itemId);
    if (!item) return;
    item.printModel = item.printModel === false ? true : false;
    updateSpecMasterRow(itemId);
    updateOutput();
    markDirty();
  }

  function setAllModelPrint(val) {
    state.sections.forEach(s => s.items.forEach(item => {
      item.printModel = val;
      // 機器仕様登録済み行も同期（machineSpecHidden で制御される）
      if (item.specMasterContent || item.machineSpec) {
        item.machineSpecHidden = !val;
      }
    }));
    state.sections.flatMap(s => s.items).forEach(item => updateSpecMasterRow(item.id));
    // グローバルボタンの状態表示を更新（OFFのとき全行OFFを赤表示）
    const btnOn  = document.getElementById('btnModelPrintOn');
    const btnOff = document.getElementById('btnModelPrintOff');
    if (btnOn)  { btnOn.classList.toggle('spm-active-on', val !== false); btnOn.classList.remove('spm-hidden-on'); }
    if (btnOff) { btnOff.classList.toggle('spm-hidden-on', val === false); btnOff.classList.remove('spm-active-on'); }
    updateOutput();
    markDirty();
    const count = state.sections.flatMap(s => s.items).filter(i => i.model || i.spec || i.specMasterContent || i.machineSpec).length;
    showToast(`型式・仕様印刷を${val ? 'ON' : 'OFF'}にしました（対象 ${count} 件）`);
  }

  let _specMasterItemId = null;

  function showSpecMasterModal(itemId) {
    _specMasterItemId = itemId;
    const item = state.sections.flatMap(s => s.items).find(i => i.id === itemId);
    if (!item) return;
    const modal = document.getElementById('specMasterModal');
    if (!modal) return;
    document.getElementById('spmProductName').textContent = item.name  || '';
    document.getElementById('spmModel').textContent       = item.model || '';
    document.getElementById('spmContent').value           = item.specMasterContent || '';
    modal.style.display = 'flex';
    document.getElementById('spmContent').focus();
  }

  function closeSpecMasterModal() {
    const modal = document.getElementById('specMasterModal');
    if (modal) modal.style.display = 'none';
    _specMasterItemId = null;
  }

  async function saveSpecMaster() {
    if (!_specMasterItemId) return;
    const item = state.sections.flatMap(s => s.items).find(i => i.id === _specMasterItemId);
    if (!item || !zohoReady) return;
    const content = (document.getElementById('spmContent').value || '').trim();
    const saveBtn = document.getElementById('spmSaveBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '保存中...'; }
    try {
      await _resolveDeptRecordId();
      const apiData = { spec: content, field1: item.model || '' };
      if (item.productId)     apiData.field2 = { id: item.productId };
      if (state.deptRecordId) apiData.field3 = { id: state.deptRecordId };
      if (item.specMasterId) {
        apiData.id = item.specMasterId;
        await ZOHO.CRM.API.updateRecord({ Entity: 'CustomModule21', APIData: apiData });
      } else {
        apiData.Name = `${item.model || item.spec || item.name}_${state.createDeptCode}`;
        const res = await ZOHO.CRM.API.insertRecord({ Entity: 'CustomModule21', APIData: apiData });
        const newId = res?.data?.[0]?.details?.id;
        if (newId) item.specMasterId = newId;
      }
      item.specMasterContent      = content;
      item.specMasterFromProducts  = false;
      item.specMasterLoaded        = true;
      _applySpecToMachineSpec(item);
      const savedItemId = _specMasterItemId;  // closeModal より先に退避
      closeSpecMasterModal();
      updateSpecMasterRow(savedItemId);
      // 印刷プレビュー更新
      const sec = state.sections.find(s => s.items.some(i => i.id === item.id));
      if (sec) {
        const block = document.querySelector(`.section-block[data-section-id="${sec.id}"]`);
        if (block) renderSection(sec, block);
      }
      updateOutput();
      showToast('機器仕様を保存しました');
    } catch(e) {
      console.warn('specMaster save error:', e);
      showToast('保存に失敗しました');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '保存'; }
    }
  }

  async function resetToProductSpec(itemId) {
    const item = state.sections.flatMap(s => s.items).find(i => i.id === itemId);
    if (!item) return;
    // CRM レコードは変更せず表示のみ切り替え（specMasterId は保持）
    if (item.productSpec === undefined && item.productId && zohoReady) {
      try {
        const pRes = await ZOHO.CRM.API.getRecord({ Entity: 'Products', RecordID: item.productId });
        item.productSpec = pRes?.data?.[0]?.field13 || '';
      } catch(e) { item.productSpec = ''; }
    }
    item.specMasterContent     = item.productSpec || null;
    item.specMasterFromProducts = true;
    item.specMasterLoaded       = true;
    if (item.specMasterContent) _applySpecToMachineSpec(item);
    else item.machineSpec = null;
    updateSpecMasterRow(itemId);
    const sec = state.sections.find(s => s.items.some(i => i.id === item.id));
    if (sec) {
      const block = document.querySelector(`.section-block[data-section-id="${sec.id}"]`);
      if (block) renderSection(sec, block);
    }
    updateOutput();
    showToast('商品マスタの仕様に戻しました');
  }

  async function applyDeptSpec(itemId) {
    const item = state.sections.flatMap(s => s.items).find(i => i.id === itemId);
    if (!item || !item.specMasterId || !zohoReady) return;
    try {
      const res = await ZOHO.CRM.API.getRecord({ Entity: 'CustomModule21', RecordID: item.specMasterId });
      const rec = res?.data?.[0];
      if (!rec) { showToast('所課仕様が見つかりません'); return; }
      item.specMasterContent     = rec.spec || '';
      item.specMasterFromProducts = false;
      item.specMasterLoaded       = true;
      _applySpecToMachineSpec(item);
      updateSpecMasterRow(itemId);
      const sec = state.sections.find(s => s.items.some(i => i.id === item.id));
      if (sec) {
        const block = document.querySelector(`.section-block[data-section-id="${sec.id}"]`);
        if (block) renderSection(sec, block);
      }
      updateOutput();
      showToast('所課仕様を参照しました');
    } catch(e) {
      console.warn('applyDeptSpec error:', e);
      showToast('所課仕様の読み込みに失敗しました');
    }
  }

  function searchMachineSpecs() {
    const q  = (document.getElementById('machineSpecSearch').value || '').trim();
    const el = document.getElementById('machineSpecResults');
    clearTimeout(_machineSpecTimer);
    if (q.length < 2) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="machine-spec-no-result">検索中...</div>';
    _machineSpecTimer = setTimeout(() => _execMachineSpecSearch(q), 400);
  }

  async function _execMachineSpecSearch(q, exact) {
    const el = document.getElementById('machineSpecResults');
    try {
      let products = [];
      if (zohoReady) {
        // exact=true のとき field2 完全一致検索（型式自動補完時）
        // exact=false のとき word 部分一致検索（手動入力時）
        const searchParam = exact
          ? { Entity: 'Products', Type: 'criteria', Query: `(field2:equals:${q})`, page: 1, per_page: 25 }
          : { Entity: 'Products', Type: 'word',     Query: q,                      page: 1, per_page: 25 };
        const res = await ZOHO.CRM.API.searchRecord(searchParam);
        products = (res?.data || [])
          .filter(p => p.field13)  // 機器仕様フィールドがある商品のみ
          .map(p => ({
            id:    p.id,
            name:  p.Product_Name || '',
            model: p.field2 || '',
            unit:  p.field4 || '台',
            price: Number(p.Unit_Price) || 0,
            specs: _parseSpecText(p.field13),
          }));
      }
      _machineSpecSearchResults = products;
      if (products.length === 0) {
        el.innerHTML = '<div class="machine-spec-no-result">該当なし（機器仕様が登録されていない商品は表示されません）</div>';
        return;
      }
      el.innerHTML = products.map((p, i) =>
        `<div class="machine-spec-result-item" onclick="app.selectMachineSpecModel(${i})">
          <span class="machine-spec-result-model">${escHtml(p.model || p.name)}</span>
          <span class="machine-spec-result-cat">${escHtml(p.name)}</span>
        </div>`
      ).join('');
    } catch(e) {
      console.error('機器仕様検索エラー:', e);
      el.innerHTML = '<div class="machine-spec-no-result">検索エラー</div>';
    }
  }

  function selectMachineSpecModel(idx) {
    const product = _machineSpecSearchResults[idx];
    if (!product) return;
    _machineSpecModel = product.model || product.name;
    document.getElementById('machineSpecModelLabel').textContent = _machineSpecModel;
    document.getElementById('machineSpecName').value = product.name;
    document.getElementById('machineSpecUnit').value = product.unit || '台';
    document.getElementById('machineSpecPrice').value = product.price > 0 ? product.price : '';
    document.getElementById('machineSpecSpecsList').innerHTML =
      product.specs.map(s => `<div class="machine-spec-spec-line">・${escHtml(s.label)}：${escHtml(s.value)}</div>`).join('');
    document.getElementById('machineSpecResults').innerHTML = '';
    document.getElementById('machineSpecSearch').value = _machineSpecModel;
    document.getElementById('machineSpecPreview').style.display = 'block';
  }

  function addMachineSpecItem() {
    if (!_machineSpecModel || !_machineSpecSectionId) return;
    const sec = state.sections.find(s => s.id === _machineSpecSectionId);
    if (!sec) return;
    const selectedProduct = _machineSpecSearchResults.find(
      p => (p.model || p.name) === _machineSpecModel
    ) || {};
    const specs = selectedProduct.specs || [];

    // セクション内に同じ型式の商品行があれば、その行に machineSpec を付与（新行不要）
    const existingItem = sec.items.find(it => it.productId && it.model === _machineSpecModel);
    if (existingItem) {
      existingItem.machineSpec = { model: _machineSpecModel, specs };
      const block = document.querySelector(`.section-block[data-section-id="${_machineSpecSectionId}"]`);
      if (block) { renderSection(sec, block); updateSectionSubtotal(block); }
      updateOutput();
      closeMachineSpecModal();
      showToast(`${_machineSpecModel} の仕様を設定しました`);
      return;
    }

    // 既存行が無い場合（手動検索で別商品を選択）は新行を追加
    const name     = (document.getElementById('machineSpecName').value || '').trim() || _machineSpecModel;
    const qty      = parseFloat(document.getElementById('machineSpecQty').value) || 1;
    const unit     = (document.getElementById('machineSpecUnit').value || '').trim();
    const priceRaw = parseFloat(document.getElementById('machineSpecPrice').value);
    const item = createItem();
    item.name  = name;
    item.qty   = qty;
    item.unit  = unit;
    if (!isNaN(priceRaw) && priceRaw > 0) {
      item.unitPrice = priceRaw;
      item.amount    = Math.round(priceRaw * qty);
    }
    item.model = _machineSpecModel || '';
    item.machineSpec = { model: _machineSpecModel, specs };
    sec.items.push(item);
    markDirty();
    const block = document.querySelector(`.section-block[data-section-id="${_machineSpecSectionId}"]`);
    if (block) { renderSection(sec, block); updateSectionSubtotal(block); }
    updateOutput();
    closeMachineSpecModal();
    showToast(`${_machineSpecModel} を追加しました`);
  }

  // ── FRP見積モード ──────────────────────────────────────────────

  async function loadFrpCache() {
    if (!zohoReady) { state.frpCache = []; return; }
    try {
      state.frpCache = await fetchAllRecords('FRP', 'Name');
      if (state.frpCache.length > 0) {
        console.log('[FRP] 取得件数:', state.frpCache.length);
        console.log('[FRP] フィールド一覧:', Object.keys(state.frpCache[0]));
        console.log('[FRP] サンプルレコード:', state.frpCache[0]);
      } else {
        console.warn('[FRP] 取得件数: 0件');
      }
    } catch (e) {
      console.warn('FRP全件取得エラー:', e);
      state.frpCache = [];
    }
  }

  const FRP_SORYO_NOTES = {
    1: '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります。',
    2: '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります。',
    3: '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります。',
    4: '',
    40: '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります。',
    44: '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります（混載便への切替可）。',
    60: '※別途チャーター便手配が必要となります。',
    100: '※別途チャーター便手配が必要となります。',
  };

  const FRP_SHUBETSU_CHUBUNRUI = {
    'ポンプアップ槽': ['標準（縦型）', 'シンプル', 'ロング', '横型'],
    '便槽':          ['簡易水洗', '無臭'],
    '受水槽':        ['受水槽', '排水槽'],
  };

  function calcSoryoNote(kubun) {
    return FRP_SORYO_NOTES[Number(kubun)] ?? '';
  }

  // 型式 → 仮固定バンドセット対応表（ポンプアップ槽【槽のみ】横型）
  const FRP_BAND_SET_MAP = {
    // ポンプアップ槽【槽のみ】横型（CRYシリーズ）
    'CRY50-10C': { model: 'KB-960',  qty: 2, unit: '組' },
    'CRY50-13C': { model: 'KB-1050', qty: 2, unit: '組' },
    'CRY50-16C': { model: 'KB-1200', qty: 2, unit: '組' },
    'CRY50-20C': { model: 'KB-1300', qty: 2, unit: '組' },
    'CRY50-24C': { model: 'KB-1300', qty: 2, unit: '組' },
    'CRY50-26C': { model: 'KB-1600', qty: 2, unit: '組' },
    // ポンプアップ槽【槽のみ】大型横型Φ1300（TPYシリーズ）
    'TPY-25W-13': { model: 'KB-1300', qty: 2, unit: '組' },
    'TPY-30W-13': { model: 'KB-1300', qty: 2, unit: '組' },
    'TPY-35W-13': { model: 'KB-1300', qty: 2, unit: '組' },
    'TPY-40W-13': { model: 'KB-1300', qty: 3, unit: '組' },
    'TPY-45W-13': { model: 'KB-1300', qty: 3, unit: '組' },
    'TPY-50W-13': { model: 'KB-1300', qty: 3, unit: '組' },
    'TPY-60W-13': { model: 'KB-1300', qty: 4, unit: '組' },
    'TPY-70W-13': { model: 'KB-1300', qty: 5, unit: '組' },
    'TPY-80W-13': { model: 'KB-1300', qty: 5, unit: '組' },
    // ポンプアップ槽【槽のみ】大型横型Φ1600（TPYシリーズ）
    'TPY-30W-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TPY-40W-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TPY-50W-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TPY-60W-16':  { model: 'KB-1600', qty: 3, unit: '組' },
    'TPY-70W-16':  { model: 'KB-1600', qty: 3, unit: '組' },
    'TPY-80W-16':  { model: 'KB-1600', qty: 3, unit: '組' },
    'TPY-90W-16':  { model: 'KB-1600', qty: 4, unit: '組' },
    'TPY-100W-16': { model: 'KB-1600', qty: 5, unit: '組' },
    'TPY-120W-16': { model: 'KB-1600', qty: 5, unit: '組' },
    'TPY-130W-16': { model: 'KB-1600', qty: 6, unit: '組' },
    // ポンプアップ槽【槽のみ】大型横型Φ2000（TPYシリーズ）
    'TPY-50W-20':  { model: 'KB-2000', qty: 2, unit: '組' },
    'TPY-60W-20':  { model: 'KB-2000', qty: 2, unit: '組' },
    'TPY-70W-20':  { model: 'KB-2000', qty: 2, unit: '組' },
    'TPY-80W-20':  { model: 'KB-2000', qty: 3, unit: '組' },
    'TPY-90W-20':  { model: 'KB-2000', qty: 3, unit: '組' },
    'TPY-100W-20': { model: 'KB-2000', qty: 3, unit: '組' },
    'TPY-130W-20': { model: 'KB-2000', qty: 4, unit: '組' },
    'TPY-150W-20': { model: 'KB-2000', qty: 4, unit: '組' },
    'TPY-180W-20': { model: 'KB-2000', qty: 5, unit: '組' },
    'TPY-200W-20': { model: 'KB-2000', qty: 6, unit: '組' },
    'TPY-250W-20': { model: 'KB-2000', qty: 6, unit: '組' },
    // 便槽・簡易水洗・横型直下（NYU2シリーズ）→ KB + SYD-100C
    'NYU2-5':  { model: 'KB-720',  qty: 2, unit: '組', extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NYU2-9':  { model: 'KB-820',  qty: 2, unit: '組', extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NYU2-10': { model: 'KB-960',  qty: 2, unit: '組', extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NYU2-13': { model: 'KB-960',  qty: 2, unit: '組', extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NYU2-16': { model: 'KB-1050', qty: 2, unit: '組', extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NYU2-18': { model: 'KB-1200', qty: 2, unit: '組', extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NYU2-21': { model: 'KB-1200', qty: 2, unit: '組', extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NYU2-25': { model: 'KB-1300', qty: 2, unit: '組', extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NYU2-31': { model: 'KB-1300', qty: 2, unit: '組', extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    // 便槽・簡易水洗・横型横引き（NYU4シリーズ）→ KB + SYD-100A
    'NYU4-5':  { model: 'KB-720',  qty: 2, unit: '組', extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NYU4-9':  { model: 'KB-820',  qty: 2, unit: '組', extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NYU4-10': { model: 'KB-960',  qty: 2, unit: '組', extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NYU4-13': { model: 'KB-960',  qty: 2, unit: '組', extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NYU4-16': { model: 'KB-1050', qty: 2, unit: '組', extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NYU4-18': { model: 'KB-1200', qty: 2, unit: '組', extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NYU4-21': { model: 'KB-1200', qty: 2, unit: '組', extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NYU4-25': { model: 'KB-1300', qty: 2, unit: '組', extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NYU4-31': { model: 'KB-1300', qty: 2, unit: '組', extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    // 便槽・簡易水洗・横型横引き2連（NYU48シリーズ）→ KB + SYD-100W
    'NYU48-5':  { model: 'KB-720',  qty: 2, unit: '組', extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NYU48-9':  { model: 'KB-820',  qty: 2, unit: '組', extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NYU48-10': { model: 'KB-960',  qty: 2, unit: '組', extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NYU48-13': { model: 'KB-960',  qty: 2, unit: '組', extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NYU48-16': { model: 'KB-1050', qty: 2, unit: '組', extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NYU48-18': { model: 'KB-1200', qty: 2, unit: '組', extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NYU48-21': { model: 'KB-1200', qty: 2, unit: '組', extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NYU48-25': { model: 'KB-1300', qty: 2, unit: '組', extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NYU48-31': { model: 'KB-1300', qty: 2, unit: '組', extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    // 便槽・簡易水洗・横型横引き3連（NYU・Tシリーズ）→ KB + SYD-100T
    'NYU・T-9':  { model: 'KB-820',  qty: 2, unit: '組', extras: [{ model: 'SYD-100T', qty: 1, unit: 'セット' }] },
    'NYU・T-13': { model: 'KB-960',  qty: 2, unit: '組', extras: [{ model: 'SYD-100T', qty: 1, unit: 'セット' }] },
    'NYU・T-16': { model: 'KB-1050', qty: 2, unit: '組', extras: [{ model: 'SYD-100T', qty: 1, unit: 'セット' }] },
    'NYU・T-18': { model: 'KB-1200', qty: 2, unit: '組', extras: [{ model: 'SYD-100T', qty: 1, unit: 'セット' }] },
    'NYU・T-21': { model: 'KB-1200', qty: 2, unit: '組', extras: [{ model: 'SYD-100T', qty: 1, unit: 'セット' }] },
    'NYU・T-25': { model: 'KB-1300', qty: 2, unit: '組', extras: [{ model: 'SYD-100T', qty: 1, unit: 'セット' }] },
    'NYU・T-31': { model: 'KB-1300', qty: 2, unit: '組', extras: [{ model: 'SYD-100T', qty: 1, unit: 'セット' }] },
    // 便槽・縦型横引き（NKU4系）→ 臭突SYD-100Aのみ付属
    'NKU4-3':  { extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NKU4-5':  { extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NKU4-8':  { extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NKU4-10': { extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NKU4-13': { extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NKU4-15': { extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    'NKU4-18': { extras: [{ model: 'SYD-100A', qty: 1, unit: 'セット' }] },
    // 便槽・縦型横引き2連（NKU48系）→ 臭突SYD-100Wのみ付属
    'NKU48-3':  { extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NKU48-5':  { extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NKU48-8':  { extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NKU48-10': { extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NKU48-13': { extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NKU48-15': { extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    'NKU48-18': { extras: [{ model: 'SYD-100W', qty: 1, unit: 'セット' }] },
    // 便槽・縦型直下（NKS2系）→ 臭突SYD-100Cのみ付属
    'NKS2-3':  { extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NKS2-5':  { extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NKS2-8':  { extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NKS2-10': { extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NKS2-13': { extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NKS2-15': { extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    'NKS2-18': { extras: [{ model: 'SYD-100C', qty: 1, unit: 'セット' }] },
    // 受水槽・横型（小型）（JYシリーズ）
    'JY-5':  { model: 'KB-720',  qty: 2, unit: '組' },
    'JY-9':  { model: 'KB-820',  qty: 2, unit: '組' },
    'JY-10': { model: 'KB-960',  qty: 2, unit: '組' },
    'JY-13': { model: 'KB-960',  qty: 2, unit: '組' },
    'JY-16': { model: 'KB-1050', qty: 2, unit: '組' },
    'JY-18': { model: 'KB-1200', qty: 2, unit: '組' },
    'JY-21': { model: 'KB-1200', qty: 2, unit: '組' },
    'JY-25': { model: 'KB-1300', qty: 2, unit: '組' },
    'JY-31': { model: 'KB-1300', qty: 2, unit: '組' },
    // 受水槽・特殊Φ1200（TJYシリーズ）
    'TJY-2000-12': { model: 'KB-1200', qty: 2, unit: '組' },
    'TJY-2500-12': { model: 'KB-1200', qty: 2, unit: '組' },
    'TJY-3000-12': { model: 'KB-1200', qty: 2, unit: '組' },
    'TJY-4000-12': { model: 'KB-1200', qty: 3, unit: '組' },
    'TJY-5000-12': { model: 'KB-1200', qty: 3, unit: '組' },
    'TJY-6000-12': { model: 'KB-1200', qty: 3, unit: '組' },
    // 受水槽・特殊Φ1300（TJYシリーズ）
    'TJY-2000-13':  { model: 'KB-1300', qty: 2, unit: '組' },
    'TJY-2500-13':  { model: 'KB-1300', qty: 2, unit: '組' },
    'TJY-3000-13':  { model: 'KB-1300', qty: 2, unit: '組' },
    'TJY-4000-13':  { model: 'KB-1300', qty: 2, unit: '組' },
    'TJY-5000-13':  { model: 'KB-1300', qty: 3, unit: '組' },
    'TJY-6000-13':  { model: 'KB-1300', qty: 3, unit: '組' },
    'TJY-7000-13':  { model: 'KB-1300', qty: 3, unit: '組' },
    'TJY-8000-13':  { model: 'KB-1300', qty: 4, unit: '組' },
    'TJY-9000-13':  { model: 'KB-1300', qty: 5, unit: '組' },
    'TJY-10000-13': { model: 'KB-1300', qty: 5, unit: '組' },
    // 受水槽・特殊Φ1600（TJYシリーズ）
    'TJY-3000-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TJY-4000-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TJY-5000-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TJY-6000-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TJY-7000-16':  { model: 'KB-1600', qty: 3, unit: '組' },
    'TJY-8000-16':  { model: 'KB-1600', qty: 3, unit: '組' },
    'TJY-9000-16':  { model: 'KB-1600', qty: 3, unit: '組' },
    'TJY-10000-16': { model: 'KB-1600', qty: 4, unit: '組' },
    'TJY-12000-16': { model: 'KB-1600', qty: 5, unit: '組' },
    'TJY-13000-16': { model: 'KB-1600', qty: 5, unit: '組' },
    'TJY-15000-16': { model: 'KB-1600', qty: 6, unit: '組' },
    // 受水槽・特殊Φ2000（TJYシリーズ）
    'TJY-9000-20':  { model: 'KB-2000', qty: 3, unit: '組' },
    'TJY-10000-20': { model: 'KB-2000', qty: 3, unit: '組' },
    'TJY-13000-20': { model: 'KB-2000', qty: 3, unit: '組' },
    'TJY-15000-20': { model: 'KB-2000', qty: 4, unit: '組' },
    'TJY-20000-20': { model: 'KB-2000', qty: 5, unit: '組' },
    'TJY-25000-20': { model: 'KB-2000', qty: 6, unit: '組' },
    'TJY-28000-20': { model: 'KB-2000', qty: 7, unit: '組' },
    // 排水槽・小型（OYシリーズ）
    'OY-5':  { model: 'KB-720',  qty: 2, unit: '組' },
    'OY-9':  { model: 'KB-820',  qty: 2, unit: '組' },
    'OY-10': { model: 'KB-960',  qty: 2, unit: '組' },
    'OY-13': { model: 'KB-960',  qty: 2, unit: '組' },
    'OY-16': { model: 'KB-1050', qty: 2, unit: '組' },
    'OY-18': { model: 'KB-1200', qty: 2, unit: '組' },
    'OY-21': { model: 'KB-1200', qty: 2, unit: '組' },
    'OY-25': { model: 'KB-1300', qty: 2, unit: '組' },
    'OY-31': { model: 'KB-1300', qty: 2, unit: '組' },
    // 排水槽・Φ1200（TOYシリーズ）
    'TOY-2000-12': { model: 'KB-1200', qty: 2, unit: '組' },
    'TOY-2500-12': { model: 'KB-1200', qty: 2, unit: '組' },
    'TOY-3000-12': { model: 'KB-1200', qty: 2, unit: '組' },
    'TOY-4000-12': { model: 'KB-1200', qty: 3, unit: '組' },
    'TOY-5000-12': { model: 'KB-1200', qty: 3, unit: '組' },
    'TOY-6000-12': { model: 'KB-1200', qty: 3, unit: '組' },
    // 排水槽・Φ1300（TOYシリーズ）
    'TOY-2000-13':  { model: 'KB-1300', qty: 2, unit: '組' },
    'TOY-2500-13':  { model: 'KB-1300', qty: 2, unit: '組' },
    'TOY-3000-13':  { model: 'KB-1300', qty: 2, unit: '組' },
    'TOY-4000-13':  { model: 'KB-1300', qty: 2, unit: '組' },
    'TOY-5000-13':  { model: 'KB-1300', qty: 3, unit: '組' },
    'TOY-6000-13':  { model: 'KB-1300', qty: 3, unit: '組' },
    'TOY-7000-13':  { model: 'KB-1300', qty: 3, unit: '組' },
    'TOY-8000-13':  { model: 'KB-1300', qty: 4, unit: '組' },
    'TOY-9000-13':  { model: 'KB-1300', qty: 5, unit: '組' },
    'TOY-10000-13': { model: 'KB-1300', qty: 5, unit: '組' },
    // 排水槽・Φ1600（TOYシリーズ）
    'TOY-3000-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TOY-4000-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TOY-5000-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TOY-6000-16':  { model: 'KB-1600', qty: 2, unit: '組' },
    'TOY-7000-16':  { model: 'KB-1600', qty: 3, unit: '組' },
    'TOY-8000-16':  { model: 'KB-1600', qty: 3, unit: '組' },
    'TOY-9000-16':  { model: 'KB-1600', qty: 3, unit: '組' },
    'TOY-10000-16': { model: 'KB-1600', qty: 4, unit: '組' },
    'TOY-12000-16': { model: 'KB-1600', qty: 5, unit: '組' },
    'TOY-13000-16': { model: 'KB-1600', qty: 5, unit: '組' },
    'TOY-15000-16': { model: 'KB-1600', qty: 6, unit: '組' },
    // 排水槽・Φ2000（TOYシリーズ）
    'TOY-9000-20':  { model: 'KB-2000', qty: 3, unit: '組' },
    'TOY-10000-20': { model: 'KB-2000', qty: 3, unit: '組' },
    'TOY-13000-20': { model: 'KB-2000', qty: 3, unit: '組' },
    'TOY-15000-20': { model: 'KB-2000', qty: 4, unit: '組' },
    'TOY-20000-20': { model: 'KB-2000', qty: 5, unit: '組' },
    'TOY-25000-20': { model: 'KB-2000', qty: 6, unit: '組' },
    'TOY-28000-20': { model: 'KB-2000', qty: 7, unit: '組' },
  };

  // 混載便 固定送料（全国共通、区分別）
  const FRP_SORYO_KONZAI = {
    1:  11000,
    2:  17000,
    3:  22000,
    44: 28000,
  };

  // チャーター便 地域別・車種別金額
  const FRP_SORYO_CHARTER = {
    'さいたま営業所': { '4t': 118000, '6t': 133000, '10t': 157000 },
    '南関東営業所':   { '4t': 125000, '6t': 142000, '10t': 164000 },
    '新潟営業所':     { '4t':  98000, '6t': 114000, '10t': 134000 },
    '松本営業所':     { '4t': 110000, '6t': 126000, '10t': 148000 },
    '静岡営業所':     { '4t': 107000, '6t': 122000, '10t': 144000 },
    '名古屋営業所':   { '4t': 107000, '6t': 121000, '10t': 142000 },
  };

  // 所課名 → 都道府県名（チャーター送料文言用）
  const FRP_SORYO_PREF = {
    'さいたま営業所': '埼玉',
    '南関東営業所':   '千葉',
    '新潟営業所':     '新潟',
    '松本営業所':     '長野',
    '静岡営業所':     '静岡',
    '名古屋営業所':   '愛知',
  };

  // 送料区分 → 車種名
  function frpSoryoVehicle(kubun) {
    if (kubun === 60)  return '6tユニック車';
    if (kubun === 100) return '10t平車';
    return '4tユニック車';
  }

  // 送料行オブジェクトを生成する（製品追加時に自動追加）
  function makeFrpSoryoItem(soryoKubun) {
    const shoka   = state.shoka || '';
    const isKonzai = [1, 2, 3].includes(soryoKubun);
    const pref     = FRP_SORYO_PREF[shoka] || '';

    let price   = 0;
    let itemnum = '';
    let note    = '';

    if (isKonzai) {
      price   = FRP_SORYO_KONZAI[soryoKubun] || 0;
      const prefStr = pref ? `(${pref}県内送り) ` : '';
      itemnum = `混載便／1台あたり${prefStr}※時間指定不可`;
      note    = '※現場直送不可　現場直送希望の場合は別途チャーター便手配が必要となります。';
    } else if ([4, 40, 44, 60, 100].includes(soryoKubun)) {
      const vehicle = frpSoryoVehicle(soryoKubun);
      const vKey    = vehicle.includes('6t') ? '6t' : vehicle.includes('10t') ? '10t' : '4t';
      const prefStr = pref ? `${pref}県内送り` : '送り先要確認';
      const charter = FRP_SORYO_CHARTER[shoka];
      price   = charter ? (charter[vKey] || 0) : 0;
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
      priceA:    price,
      priceB:    price,
      soryoKubun,
      soryoNote: note,
      specs:     [],
    };
  }

  let _frpWizard = {
    mode:        'product',
    hz:          null,
    shubetsu:    null,
    chubunrui:   null,
    kashira:     null,
    step:        1,
    step5Search: '',
    _items:      null,
  };

  function openFrpWizard(mode) {
    if (!state.frpCache) {
      showToast('FRPデータを読み込み中です。しばらくお待ちください。', 'warn');
      return;
    }
    const _deptHzAuto = DEPT_LIST.find(d => d.code === state.createDeptCode)?.hz;
    _frpWizard = {
      mode,
      hz:          _deptHzAuto || state.frpHz,
      shubetsu:    null,
      chubunrui:   null,
      kashira:     null,
      step:        1,
      step5Search: '',
      _items:      null,
    };
    const modal = document.getElementById('frpWizardModal');
    if (modal) modal.style.display = '';
    _frpWizardRender();
  }

  function _frpWizardRender() {
    const titleEl  = document.getElementById('frpWizardTitle');
    const bodyEl   = document.getElementById('frpWizardBody');
    const footerEl = document.getElementById('frpWizardFooter');
    if (!bodyEl || !footerEl) return;

    const w     = _frpWizard;
    const cache = state.frpCache || [];

    if (w.mode === 'product') {
      _frpWizardRenderProduct(w, cache, titleEl, bodyEl, footerEl);
    } else {
      _frpWizardRenderOption(w, cache, titleEl, bodyEl, footerEl);
    }
  }

  function _frpWizardRenderProduct(w, cache, titleEl, bodyEl, footerEl) {
    const step = w.step;
    const FRP_FAMILY_GROUPS = {
      'TPY': { prefix: 'TPY ', subGroups: ['TPY Φ1300', 'TPY Φ1600', 'TPY Φ2000'] },
      'TJY': { prefix: 'TJY ', subGroups: ['TJY Φ1200', 'TJY Φ1300', 'TJY Φ1600', 'TJY Φ2000'] },
      'TOY': { prefix: 'TOY ', subGroups: ['TOY Φ1200', 'TOY Φ1300', 'TOY Φ1600', 'TOY Φ2000'] },
    };

    if (step === 1) {
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
      if (titleEl) titleEl.textContent = '② 種別を選択';
      const types = [...new Set(cache
        .filter(r => r.field3 && r.field3 !== 'オプション部品' && r.field3 !== 'オプション２')
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
        <button class="btn-primary" onclick="app._frpWizardNext()" ${!w.shubetsu ? 'disabled' : ''}>次へ →</button>
      `;

    } else if (step === 3) {
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
      if (titleEl) titleEl.textContent = '④ 型式グループを選択';
      const filtered = cache.filter(r => {
        if (r.field3 === 'オプション部品') return false;
        if (w.shubetsu  && r.field3 !== w.shubetsu)  return false;
        if (w.chubunrui && r.field4 !== w.chubunrui) return false;
        if (w.hz !== '共通' && r.Hz && r.Hz !== '共通' && r.Hz !== w.hz) return false;
        return true;
      });
      const groups = [...new Set(filtered.map(r => r.field1).filter(Boolean))].sort();
      // "TPY Φ*" "TJY Φ*" "TOY Φ*" サブグループをそれぞれ1つにまとめる
      const familyEntry = Object.entries(FRP_FAMILY_GROUPS).find(([, cfg]) =>
        groups.some(g => g.startsWith(cfg.prefix)));
      const displayGroups = familyEntry
        ? [...groups.filter(g => !g.startsWith(familyEntry[1].prefix)), familyEntry[0]].sort()
        : groups;

      if (displayGroups.length === 0) {
        bodyEl.innerHTML = '<p style="color:#888;padding:16px">条件に合う型式グループが見つかりません。</p>';
        footerEl.innerHTML = `<button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>`;
        return;
      }

      const kashiraSelected = displayGroups.includes(w.kashira) ? w.kashira
        : (familyEntry && w.kashira && w.kashira.startsWith(familyEntry[1].prefix) ? familyEntry[0] : w.kashira);

      bodyEl.innerHTML = `
        <div class="frp-wizard-choices">
          ${displayGroups.map(g => `
            <button class="frp-wizard-choice ${kashiraSelected === g ? 'selected' : ''}"
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
      if (titleEl) titleEl.textContent = '型式を選択';
      const familyCfg = FRP_FAMILY_GROUPS[w.kashira] || null;
      const items = cache.filter(r => {
        if (r.field3 === 'オプション部品') return false;
        if (w.shubetsu  && r.field3 !== w.shubetsu)  return false;
        if (w.chubunrui && r.field4 !== w.chubunrui) return false;
        if (familyCfg) {
          if (!r.field1 || !r.field1.startsWith(familyCfg.prefix)) return false;
        } else {
          if (w.kashira && r.field1 !== w.kashira) return false;
        }
        if (w.hz !== '共通' && r.Hz && r.Hz !== '共通' && r.Hz !== w.hz) return false;
        return true;
      });

      if (items.length === 0) {
        bodyEl.innerHTML = '<p style="color:#888;padding:16px">条件に合う製品が見つかりません。</p>';
        footerEl.innerHTML = `<button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>`;
        return;
      }

      // 型式検索フィルタ（全角・半角正規化）
      const searchRaw = w.step5Search || '';
      const searchNorm = searchRaw.normalize('NFKC').toLowerCase();
      const filteredItems = searchNorm
        ? items.filter(r => (r.itemnum || '').normalize('NFKC').toLowerCase().includes(searchNorm))
        : items;

      const searchInputHtml = `
        <div style="padding:6px 8px 4px">
          <input type="text" id="frpStep5Search"
                 style="width:100%;box-sizing:border-box;padding:4px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px"
                 placeholder="型式で絞り込み（全角・半角可）"
                 value="${escHtml(searchRaw)}"
                 oninput="app._frpWizardSearchStep5(this.value)">
        </div>`;

      if (familyCfg) {
        const subGroups = familyCfg.subGroups;
        const cols = subGroups.map(sg => filteredItems.filter(r => r.field1 === sg));
        const maxRows = Math.max(...cols.map(c => c.length), 0);
        const allItems = [];
        const colMeta = cols.map(col => { const s = allItems.length; allItems.push(...col); return s; });
        _frpWizard._items = allItems;

        bodyEl.innerHTML = searchInputHtml + `
          <table class="frp-wizard-table frp-tpy-3col">
            <thead>
              <tr>${subGroups.map(sg => `<th colspan="2" class="frp-tpy-header">${escHtml(sg)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${maxRows === 0
                ? `<tr><td colspan="${subGroups.length * 2}" style="color:#888;padding:12px;text-align:center">該当なし</td></tr>`
                : Array.from({length: maxRows}, (_, ri) => `
                <tr>${cols.map((col, ci) => {
                  const item = col[ri];
                  if (!item) return '<td></td><td></td>';
                  const idx = colMeta[ci] + ri;
                  return `<td class="frp-tpy-zuban">${escHtml(item.field || '')}</td>
                          <td><button class="btn-primary btn-sm" onclick="app._frpWizardSelect(${idx})">${escHtml(item.itemnum || '')}</button></td>`;
                }).join('')}</tr>
              `).join('')}
            </tbody>
          </table>
        `;
        footerEl.innerHTML = `<button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>`;
      } else {
        _frpWizard._items = filteredItems;
        bodyEl.innerHTML = searchInputHtml + `
          <table class="frp-wizard-table">
            <thead>
              <tr><th>品名</th><th>型式</th><th>図番</th><th>品番</th><th>定価</th><th></th></tr>
            </thead>
            <tbody>
              ${filteredItems.length === 0
                ? `<tr><td colspan="6" style="color:#888;padding:12px;text-align:center">該当なし</td></tr>`
                : filteredItems.map((r, i) => `
                <tr>
                  <td>${escHtml(r.field3 || '')}</td>
                  <td>${escHtml(r.itemnum || '')}</td>
                  <td>${escHtml(r.field  || '')}</td>
                  <td>${escHtml(r.field5 || '')}</td>
                  <td style="text-align:right">${(Number(r.price) || 0).toLocaleString('ja-JP')}</td>
                  <td><button class="btn-primary btn-sm"
                              onclick="app._frpWizardSelect(${i})">選択</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        footerEl.innerHTML = `<button class="btn-secondary" onclick="app._frpWizardBack()">← 戻る</button>`;
      }
    }
  }

  function _frpWizardRenderOption(w, cache, titleEl, bodyEl, footerEl) {
    if (titleEl) titleEl.textContent = 'オプション部品を選択';

    const FRP_OPT_ORDER = ['かさ上げ', '警報盤セット', 'フロートスイッチセット', '臭突管セット', '仮固定バンド', '片ユニオンスイングチャッキ'];
    const allItems = cache.filter(r => r.field3 === 'オプション部品' || r.field3 === 'オプション２');
    const groups = {};
    const groupOrder = [];
    allItems.forEach((r, idx) => {
      const cat = r.field4 || '';
      if (!groups[cat]) { groups[cat] = []; groupOrder.push(cat); }
      groups[cat].push({ r, idx });
    });
    groupOrder.sort((a, b) => {
      const ai = FRP_OPT_ORDER.indexOf(a);
      const bi = FRP_OPT_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b, 'ja');
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    let rows = '';
    let rowCount = 0;
    for (const cat of groupOrder) {
      groups[cat].forEach(({ r, idx }, ci) => {
        const pdfKey = ci === 0 ? _getFrpRecordPdfKey(r) : null;
        const pdfBtn = pdfKey
          ? `<br><button onclick="app._frpWizardOpenPdf('${pdfKey}')"
               style="font-size:11px;padding:1px 7px;margin-top:3px;cursor:pointer;background:#fff3e0;border:1px solid #e0a854;border-radius:3px;color:#7a4800;">📄 参考図</button>`
          : '';
        rows += `<tr>
          <td class="frp-opt-l1">${rowCount === 0 ? 'オプション部品' : ''}</td>
          <td class="frp-opt-l2">${ci === 0 ? escHtml(cat) + pdfBtn : ''}</td>
          <td><button class="frp-opt-name-btn" onclick="app._frpWizardSelect(${idx})">${escHtml(r.Name || r.itemnum || '')}</button></td>
        </tr>`;
        rowCount++;
      });
    }

    _frpWizard._items = allItems;
    bodyEl.innerHTML = `
      <table class="frp-wizard-table frp-opt-table">
        <thead>
          <tr>
            <th>1段目</th>
            <th>2段目（名称）</th>
            <th>3段目（品名）</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    footerEl.innerHTML = `
      <button class="btn-secondary" onclick="document.getElementById('frpWizardModal').style.display='none'">キャンセル</button>
    `;
  }

  function _frpWizardSetHz(hz)       { _frpWizard.hz = hz;        _frpWizardRender(); }
  function _frpWizardSetShubetsu(v)  {
    // 種別変更時は下流の選択（中分類・型式グループ）をリセット
    _frpWizard.shubetsu = v;
    _frpWizard.chubunrui = null;
    _frpWizard.kashira   = null;
    _frpWizardRender();
  }
  function _frpWizardSetChubunrui(v) {
    // 中分類変更時は型式グループをリセット
    _frpWizard.chubunrui = v;
    _frpWizard.kashira   = null;
    _frpWizardRender();
  }
  function _frpWizardSetKashira(v)   { _frpWizard.kashira = v;    _frpWizardRender(); }

  function _frpWizardNext() {
    const maxStep = _frpWizard.mode === 'product' ? 5 : 2;
    if (_frpWizard.step < maxStep) { _frpWizard.step5Search = ''; _frpWizard.step++; _frpWizardRender(); }
  }
  function _frpWizardBack() {
    if (_frpWizard.step > 1) { _frpWizard.step5Search = ''; _frpWizard.step--; _frpWizardRender(); }
  }
  function _frpWizardSkip() {
    // Step3（中分類）スキップ時は chubunrui・kashira をクリアして全件対象にする
    _frpWizard.step5Search = '';
    _frpWizard.chubunrui   = null;
    _frpWizard.kashira     = null;
    _frpWizard.step++;
    _frpWizardRender();
  }
  function _frpWizardSearchStep5(val) {
    _frpWizard.step5Search = val;
    _frpWizardRender();
    const el = document.getElementById('frpStep5Search');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }
  function _frpWizardSelect(idx) {
    const record = (_frpWizard._items || [])[idx];
    if (!record) return;

    // 製品を追加し、そのIDを取得
    const prevMaxId0 = state.frpItems.reduce((m, i) => Math.max(m, i.id), 0);
    addFrpItem(record);
    const productItem = state.frpItems.find(i => i.id > prevMaxId0 && i.type !== 'soryo');

    // 仮固定バンドセットを自動追加（全角→半角正規化して照合）
    const normalizedItemnum = (record.itemnum || '').normalize('NFKC').trim();
    const bandCfg = FRP_BAND_SET_MAP[normalizedItemnum];
    if (bandCfg && productItem) {
      // オプション品をキャッシュまたは手動で追加するヘルパー
      function _addAutoOption(optModel, optQty, optUnit, fallbackHinmei) {
        const nm = optModel.normalize('NFKC');
        const r = state.frpCache.find(x =>
          x.field3 === 'オプション部品' && (
            (x.itemnum || '').normalize('NFKC').trim() === nm ||
            (x.Name || '').normalize('NFKC').includes(nm)
          )
        );
        if (r) {
          const prevId = state.frpItems.reduce((m, i) => Math.max(m, i.id), 0);
          addFrpItem(r);
          const added = state.frpItems.find(i => i.id > prevId && i.type !== 'soryo');
          if (added) { added.qty = optQty; added._bandFor = productItem.id; added._bandQtyPer = optQty; }
        } else {
          state.frpItems.push({
            id: state.nextFrpId++, type: 'option',
            shubetsu: 'オプション部品', chubunrui: '', kashira: '',
            hinmei: fallbackHinmei, name3: '', optSpec5: '',
            itemnum: optModel, zuban: '', hinban: '',
            qty: optQty, unit: optUnit,
            price: 0, priceA: 0, priceB: 0,
            soryoKubun: 0, soryoNote: '', specs: [], hinshu: 'opt',
            _bandFor: productItem.id, _bandQtyPer: optQty,
          });
        }
      }

      // 仮固定バンドを追加（model指定がある場合のみ）
      if (bandCfg.model) {
        const normalizedModel = bandCfg.model.normalize('NFKC');
        const bandRecord = state.frpCache.find(r =>
          r.field3 === 'オプション部品' && (
            (r.itemnum || '').normalize('NFKC').trim() === normalizedModel ||
            (r.Name || '').normalize('NFKC').includes(normalizedModel)
          )
        );
        if (bandRecord) {
          const prevMaxId = state.frpItems.reduce((m, i) => Math.max(m, i.id), 0);
          addFrpItem(bandRecord);
          const added = state.frpItems.find(i => i.id > prevMaxId && i.type !== 'soryo');
          if (added) {
            added.qty = bandCfg.qty;
            added._bandFor = productItem.id;
            added._bandQtyPer = bandCfg.qty;
          }
        } else {
          _addAutoOption(bandCfg.model, bandCfg.qty, bandCfg.unit, '仮固定バンドセット');
        }
      }

      // 追加オプション品（臭突管セット等）を自動追加
      if (bandCfg.extras) {
        for (const ex of bandCfg.extras) {
          _addAutoOption(ex.model, ex.qty, ex.unit, ex.model);
        }
      }

      // 送料を末尾に再ソート
      const soryoItems2 = state.frpItems.filter(i => i.type === 'soryo');
      const otherItems2 = state.frpItems.filter(i => i.type !== 'soryo');
      state.frpItems = [...otherItems2, ...soryoItems2];

      markDirty();
      renderFrpItems();
      updateFrpTotals();
      updateOutput();
      const extraNames = (bandCfg.extras || []).map(e => e.model).join('・');
      const bandPart = bandCfg.model ? `${bandCfg.model} × ${bandCfg.qty}${bandCfg.unit}` : '';
      const toastParts = [bandPart, extraNames].filter(Boolean).join('・');
      showToast(`${record.itemnum} → ${toastParts} を自動追加しました`);
    }

    document.getElementById('frpWizardModal').style.display = 'none';
    if (!bandCfg) showToast(`${record.Name || record.itemnum || '製品'} を追加しました`);

    // 配送区分に基づいて送料を自動追加
    const itemnumNorm = (record.itemnum || '').normalize('NFKC').trim();
    const haisouKubun = FRP_HAISOU_KUBUN[itemnumNorm];
    if (haisouKubun) {
      if (haisouKubun <= 9) {
        _frpAddKonzaiSoryo(haisouKubun);
      } else {
        _frpOpenCharterModal(haisouKubun);
      }
    }
  }

  const FRP_DEFAULT_SECTIONS = [
    {
      title: 'ご注文について',
      enabled: true,
      text: `・ご注文の際は、仕様の最終確認として添付図面内に「OKサイン」を記載し
　ご注文書とあわせてFAX下さいますようお願いいたします。
・OKサイン図面のFAXを頂き次第、製作開始します。
　また当商品は受注製作品のため、OKサイン図面受信後の製品の仕様変更・返品・
　キャンセルはお受けいたしかねます。あらかじめご了承くださいますようお願い
　申し上げます。`,
    },
    {
      title: 'ご発注後の出荷日延期について',
      enabled: true,
      text: `　ご発注後の出荷日延期につきましては、弊社保管スペースの都合により、当初ご
　指定の出荷予定日（または生産完了日）から1か月以内の範囲で承ります。なお、
　この期間内であっても、月を跨ぐ変更となる場合には、保管および調整にかかる
　費用として10,000円（税別）を別途頂戴いたします。あらかじめご了承ください
　ますようお願い申し上げます。`,
    },
    {
      title: '決算月に関する出荷について',
      enabled: true,
      text: `　弊社決算月（3月・6月・9月・12月）に出荷予定の案件につきましては、上記に
　かかわらず、当該月内での出荷完了をお願いしております。そのため、1か月以内
　の延期であっても、決算月を跨ぐ出荷延期はお受けいたしかねます。`,
    },
    {
      title: 'アフターサービスについて',
      enabled: true,
      text: `・納入後の故障や不具合に関する修理対応につきましては、着脱装置が付いていない
　型式は対応をお断りさせていただく場合がございますので、あらかじめご了承くだ
　さいますようお願い申し上げます。`,
    },
  ];

  function loadFrpSettings() {
    const saved = state._frpSettingsRaw;
    // さいたま営業所（コード28）のみ枠外文言を初期ON、それ以外はOFF
    const _defEnabled = state.createDeptCode === '28';
    if (saved) {
      state.frpHz        = saved.hz        || '50Hz';
      state.frpShowZuban = saved.showZuban !== false;
      state.frpShowSpecs = saved.showSpecs === true;
      if (saved.footerSectionsV2) {
        // v2以降: ユーザーが明示保存した値を使用
        state.frpFooterSections = FRP_DEFAULT_SECTIONS.map((def, i) => {
          const s = saved.footerSections?.[i];
          return s ? { title: s.title ?? def.title, enabled: s.enabled !== false, text: s.text ?? def.text }
                   : { ...def, enabled: _defEnabled };
        });
      } else {
        // v1以前の旧保存データ: 枠外文言は所課デフォルトを適用
        state.frpFooterSections = FRP_DEFAULT_SECTIONS.map((def, i) => {
          const s = saved.footerSections?.[i];
          return { title: (s?.title ?? def.title), enabled: _defEnabled, text: (s?.text ?? def.text) };
        });
      }
    } else {
      state.frpHz             = '50Hz';
      state.frpShowZuban      = true;
      state.frpShowSpecs      = false;
      state.frpFooterSections = FRP_DEFAULT_SECTIONS.map(s => ({ ...s, enabled: _defEnabled }));
    }
  }

  /** 送料選択モーダルを開く */
  /** 混載便送料を送料マスタから自動追加 */
  function _frpAddKonzaiSoryo(kubun) {
    const soryoName = FRP_KONZAI_SORYO_NAME[kubun];
    if (!soryoName) return;
    const def = state.soryoMaster.find(m => m.name === soryoName);
    const item = {
      id: state.nextFrpId++, type: 'soryo',
      shubetsu: '送料', chubunrui: '', kashira: '',
      hinmei:    def ? def.line1 : '送料',
      itemnum:   def ? def.line2 : '',
      zuban: '', hinban: '', name3: '', optSpec5: '',
      qty: 1, unit: '式',
      price:  def ? def.price : 0,
      priceA: def ? def.price : 0,
      priceB: def ? def.price : 0,
      soryoKubun: kubun,
      soryoNote:  def ? def.line3 : '',
      specs: [], _fromMaster: true,
    };
    const others = state.frpItems.filter(i => i.type !== 'soryo');
    const soryos = state.frpItems.filter(i => i.type === 'soryo');
    state.frpItems = [...others, ...soryos, item];
    markDirty(); renderFrpItems(); updateFrpTotals(); updateOutput();
  }

  /** チャーター便地域選択モーダルを表示 */
  function _frpOpenCharterModal(kubun) {
    const existing = document.getElementById('soryoCharterModal');
    if (existing) existing.remove();
    const vkey  = FRP_CHARTER_VEHICLE[kubun];
    const prices = FRP_CHARTER_PRICE[vkey];
    const vLabel = { t4: '4tユニック', t6: '6tユニック', t10: '10t平車' }[vkey];
    const canSwitch = kubun === 44;
    const rows = FRP_CHARTER_REGIONS.map((region, i) =>
      `<tr style="border-bottom:1px solid #eee">
         <td style="padding:8px 12px">${escHtml(region)}</td>
         <td style="padding:8px 12px;text-align:right;font-variant-numeric:tabular-nums">
           ¥${prices[i].toLocaleString()}</td>
         <td style="padding:8px 12px">
           <button class="btn-primary btn-sm"
             onclick="app._frpAddCharterSoryo(${kubun},${i})">選択</button>
         </td>
       </tr>`
    ).join('');
    const switchNote = canSwitch
      ? '<p style="margin:0 0 10px;font-size:12px;color:#e67e22">※混載切替可：値段次第で混載便への変更が可能です</p>' : '';
    const modal = document.createElement('div');
    modal.id = 'soryoCharterModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9001;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.2);width:420px;max-width:95vw">
        <div style="padding:14px 18px;border-bottom:1px solid #e0e0e0;display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:700;font-size:15px">チャーター便【${escHtml(vLabel)}】地域選択</span>
          <button onclick="document.getElementById('soryoCharterModal').remove()"
                  style="background:none;border:none;font-size:20px;cursor:pointer;color:#666">×</button>
        </div>
        <div style="padding:14px 18px">
          ${switchNote}
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f5f5f5;font-size:12px;color:#666">
                <th style="padding:6px 12px;text-align:left">配送先</th>
                <th style="padding:6px 12px;text-align:right">金額（例）</th>
                <th style="padding:6px 12px"></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin:10px 0 0;font-size:11px;color:#999">※金額は参考値です。実際の金額は確認の上修正してください。</p>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  /** チャーター便送料行を追加 */
  function _frpAddCharterSoryo(kubun, regionIdx) {
    document.getElementById('soryoCharterModal')?.remove();
    const vkey   = FRP_CHARTER_VEHICLE[kubun];
    const price  = FRP_CHARTER_PRICE[vkey][regionIdx];
    const region = FRP_CHARTER_REGIONS[regionIdx];
    const vLabel = { t4: '4tユニック', t6: '6tユニック', t10: '10t平車' }[vkey];
    const canSwitch = kubun === 44;
    const item = {
      id: state.nextFrpId++, type: 'soryo',
      shubetsu: '送料', chubunrui: '', kashira: '',
      hinmei:  'チャーター便',
      itemnum: `【${vLabel}】${region}送り${canSwitch ? '（混載切替可）' : ''}`,
      zuban: '', hinban: '', name3: '', optSpec5: '',
      qty: 1, unit: '式',
      price, priceA: price, priceB: price,
      soryoKubun: kubun,
      soryoNote: '車両通行可否要確認',
      specs: [], _fromMaster: false,
    };
    const others = state.frpItems.filter(i => i.type !== 'soryo');
    const soryos = state.frpItems.filter(i => i.type === 'soryo');
    state.frpItems = [...others, ...soryos, item];
    markDirty(); renderFrpItems(); updateFrpTotals(); updateOutput();
  }

  function openSoryoModal() {
    const existing = document.getElementById('soryoModal');
    if (existing) existing.remove();

    if (!state.soryoMaster.length) {
      showToast('送料マスタが読み込まれていません。所課を確認してください。');
      return;
    }

    const rows = state.soryoMaster.map((def, idx) => {
      const priceStr = def.price ? '¥' + def.price.toLocaleString() : '—';
      const sub = [def.line2, def.line3].filter(Boolean).join(' / ');
      return `
        <tr class="soryo-modal-row" onclick="app.addFrpSoryoFromMaster(${idx})" style="cursor:pointer">
          <td style="padding:7px 10px;font-size:13px;font-weight:600">${escHtml(def.name)}</td>
          <td style="padding:7px 10px;font-size:12px;color:#555">
            ${escHtml(def.line1)}${sub ? '<br><span style="color:#888">' + escHtml(sub) + '</span>' : ''}
          </td>
          <td style="padding:7px 10px;font-size:13px;text-align:right;white-space:nowrap">${escHtml(priceStr)}</td>
        </tr>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'soryoModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.2);width:560px;max-width:95vw;max-height:80vh;display:flex;flex-direction:column">
        <div style="padding:14px 18px;border-bottom:1px solid #e0e0e0;display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:700;font-size:15px">送料を選択</span>
          <button onclick="document.getElementById('soryoModal').remove()"
                  style="background:none;border:none;font-size:20px;cursor:pointer;color:#666;line-height:1">×</button>
        </div>
        <div style="overflow-y:auto;flex:1">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f5f5f5;font-size:12px;color:#666">
                <th style="padding:6px 10px;text-align:left;font-weight:600">選択項目名</th>
                <th style="padding:6px 10px;text-align:left;font-weight:600">見積表記</th>
                <th style="padding:6px 10px;text-align:right;font-weight:600">価格</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;

    // 行ホバー
    modal.querySelectorAll('.soryo-modal-row').forEach(tr => {
      tr.addEventListener('mouseenter', () => tr.style.background = '#e8f0fe');
      tr.addEventListener('mouseleave', () => tr.style.background = '');
    });
    // 背景クリックで閉じる
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.body.appendChild(modal);
  }

  /** 送料マスタから送料行を追加してFRP明細末尾に挿入 */
  function addFrpSoryoFromMaster(idx) {
    const def = state.soryoMaster[idx];
    if (!def) return;
    const item = {
      id:         state.nextFrpId++,
      type:       'soryo',
      shubetsu:   '送料',
      chubunrui:  '',
      kashira:    '',
      hinmei:     def.line1,
      itemnum:    def.line2,
      zuban:      '',
      hinban:     '',
      name3:      '',
      optSpec5:   '',
      qty:        1,
      unit:       '式',
      price:      def.price,
      priceA:     def.price,
      priceB:     def.price,
      soryoKubun: 0,
      soryoNote:  def.line3,
      specs:      [],
      _fromMaster: true,
    };
    // 送料は常に最下段
    const others = state.frpItems.filter(i => i.type !== 'soryo');
    const soryos = state.frpItems.filter(i => i.type === 'soryo');
    soryos.push(item);
    state.frpItems = [...others, ...soryos];

    document.getElementById('soryoModal')?.remove();
    markDirty();
    renderFrpItems();
    updateFrpTotals();
    updateOutput();
  }

  function openFrpSettings() {
    const modal = document.getElementById('frpSettingsModal');
    if (!modal) return;

    const hzRadios = modal.querySelectorAll('input[name="frpSettingsHz"]');
    hzRadios.forEach(r => { r.checked = r.value === state.frpHz; });

    const zubanCb = document.getElementById('frpSettingsZuban');
    if (zubanCb) zubanCb.checked = state.frpShowZuban !== false;

    const specsCb = document.getElementById('frpSettingsSpecs');
    if (specsCb) specsCb.checked = state.frpShowSpecs === true;

    const sections = state.frpFooterSections || FRP_DEFAULT_SECTIONS.map(s => ({ ...s }));
    sections.forEach((sec, i) => {
      const cb    = document.getElementById(`frpSection${i}Enabled`);
      const title = document.getElementById(`frpSection${i}Title`);
      const ta    = document.getElementById(`frpSection${i}Text`);
      if (cb)    cb.checked    = sec.enabled !== false;
      if (title) title.value   = sec.title   ?? FRP_DEFAULT_SECTIONS[i].title;
      if (ta)    ta.value      = sec.text     ?? '';
    });

    modal.style.display = '';
  }

  async function saveFrpSettings() {
    if (!state.quoteId) { showToast('見積レコードが未ロードです', 'warn'); return; }

    const hzRadio  = document.querySelector('input[name="frpSettingsHz"]:checked');
    const zubanCb  = document.getElementById('frpSettingsZuban');
    const specsCb2 = document.getElementById('frpSettingsSpecs');

    state.frpHz        = hzRadio?.value || '50Hz';
    state.frpShowZuban = zubanCb  ? zubanCb.checked  : true;
    state.frpShowSpecs = specsCb2 ? specsCb2.checked : true;

    state.frpFooterSections = FRP_DEFAULT_SECTIONS.map((def, i) => {
      const cb    = document.getElementById(`frpSection${i}Enabled`);
      const title = document.getElementById(`frpSection${i}Title`);
      const ta    = document.getElementById(`frpSection${i}Text`);
      return {
        title:   (title ? title.value.trim() : '') || def.title,
        enabled: cb ? cb.checked : true,
        text:    ta ? ta.value   : def.text,
      };
    });

    const frpJson = JSON.stringify({
      hz:               state.frpHz,
      showZuban:        state.frpShowZuban,
      showSpecs:        state.frpShowSpecs,
      footerSectionsV2: true,
      footerSections:   state.frpFooterSections,
    });

    try {
      const res = await ZOHO.CRM.API.updateRecord({
        Entity:  'Quotes',
        APIData: { id: state.quoteId, FRP_JSON: frpJson },
        Trigger: [],
      });
      const code = res?.data?.[0]?.code;
      if (code === 'SUCCESS') {
        state._frpSettingsRaw = JSON.parse(frpJson);
        document.getElementById('frpSettingsModal').style.display = 'none';
        showToast('FRP設定を保存しました');
      } else {
        showToast('FRP設定の保存に失敗しました: ' + (res?.data?.[0]?.message || code), 'err');
      }
    } catch (e) {
      showToast('FRP設定の保存エラー: ' + (e?.message || String(e)), 'err');
    }
  }

  function resetFrpSettings() {
    const _defEnabled = state.createDeptCode === '28';
    FRP_DEFAULT_SECTIONS.forEach((def, i) => {
      const cb    = document.getElementById(`frpSection${i}Enabled`);
      const title = document.getElementById(`frpSection${i}Title`);
      const ta    = document.getElementById(`frpSection${i}Text`);
      if (cb)    cb.checked  = _defEnabled;
      if (title) title.value = def.title;
      if (ta)    ta.value    = def.text;
    });
    const zubanCb  = document.getElementById('frpSettingsZuban');
    const specsCb2 = document.getElementById('frpSettingsSpecs');
    document.querySelectorAll('input[name="frpSettingsHz"]').forEach(r => { r.checked = r.value === '50Hz'; });
    if (zubanCb)  zubanCb.checked  = true;
    if (specsCb2) specsCb2.checked = false;
    showToast('初期値に戻しました（保存するには「保存」を押してください）', 'warn');
  }

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
    if (sectionsContainer) sectionsContainer.style.display = '';
    if (noSectionsMsg)     noSectionsMsg.style.display     = frpOn ? 'none' : '';
    if (itemsToolbar)      itemsToolbar.style.display      = frpOn ? 'none' : '';
    if (gensuiSummary)     gensuiSummary.style.display     = frpOn ? 'none' : '';

    // 衛生ツールバー: FRPモードのみ表示
    const eiseiRowEl = document.getElementById('eiseiRow');
    if (eiseiRowEl) eiseiRowEl.style.display = frpOn ? '' : 'none';

    // 掛率パネル注意書き: FRPモードのみ表示
    const ratePanelFrpNote = document.getElementById('ratePanelFrpNote');
    if (ratePanelFrpNote) ratePanelFrpNote.style.display = frpOn ? '' : 'none';

    const btn   = document.getElementById('btnFrpMode');
    const label = document.getElementById('frpModeLabel');
    if (btn) {
      btn.textContent = frpOn ? 'FRPモードを終了' : 'FRP見積モードに切り替え';
      btn.classList.toggle('active', frpOn);
    }
    if (label) label.style.display = frpOn ? '' : 'none';

    if (frpOn) {
      // FRPモードでは内訳印刷をデフォルトOFF
      const chkNaiyaku = document.getElementById('printNaiyaku');
      if (chkNaiyaku) chkNaiyaku.checked = false;

      fetchFrpDealerCode();

      const discountEl = document.getElementById('frpDiscountInput');
      if (discountEl) {
        discountEl.value = state.frpDiscount || 0;
        if (!discountEl._frpBound) {
          discountEl._frpBound = true;
          discountEl.addEventListener('input', () => {
            state.frpDiscount = Number(discountEl.value) || 0;
            updateFrpTotals();
            markDirty();
          });
        }
      }
    }
  }

  function _getFrpRate(rateRow, hinshu) {
    if (!rateRow || !hinshu) return null;
    const rate = rateRow[hinshu];
    if (hinshu === 'opt2' && !rate) return rateRow['opt'] ?? null;
    return rate ?? null;
  }

  function _autoHinshu(item) {
    const s = item.shubetsu  || '';
    if (s === 'オプション２')   return 'opt2';
    if (item.type === 'option') return 'opt';
    const c = item.chubunrui || '';
    if (s === 'ポンプアップ槽')         return 'p2';
    if (s === 'ポンプアップ槽【槽のみ】') return 'p1';
    if (s === '便槽') {
      if (c.includes('簡易水洗')) return 'b1';
      if (c.includes('無臭'))     return 'b2';
      return 'b1';
    }
    if (s === '受水槽') {
      if (c === '排水槽') return 'b3';
      return 'w1';
    }
    return null;
  }

  function addFrpItem(record) {
    const specs = [];
    for (let i = 1; i <= 9; i++) {
      const v = String(record[`spec${i}`] || '').trim();
      if (v) specs.push(v);
    }
    const soryoKubun = Number(record.field2) || 0;
    const isOpt  = record.field3 === 'オプション部品';
    const isOpt2 = record.field3 === 'オプション２';
    const item = {
      id:          state.nextFrpId++,
      type:        (isOpt || isOpt2) ? 'option' : 'product',
      shubetsu:    record.field3  || '',
      chubunrui:   (isOpt || isOpt2) ? (record.spec3 || '') : (record.field4 || ''),
      kashira:     record.field1  || '',
      hinmei:      (isOpt || isOpt2) ? (record.spec2 || '') : (record.field3 || record.Name || ''),
      name3:       (isOpt || isOpt2) ? (record.spec4 || '') : '',
      optSpec5:    (isOpt || isOpt2) ? (record.spec5 || '') : '',
      itemnum:     record.itemnum || '',
      zuban:       record.field  || '',
      hinban:      record.field5 || '',
      qty:         1,
      unit:        record.unit    || '',
      price:       Number(record.price)  || 0,
      priceA:      0,
      priceB:      0,
      genka:       Number(record.field8) || 0,
      priceS:      Number(record.field7) || 0,
      soryoKubun,
      soryoNote:   '',
      specs,
    };
    // 品種を自動設定し、エリアが選択済みなら仕切単価を計算
    item.hinshu = _autoHinshu(item);
    if (item.hinshu && state.frpDealerCode && state.frpArea) {
      const rateRow = state.frpAreaRates.find(r => r.code === state.frpDealerCode && r.area === state.frpArea);
      const rate0 = _getFrpRate(rateRow, item.hinshu);
      if (rate0 != null) {
        item.frpRate = rate0 / 100;
        item.priceA  = Math.round((item.price || 0) * item.frpRate);
      }
    }

    state.frpItems.push(item);

    // 送料行を常に最下段へ移動
    const soryoItems = state.frpItems.filter(i => i.type === 'soryo');
    const otherItems = state.frpItems.filter(i => i.type !== 'soryo');
    state.frpItems = [...otherItems, ...soryoItems];

    markDirty();
    renderFrpItems();
    updateFrpTotals();
    updateOutput();
  }

  function moveFrpItem(itemId, dir) {
    const idx = state.frpItems.findIndex(i => i.id === itemId);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= state.frpItems.length) return;
    const items = [...state.frpItems];
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    state.frpItems = items;
    markDirty();
    renderFrpItems();
    updateFrpTotals();
    updateOutput();
  }


  const FRP_OPTION_PDFS = ['仮固定バンド', '臭突管セット'];

  function _getFrpRecordPdfKey(r) {
    const fields = [r.Name || '', r.itemnum || '', r.field4 || ''];
    for (const key of FRP_OPTION_PDFS) {
      if (fields.some(f => f.includes(key))) return key;
    }
    return null;
  }

  function _frpWizardOpenPdf(key) {
    const b64 = (typeof FRP_PDF_B64 !== 'undefined') && FRP_PDF_B64[key];
    if (!b64) return;
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const blob = new Blob([arr], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob), '_blank');
  }

  function toggleFrpSpecs(itemId) {
    const specRows = document.querySelectorAll(`.frp-spec-row[data-frp-id="${itemId}"]`);
    if (!specRows.length) return;
    const willShow = specRows[0].style.display === 'none';
    specRows.forEach(r => { r.style.display = willShow ? '' : 'none'; });
    const btn = document.querySelector(`.frp-spec-toggle-btn[data-frp-id="${itemId}"]`);
    if (btn) btn.textContent = willShow ? '仕様 ▲' : '仕様 ▶';
    const item = state.frpItems.find(i => i.id === itemId);
    if (item) { item.specsHidden = !willShow; markDirty(); }
  }

  function removeFrpSpec(itemId, specIdx) {
    const item = state.frpItems.find(i => i.id === itemId);
    if (!item || !item.specs) return;
    item.specs.splice(specIdx, 1);
    markDirty();
    renderFrpItems();
  }

  function addFrpSpec(itemId) {
    const item = state.frpItems.find(i => i.id === itemId);
    if (!item) return;
    if (!item.specs) item.specs = [];
    item.specs.push('');
    item.specsHidden = false;
    markDirty();
    renderFrpItems();
    // 追加後にスペック行を展開表示
    const specRows = document.querySelectorAll(`.frp-spec-row[data-frp-id="${itemId}"]`);
    specRows.forEach(r => { r.style.display = ''; });
    const btn = document.querySelector(`.frp-spec-toggle-btn[data-frp-id="${itemId}"]`);
    if (btn) btn.textContent = '仕様 ▲';
    // 追加した最後の入力欄にフォーカス
    const lastInput = [...specRows].pop()?.querySelector('.frp-spec-input');
    if (lastInput) lastInput.focus();
  }

  function addFrpManualItem() {
    state.frpItems.push({
      id:         state.nextFrpId++,
      type:       'product',
      shubetsu:   '',
      chubunrui:  '',
      kashira:    '',
      hinmei:     '',
      name3:      '',
      optSpec5:   '',
      itemnum:    '',
      zuban:      '',
      hinban:     '',
      qty:        1,
      unit:       '式',
      price:      0,
      priceA:     0,
      priceB:     0,
      soryoKubun: 0,
      soryoNote:  '',
      specs:      [],
      hinshu:     null,
    });
    markDirty();
    renderFrpItems();
    updateFrpTotals();
    updateOutput();
  }

  function removeFrpItem(itemId) {
    state.frpItems = state.frpItems.filter(i => i.id !== itemId);
    markDirty();
    renderFrpItems();
    updateFrpTotals();
    updateOutput();
  }

  let _frpZubanTargetId = null;

  function openFrpZubanModal(itemId) {
    const item = state.frpItems.find(i => i.id === itemId);
    if (!item) return;
    _frpZubanTargetId = itemId;
    const zubanEl  = document.getElementById('frpZubanInput');
    const hinbanEl = document.getElementById('frpHinbanInput');
    if (zubanEl)  zubanEl.value  = item.zuban  || '';
    if (hinbanEl) hinbanEl.value = item.hinban || '';
    document.getElementById('frpZubanModal').style.display = 'flex';
    if (zubanEl) zubanEl.focus();
  }

  function execFrpZubanSave() {
    if (_frpZubanTargetId == null) return;
    const item = state.frpItems.find(i => i.id === _frpZubanTargetId);
    if (!item) return;
    item.zuban  = (document.getElementById('frpZubanInput')?.value  || '').trim();
    item.hinban = (document.getElementById('frpHinbanInput')?.value || '').trim();
    _frpZubanTargetId = null;
    document.getElementById('frpZubanModal').style.display = 'none';
    markDirty();
    renderFrpItems();
  }

  function renderFrpItems() {
    const tbody = document.getElementById('frpItemsTbody');
    if (!tbody) return;

    const shikiriKey = 'priceA';
    const rateRow = (state.frpDealerCode && state.frpArea)
      ? state.frpAreaRates.find(r => r.code === state.frpDealerCode && r.area === state.frpArea)
      : null;
    const rows = [];

    state.frpItems.forEach((item, idx) => {
      const shikiriRaw   = item[shikiriKey] || 0;
      const shikiri      = state.roundingEnabled ? roundUp(shikiriRaw) : shikiriRaw;
      const qty          = Number(item.qty) || 1;
      const priceTotal   = item.price * qty;
      const shikiriTotal = shikiri    * qty;
      const rateVal      = (rateRow && item.hinshu) ? _getFrpRate(rateRow, item.hinshu) : null;
      const rateTxt      = rateVal != null ? (rateVal / 100).toFixed(2) : '—';

      // 品名・型式（編集可能）
      const zubanParts = [];
      if (item.zuban)  zubanParts.push(`図番　${escHtml(item.zuban)}`);
      if (item.hinban) zubanParts.push(`品番　${escHtml(item.hinban)}`);
      const zubanHtml = (state.frpShowZuban && zubanParts.length)
        ? `<div class="frp-zuban-text">${zubanParts.join('　')}</div>` : '';

      const hinshuOptionsHtml = FRP_HINSHU_OPTIONS.map(h =>
        `<option value="${h.key}" ${item.hinshu === h.key ? 'selected' : ''}>${escHtml(h.label)}</option>`
      ).join('');

      rows.push(`
        <tr class="frp-item-row" draggable="true" data-frp-id="${item.id}">
          <td class="frp-col-no frp-drag-handle" style="text-align:center;cursor:grab">
            <span style="display:block;font-size:15px;color:#aaa;line-height:1">⠿</span>
            <span style="font-size:11px">${idx + 1}</span>
          </td>
          <td class="frp-col-name">
            <input type="text" class="frp-name-input frp-name-main"
                   value="${escHtml(item.hinmei || '')}"
                   data-frp-id="${item.id}" data-field="hinmei">
            ${item.type === 'option' ? `
            <input type="text" class="frp-name-input frp-name-sub"
                   value="${escHtml(item.chubunrui || '')}"
                   data-frp-id="${item.id}" data-field="chubunrui">
            <input type="text" class="frp-name-input frp-name-sub"
                   value="${escHtml(qty >= 2 ? (item.optSpec5 || '') : (item.name3 || ''))}"
                   data-frp-id="${item.id}" data-field="${qty >= 2 ? 'optSpec5' : 'name3'}">
` : `
            <input type="text" class="frp-name-input frp-name-sub"
                   value="${escHtml(item.itemnum || '')}"
                   data-frp-id="${item.id}" data-field="itemnum">
            ${zubanHtml}
            ${(item.specLines && item.specLines.length)
              ? item.specLines.map(l => `<div class="frp-spec-line">${escHtml(l)}</div>`).join('')
              : ''}
            <button onclick="app.addFrpSpec(${item.id})"
                    style="font-size:11px;padding:1px 6px;margin-top:3px;cursor:pointer;background:#f0fff4;border:1px solid #8b8;border-radius:3px;color:#363;">＋仕様</button>
            ${(item.specs && item.specs.length)
              ? `<button class="frp-spec-toggle-btn" data-frp-id="${item.id}"
                         onclick="app.toggleFrpSpecs(${item.id})"
                         style="font-size:11px;padding:1px 6px;margin-top:3px;cursor:pointer;background:#f0f4ff;border:1px solid #aac;border-radius:3px;color:#336;">仕様 ▶</button>`
              : ''}
            `}
          </td>
          <td class="frp-col-hinshu">
            ${item.type === 'soryo' ? '' : `<select class="frp-hinshu-sel" data-frp-id="${item.id}"><option value="">—</option>${hinshuOptionsHtml}</select>`}
          </td>
          <td class="frp-col-qty">
            <input type="number" class="frp-qty-input" value="${item.qty}"
                   min="0" step="any" data-frp-id="${item.id}">
          </td>
          <td class="frp-col-unit" style="text-align:center">${escHtml(item.unit)}</td>
          <td class="frp-col-price">
            <input type="number" class="frp-price-input" value="${item.price || ''}"
                   min="0" step="1" data-frp-id="${item.id}" data-field="price">
          </td>
          <td class="frp-col-total" style="text-align:right">${fmtFrp(priceTotal)}</td>
          <td class="frp-col-rate">
            ${item.type === 'soryo'
              ? `<span style="color:#aaa">—</span>`
              : `<input type="number" class="frp-rate-input"
                   value="${item.frpRate != null ? item.frpRate : (rateVal != null ? (rateVal / 100) : '')}"
                   min="0" max="2" step="0.001" placeholder="—"
                   data-frp-id="${item.id}">`}
          </td>
          <td class="frp-col-shikiri">
            <input type="number" class="frp-price-input" value="${shikiri || ''}"
                   min="0" step="1" data-frp-id="${item.id}" data-field="shikiri">
          </td>
          <td class="frp-col-shikiri-total" style="text-align:right">${fmtFrp(shikiriTotal)}</td>
          <td class="frp-col-genka">
            ${item.type === 'soryo' ? (item.genka != null && item.genka !== 0 ? fmtFrp(item.genka) : '') : `<input type="number" class="frp-genka-input" value="${item.genka || ''}" min="0" step="1" data-frp-id="${item.id}">`}
          </td>
          <td class="frp-col-genka-total" style="text-align:right">${item.genka != null && item.genka !== 0 ? fmtFrp((item.genka || 0) * qty) : ''}</td>
          <td class="frp-col-del">
            ${item.type !== 'soryo' ? `<button onclick="app.openFrpZubanModal(${item.id})"
                    style="background:none;border:none;cursor:pointer;font-size:13px;color:#555;margin-right:4px" title="図番・品番を編集">✏️</button>` : ''}
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
            <td colspan="12" class="frp-soryo-note">${escHtml(item.soryoNote)}</td>
          </tr>
        `);
      }

      // 仕様補足行（オプション品は非表示、初期状態は折り畳み）
      if (item.type !== 'option') {
        (item.specs || []).forEach((spec, si) => {
          rows.push(`
            <tr class="frp-spec-row" data-frp-id="${item.id}" style="display:none">
              <td></td>
              <td colspan="10">
                <input type="text" class="frp-spec-input"
                       value="${escHtml(spec)}"
                       data-frp-id="${item.id}" data-spec-idx="${si}">
              </td>
              <td class="frp-col-del">
                <button onclick="app.removeFrpSpec(${item.id},${si})"
                        style="color:#c00;background:none;border:none;cursor:pointer;font-size:14px;">✕</button>
              </td>
            </tr>
          `);
        });
      }
    });

    tbody.innerHTML = rows.join('');

    // ドラッグ＆ドロップで並び替え
    let _dragSrcId = null;
    tbody.querySelectorAll('.frp-item-row').forEach(tr => {
      tr.addEventListener('dragstart', e => {
        _dragSrcId = Number(tr.dataset.frpId);
        tr.classList.add('frp-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      tr.addEventListener('dragend', () => {
        tr.classList.remove('frp-dragging');
        tbody.querySelectorAll('.frp-drag-over').forEach(el => el.classList.remove('frp-drag-over'));
      });
      tr.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        tbody.querySelectorAll('.frp-drag-over').forEach(el => el.classList.remove('frp-drag-over'));
        tr.classList.add('frp-drag-over');
      });
      tr.addEventListener('dragleave', () => tr.classList.remove('frp-drag-over'));
      tr.addEventListener('drop', e => {
        e.stopPropagation();
        const dropId = Number(tr.dataset.frpId);
        if (_dragSrcId == null || _dragSrcId === dropId) return;
        const srcIdx = state.frpItems.findIndex(i => i.id === _dragSrcId);
        const dstIdx = state.frpItems.findIndex(i => i.id === dropId);
        if (srcIdx === -1 || dstIdx === -1) return;
        const items = [...state.frpItems];
        const [moved] = items.splice(srcIdx, 1);
        items.splice(dstIdx, 0, moved);
        state.frpItems = items;
        markDirty();
        renderFrpItems();
        updateFrpTotals();
        updateOutput();
      });
    });

    // 数量入力イベント
    tbody.querySelectorAll('.frp-qty-input').forEach(input => {
      input.addEventListener('input', () => {
        const id = Number(input.dataset.frpId);
        const item = state.frpItems.find(i => i.id === id);
        if (item) {
          item.qty = Number(input.value) || 0;
          // 紐付きオプション品（仮固定バンドセット・臭突管セット等）の数量を連動更新
          state.frpItems.filter(i => i._bandFor === id)
            .forEach(i => { i.qty = item.qty * (i._bandQtyPer || 1); });
          renderFrpItems();
          updateFrpTotals();
          updateOutput();
        }
      });
    });

    // 価格入力イベント（確定時のみ更新）
    tbody.querySelectorAll('.frp-price-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = Number(input.dataset.frpId);
        const field = input.dataset.field;
        const item = state.frpItems.find(i => i.id === id);
        if (!item) return;
        const val = Number(input.value) || 0;
        const qty = Number(item.qty) || 1;
        const row = input.closest('tr');
        if (field === 'price') {
          item.price = val;
          const totalCell = row.querySelector('.frp-col-total');
          if (totalCell) totalCell.textContent = fmtFrp(val * qty);
        } else {
          item.priceA = val;
          // 掛率を逆算して表示更新
          if (item.price > 0) {
            item.frpRate = Math.round(val / item.price * 1000) / 1000;
            const rateInput = row.querySelector('.frp-rate-input');
            if (rateInput) rateInput.value = item.frpRate;
          }
          const shikiriTotalCell = row.querySelector('.frp-col-shikiri-total');
          if (shikiriTotalCell) shikiriTotalCell.textContent = fmtFrp(val * qty);
        }
        updateFrpTotals();
        updateOutput();
        markDirty();
      });
    });

    // 品名・型式入力イベント
    tbody.querySelectorAll('.frp-name-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = Number(input.dataset.frpId);
        const field = input.dataset.field;
        const item = state.frpItems.find(i => i.id === id);
        if (!item) return;
        item[field] = input.value;
        updateOutput();
        markDirty();
      });
    });

    // 仕様補足入力イベント
    tbody.querySelectorAll('.frp-spec-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = Number(input.dataset.frpId);
        const idx = Number(input.dataset.specIdx);
        const item = state.frpItems.find(i => i.id === id);
        if (!item) return;
        item.specs[idx] = input.value;
        updateOutput();
        markDirty();
      });
    });

    // 原価入力イベント
    tbody.querySelectorAll('.frp-genka-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = Number(input.dataset.frpId);
        const item = state.frpItems.find(i => i.id === id);
        if (!item) return;
        item.genka = Number(input.value) || 0;
        const qty = Number(item.qty) || 1;
        const row = input.closest('tr');
        const totalCell = row.querySelector('.frp-col-genka-total');
        if (totalCell) totalCell.textContent = item.genka ? fmtFrp(item.genka * qty) : '';
        updateFrpTotals();
        updateOutput();
        markDirty();
      });
    });

    // 品種選択イベント
    tbody.querySelectorAll('.frp-hinshu-sel').forEach(sel => {
      sel.addEventListener('change', () => {
        const id   = Number(sel.dataset.frpId);
        const item = state.frpItems.find(i => i.id === id);
        if (!item) return;
        item.hinshu = sel.value || null;
        if (item.hinshu && state.frpArea && state.frpDealerCode) {
          const rateRow = state.frpAreaRates.find(r => r.code === state.frpDealerCode && r.area === state.frpArea);
          const rate = _getFrpRate(rateRow, item.hinshu);
          if (rateRow && rate != null) {
            item.frpRate = rate / 100;
            item.priceA  = Math.round((item.price || 0) * item.frpRate);
            item.priceB  = Math.round((item.price || 0) * item.frpRate);
            renderFrpItems();
            updateFrpTotals();
          }
        }
        updateOutput();
        markDirty();
      });
    });

    // 掛率入力イベント
    tbody.querySelectorAll('.frp-rate-input').forEach(input => {
      // inputイベント: 入力中にstateへ即反映（他のinputが renderFrpItems を呼んでも値が消えない）
      input.addEventListener('input', () => {
        const id   = Number(input.dataset.frpId);
        const item = state.frpItems.find(i => i.id === id);
        if (!item) return;
        const rate = parseFloat(input.value);
        if (!isNaN(rate) && rate > 0) {
          item.frpRate = rate;
          item.priceA  = Math.round((item.price || 0) * rate);
        } else {
          item.frpRate = null;
          item.priceA  = 0;
        }
      });
      // changeイベント: フォーカスが外れたときにUI全体を更新
      input.addEventListener('change', () => {
        const id   = Number(input.dataset.frpId);
        const item = state.frpItems.find(i => i.id === id);
        if (!item) return;
        const rate = parseFloat(input.value);
        const qty  = Number(item.qty) || 1;
        const row  = input.closest('tr');
        if (!isNaN(rate) && rate > 0) {
          item.frpRate = rate;
          item.priceA  = Math.round((item.price || 0) * rate);
        } else {
          item.frpRate = null;
          item.priceA  = 0;
        }
        const displayShikiri = state.roundingEnabled ? roundUp(item.priceA || 0) : (item.priceA || 0);
        const shikiriInput = row.querySelector('.frp-price-input[data-field="shikiri"]');
        if (shikiriInput) shikiriInput.value = displayShikiri || '';
        const shikiriTotalCell = row.querySelector('.frp-col-shikiri-total');
        if (shikiriTotalCell) shikiriTotalCell.textContent = fmtFrp(displayShikiri * qty);
        updateFrpTotals();
        updateOutput();
        markDirty();
      });
    });
  }

  // 取引先名（全角・半角括弧）からコードを抽出: （A1780200） → "A178"
  function _extractDealerCode(name) {
    const m = String(name || '').match(/[（(]([A-Z]{1,2}\d{3,})[）)]/);
    return m ? m[1].slice(0, 4) : null;
  }

  async function fetchFrpDealerCode() {
    // 掛率マスタ未ロードなら先にロードする（loadCurrentUser との競合対策）
    if (!state.frpAreaRates.length) {
      await loadFrpRates(state.createDeptCode);
    }
    const accountId = state.customerAccountId;
    if (!accountId || !zohoReady) {
      updateFrpAreaUI();
      return;
    }
    try {
      const res = await ZOHO.CRM.API.getRecord({ Entity: 'Accounts', RecordID: accountId });
      const record = res?.data?.[0];

      // Accounts の "field" フィールドに代理店コード（例: Y1003122）が格納されている
      const raw = String(record?.field || '');
      const candidate = raw.slice(0, 4);

      state.frpDealerCode = state.frpAreaRates.some(r => r.code === candidate) ? candidate : null;
    } catch(e) {
      console.error('[FRP] 代理店コード取得エラー:', e);
      state.frpDealerCode = null;
    }
    updateFrpAreaUI();
  }

  function updateFrpAreaUI() {
    const dealerSelect = document.getElementById('frpDealerSelect');
    const areaSelect   = document.getElementById('frpAreaSelect');
    if (!areaSelect) return;

    // 代理店ドロップダウンを一意コードで構築
    if (dealerSelect) {
      const seen = new Set();
      const dealerOpts = state.frpAreaRates
        .filter(r => { if (seen.has(r.code)) return false; seen.add(r.code); return true; })
        .map(r => {
            // dealerName がない場合（FRP_AREA_RATES フォールバック）は area 文字列の「（」前を代理店名として使用
            const label = r.dealerName || (r.area || '').split(/[（(]/)[0].trim() || r.code;
            return `<option value="${escHtml(r.code)}" ${state.frpDealerCode === r.code ? 'selected' : ''}>${escHtml(label)}</option>`;
          })
        .join('');
      dealerSelect.innerHTML = '<option value="">— 選択 —</option>' + dealerOpts;
    }

    const code  = state.frpDealerCode;
    const areas = code
      ? state.frpAreaRates.filter(r => r.code === code).map(r => r.area)
      : [];

    areaSelect.innerHTML = '<option value="">— 選択 —</option>' +
      areas.map(a => `<option value="${escHtml(a)}" ${state.frpArea === a ? 'selected' : ''}>${escHtml(a)}</option>`).join('');
  }

  function onFrpDealerSelect(code) {
    state.frpDealerCode = state.frpAreaRates.some(r => r.code === code) ? code : null;
    state.frpArea = null;
    updateFrpAreaUI();
    markDirty();
  }

  function onFrpAreaChange(area) {
    state.frpArea = area || null;
    applyFrpAreaRates();
    updateOutput();
    markDirty();
  }

  function applyFrpAreaRates() {
    if (!state.frpArea || !state.frpDealerCode) return;
    const rateRow = state.frpAreaRates.find(r => r.code === state.frpDealerCode && r.area === state.frpArea);
    if (!rateRow) return;

    state.frpItems.forEach(item => {
      if (item.type === 'soryo') return;
      if (!item.hinshu) item.hinshu = _autoHinshu(item);
      if (!item.hinshu) return;
      const rate = _getFrpRate(rateRow, item.hinshu);
      if (rate == null) return;
      item.frpRate = rate / 100;
      item.priceA  = Math.round((item.price || 0) * item.frpRate);
    });

    renderFrpItems();
    updateFrpTotals();
  }

  function updateFrpTotals() {
    const shikiriKey   = 'priceA';
    const priceTotal   = state.frpItems.reduce((s, i) => s + i.price * (Number(i.qty) || 1), 0);
    const shikiriTotal = state.frpItems.reduce((s, i) => {
      const v = state.roundingEnabled ? roundUp(i[shikiriKey] || 0) : (i[shikiriKey] || 0);
      return s + v * (Number(i.qty) || 1);
    }, 0);
    const discount     = state.frpDiscount || 0;
    const grandTotal   = Math.max(0, shikiriTotal - discount);

    const ptEl = document.getElementById('frpPriceTotal');
    const stEl = document.getElementById('frpShikiriTotal');
    const gtEl = document.getElementById('frpGrandTotal');
    if (ptEl) ptEl.textContent = '¥' + priceTotal.toLocaleString('ja-JP');
    if (stEl) stEl.textContent = '¥' + shikiriTotal.toLocaleString('ja-JP');
    if (gtEl) gtEl.textContent = '¥' + grandTotal.toLocaleString('ja-JP');

    // 底部フッターバーを FRP 合計で更新
    setText('footerTotal', '¥' + priceTotal.toLocaleString('ja-JP'));
    const footerDairiWrap = document.getElementById('footerDairiWrap');
    if (footerDairiWrap) {
      if (shikiriTotal > 0) {
        setText('footerDairi', '¥' + shikiriTotal.toLocaleString('ja-JP'));
        const labelEl = document.getElementById('footerDairiLabel');
        if (labelEl) labelEl.textContent = '仕切';
        footerDairiWrap.style.display = '';
      } else {
        footerDairiWrap.style.display = 'none';
      }
    }
    // 粗利・粗利率（原価データなし = 0 のため 粗利 = 御見積金額）
    const footerAraRi     = grandTotal;
    const footerAraRiRate = grandTotal > 0 ? 100.0 : 0;
    setText('footerAraRi',     '¥' + footerAraRi.toLocaleString('ja-JP'));
    setText('footerAraRiRate', footerAraRiRate.toFixed(1) + '%');
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

    const createCode = createDeptEl?.value || '';
    const siteCode   = siteDeptEl?.value   || '';
    const kikaShita  = String(kikaShitaEl?.value || '80').padStart(2, '0');
    const edaban     = String(parseInt(edabanEl?.value) || 1);

    const isKouji = (state.quoteCategory || '').includes('工事');
    // 工事: 工事カテゴリコード（CD/CE/…）、物販: BP、作業: SA
    let category;
    if (isKouji) {
      category = categoryEl?.value || '';
    } else if ((state.quoteCategory || '').includes('物販')) {
      category = 'BP';
    } else if ((state.quoteCategory || '').includes('作業')) {
      category = 'SA';
    } else {
      category = '';
    }

    if (isKouji) {
      if (!category || !createCode || !siteCode) {
        showToast('工事カテゴリ・作成所課・現場所課を選択してください', 'warn');
        return;
      }
    } else {
      if (!createCode) {
        showToast('作成所課を選択してください', 'warn');
        return;
      }
    }

    btn.disabled = true;
    btn.textContent = '採番中...';

    try {
      let newSeq = 1;

      if (zohoReady) {
        // 採番管理モジュール（CustomModule27）からカウンターを取得・更新
        const counterKey = `${category}${createCode}-${kikaShita}`;
        const cRes = await ZOHO.CRM.API.searchRecord({
          Entity: 'CustomModule27',
          Type:   'criteria',
          Query:  `(Name:equals:${counterKey})`,
        });
        const cRecords = cRes?.data || [];

        if (cRecords.length === 0) {
          // 初回: レコードを新規作成（現在値=1）
          await ZOHO.CRM.API.insertRecord({
            Entity:  'CustomModule27',
            APIData: {
              Name:   counterKey,
              field:  createCode,  // 所課コード
              field1: category,    // カテゴリ
              field2: 1,           // 現在値
              field3: kikaShita,   // 期下
            },
          });
          newSeq = 1;
        } else {
          // 既存: 現在値+1 で更新
          const rec = cRecords[0];
          newSeq = (Number(rec.field2) || 0) + 1;
          await ZOHO.CRM.API.updateRecord({
            Entity:  'CustomModule27',
            APIData: { id: rec.id, field2: newSeq },
          });
        }
      }

      const seqStr  = String(newSeq).padStart(4, '0');
      const quoteNo = `${category}${createCode}${siteCode}-${kikaShita}${seqStr}${edaban}`;

      // 重複チェック: 同じ見積番号が既に存在しないか確認
      if (zohoReady) {
        const dupRes = await ZOHO.CRM.API.searchRecord({
          Entity: 'Quotes',
          Type:   'criteria',
          Query:  `(field55:equals:${quoteNo})`,
        }).catch(() => null);
        const dups = (dupRes?.data || []).filter(r => r.id !== state.quoteId);
        if (dups.length > 0) {
          const dupSubjects = dups.map(r => r.Subject || r.id).join('\n');
          const proceed = confirm(
            `⚠️ 見積番号「${quoteNo}」は既に使用されています。\n\n該当見積:\n${dupSubjects}\n\nこのまま使用しますか？`
          );
          if (!proceed) {
            btn.disabled = false;
            btn.textContent = '🔢 採番する';
            return;
          }
          showToast(`重複番号で発行: ${quoteNo}`, 'warn');
        }
      }

      state.seqNoHistory.push({ seqNo: state.seqNo, seqNumber: state.seqNumber, edaban: state.edaban });
      state.seqNo          = quoteNo;
      state.seqNumber      = newSeq;
      state.koujiCategory  = category;
      state.createDeptCode = createCode;
      state.createDeptName = createDeptEl?.options[createDeptEl.selectedIndex]?.dataset?.name || '';
      state.siteDeptCode   = siteCode;
      state.siteDeptName   = siteDeptEl?.options[siteDeptEl.selectedIndex]?.dataset?.name || '';
      state.kikaShita      = kikaShita;
      state.edaban         = edaban;

      updateQuoteNoBadge();
      showToast(`採番完了: ${quoteNo}`);
      btn.textContent = '採番済み';
      // disabled のまま維持（採番後ロック）
      const btnIncrEl2  = document.getElementById('btnIncrSeqNo');
      const btnResetEl2 = document.getElementById('btnResetSeqNo');
      const btnClearEl2 = document.getElementById('btnClearSeqNo');
      if (btnIncrEl2)  btnIncrEl2.style.display  = '';
      if (btnResetEl2) btnResetEl2.style.display = '';
      if (btnClearEl2) btnClearEl2.style.display = '';
      updateUndoSeqBtn();
    } catch (e) {
      const msg = e?.message || JSON.stringify(e);
      showToast('採番に失敗しました: ' + msg, 'err');
      btn.disabled = false;
      btn.textContent = '🔢 採番する';
    }
  }

  async function incrementSeqNo() {
    if (!state.seqNo) return;
    let newSeqNo = '';
    let newSeq   = 0;
    let newKikaShita = '';
    if (state.seqNo.includes('-')) {
      const parts = state.seqNo.split('-');
      if (parts.length >= 6) {
        // 旧形式: CD-32-32-80-0001-1
        newSeq = (parseInt(parts[4]) || 0) + 1;
        parts[4] = String(newSeq).padStart(4, '0');
        parts[5] = '1';
        newSeqNo = parts.join('-');
        newKikaShita = parts[3] || '';
        state.seqNumber = newSeq;
        state.edaban    = '1';
      } else if (parts.length === 2) {
        // 新形式: CQ7700-8000021
        const suffix = parts[1];
        newKikaShita = suffix.substring(0, 2);
        newSeq       = (parseInt(suffix.substring(2, 6)) || 0) + 1;
        const edaban = '1';
        newSeqNo = `${parts[0]}-${newKikaShita}${String(newSeq).padStart(4, '0')}${edaban}`;
        state.seqNumber = newSeq;
        state.edaban    = edaban;
      }
    }
    if (!newSeqNo) return;
    state.seqNoHistory.push({ seqNo: state.seqNo, seqNumber: state.seqNumber, edaban: state.edaban });
    state.seqNo = newSeqNo;
    const edabanEl = document.getElementById('edaban');
    if (edabanEl) edabanEl.value = state.edaban;
    updateQuoteNoBadge();
    updateUndoSeqBtn();

    // CustomModule27 のカウンターを新しい連番値に更新
    if (zohoReady && newSeq > 0 && newKikaShita) {
      try {
        const category   = state.koujiCategory  || document.getElementById('koujiCategory')?.value  || '';
        const createCode = state.createDeptCode || document.getElementById('createDept')?.value     || '';
        const counterKey = `${category}${createCode}-${newKikaShita}`;
        const cRes = await ZOHO.CRM.API.searchRecord({
          Entity: 'CustomModule27',
          Type:   'criteria',
          Query:  `(Name:equals:${counterKey})`,
        });
        const cRecords = cRes?.data || [];
        if (cRecords.length === 0) {
          await ZOHO.CRM.API.insertRecord({
            Entity:  'CustomModule27',
            APIData: {
              Name:   counterKey,
              field:  createCode,
              field1: category,
              field2: newSeq,
              field3: newKikaShita,
            },
          });
        } else {
          const rec = cRecords[0];
          // 現在値より大きい場合のみ更新（逆戻り防止）
          if (newSeq > (Number(rec.field2) || 0)) {
            await ZOHO.CRM.API.updateRecord({
              Entity:  'CustomModule27',
              APIData: { id: rec.id, field2: newSeq },
            });
          }
        }
      } catch (e) {
        console.warn('採番管理の更新に失敗:', e);
      }
    }
  }

  function incrementEdaban() {
    if (!state.seqNo) return;
    let newSeqNo = '';
    if (state.seqNo.includes('-')) {
      const parts = state.seqNo.split('-');
      if (parts.length >= 6) {
        const edaban = (parseInt(parts[5]) || 1) + 1;
        parts[5] = String(edaban);
        newSeqNo = parts.join('-');
        state.edaban = String(edaban);
      } else if (parts.length === 2) {
        const suffix = parts[1];
        const base   = suffix.substring(0, 6);
        const edaban = (parseInt(suffix.substring(6)) || 1) + 1;
        newSeqNo = `${parts[0]}-${base}${edaban}`;
        state.edaban = String(edaban);
      }
    }
    if (!newSeqNo) return;
    state.seqNoHistory.push({ seqNo: state.seqNo, seqNumber: state.seqNumber, edaban: state.edaban });
    state.seqNo = newSeqNo;
    const edabanEl = document.getElementById('edaban');
    if (edabanEl) edabanEl.value = state.edaban;
    updateQuoteNoBadge();
    updateUndoSeqBtn();
  }

  function resetSeqNo() {
    if (!confirm('採番をクリアします。よろしいですか？')) return;
    state.seqNo        = '';
    state.edaban       = '1';
    state.seqNoHistory = [];
    const btnAutoEl  = document.getElementById('btnAutoNumber');
    const btnIncrEl  = document.getElementById('btnIncrSeqNo');
    const btnResetEl = document.getElementById('btnResetSeqNo');
    const btnClearEl = document.getElementById('btnClearSeqNo');
    const btnUndoEl  = document.getElementById('btnUndoSeqNo');
    const displayEl  = document.getElementById('quoteNoDisplay');
    const edabanEl   = document.getElementById('edaban');
    if (btnAutoEl)  { btnAutoEl.disabled = false; btnAutoEl.textContent = '🔢 採番する'; }
    if (btnIncrEl)  btnIncrEl.style.display  = 'none';
    if (btnResetEl) { btnResetEl.style.display = 'none'; btnResetEl.disabled = false; }
    if (btnClearEl) btnClearEl.style.display = 'none';
    if (btnUndoEl)  btnUndoEl.style.display  = 'none';
    if (displayEl)  displayEl.textContent = '（未採番）';
    if (edabanEl)   edabanEl.value = '1';
    updateQuoteNoBadge();
  }

  function updateUndoSeqBtn() {
    const btn = document.getElementById('btnUndoSeqNo');
    if (btn) btn.style.display = state.seqNoHistory.length > 0 ? '' : 'none';
  }

  function undoSeqNo() {
    if (!state.seqNoHistory.length) return;
    const prev = state.seqNoHistory.pop();
    state.seqNo     = prev.seqNo;
    state.seqNumber = prev.seqNumber;
    state.edaban    = prev.edaban;
    const edabanEl = document.getElementById('edaban');
    if (edabanEl) edabanEl.value = state.edaban;
    applyStateToForm();
    updateUndoSeqBtn();
    showToast(state.seqNo ? `戻しました: ${state.seqNo}` : '採番前の状態に戻しました');
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
    markDirty();
    renderSections();
    updateOutput();
    document.getElementById('noSectionsMsg').style.display = 'none';
    // ② 追加した大項目のNoをcommonTargetSectionに選択
    const sel = document.getElementById('commonTargetSection');
    if (sel) sel.value = String(section.id);
    // ① 新セクションが見えるようにスクロール
    const newBlock = document.querySelector(`[data-section-id="${section.id}"]`);
    if (newBlock) {
      const sc = _findScrollContainer(newBlock);
      if (sc) {
        const toolbar  = document.querySelector('.items-toolbar');
        const toolbarH = toolbar ? toolbar.offsetHeight : 0;
        const blockTop = newBlock.getBoundingClientRect().top;
        const scTop    = sc.getBoundingClientRect().top;
        sc.scrollTop  += blockTop - scTop - toolbarH - 8;
      }
    }
  }

  function removeSection(btn) {
    const block = btn.closest('.section-block');
    const id    = Number(block.dataset.sectionId);
    if (!confirm('このセクションを削除しますか？')) return;
    state.sections = state.sections.filter(s => s.id !== id);
    markDirty();
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
    markDirty();
    renumberSections();
    renderSections();
  }

  function moveSectionDown(btn) {
    const block = btn.closest('.section-block');
    const id    = Number(block.dataset.sectionId);
    const idx   = state.sections.findIndex(s => s.id === id);
    if (idx < 0 || idx >= state.sections.length - 1) return;
    [state.sections[idx], state.sections[idx + 1]] = [state.sections[idx + 1], state.sections[idx]];
    markDirty();
    renumberSections();
    renderSections();
  }

  function duplicateSection(btn) {
    const block = btn.closest('.section-block');
    const id    = Number(block.dataset.sectionId);
    const idx   = state.sections.findIndex(s => s.id === id);
    if (idx < 0) return;
    const src = state.sections[idx];
    const copy = {
      id:     state.nextSectionId++,
      no:     src.no + 1,
      name:   src.name,
      secQty: src.secQty,
      items:  src.items.map(item => ({
        ...item,
        id: state.nextItemId++,
        specLines:   item.specLines   ? [...item.specLines]   : [],
        machineSpec: item.machineSpec ? JSON.parse(JSON.stringify(item.machineSpec)) : null,
      })),
    };
    state.sections.splice(idx + 1, 0, copy);
    markDirty();
    renumberSections();
    renderSections();
    updateOutput();
  }

  function renumberSections() {
    state.sections.forEach((s, i) => { s.no = i + 1; });
  }

  // ── 明細行操作 ────────────────────────────────────────────────

  function createItem() {
    return {
      id: state.nextItemId++, productId: null, model: '',
      name: '', spec: '', productCode: '', qty: 1, unit: '式', unitPrice: null, amount: 0,
      includeInLabor: false,  // 労務費に含めるか（null=auto: ④工事費なら true）
      dairiRate: state.mainRate ?? null, // null = グローバル main_rate を継承
      dairiUnitPrice: null,  // null = 自動計算（unitPrice × rate）、数値 = 手動上書き
      finalDairiUnit: null,  // null = 自動（代理店単価と同じ）、数値 = 手動上書き
      buhanDiscount: null,   // 値引き（物販のみ、行合計）
      calcCategory: '',
      kouTanka:    0,   // 工単価（マスタから、減衰再計算用）
      houdan: 0,        // 歩単（マスタから）
      houkouKubun: '',  // 歩工区分（マスタから）
      houkouGoukei: 0,  // 歩工合計（減衰計算結果 or 手動上書き）
      houkouDirect: 0,  // 直接歩工値（field16 > 0 なら減衰計算をスキップして使用）
      gensuiKubun:  '',    // 減衰区分（field17: 1〜8）
      gensuiA:      0,     // 減衰係数A（field A）
      gensuiB:      0,     // 減衰係数B（field B）
      gensuiEnabled: false, // 減衰計算オン/オフ（④工事費行ごとに制御）
      kojiCategory: '',    // 工事カテゴリー名（field18）
      specLines: [],    // 仕様行（テキストのみ）
      machineSpec: null, // {model, specs:[{label,value}]}
      printModel: false,  // 型式行の印刷ON/OFF
    };
  }

  function addItem(btn) {
    const block = btn.closest('.section-block');
    const id    = Number(block.dataset.sectionId);
    const sec   = state.sections.find(s => s.id === id);
    if (sec) {
      sec.items.push(createItem());
      markDirty();
      renderSection(sec, block);
      updateSectionSubtotal(block);
    }
  }

  function updateSectionRateWarn(sec, block) {
    const warnEl = block && block.querySelector('.section-rate-warn');
    if (!warnEl) return;
    const mainRate = state.mainRate;
    if (mainRate == null) { warnEl.style.display = 'none'; return; }
    const rateSet = new Set();
    // 手入力した行は掛率混在の判定から除外
    (sec.items || []).forEach(i => {
      if (i._dairiManual !== true) {
        rateSet.add(i.dairiRate ?? mainRate);
      }
    });
    if (rateSet.size > 1) {
      const list = [...rateSet].sort((a, b) => a - b).map(r => (r * 100).toFixed(1) + '%').join(' / ');
      warnEl.textContent = `⚠ 掛率混在（${list}）`;
      warnEl.style.display = '';
    } else {
      warnEl.style.display = 'none';
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
      item.dairiRate = rate;
      if (!item._dairiManual) {
        item.dairiUnitPrice = null;
      }
    });

    renderSection(sec, block);
    updateSectionSubtotal(block);
    updateSectionRateWarn(sec, block);
    updateOutput();
    showToast(`掛率 ${rate} を適用しました`);
  }

  function onMainRateInput(val) {
    const v = parseFloat(val);
    state.mainRate = (!isNaN(v) && v > 0) ? v : null;
    // 中途入力（"0" や "0." など）でも閾値チェックを抑制し続ける。
    // 解除は applyGlobalRate 内でのみ行う。
    _skipThresholdCheck = true;
    updateOutput();
  }

  function applyGlobalRate() {
    const mainRateVal    = parseFloat(document.getElementById('rateMain')?.value);
    const itemRateVal    = parseFloat(document.getElementById('rateItem')?.value);
    const partsRateVal   = parseFloat(document.getElementById('rateParts')?.value);
    const purchaseRateVal= parseFloat(document.getElementById('ratePurchase')?.value);

    if (isNaN(mainRateVal) || mainRateVal <= 0) {
      _skipThresholdCheck = false;
      showToast('代理店掛率を入力してください', 'warn');
      return;
    }

    // stateに反映
    state.mainRate    = mainRateVal;
    state.itemRate    = !isNaN(itemRateVal)    ? itemRateVal    : state.itemRate;
    state.partsRate   = !isNaN(partsRateVal)   ? partsRateVal   : state.partsRate;
    state.purchaseRate= !isNaN(purchaseRateVal) ? purchaseRateVal: state.purchaseRate;

    // 全明細行の dairiRate を更新（手動単価が設定されている行はそのまま維持）
    state.sections.forEach(sec => {
      sec.items.forEach(item => {
        item.dairiRate = mainRateVal;
        if (!item._dairiManual) {
          item.dairiUnitPrice = null;
        }
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

    _skipThresholdCheck = false; // 反映ボタン押下時に閾値チェックを再有効化
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
      markDirty();
      // アイテム行・仕様行・追加ボタン行をまとめて削除
      const tbody = block.querySelector('.items-tbody');
      tbody.querySelectorAll(`[data-item-id="${itemId}"]`).forEach(r => r.remove());
      updateSectionSubtotal(block);
      updateOutput();
    }
  }

  function scrollToMovedRow(block, itemId) {
    requestAnimationFrame(() => {
      const row = block.querySelector(`[data-item-id="${itemId}"]`);
      if (!row) return;
      // Walk up DOM to find the actual scrollable ancestor
      let container = null;
      let cur = row.parentElement;
      while (cur && cur !== document.documentElement) {
        const ov = window.getComputedStyle(cur).overflowY;
        if ((ov === 'auto' || ov === 'scroll') && cur.scrollHeight > cur.clientHeight) {
          container = cur;
          break;
        }
        cur = cur.parentElement;
      }
      if (!container) return;
      const toolbar = container.querySelector('.items-toolbar');
      const toolbarH = toolbar ? toolbar.offsetHeight : 0;
      const rowRect = row.getBoundingClientRect();
      const cRect   = container.getBoundingClientRect();
      // Convert viewport-relative rect to scroll-coordinate position
      const rowTopAbs    = rowRect.top    - cRect.top + container.scrollTop;
      const rowBottomAbs = rowRect.bottom - cRect.top + container.scrollTop;
      const visibleTop    = container.scrollTop + toolbarH;
      const visibleBottom = container.scrollTop + container.clientHeight;
      if (rowTopAbs < visibleTop + 8) {
        container.scrollTop = Math.max(0, rowTopAbs - toolbarH - 8);
      } else if (rowBottomAbs > visibleBottom - 8) {
        container.scrollTop = rowBottomAbs - container.clientHeight + 8;
      }
    });
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
    scrollToMovedRow(block, itemId);
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
    scrollToMovedRow(block, itemId);
  }

  // 全角数字・小数点・マイナスを半角に変換（変換があれば true を返す）
  function normalizeNumericInput(el) {
    const val = el.value;
    const converted = val.replace(/[０-９．，－]/g, ch => {
      const c = ch.charCodeAt(0);
      if (c >= 0xFF10 && c <= 0xFF19) return String.fromCharCode(c - 0xFEE0);
      if (c === 0xFF0E) return '.';
      if (c === 0xFF0C) return ',';
      if (c === 0xFF0D) return '-';
      return ch;
    });
    if (converted !== val) { el.value = converted; return true; }
    return false;
  }
  let _fullWidthToastTimer = null;
  function warnFullWidth() {
    clearTimeout(_fullWidthToastTimer);
    _fullWidthToastTimer = setTimeout(() => showToast('全角数字を半角に変換しました', 'warn'), 150);
  }

  /** 数量・単価変更 → 金額自動計算 */
  function onItemInput(e) {
    // IME composition 中（日本語変換中）はDOM更新をスキップ
    if (e.isComposing) return;
    if (normalizeNumericInput(e.target)) warnFullWidth();
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
    const bikouEl  = row.querySelector('.item-bikou');
    item.bikou     = bikouEl?.value || '';

    // 歩単（手動入力可）→ state に反映
    const houdanInputEl = row.querySelector('.item-houdan');
    if (houdanInputEl) {
      const v = parseFloat(houdanInputEl.value);
      item.houdan = isNaN(v) ? 0 : v;
      if (e.target === houdanInputEl) {
        item._genkaManual = false;      // houdan変更時はgenka自動計算に戻す
        item._unitPriceManual = false;  // houdan変更時はunitPrice自動計算に戻す
      }
    }

    item.unitPrice = priceEl?.value ? Number(priceEl.value.replace(/,/g, '')) : null;
    if (e.target === priceEl) {
      item._unitPriceManual = priceEl?.value ? priceEl.value.replace(/,/g, '').trim() !== '' : false;
    }

    // qty が変わった houdan > 0 の行がある場合、セクション内の④工事費・⑤その他を再計算
    if (e.target === qtyEl && (Number(item.houdan) || 0) > 0) {
      recalcKoujihiInSection(sec);
      // 再計算結果を DOM に反映
      const block2 = e.target.closest('.section-block');
      sec.items.forEach(koItem => {
        if (koItem.calcCategory !== '④工事費' && koItem.calcCategory !== '⑤その他'
            && koItem.calcCategory !== '⑥配管材料' && koItem.calcCategory !== '⑦支持具・雑材費') return;
        const koRow = block2?.querySelector(`[data-item-id="${koItem.id}"]`);
        if (!koRow) return;
        const koPriceEl      = koRow.querySelector('.item-price');
        const koGenkaEl      = koRow.querySelector('.item-genka');
        const koGenkaAmtEl   = koRow.querySelector('.item-genka-amount');
        const koAmountEl     = koRow.querySelector('.item-amount');
        const koGoukeiEl     = koRow.querySelector('.item-houkou-goukei');
        const koHoukouEl     = koRow.querySelector('.item-houkou');
        const koDairiEl      = koRow.querySelector('.item-dairi');
        if (koPriceEl    && koPriceEl    !== document.activeElement) koPriceEl.value  = koItem.unitPrice || '';
        if (koGenkaEl    && koGenkaEl    !== document.activeElement) koGenkaEl.value  = koItem.genka ? koItem.genka : '';
        if (koGenkaAmtEl) koGenkaAmtEl.textContent = koItem.genka ? (koItem.genka * (Number(koItem.qty) || 1)).toLocaleString('ja-JP') : '';
        if (koAmountEl   && koAmountEl   !== document.activeElement) koAmountEl.value = koItem.amount    || '';
        if (koGoukeiEl   && koGoukeiEl   !== document.activeElement) {
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
    } else if (e.target === priceEl && item.unitPrice === null) {
      // 単価を削除した場合、金額を0（空欄）にする
      item.amount = null;
      if (amountEl) amountEl.value = '';

      // 代理店単価のDOMの値をstateに保存（自動計算値を維持）
      const dairiUnitEl = row.querySelector('.item-dairi-unit');
      if (dairiUnitEl && !item._dairiManual) {
        const raw = dairiUnitEl.value.replace(/,/g, '').trim();
        if (raw !== '') {
          item.dairiUnitPrice = Number(raw) || null;
          item._dairiManual = true;
        }
      }
    } else if (e.target === amountEl) {
      item.amount = Number((amountEl?.value || '').replace(/,/g, '')) || 0;
      // 金額から単価を逆算（数量2以上で単価が入らない不具合対応）
      if (item.qty && item.amount) {
        item.unitPrice = Math.round(item.amount / item.qty);
        if (priceEl) priceEl.value = item.unitPrice.toLocaleString('ja-JP');
      } else if (!item.amount) {
        item.unitPrice = null;
        if (priceEl) priceEl.value = '';
      }
    }

    // 算出カテゴリ変更 → includeInLabor・gensuiEnabled表示を自動更新
    const calcCatEl = row.querySelector('.item-calc-cat');
    if (calcCatEl) {
      item.calcCategory = calcCatEl.value || '';
      if (e.target === calcCatEl) {
        item.includeInLabor = (item.calcCategory === '④工事費' || item.calcCategory === '⑤その他'
          || item.calcCategory === '⑥配管材料' || item.calcCategory === '⑦支持具・雑材費');
        const laborCheckEl2 = row.querySelector('.item-labor-check');
        if (laborCheckEl2) laborCheckEl2.checked = item.includeInLabor;
        // gensuiEnabledチェックボックスの表示切り替え
        const gensuiEnabledEl2 = row.querySelector('.item-gensui-enabled');
        if (gensuiEnabledEl2) {
          gensuiEnabledEl2.style.display = (item.calcCategory === '④工事費' || item.calcCategory === '⑤その他'
            || item.calcCategory === '⑥配管材料' || item.calcCategory === '⑦支持具・雑材費') ? '' : 'none';
        }
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
    }

    // 掛率変更時: 手動上書きがない場合のみ代理店単価を再計算
    if (e.target === dairiRateEl && !item._dairiManual) {
      item.dairiUnitPrice = null;
      const dairiUnitElR = row.querySelector('.item-dairi-unit');
      if (dairiUnitElR) {
        dairiUnitElR.classList.remove('is-manual');
        const dairiUnitLockR = row.querySelector('.btn-dairi-unit-lock');
        if (dairiUnitLockR) dairiUnitLockR.style.display = 'none';
        const newUnit = effectiveDairiUnit(item);
        dairiUnitElR.value = newUnit != null ? Number(newUnit).toLocaleString('ja-JP') : '';
        delete dairiUnitElR.dataset.dirty;
      }
    }

    // 代理店単価（手動入力時は item.dairiUnitPrice にセット）
    const dairiUnitEl2  = row.querySelector('.item-dairi-unit');
    const dairiUnitLock2 = row.querySelector('.btn-dairi-unit-lock');
    if (dairiUnitEl2 && e.target === dairiUnitEl2) {
      dairiUnitEl2.dataset.dirty = '1';
      const raw = dairiUnitEl2.value.replace(/,/g, '').trim();
      if (raw === '') {
        // 空欄 → 手動解除（自動計算に戻す）
        item.dairiUnitPrice = null;
        item._dairiManual   = false;
        dairiUnitEl2.classList.remove('is-manual');
        if (dairiUnitLock2) dairiUnitLock2.style.display = 'none';
      } else {
        item.dairiUnitPrice = Number(raw) || 0;
        item._dairiManual   = true;
        // 代理店単価を手動入力したら、最終代理店単価をクリア（代理店単価を優先）
        item.finalDairiUnit = null;
        dairiUnitEl2.classList.add('is-manual');
        if (dairiUnitLock2) dairiUnitLock2.style.display = '';
        // 最終代理店単価のロック表示も更新
        const finalDairiInputEl = row.querySelector('.item-final-dairi');
        const finalDairiLockEl = row.querySelector('.btn-final-dairi-lock');
        if (finalDairiInputEl) finalDairiInputEl.classList.remove('is-manual');
        if (finalDairiLockEl) finalDairiLockEl.style.display = 'none';
      }
    }

    // 最終代理店単価（手動入力時は item.finalDairiUnit にセット）
    const finalDairiInputEl  = row.querySelector('.item-final-dairi');
    const finalDairiLockEl   = row.querySelector('.btn-final-dairi-lock');
    if (finalDairiInputEl && e.target === finalDairiInputEl) {
      const raw = finalDairiInputEl.value.replace(/,/g, '').trim();
      if (raw === '') {
        item.finalDairiUnit = null;
        finalDairiInputEl.classList.remove('is-manual');
        if (finalDairiLockEl) finalDairiLockEl.style.display = 'none';
      } else {
        item.finalDairiUnit = Number(raw) || 0;
        finalDairiInputEl.classList.add('is-manual');
        if (finalDairiLockEl) finalDairiLockEl.style.display = '';
      }
    }

    // 代理店価格スパン更新（最終代理店単価 × 数量）
    const dairiEl = row.querySelector('.item-dairi');
    if (dairiEl) {
      const qty     = Number(item.qty) || 1;
      const dUnit   = effectiveFinalDairiUnit(item);
      const dairiAmt = dUnit != null ? dUnit * qty : null;
      dairiEl.textContent = dairiAmt != null ? dairiAmt.toLocaleString('ja-JP') : '';
    }

    // 値引き（物販のみ）
    const buhanDiscEl = row.querySelector('.item-buhan-discount');
    if (buhanDiscEl && e.target === buhanDiscEl) {
      const raw = buhanDiscEl.value.replace(/,/g, '').trim();
      item.buhanDiscount = raw === '' ? null : (Number(raw) || 0);
    }
    // 販売価格スパン更新（代理店価格 - 値引き）
    const hanbaikaEl = row.querySelector('.item-hanbaika');
    if (hanbaikaEl) {
      const fUnit = effectiveFinalDairiUnit(item);
      const dairiAmt = fUnit != null ? fUnit * (Number(item.qty) || 1) : null;
      const disc = item.buhanDiscount != null ? item.buhanDiscount : 0;
      hanbaikaEl.textContent = dairiAmt != null ? (dairiAmt - disc).toLocaleString('ja-JP') : '';
    }

    // 原価（手動入力可）→ state に反映
    const genkaInputEl = row.querySelector('.item-genka');
    if (genkaInputEl) {
      item.genka = Number((genkaInputEl.value || '').replace(/,/g, '')) || 0;
      if (e.target === genkaInputEl) {
        // ユーザーが直接編集 → 手動フラグをセット（空欄にしたらリセット）
        item._genkaManual = genkaInputEl.value.replace(/,/g, '').trim() !== '';
      }
    }

    // 減衰A・減衰B（手動入力可）→ state に反映
    const gensuiAInputEl = row.querySelector('.item-gensui-a');
    const gensuiBInputEl = row.querySelector('.item-gensui-b');
    if (gensuiAInputEl) item.gensuiA = parseFloat(gensuiAInputEl.value) || 0;
    if (gensuiBInputEl) item.gensuiB = parseFloat(gensuiBInputEl.value) || 0;

    // 減衰計算チェックボックス（④工事費行ごと）
    const gensuiEnabledEl = row.querySelector('.item-gensui-enabled');
    if (gensuiEnabledEl) item.gensuiEnabled = gensuiEnabledEl.checked;

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

      if (item.calcCategory === '④工事費' || item.calcCategory === '⑤その他'
          || item.calcCategory === '⑥配管材料' || item.calcCategory === '⑦支持具・雑材費') {
        // ④工事費行の場合、手入力値を基底歩工（houdan）として保存→gensuiEnabled再計算に使う
        if (item.calcCategory === '④工事費') item.houdan = goukei;
        // ④工事費・⑤その他行を直接編集：歩工合計 → 単価・金額を再計算
        if (goukei > 0) {
          item._unitPriceManual = false; // 歩工合計直接編集時はunitPrice自動計算に戻す
          item.unitPrice = Math.round(RODO_TANKA * goukei / 1000) * 1000;
          item._genkaManual = false; // 歩工合計直接編集時はgenka自動計算に戻す
          item.genka     = Math.round(RODO_GENKA  * goukei / 1000) * 1000;
        }
        item.amount = (item.unitPrice || 0) * (Number(item.qty) || 1);
        if (priceEl)  priceEl.value  = item.unitPrice ? item.unitPrice.toLocaleString('ja-JP') : '';
        if (amountEl) amountEl.value = item.amount ? item.amount.toLocaleString('ja-JP') : '';
        const dairiEl2 = row.querySelector('.item-dairi');
        if (dairiEl2) {
          const qty2     = Number(item.qty) || 1;
          const dUnit2   = effectiveDairiUnit(item);
          dairiEl2.textContent = dUnit2 != null ? (dUnit2 * qty2).toLocaleString('ja-JP') : '';
        }
      } else if ((Number(item.houdan) || 0) > 0) {
        // houdan行の歩工合計を手動変更 → セクション内の④工事費を再計算してDOM更新
        recalcKoujihiInSection(sec);
        const block2 = e.target.closest('.section-block');
        sec.items.forEach(koItem => {
          if (koItem.calcCategory !== '④工事費' && koItem.calcCategory !== '⑤その他'
              && koItem.calcCategory !== '⑥配管材料' && koItem.calcCategory !== '⑦支持具・雑材費') return;
          const koRow = block2?.querySelector(`[data-item-id="${koItem.id}"]`);
          if (!koRow) return;
          const koPriceEl    = koRow.querySelector('.item-price');
          const koGenkaEl    = koRow.querySelector('.item-genka');
          const koGenkaAmtEl = koRow.querySelector('.item-genka-amount');
          const koAmountEl   = koRow.querySelector('.item-amount');
          const koGoukeiEl   = koRow.querySelector('.item-houkou-goukei');
          const koHoukouEl   = koRow.querySelector('.item-houkou');
          const koDairiEl    = koRow.querySelector('.item-dairi');
          if (koPriceEl    && koPriceEl    !== document.activeElement) koPriceEl.value  = koItem.unitPrice ? koItem.unitPrice.toLocaleString('ja-JP') : '';
          if (koGenkaEl    && koGenkaEl    !== document.activeElement) koGenkaEl.value  = koItem.genka ? koItem.genka : '';
          if (koGenkaAmtEl) koGenkaAmtEl.textContent = koItem.genka ? (koItem.genka * (Number(koItem.qty) || 1)).toLocaleString('ja-JP') : '';
          if (koAmountEl   && koAmountEl   !== document.activeElement) koAmountEl.value = koItem.amount ? koItem.amount.toLocaleString('ja-JP') : '';
          if (koGoukeiEl   && koGoukeiEl   !== document.activeElement) {
            koGoukeiEl.value = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
          }
          if (koHoukouEl) {
            koHoukouEl.textContent = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
          }
          if (koDairiEl) {
            const koQty2   = Number(koItem.qty) || 1;
            const koDUnit  = effectiveDairiUnit(koItem);
            koDairiEl.textContent = koDUnit != null ? (koDUnit * koQty2).toLocaleString('ja-JP') : '';
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
      const kubunFallback = GENSUI_KUBUN_PARAMS[kubun];
      if (master && master.gensuiA > 0 && master.gensuiB > 0) {
        item.gensuiA      = master.gensuiA;
        item.gensuiB      = master.gensuiB;
        item.kojiCategory = master.kojiCategory;
      } else if (kubunFallback) {
        item.gensuiA      = kubunFallback.A;
        item.gensuiB      = kubunFallback.b;
        item.kojiCategory = master ? master.kojiCategory : '';
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

    // 減衰A・B・区分・減衰計算チェック・カテゴリ変更・歩単変更 → 再計算
    const isGensuiChange = e.target.classList.contains('item-gensui-kubun')
      || e.target.classList.contains('item-gensui-a')
      || e.target.classList.contains('item-gensui-b')
      || e.target.classList.contains('item-gensui-enabled')
      || e.target.classList.contains('item-calc-cat')
      || e.target.classList.contains('item-houdan');
    if (isGensuiChange) {
      recalcKoujihiInSection(sec);
      const block2 = e.target.closest('.section-block');
      sec.items.forEach(koItem => {
        if (koItem.calcCategory !== '④工事費' && koItem.calcCategory !== '⑤その他'
            && koItem.calcCategory !== '⑥配管材料' && koItem.calcCategory !== '⑦支持具・雑材費') return;
        const koRow = block2?.querySelector(`[data-item-id="${koItem.id}"]`);
        if (!koRow) return;
        const koPriceEl    = koRow.querySelector('.item-price');
        const koGenkaEl    = koRow.querySelector('.item-genka');
        const koGenkaAmtEl = koRow.querySelector('.item-genka-amount');
        const koAmountEl   = koRow.querySelector('.item-amount');
        const koGoukeiEl   = koRow.querySelector('.item-houkou-goukei');
        const koHoukouEl   = koRow.querySelector('.item-houkou');
        const koDairiEl    = koRow.querySelector('.item-dairi');
        if (koPriceEl    && koPriceEl    !== document.activeElement) koPriceEl.value  = koItem.unitPrice ? koItem.unitPrice.toLocaleString('ja-JP') : '';
        if (koGenkaEl    && koGenkaEl    !== document.activeElement) koGenkaEl.value  = koItem.genka ? koItem.genka : '';
        if (koGenkaAmtEl) koGenkaAmtEl.textContent = koItem.genka ? (koItem.genka * (Number(koItem.qty) || 1)).toLocaleString('ja-JP') : '';
        if (koAmountEl   && koAmountEl   !== document.activeElement) koAmountEl.value = koItem.amount    ? koItem.amount.toLocaleString('ja-JP')    : '';
        if (koGoukeiEl   && koGoukeiEl   !== document.activeElement) koGoukeiEl.value = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
        if (koHoukouEl) koHoukouEl.textContent = koItem.houkouGoukei ? koItem.houkouGoukei.toFixed(2) : '';
        if (koDairiEl) {
          const koQty3 = Number(koItem.qty) || 1;
          let koDairiAmt2 = null;
          if (koItem.dairiUnitPrice != null) {
            koDairiAmt2 = koItem.dairiUnitPrice * koQty3;
          } else {
            const rate = koItem.dairiRate ?? state.mainRate;
            if (rate != null && koItem.unitPrice != null) koDairiAmt2 = Math.round(koItem.unitPrice * rate) * koQty3;
          }
          koDairiEl.textContent = koDairiAmt2 != null ? koDairiAmt2.toLocaleString('ja-JP') : '';
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

    // 物販・作業のみ機器仕様ボタンを表示
    const cat = state.quoteCategory || '';
    const showMachineBtn = cat.includes('物販') || cat.includes('作業');
    container.classList.toggle('show-machine-spec-btn', showMachineBtn);

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

      const secBikouInput = block.querySelector('.section-bikou-input');
      if (secBikouInput && secBikouInput !== document.activeElement) {
        const bv = sec.bikou || '';
        if (secBikouInput.value !== bv) secBikouInput.value = bv;
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

    // state 更新 + 折りたたみ反映（ドロップダウン選択・直接入力共通）
    const applyName = (value) => {
      const s = state.sections.find(s => s.id === sec.id);
      if (s) {
        s.name = value;
        updateCollapsedInfo(sec.id, block);
      }
    };

    // 大項目名入力（テキスト）→ 絞り込みドロップダウン表示
    nameInput.addEventListener('input', () => {
      applyName(nameInput.value);
      openNameDropdown(nameInput, nameInput.value, applyName);
    });

    // フォーカス取得 or クリック: 全候補を表示
    const showAll = () => openNameDropdown(nameInput, '', applyName);
    nameInput.addEventListener('focus', showAll);
    nameInput.addEventListener('click', showAll);

    // フォーカスを外したら閉じる
    nameInput.addEventListener('blur', () => {
      setTimeout(() => closeNameDropdown(nameInput), 150);
    });

    // Escape で閉じる
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNameDropdown(nameInput);
    });

    // 式数入力 → state 更新
    const secQtyInput = block.querySelector('.section-qty-input');
    if (secQtyInput) {
      secQtyInput.addEventListener('input', () => {
        if (normalizeNumericInput(secQtyInput)) warnFullWidth();
        const s = state.sections.find(s => s.id === sec.id);
        if (s) {
          s.secQty = Math.max(1, Number(secQtyInput.value) || 1);
          updateSectionSubtotal(block);
        }
      });
    }

    // 備考入力 → state 更新
    const secBikouInput = block.querySelector('.section-bikou-input');
    if (secBikouInput) {
      secBikouInput.addEventListener('input', () => {
        const s = state.sections.find(s => s.id === sec.id);
        if (s) s.bikou = secBikouInput.value;
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

    // 削除: item-row と対応する spec-master-row も一緒に削除
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        tbody.querySelector(`.item-row[data-item-id="${id}"]`)?.remove();
        tbody.querySelector(`.spec-master-row[data-item-id="${id}"]`)?.remove();
      }
    });
    // 孤立した spec-master-row を除去（念のため）
    tbody.querySelectorAll('.spec-master-row').forEach(r => {
      if (!newIds.has(Number(r.dataset.itemId))) r.remove();
    });

    // 追加・更新
    sec.items.forEach(item => {
      let row = tbody.querySelector(`.item-row[data-item-id="${item.id}"]`);
      if (!row) {
        row = createItemRowDOM(item);
        tbody.appendChild(row);
        // 商品アイテムまたは機器仕様・型式があるアイテムには機器仕様マスタ行を追加（工事カテゴリは非表示）
        if ((item.productId || item.machineSpec || item.specMasterContent || item.model || item.spec) && !(state.quoteCategory || '').includes('工事')) {
          const spmRow = createSpecMasterRowDOM(item);
          row.insertAdjacentElement('afterend', spmRow);
          if (item.productId && !item.specMasterLoaded) {
            loadItemSpecMaster(item).then(() => updateSpecMasterRow(item.id));
          } else {
            if (!item.specMasterLoaded) item.specMasterLoaded = true;
            updateSpecMasterRow(item.id);
          }
        }
      } else if (!row.dataset.dragReady) {
        row.draggable = true;
        attachDragEvents(row);
        row.dataset.dragReady = '1';
      }
      // フォーカス中の行は上書きしない
      if (![...row.querySelectorAll('input,select')].some(el => el === document.activeElement)) {
        row.querySelector('.item-name').value   = item.name;
        row.querySelector('.item-spec').value   = item.spec;
        const productCodeEl = row.querySelector('.item-product-code');
        if (productCodeEl) productCodeEl.textContent = item.productCode || '';
        row.querySelector('.item-qty').value    = item.qty;
        row.querySelector('.item-unit').value   = item.unit || '';
        row.querySelector('.item-price').value  = item.unitPrice != null ? Number(item.unitPrice).toLocaleString('ja-JP') : '';
        row.querySelector('.item-amount').value = item.amount ? Number(item.amount).toLocaleString('ja-JP') : '';
        const bikouEl2 = row.querySelector('.item-bikou');
        if (bikouEl2) bikouEl2.value = item.bikou || '';
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
      // SABCランクセレクタの反映
      const rankEl = row.querySelector('.item-price-rank');
      if (rankEl && rankEl !== document.activeElement) {
        rankEl.value = item.priceRank || '';
      }
      // 代理店単価の反映
      const dairiUnitEl   = row.querySelector('.item-dairi-unit');
      const dairiUnitLock = row.querySelector('.btn-dairi-unit-lock');
      if (dairiUnitEl && dairiUnitEl !== document.activeElement) {
        // dairiUnitPriceが設定されていれば手動扱い（_dairiManualが古いデータでfalseの場合も対応）
        const isManual    = item.dairiUnitPrice != null || item._dairiManual === true;
        if (isManual && !item._dairiManual) item._dairiManual = true; // 状態を同期
        const displayUnit = effectiveDairiUnit(item);
        dairiUnitEl.value = displayUnit != null ? Number(displayUnit).toLocaleString('ja-JP') : '';
        const isAutoRounded = state.roundingEnabled && !isManual;
        dairiUnitEl.classList.toggle('is-manual',       isManual);
        dairiUnitEl.classList.toggle('is-auto-rounded', isAutoRounded && displayUnit != null);
        if (dairiUnitLock) dairiUnitLock.style.display = isManual ? '' : 'none';
      }
      // 代理店価格の反映（最終代理店単価 × 数量）
      const dairiEl = row.querySelector('.item-dairi');
      if (dairiEl) {
        const qty = Number(item.qty) || 1;
        const dUnit = effectiveFinalDairiUnit(item);
        const dairiAmt = dUnit != null ? dUnit * qty : null;
        dairiEl.textContent = dairiAmt != null ? dairiAmt.toLocaleString('ja-JP') : '';
      }

      // 最終代理店単価の反映
      const finalDairiInputEl2 = row.querySelector('.item-final-dairi');
      const finalDairiLockEl2  = row.querySelector('.btn-final-dairi-lock');
      if (finalDairiInputEl2 && finalDairiInputEl2 !== document.activeElement) {
        const isManualF = item.finalDairiUnit != null;
        const displayF  = effectiveFinalDairiUnit(item);
        finalDairiInputEl2.value = displayF != null ? Number(displayF).toLocaleString('ja-JP') : '';
        finalDairiInputEl2.classList.toggle('is-manual', isManualF);
        if (finalDairiLockEl2) finalDairiLockEl2.style.display = isManualF ? '' : 'none';
      }

      // 値引き・販売価格の反映（物販のみ）
      const buhanDiscEl2 = row.querySelector('.item-buhan-discount');
      const hanbaikaEl2  = row.querySelector('.item-hanbaika');
      if (buhanDiscEl2 && buhanDiscEl2 !== document.activeElement) {
        buhanDiscEl2.value = item.buhanDiscount != null ? Number(item.buhanDiscount).toLocaleString('ja-JP') : '';
      }
      if (hanbaikaEl2) {
        const fUnit2 = effectiveFinalDairiUnit(item);
        const dairiAmt2 = fUnit2 != null ? fUnit2 * (Number(item.qty) || 1) : null;
        const disc2 = item.buhanDiscount != null ? item.buhanDiscount : 0;
        hanbaikaEl2.textContent = dairiAmt2 != null ? (dairiAmt2 - disc2).toLocaleString('ja-JP') : '';
      }

      // 原価・原価合計の反映
      const genkaEl       = row.querySelector('.item-genka');
      const genkaAmtEl    = row.querySelector('.item-genka-amount');
      const genka    = Number(item.genka) || 0;
      const genkaAmt = genka * (Number(item.qty) || 1);
      if (genkaEl    && genkaEl    !== document.activeElement) genkaEl.value = genka ? genka : '';
      if (genkaAmtEl) genkaAmtEl.textContent = genkaAmt ? genkaAmt.toLocaleString('ja-JP') : '';

      // 減衰計算チェックボックス（④工事費・⑤その他・⑥⑦行のみ表示）
      const gensuiEnabledEl = row.querySelector('.item-gensui-enabled');
      if (gensuiEnabledEl) {
        gensuiEnabledEl.checked = item.gensuiEnabled || false;
        gensuiEnabledEl.style.display = (item.calcCategory === '④工事費' || item.calcCategory === '⑤その他'
          || item.calcCategory === '⑥配管材料' || item.calcCategory === '⑦支持具・雑材費') ? '' : 'none';
      }

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
      if (houdanEl && houdanEl !== document.activeElement) houdanEl.value = houdanNum !== 0 ? houdanNum.toFixed(2) : '';
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

    // 順序修正＋仕様行・機器仕様マスタ行を各アイテム行の直後に挿入
    const fragment = document.createDocumentFragment();
    let displayNo = 1;
    sec.items.forEach((item) => {
      const itemRow = tbody.querySelector(`.item-row[data-item-id="${item.id}"]`);
      if (itemRow) {
        const numEl = itemRow.querySelector('.item-row-num');
        if (item.isNetsukiHeader) {
          if (numEl) numEl.textContent = '';
        } else {
          if (numEl) numEl.textContent = displayNo++;
        }
        fragment.appendChild(itemRow);
      }
      // 機器仕様マスタ行（item-row の直後）
      const spmRow = tbody.querySelector(`.spec-master-row[data-item-id="${item.id}"]`);
      if (spmRow) fragment.appendChild(spmRow);
      // 説明文行
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
    const secQty   = Number(s.secQty) || 1;
    const nameStr  = s.name ? `${s.name}　` : '';
    const qtyStr   = secQty !== 1 ? `${secQty}式　` : '';
    const totalStr = secQty !== 1
      ? `　合計: ¥${(subtotal * secQty).toLocaleString('ja-JP')}`
      : '';
    let dairiStr = '';
    if (state.mainRate != null) {
      const dairiSub = s.items.reduce((sum, i) => {
        const u = effectiveDairiUnit(i);
        return sum + (u != null ? u * (Number(i.qty) || 1) : 0);
      }, 0);
      const dairiTotal = dairiSub * secQty;
      dairiStr = secQty !== 1
        ? `　代理店小計: ¥${dairiSub.toLocaleString('ja-JP')}　代理店合計: ¥${dairiTotal.toLocaleString('ja-JP')}`
        : `　代理店: ¥${dairiSub.toLocaleString('ja-JP')}`;
    }
    info.textContent = `${nameStr}${qtyStr}${count}行　小計: ¥${subtotal.toLocaleString('ja-JP')}${totalStr}${dairiStr}`;
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

  // ── オートスクロール ──────────────────────────────────────────
  let _asRaf = null;
  let _asClientY = 0;
  let _asContainer = null;
  const AS_ZONE = 50;   // エッジからこの距離以内でスクロール開始 (px)
  const AS_MAX  = 12;   // 1フレームあたりの最大スクロール量 (px)

  function _findScrollContainer(el) {
    while (el && el !== document.documentElement) {
      const ov = window.getComputedStyle(el).overflowY;
      if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > el.clientHeight) return el;
      el = el.parentElement;
    }
    return null;
  }

  function _autoScrollStep() {
    if (!_asContainer) return;
    const rect = _asContainer.getBoundingClientRect();  // 毎フレーム再取得
    let speed = 0;
    if (_asClientY >= rect.top && _asClientY < rect.top + AS_ZONE) {
      speed = -Math.ceil((1 - (_asClientY - rect.top) / AS_ZONE) * AS_MAX);
    } else if (_asClientY > rect.bottom - AS_ZONE && _asClientY <= rect.bottom) {
      speed = Math.ceil((1 - (rect.bottom - _asClientY) / AS_ZONE) * AS_MAX);
    }
    if (speed !== 0) _asContainer.scrollTop += speed;
    _asRaf = requestAnimationFrame(_autoScrollStep);
  }

  function _onAsMove(e) {
    if (e.clientY) _asClientY = e.clientY;  // clientY=0 は無視（drag イベントの誤値対策）
  }

  function _stopAutoScroll() {
    if (_asRaf) { cancelAnimationFrame(_asRaf); _asRaf = null; }
    _asContainer = null;
    document.removeEventListener('dragover', _onAsMove);
    document.removeEventListener('mousemove', _onAsMove);
    document.removeEventListener('mouseup',   _stopAutoScroll);
  }

  function _startAutoScroll(el) {
    // 前のループが残っていれば必ずキャンセル
    if (_asRaf) { cancelAnimationFrame(_asRaf); _asRaf = null; }
    document.removeEventListener('dragover', _onAsMove);
    document.removeEventListener('mousemove', _onAsMove);
    document.removeEventListener('mouseup',   _stopAutoScroll);

    _asContainer = _findScrollContainer(el);
    if (!_asContainer) return;

    // dragover（HTML5 drag）と mousemove 両方でカーソル位置を追跡
    document.addEventListener('dragover', _onAsMove);
    document.addEventListener('mousemove', _onAsMove);
    // mouseup でドラッグ強制終了時も確実に停止
    document.addEventListener('mouseup',   _stopAutoScroll);

    _asRaf = requestAnimationFrame(_autoScrollStep);
  }
  // ─────────────────────────────────────────────────────────────

  function attachDragEvents(row) {
    row.addEventListener('dragstart', e => {
      dragSrcRow = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', row.dataset.itemId);
      _startAutoScroll(row);
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      row.closest('.items-tbody')?.querySelectorAll('.item-row').forEach(r => {
        r.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      dragSrcRow = null;
      _stopAutoScroll();
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
      <td class="spec-line-td" colspan="13">
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
      <td colspan="14" class="spec-add-td">
        <button class="btn-spec-add" onclick="app.addSpecLine(this)">＋ 説明文</button>
        <button class="btn-spec-template" onclick="app.showSpecTemplateMenu(this)">📋 説明テンプレート</button>
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
      if (!user) return;

      state.currentUserId   = user.id;
      state.currentUserName = user.full_name || '';

      // getCurrentUser はカスタムフィールドを返さないため、getRecord で取得
      let deptCode = '';
      try {
        const detail = await ZOHO.CRM.API.getRecord({ Entity: 'users', RecordID: user.id });
        const rec = detail?.users?.[0] || detail?.data?.[0];
        const rawDprt = rec?.dprt_cd;
        console.log('[loadCurrentUser] dprt_cd raw:', rawDprt, '| type:', typeof rawDprt);
        // dprt_cd がオブジェクト（ルックアップ）の場合は中のコード/名前で照合
        if (rawDprt && typeof rawDprt === 'object') {
          const byCode = DEPT_LIST.find(d => d.code === String(rawDprt.id || '').trim() || d.name === String(rawDprt.name || '').trim());
          deptCode = byCode ? byCode.code : String(rawDprt.id || rawDprt.name || '').trim();
        } else {
          const raw = String(rawDprt || '').trim();
          // コードで直接照合、なければ名前で照合
          const byCode = DEPT_LIST.find(d => d.code === raw);
          const byName = DEPT_LIST.find(d => d.name === raw);
          deptCode = byCode ? byCode.code : (byName ? byName.code : raw);
        }
        console.log('[loadCurrentUser] resolved deptCode:', deptCode);
      } catch(e2) { console.warn('getRecord(users) error:', e2); }

      // 作成所課はQuotes.field15から設定するため、ユーザー所課は使わない
      // 所課コードが確定したタイミングでFRP掛率・送料マスタをロード
      await loadFrpRates(state.createDeptCode);
      await loadSoryoMaster(state.createDeptCode);
    } catch(e) { console.warn('getCurrentUser error:', e); }
  }

  /** FRP掛率マスタを CRM FRP1 モジュールからロードする
   *  優先1: 所課コード（field1）で検索 ← 確実
   *  優先2: Quotes.field15 の所課名（field）で検索 ← コード未確定時
   */
  async function loadFrpRates(deptCode) {
    const shokaName = state.shoka || '';  // Quotes.field15 の所課名
    // CRM未接続 または所課が未確定 → ハードコードをフォールバックとして使用
    if (!zohoReady || (!shokaName && !deptCode)) {
      if (!state.frpAreaRates.length) state.frpAreaRates = FRP_AREA_RATES;
      if (state.frpMode) updateFrpAreaUI();
      return;
    }
    try {
      // 所課コードが確定していればfield1で検索、なければ所課名で検索
      const query = deptCode
        ? `(field1:equals:${deptCode})`
        : `(field:equals:${shokaName})`;
      const label = deptCode || shokaName;

      const res = await ZOHO.CRM.API.searchRecord({
        Entity:   'FRP1',
        Type:     'criteria',
        Query:    query,
        page:     1,
        per_page: 200,
      });
      const records = res?.data || [];
      if (records.length === 0) {
        // CRM接続中にレコードなし → 空配列（誤った所課のデータを混入させない）
        console.warn(`[FRP] 掛率マスタ: 所課「${label}」のレコードなし`);
        state.frpAreaRates = [];
      } else {
        state.frpAreaRates = records.map(r => ({
          code:       r.field2 || '',
          dealerName: r.field3 || '',
          area:       [r.field4, r.field5].filter(x => x && x !== '-').join(' ') || '',
          p1:  Number(r.p1)  || 0,
          p2:  Number(r.p2)  || 0,
          b1:  Number(r.b1)  || 0,
          b2:  Number(r.b2)  || 0,
          b3:  Number(r.b3)  || 0,
          w1:  Number(r.w1)  || 0,
          w2:   Number(r.w2)    || 0,
          opt:  Number(r.opt)   || 0,
          opt2: Number(r.opt_2) || 0,
        }));
        console.log(`[FRP] 掛率マスタ読み込み完了: ${state.frpAreaRates.length}件 (所課「${label}」)`);
        // 所課コードが未確定かつfield15（所課）も未設定の場合のみ、FRP1.field1 から逆引きして createDept を更新
        const derivedCode = String(records[0].field1 || '').trim();
        if (!state.createDeptCode && !state.shoka && derivedCode) {
          state.createDeptCode = derivedCode;
          const createEl = document.getElementById('createDept');
          if (createEl && createEl.value !== derivedCode) {
            createEl.value = derivedCode;
            console.log('[FRP] createDeptCode を FRP1.field1 から取得:', derivedCode);
          }
        }
      }
    } catch(e) {
      console.warn('[FRP] 掛率マスタ読み込み失敗:', e);
      if (!state.frpAreaRates.length) state.frpAreaRates = FRP_AREA_RATES;
    }
    // FRPモード中なら代理店ドロップダウンを更新
    if (state.frpMode) updateFrpAreaUI();
  }

  /** CustomModule33 レコードを選択項目名順に整形して返す */
  function _parseSoryoRecords(records) {
    return SORYO_ORDER
      .map(name => {
        const r = records.find(rec => rec.field4 === name);
        if (!r) return null;
        return {
          name:  name,
          line1: String(r.field2 || ''),
          line2: String(r.field5 || ''),
          line3: String(r.field6 || ''),
          price: Number(r.field3) || 0,
        };
      })
      .filter(Boolean);
  }

  /** 送料マスタを CRM CustomModule33 からロードする
   *  優先1: 所課コード（field1）で検索
   *  優先2: 所課名「標準」（field）で検索（所課別データなし時のフォールバック）
   */
  async function loadSoryoMaster(deptCode) {
    if (!zohoReady) { state.soryoMaster = []; return; }
    try {
      // 所課コードが確定していれば所課別データを優先取得
      if (deptCode) {
        const res = await ZOHO.CRM.API.searchRecord({
          Entity:   'CustomModule33',
          Type:     'criteria',
          Query:    `(field1:equals:${deptCode})`,
          page:     1,
          per_page: 50,
        });
        const records = res?.data || [];
        if (records.length > 0) {
          state.soryoMaster = _parseSoryoRecords(records);
          console.log('[Soryo] 所課別マスタ読み込み完了:', state.soryoMaster.length + '件 (所課「' + deptCode + '」)');
          return;
        }
        console.log('[Soryo] 所課「' + deptCode + '」のレコードなし → 標準にフォールバック');
      }
      // フォールバック: 所課名「標準」で検索
      const resDef = await ZOHO.CRM.API.searchRecord({
        Entity:   'CustomModule33',
        Type:     'criteria',
        Query:    '(field:equals:標準)',
        page:     1,
        per_page: 50,
      });
      const defRecords = resDef?.data || [];
      if (defRecords.length > 0) {
        state.soryoMaster = _parseSoryoRecords(defRecords);
        console.log('[Soryo] 標準マスタ読み込み完了:', state.soryoMaster.length + '件');
      } else {
        console.warn('[Soryo] 標準マスタも見つかりません');
        state.soryoMaster = [];
      }
    } catch(e) {
      console.warn('[Soryo] マスタ取得エラー:', e);
      state.soryoMaster = [];
    }
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
    const menuMinWidth = 300;
    const left = Math.min(btnRect.left, window.innerWidth - menuMinWidth - 8);
    menu.style.left = Math.max(0, left) + 'px';
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
    html += '<button class="stm-save-btn">💾 現在の説明文を保存</button>';
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

  const DEPT_LIST = [
    { code: '15',  name: '札幌営業所',     hz: '50Hz' },
    { code: '19',  name: '仙台営業所',     hz: '50Hz' },
    { code: '17',  name: '盛岡出張所',     hz: '50Hz' },
    { code: '28',  name: 'さいたま営業所', hz: '50Hz' },
    { code: '32',  name: '南関東営業所',   hz: '50Hz' },
    { code: '37',  name: '新潟営業所',     hz: '50Hz' },
    { code: '36',  name: '松本営業所',     hz: '50Hz' },
    { code: '43',  name: '静岡営業所' },
    { code: '44',  name: '名古屋営業所',   hz: '60Hz' },
    { code: '51',  name: '大阪営業所',     hz: '60Hz' },
    { code: '61',  name: '広島営業所',     hz: '60Hz' },
    { code: '66',  name: '高松営業所',     hz: '60Hz' },
    { code: '68',  name: '高知営業所',     hz: '60Hz' },
    { code: '70',  name: '福岡営業所',     hz: '60Hz' },
    { code: '73',  name: '長崎営業所',     hz: '60Hz' },
    { code: '75',  name: '熊本営業所',     hz: '60Hz' },
    { code: '79',  name: '熊本SC',         hz: '60Hz' },
    { code: '76',  name: '南九州営業所',   hz: '60Hz' },
    { code: '77',  name: '鹿児島営業所',   hz: '60Hz' },
    { code: '97',  name: '営業サービス統括部' },
    { code: '990', name: '経営企画室' },
    { code: '99',  name: 'その他' },
    { code: '991', name: '【ダミー】開発部' },
  ];

  function populateQuoteDeptSelects() {
    const deptOpts = DEPT_LIST
      .map(d => `<option value="${escHtml(d.code)}" data-name="${escHtml(d.name)}">${escHtml(d.code)}：${escHtml(d.name)}</option>`)
      .join('');
    const opts = '<option value="">― 選択 ―</option>' +
      '<option value="00" data-name="">00：（未指定）</option>' +
      deptOpts;
    const createEl = document.getElementById('createDept');
    const siteEl   = document.getElementById('siteDept');
    if (createEl) {
      createEl.innerHTML = opts;
      if (state.createDeptCode) createEl.value = state.createDeptCode;
      createEl.onchange = async function() {
        const code = createEl.value;
        state.createDeptCode = code;
        const entry = DEPT_LIST.find(d => d.code === code);
        state.shoka = entry ? entry.name : '';
        // 所課変更時は代理店・エリアをリセットして再ロード
        state.frpDealerCode = null;
        state.frpArea       = null;
        state.frpAreaRates  = [];
        await loadFrpRates(code);
        await loadSoryoMaster(code);
        markDirty();
      };
    }
    if (siteEl) {
      siteEl.innerHTML = opts;
      siteEl.value = state.siteDeptCode || '00';
    }
  }

  async function loadAllTemplates() {
    if (!zohoReady) return;
    try {
      const data = await fetchAllRecords('CustomModule8', 'Name');
      state.templateList   = [];
      state.setProductList = [];
      data.filter(r => r.JSON).forEach(r => {
        let parsed = null;
        try { parsed = JSON.parse(r.JSON); } catch(e) {}
        const entry = {
          id:          r.id,
          name:        r.Name || '',
          type:        r.field17 || '',
          deptId:      r.field21?.id   || '',
          deptName:    r.field21?.name || '',
          description: parsed?.description || r.Description || '',
          data:        parsed,
          pdfJson:     r.PDFJSON || null,
        };
        if (parsed?.isSetProduct) {
          state.setProductList.push(entry);
        } else {
          state.templateList.push(entry);
        }
      });
    } catch (e) { console.warn('loadAllTemplates error:', e); }
  }

  function populateDeptSelects() {
    // DEPT_LIST の順序・表示に合わせ、CRM ID を code でマッチして引き当てる
    const deptOpts = DEPT_LIST.map(d => {
      const crm = state.templateDepts.find(td => td.code === d.code || td.name === d.name);
      return `<option value="${escHtml(crm ? crm.id : '')}">${escHtml(d.code)}：${escHtml(d.name)}</option>`;
    }).join('');
    const opts = '<option value="">― 選択 ―</option>' + deptOpts;
    const saveEl = document.getElementById('tplSaveDept');
    const filterEl = document.getElementById('tplFilterDept');
    if (saveEl) saveEl.innerHTML = opts;
    if (filterEl) filterEl.innerHTML = '<option value="">― 所課で絞り込み ―</option>' + deptOpts;
  }

  function showSetProductSaveDialog(existingId) {
    if (!zohoReady) { showToast('Zoho未接続', 'warn'); return; }
    if (state.templateDepts.length === 0) {
      loadDepartments().then(() => { populateDeptSelects(); _openSpSaveModal(existingId); });
      return;
    }
    populateDeptSelects();
    _openSpSaveModal(existingId);
  }

  function _openSpSaveModal(existingId) {
    const nameEl  = document.getElementById('spSaveName');
    const deptEl  = document.getElementById('spSaveDept');
    const setPrEl = document.getElementById('spSaveSetPrice');
    const titleEl = document.getElementById('setProductSaveTitle');

    // 所課ドロップダウンを構築（DEPT_LIST 順・CRM ID でマッチ）
    if (deptEl) {
      deptEl.innerHTML = '<option value="">― 選択 ―</option>' +
        DEPT_LIST.map(d => {
          const crm = state.templateDepts.find(td => td.code === d.code || td.name === d.name);
          return `<option value="${escHtml(crm ? crm.id : '')}">${escHtml(d.code)}：${escHtml(d.name)}</option>`;
        }).join('');
      const currentDept = state.templateDepts.find(d => d.name === state.shoka);
      if (currentDept) deptEl.value = currentDept.id;
    }

    // 見積明細チェックリストを構築（品名・単価が入っている行のみ）
    const checklistEl = document.getElementById('spSaveItemChecklist');
    if (checklistEl) {
      const rows = [];
      state.sections.forEach((sec, si) => {
        sec.items.forEach((item, ii) => {
          if (!item.name && !item.unitPrice) return;
          rows.push({ si, ii, item, secName: sec.name });
        });
      });

      if (rows.length === 0) {
        checklistEl.innerHTML = '<div style="padding:12px;color:#999;font-size:13px;text-align:center">見積明細に行がありません</div>';
      } else {
        // 編集時は既存構成品の品名でチェック状態を初期設定
        const existingSp   = existingId ? state.setProductList.find(p => p.id === existingId) : null;
        const existingNames = existingSp?.data?.items?.map(i => i.name) || [];

        checklistEl.innerHTML = rows.map(({ si, ii, item, secName }) => {
          const amount  = item.amount ?? Math.round((item.qty || 1) * (item.unitPrice || 0));
          const checked = existingId ? existingNames.includes(item.name) : true;
          return `<label style="display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid #f0f0f0;cursor:pointer;font-size:13px" data-si="${si}" data-ii="${ii}">
            <input type="checkbox" ${checked ? 'checked' : ''} onchange="app.calcSetProductNormal()">
            <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(item.name)}">${escHtml(secName ? secName + ' / ' : '') + escHtml(item.name)}</span>
            <span style="color:#666;white-space:nowrap">${item.qty}${escHtml(item.unit || '式')} × ${(item.unitPrice ?? 0).toLocaleString()} = ${amount.toLocaleString()}円</span>
          </label>`;
        }).join('');
      }
    }

    if (existingId) {
      const sp = state.setProductList.find(p => p.id === existingId);
      if (!sp) return;
      document.getElementById('setProductSaveModal').dataset.editId = existingId;
      if (titleEl) titleEl.textContent = 'セット商品を編集';
      if (nameEl)  nameEl.value = sp.name;
      if (deptEl && sp.deptId) deptEl.value = sp.deptId;
      if (setPrEl) setPrEl.value = sp.data?.setPrice ?? '';
    } else {
      delete document.getElementById('setProductSaveModal').dataset.editId;
      if (titleEl) titleEl.textContent = 'セット商品を登録';
      if (nameEl)  nameEl.value = '';
      if (setPrEl) setPrEl.value = '';
    }
    calcSetProductNormal();
    document.getElementById('setProductSaveModal').style.display = 'flex';
  }

  function calcSetProductNormal() {
    const checklistEl = document.getElementById('spSaveItemChecklist');
    if (!checklistEl) return;
    let total = 0;
    checklistEl.querySelectorAll('label').forEach(label => {
      const cb = label.querySelector('input[type=checkbox]');
      if (!cb?.checked) return;
      const si   = parseInt(label.dataset.si);
      const ii   = parseInt(label.dataset.ii);
      const sec  = state.sections[si];
      const item = sec?.items[ii];
      if (!item) return;
      total += item.amount ?? Math.round((item.qty || 1) * (item.unitPrice || 0));
    });
    const el = document.getElementById('spSaveNormalTotal');
    if (el) el.textContent = total.toLocaleString();
  }

  function _collectSpItems() {
    const checklistEl = document.getElementById('spSaveItemChecklist');
    if (!checklistEl) return [];
    const items = [];
    checklistEl.querySelectorAll('label').forEach(label => {
      const cb = label.querySelector('input[type=checkbox]');
      if (!cb?.checked) return;
      const si   = parseInt(label.dataset.si);
      const ii   = parseInt(label.dataset.ii);
      const sec  = state.sections[si];
      const item = sec?.items[ii];
      if (!item) return;
      items.push({
        name:      item.name      || '',
        spec:      item.spec      || '',
        qty:       item.qty       ?? 1,
        unit:      item.unit      || '式',
        unitPrice: item.unitPrice ?? 0,
        amount:    item.amount    ?? Math.round((item.qty || 1) * (item.unitPrice || 0)),
        genka:     item.genka     ?? 0,
      });
    });
    return items;
  }

  async function execSetProductSave() {
    const name     = (document.getElementById('spSaveName')?.value || '').trim();
    const deptId   = document.getElementById('spSaveDept')?.value || '';
    const setPrice = parseFloat(document.getElementById('spSaveSetPrice')?.value) || 0;
    if (!name)   { showToast('商品名を入力してください', 'warn'); return; }
    if (!deptId) { showToast('所課を選択してください', 'warn'); return; }

    const items = _collectSpItems();
    if (items.length === 0) { showToast('構成品を1件以上選択してください', 'warn'); return; }

    const normalPrice = items.reduce((s, it) => s + it.amount, 0);
    const deptName = state.templateDepts.find(d => d.id === deptId)?.name || '';

    const payload = { isSetProduct: true, items, normalPrice, setPrice };
    const apiData = {
      Name:    name,
      JSON:    JSON.stringify(payload),
      field17: 'セット商品',
      field21: { id: deptId, name: deptName },
    };

    const editId = document.getElementById('setProductSaveModal').dataset.editId;
    try {
      if (editId) {
        await ZOHO.CRM.API.updateRecord({
          Entity: 'CustomModule8', APIData: { id: editId, ...apiData }, Trigger: [],
        });
        const sp = state.setProductList.find(p => p.id === editId);
        if (sp) Object.assign(sp, { name, deptId, deptName, data: payload });
        showToast('セット商品を更新しました');
      } else {
        // 同じ所課・同じ名前のセット商品を検索
        const sameName = state.setProductList.find(p => p.name === name && p.deptId === deptId);
        if (sameName) {
          if (!confirm(`「${name}」は同じ所課に既に存在します。上書きしますか？`)) return;
          await ZOHO.CRM.API.updateRecord({
            Entity: 'CustomModule8', APIData: { id: sameName.id, ...apiData }, Trigger: [],
          });
          Object.assign(sameName, { name, deptId, deptName, data: payload });
          showToast('セット商品を上書きしました');
        } else {
          const res = await ZOHO.CRM.API.insertRecord({
            Entity: 'CustomModule8', APIData: apiData, Trigger: [],
          });
          const newId = res?.data?.[0]?.details?.id;
          if (newId) state.setProductList.push({ id: newId, name, type: 'セット商品', deptId, deptName, data: payload });
          showToast('セット商品を登録しました');
        }
      }
      document.getElementById('setProductSaveModal').style.display = 'none';
      showSetProductDialog();
    } catch (e) {
      console.error('セット商品保存エラー:', e);
      showToast('保存に失敗しました', 'err');
    }
  }

  function showSetProductDialog() {
    const currentDept = state.templateDepts.find(d => d.name === state.shoka);
    const list = currentDept
      ? state.setProductList.filter(p => p.deptId === currentDept.id)
      : state.setProductList;

    state.selectedSetProductId = null;
    const btnEl = document.getElementById('btnAddSetProduct');
    if (btnEl) btnEl.disabled = true;

    const listEl = document.getElementById('setProductList');
    if (listEl) {
      if (list.length === 0) {
        listEl.innerHTML = '<div class="tpl-none">セット商品が登録されていません</div>';
      } else {
        listEl.innerHTML = list.map(p => {
          const d = p.data || {};
          const normalPrice = d.normalPrice != null ? `定価 ${Number(d.normalPrice).toLocaleString()}円` : '';
          const setPrice    = d.setPrice    != null ? `セット価格 ${Number(d.setPrice).toLocaleString()}円` : '';
          const itemCount   = Array.isArray(d.items) ? `${d.items.length}品目` : '';
          return `
            <div class="tpl-item${state.selectedSetProductId === p.id ? ' selected' : ''}"
                 data-set-id="${p.id}" onclick="app.selectSetProduct('${p.id}')">
              <input type="radio" class="tpl-item-radio" name="setProductItem"
                     ${state.selectedSetProductId === p.id ? 'checked' : ''}>
              <div class="tpl-item-info">
                <div class="tpl-item-name">${escHtml(p.name)}</div>
                <div class="tpl-item-meta">${[p.deptName, itemCount, normalPrice, setPrice].filter(Boolean).join(' / ') || '―'}</div>
              </div>
              <button class="tpl-detail-btn" onclick="event.stopPropagation();app.toggleSetProductDetail('${p.id}')"
                      data-sp-detail-id="${p.id}" style="margin-left:auto;padding:2px 8px;font-size:12px;background:none;border:1px solid #ccc;border-radius:4px;cursor:pointer;white-space:nowrap">▶ 詳細</button>
            </div>
            <div id="sp-detail-${p.id}" style="display:none;padding:6px 12px 8px 36px;font-size:12px;color:#444;background:#f9f9f9;border-bottom:1px solid #e0e0e0"></div>`;
        }).join('');
      }
    }
    // 追加先セクション選択を commonTargetSection と同期
    const commonVal = document.getElementById('commonTargetSection')?.value || 'last';
    const spSel = document.getElementById('setProductTargetSection');
    if (spSel) spSel.value = commonVal;

    const el = document.getElementById('setProductModal');
    if (el) el.style.display = 'flex';
  }

  function selectSetProduct(id) {
    state.selectedSetProductId = id;
    const btnEl = document.getElementById('btnAddSetProduct');
    if (btnEl) btnEl.disabled = false;
    document.querySelectorAll('#setProductList .tpl-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.setId === id);
      const radio = el.querySelector('input[type=radio]');
      if (radio) radio.checked = el.dataset.setId === id;
    });
  }

  function toggleSetProductDetail(id) {
    const panel = document.getElementById('sp-detail-' + id);
    const btn   = document.querySelector('[data-sp-detail-id="' + id + '"]');
    if (!panel) return;
    selectSetProduct(id);
    const isOpen = panel.style.display !== 'none';
    if (isOpen) {
      panel.style.display = 'none';
      if (btn) btn.textContent = '▶ 詳細';
      return;
    }
    const sp = state.setProductList.find(p => p.id === id);
    const d  = sp?.data || {};
    const lines = [];
    if (Array.isArray(d.items) && d.items.length > 0) {
      const itemLines = d.items.map(it => {
        const amount = it.amount ?? Math.round((it.qty || 1) * (it.unitPrice || 0));
        return `${escHtml(it.name)}　${it.qty}${escHtml(it.unit || '式')} × ${(it.unitPrice || 0).toLocaleString()}円 ＝ ${amount.toLocaleString()}円`;
      }).join('<br>');
      lines.push(itemLines);
    }
    if (d.normalPrice != null) lines.push(`<span style="color:#666">定価合計：${Number(d.normalPrice).toLocaleString()}円</span>`);
    if (d.setPrice    != null) lines.push(`<span style="color:#c00;font-weight:bold">セット価格：${Number(d.setPrice).toLocaleString()}円</span>`);
    panel.innerHTML = lines.length ? lines.join('<br>') : '<span style="color:#999">情報なし</span>';
    panel.style.display = '';
    if (btn) btn.textContent = '▼ 詳細';
  }

  function execAddSetProduct() {
    if (!state.selectedSetProductId) { showToast('セット商品を選択してください', 'warn'); return; }
    const setProduct = state.setProductList.find(p => p.id === state.selectedSetProductId);
    if (!setProduct?.data) { showToast('データが見つかりません', 'warn'); return; }

    const d = setProduct.data;
    const items = Array.isArray(d.items) ? d.items : [];
    if (items.length === 0) { showToast('構成品が登録されていません', 'warn'); return; }

    // 追加先セクションを選択肢から取得、なければ新規作成
    const targetVal = document.getElementById('setProductTargetSection')?.value || 'last';
    let targetSection;
    if (targetVal === 'last') {
      targetSection = state.sections[state.sections.length - 1];
    } else {
      const targetId = Number(targetVal);
      targetSection = state.sections.find(s => s.id === targetId) || state.sections[state.sections.length - 1];
    }
    if (!targetSection) {
      targetSection = {
        id: state.nextSectionId++, no: 1,
        name: setProduct.name, cat: '', items: [],
      };
      state.sections.push(targetSection);
    }

    // 構成品を追加
    items.forEach(tplItem => {
      const item = createItem();
      item.name      = tplItem.name      || '';
      item.spec      = tplItem.spec      || '';
      item.qty       = tplItem.qty       ?? 1;
      item.unit      = tplItem.unit      || '式';
      item.unitPrice = tplItem.unitPrice ?? null;
      item.amount    = tplItem.amount    ?? 0;
      item.genka     = tplItem.genka     ?? 0;
      targetSection.items.push(item);
    });

    markDirty();
    renumberSections();
    renderSections();
    updateOutput();
    document.getElementById('setProductModal').style.display = 'none';
    document.getElementById('tplLoadModal').style.display = 'none';
    showToast(`「${setProduct.name}」を追加しました`);
    const msg = document.getElementById('noSectionsMsg');
    if (msg) msg.style.display = 'none';
  }

  async function showTemplateSaveDialog() {
    if (!zohoReady) { showToast('Zoho未接続', 'warn'); return; }
    if (state.templateDepts.length === 0) await loadDepartments();
    populateDeptSelects();

    const catRow  = document.getElementById('tplSaveCatRow');
    const inclRow = document.getElementById('tplSaveIncludeRow');
    const titleEl = document.getElementById('tplSaveModalTitle');

    if (state.frpMode) {
      const frpSaveItems = state.frpItems.filter(i => i.type !== 'soryo');
      if (frpSaveItems.length === 0) { showToast('保存するFRPアイテムがありません', 'warn'); return; }
      if (titleEl) titleEl.textContent = 'FRPテンプレートを保存';
      if (catRow)  catRow.style.display  = 'none';
      if (inclRow) inclRow.style.display = 'none';

      const currentDept = state.templateDepts.find(d => d.code === state.createDeptCode || d.name === state.shoka);
      const deptEl = document.getElementById('tplSaveDept');
      if (deptEl && currentDept) deptEl.value = currentDept.id;

      const overwriteEl = document.getElementById('tplSaveOverwriteTarget');
      if (overwriteEl) {
        const frpTpls = currentDept
          ? state.templateList.filter(t => t.type === 'FRP' && t.deptId === currentDept.id)
          : state.templateList.filter(t => t.type === 'FRP');
        overwriteEl.innerHTML = '<option value="">― 新規保存 ―</option>' +
          frpTpls.map(t =>
            `<option value="${t.id}">${escHtml(t.name)}${t.deptName ? '　' + escHtml(t.deptName) : ''}</option>`
          ).join('');
        overwriteEl.value = '';
      }
      const nameEl = document.getElementById('tplSaveName');
      if (nameEl) nameEl.value = '';
      const descEl = document.getElementById('tplSaveDescription');
      if (descEl) descEl.value = '';
      const el = document.getElementById('tplSaveModal');
      if (el) el.style.display = 'flex';
      return;
    }

    if (titleEl) titleEl.textContent = 'テンプレートを保存';
    if (catRow)  catRow.style.display  = '';
    if (inclRow) inclRow.style.display = '';
    if (state.sections.length === 0) { showToast('保存する明細がありません', 'warn'); return; }

    const currentDept = state.templateDepts.find(d => d.name === state.shoka);
    const deptEl = document.getElementById('tplSaveDept');
    if (deptEl && currentDept) deptEl.value = currentDept.id;

    // 上書き先ドロップダウンを構築（同じ所課のみ）
    const overwriteEl = document.getElementById('tplSaveOverwriteTarget');
    if (overwriteEl) {
      const sameDeptList = currentDept
        ? state.templateList.filter(t => t.deptId === currentDept.id)
        : state.templateList;
      overwriteEl.innerHTML = '<option value="">― 新規保存 ―</option>' +
        sameDeptList.map(t =>
          `<option value="${t.id}">${escHtml(t.name)}${t.type ? '　' + escHtml(t.type) : ''}</option>`
        ).join('');
      overwriteEl.value = '';
    }
    // 名前・説明フィールドをリセット
    const nameEl = document.getElementById('tplSaveName');
    if (nameEl) nameEl.value = '';
    const descEl = document.getElementById('tplSaveDescription');
    if (descEl) descEl.value = '';

    const el = document.getElementById('tplSaveModal');
    if (el) el.style.display = 'flex';
  }

  function onTplOverwriteTargetChange(id) {
    if (!id) return;
    const tpl = state.templateList.find(t => t.id === id);
    if (!tpl) return;
    const nameEl = document.getElementById('tplSaveName');
    const catEl    = document.getElementById('tplSaveCat');
    const subcatEl = document.getElementById('tplSaveSubcat');
    const deptEl   = document.getElementById('tplSaveDept');
    const descEl   = document.getElementById('tplSaveDescription');
    if (nameEl) nameEl.value = tpl.name;
    if (catEl && subcatEl) {
      const { cat, subcat } = _parseTplType(tpl.type || '');
      catEl.value = cat;
      if (TPL_CATS_WITH_SUBCAT.includes(cat)) {
        subcatEl.style.display = '';
        subcatEl.value = subcat;
      } else {
        subcatEl.value = '';
        subcatEl.style.display = 'none';
      }
    }
    if (deptEl && tpl.deptId) deptEl.value = tpl.deptId;
    if (descEl) descEl.value = tpl.description || '';
  }

  async function execTemplateSave() {
    const overwriteId = document.getElementById('tplSaveOverwriteTarget')?.value || '';
    const name = (document.getElementById('tplSaveName')?.value || '').trim();
    if (!name) { showToast('テンプレート名を入力してください', 'warn'); return; }
    const description = (document.getElementById('tplSaveDescription')?.value || '').trim();
    const deptId = document.getElementById('tplSaveDept')?.value || '';
    const deptName = deptId
      ? (state.templateDepts.find(d => d.id === deptId)?.name || '')
      : '';

    let type, payload, includePdf = false;

    if (state.frpMode) {
      type = 'FRP';
      const frpSaveItems = state.frpItems
        .filter(i => i.type !== 'soryo')
        .map(i => ({
          type: i.type, shubetsu: i.shubetsu, chubunrui: i.chubunrui, kashira: i.kashira,
          hinmei: i.hinmei, name3: i.name3, optSpec5: i.optSpec5,
          itemnum: i.itemnum, zuban: i.zuban, hinban: i.hinban,
          qty: i.qty, unit: i.unit, price: i.price, priceA: i.priceA, priceB: i.priceB,
          genka: i.genka, priceS: i.priceS,
          soryoKubun: i.soryoKubun, soryoNote: i.soryoNote,
          specs: i.specs, hinshu: i.hinshu,
          _bandFor: i._bandFor, _bandQtyPer: i._bandQtyPer,
        }));
      payload = { description, frpItems: frpSaveItems };
    } else {
      const cat         = (document.getElementById('tplSaveCat')?.value || '').trim();
      const saveSubcat  = (document.getElementById('tplSaveSubcat')?.value || '').trim();
      type              = cat && saveSubcat ? cat + '_' + saveSubcat : cat;
      const includeConditions  = document.getElementById('tplSaveIncludeConditions')?.checked;
      const includeRemarks     = document.getElementById('tplSaveIncludeRemarks')?.checked;
      const includeExclusions  = document.getElementById('tplSaveIncludeExclusions')?.checked;
      includePdf               = document.getElementById('tplSaveIncludePdf')?.checked ?? false;
      payload = {
        description,
        sections: state.sections.map(sec => ({
          name:   sec.name,
          cat:    sec.cat || '',
          secQty: sec.secQty || 1,
          items: sec.items.map(item => ({
            name: item.name, spec: item.spec, qty: item.qty, unit: item.unit,
            unitPrice: item.unitPrice, amount: item.amount, genka: item.genka,
            includeInLabor: item.includeInLabor,
            dairiRate: item.dairiRate, dairiUnitPrice: item.dairiUnitPrice,
            _dairiManual: item._dairiManual || false,
            calcCategory: item.calcCategory,
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
      if (includeExclusions) {
        collectExclusions();
        payload.exclusions = state.exclusions.slice();
      }
    }

    const tplData = JSON.stringify(payload);

    try {
      const apiData = { Name: name, JSON: tplData };
      if (type) apiData.field17 = type;
      if (deptId) apiData.field21 = { id: deptId, name: deptName };
      apiData.Description = description;
      if (includePdf) apiData.PDFJSON = JSON.stringify(collectPdfSettings());

      // 上書き先が指定されている場合はIDで直接更新、なければ同名チェック
      const existing = overwriteId
        ? state.templateList.find(t => t.id === overwriteId)
        : state.templateList.find(t => t.name === name);
      if (existing) {
        if (!overwriteId && !confirm(`「${name}」は既に存在します。上書きしますか？`)) return;
        await ZOHO.CRM.API.updateRecord({
          Entity: 'CustomModule8', APIData: { id: existing.id, ...apiData }, Trigger: [],
        });
        Object.assign(existing, { type, deptId, deptName, description, data: payload });
        showToast('テンプレートを更新しました');
      } else {
        const res = await ZOHO.CRM.API.insertRecord({
          Entity: 'CustomModule8', APIData: apiData, Trigger: [],
        });
        const newId = res?.data?.[0]?.details?.id;
        if (newId) state.templateList.push({ id: newId, name, type, deptId, deptName, description, data: payload });
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

    const currentDept = state.templateDepts.find(d => d.name === state.shoka);
    document.getElementById('tplFilterDept').value = currentDept ? currentDept.id : '';
    const filterCatEl    = document.getElementById('tplFilterCat');
    const filterSubcatEl = document.getElementById('tplFilterSubcat');
    const titleEl        = document.getElementById('tplLoadModalTitle');
    const loadModeRow    = document.getElementById('tplLoadModeRow');
    const restoreOptRow  = document.getElementById('tplRestoreOptRow');

    if (state.frpMode) {
      if (titleEl) titleEl.textContent = 'FRPテンプレートを読み込み';
      if (filterCatEl)    { filterCatEl.value    = ''; filterCatEl.style.display    = 'none'; }
      if (filterSubcatEl) { filterSubcatEl.value = ''; filterSubcatEl.style.display = 'none'; }
      if (loadModeRow)   loadModeRow.style.display   = 'none';
      if (restoreOptRow) restoreOptRow.style.display = 'none';
    } else {
      if (titleEl) titleEl.textContent = 'テンプレートを読み込み';
      if (filterCatEl)    { filterCatEl.value    = ''; filterCatEl.style.display    = ''; }
      if (filterSubcatEl) { filterSubcatEl.value = ''; filterSubcatEl.style.display = 'none'; }
      if (loadModeRow)   loadModeRow.style.display   = '';
      if (restoreOptRow) restoreOptRow.style.display = '';
    }

    document.getElementById('tplFilterName').value = '';
    state.selectedTemplateId = null;
    document.getElementById('btnTplLoad').disabled = true;

    loadModal.style.display = 'flex';
    const listEl = document.getElementById('tplList');
    listEl.innerHTML = '<div class="tpl-loading">読み込み中...</div>';

    await loadAllTemplates();
    filterTemplates();
  }

  const TPL_CATS_WITH_SUBCAT = ['農用', '熱機', '衛生'];
  const TPL_ALL_CATS = ['農用', '熱機', '衛生', '送料', '部分セット品'];

  function onTplCatChange(context) {
    const catId    = context === 'save' ? 'tplSaveCat'    : 'tplFilterCat';
    const subcatId = context === 'save' ? 'tplSaveSubcat' : 'tplFilterSubcat';
    const cat      = document.getElementById(catId)?.value || '';
    const subcatEl = document.getElementById(subcatId);
    if (!subcatEl) return;
    if (TPL_CATS_WITH_SUBCAT.includes(cat)) {
      subcatEl.style.display = '';
    } else {
      subcatEl.value = '';
      subcatEl.style.display = 'none';
    }
    if (context === 'filter') filterTemplates();
  }

  function _parseTplType(type) {
    const sep = type.lastIndexOf('_');
    if (sep === -1) return { cat: type, subcat: '' };
    const subcat = type.slice(sep + 1);
    if (['物販', '作業', '工事'].includes(subcat)) return { cat: type.slice(0, sep), subcat };
    return { cat: type, subcat: '' };
  }

  function filterTemplates() {
    const deptId = document.getElementById('tplFilterDept')?.value || '';
    const cat    = document.getElementById('tplFilterCat')?.value || '';
    const subcat = document.getElementById('tplFilterSubcat')?.value || '';
    const nameQ  = (document.getElementById('tplFilterName')?.value || '').trim().toLowerCase();

    const sortOrder = document.getElementById('tplSortOrder')?.value || 'name_asc';

    let filtered = state.templateList.slice();

    if (state.frpMode) {
      filtered = filtered.filter(t => t.type === 'FRP');
    } else {
      if (cat === '__other__') {
        filtered = filtered.filter(t => !TPL_ALL_CATS.some(c => t.type === c || t.type.startsWith(c + '_')));
      } else if (cat && subcat) {
        filtered = filtered.filter(t => t.type === cat + '_' + subcat);
      } else if (cat) {
        filtered = filtered.filter(t => t.type === cat || t.type.startsWith(cat + '_'));
      }
    }

    if (deptId) filtered = filtered.filter(t => t.deptId === deptId);
    if (nameQ)  filtered = filtered.filter(t => t.name.toLowerCase().includes(nameQ));

    filtered.sort((a, b) => {
      if (sortOrder === 'name_asc')  return a.name.localeCompare(b.name, 'ja');
      if (sortOrder === 'name_desc') return b.name.localeCompare(a.name, 'ja');
      if (sortOrder === 'type_asc')  return (a.type || '').localeCompare(b.type || '', 'ja') || a.name.localeCompare(b.name, 'ja');
      if (sortOrder === 'type_desc') return (b.type || '').localeCompare(a.type || '', 'ja') || a.name.localeCompare(b.name, 'ja');
      return 0;
    });

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
        <button class="tpl-detail-btn" onclick="event.stopPropagation();app.toggleTplDetail('${t.id}')"
                data-detail-id="${t.id}" style="margin-left:auto;padding:2px 8px;font-size:12px;background:none;border:1px solid #ccc;border-radius:4px;cursor:pointer;white-space:nowrap">▶ 詳細</button>
        <button class="tpl-delete-btn" data-tpl-id="${escHtml(t.id)}" data-tpl-name="${escHtml(t.name)}"
                style="margin-left:6px;padding:2px 8px;font-size:12px;background:none;border:1px solid #e57373;border-radius:4px;cursor:pointer;color:#c62828;white-space:nowrap">🗑 削除</button>
      </div>
      <div class="tpl-detail-panel" id="tpl-detail-${t.id}" style="display:none;padding:6px 12px 8px 36px;font-size:12px;color:#444;background:#f9f9f9;border-bottom:1px solid #e0e0e0"></div>
    `).join('');

    listEl.querySelectorAll('.tpl-delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        deleteTemplate(btn.dataset.tplId, btn.dataset.tplName);
      });
    });
  }

  async function deleteTemplate(id, name) {
    if (!confirm(`「${name}」を削除しますか？\nこの操作は取り消せません。`)) return;
    try {
      await ZOHO.CRM.API.deleteRecord({ Entity: 'CustomModule8', RecordID: id });
      state.templateList = state.templateList.filter(t => t.id !== id);
      if (state.selectedTemplateId === id) {
        state.selectedTemplateId = null;
        document.getElementById('btnTplLoad').disabled = true;
      }
      filterTemplates();
      showToast('テンプレートを削除しました');
    } catch (e) {
      console.error('deleteTemplate error:', e);
      showToast('削除に失敗しました', 'error');
    }
  }

  function toggleTplDetail(id) {
    const panel = document.getElementById('tpl-detail-' + id);
    const btn   = document.querySelector('[data-detail-id="' + id + '"]');
    if (!panel) return;
    selectTemplate(id);
    const isOpen = panel.style.display !== 'none';
    if (isOpen) {
      panel.style.display = 'none';
      if (btn) btn.textContent = '▶ 詳細';
      return;
    }
    const tpl = state.templateList.find(t => t.id === id);
    if (!tpl || !tpl.data) {
      panel.innerHTML = '<span style="color:#999">データなし</span>';
      panel.style.display = '';
      if (btn) btn.textContent = '▼ 詳細';
      return;
    }
    const d = tpl.data;
    const lines = [];
    if (tpl.description) lines.push('【説明】' + escHtml(tpl.description).replace(/\n/g, '<br>'));
    if (d.frpItems && Array.isArray(d.frpItems)) {
      const count  = d.frpItems.length;
      const sample = d.frpItems.slice(0, 3).map(i => escHtml(i.hinmei || i.name3 || '')).filter(Boolean);
      const extra  = count > 3 ? `他${count - 3}件` : '';
      const items  = [...sample, ...(extra ? [extra] : [])].join('、');
      lines.push(`【FRP】${count}件${items ? '：' + items : ''}`);
    }
    if (d.sections && d.sections.length) {
      const sectionSummary = d.sections.map(sec => {
        const rowCount = sec.items ? sec.items.length : 0;
        const sample = (sec.items || []).slice(0, 3).map(r => escHtml(r.name || r.hinmei || '')).filter(Boolean);
        const extra  = rowCount > 3 ? `他${rowCount - 3}行` : '';
        const items  = [...sample, ...(extra ? [extra] : [])].join('、');
        return `${escHtml(sec.name || '大項目')}（${rowCount}行）${items ? '：' + items : ''}`;
      }).join('<br>');
      lines.push('【大項目】' + sectionSummary);
    }
    if (d.deliveryTerm)   lines.push('【納期】'     + escHtml(d.deliveryTerm));
    if (d.deliveryMethod) lines.push('【納入条件】' + escHtml(d.deliveryMethod));
    if (d.paymentTerm)    lines.push('【支払条件】' + escHtml(d.paymentTerm));
    if (d.validDays)      lines.push('【有効日数】' + escHtml(String(d.validDays)) + '日');
    if (d.remarks)        lines.push('【備考】'     + escHtml(d.remarks).replace(/\n/g, ' '));
    if (d.exclusions && d.exclusions.length) lines.push('【見積外工事】' + d.exclusions.length + '件');
    panel.innerHTML = lines.length ? lines.join('<br>') : '<span style="color:#999">情報なし</span>';
    panel.style.display = '';
    if (btn) btn.textContent = '▼ 詳細';
  }

  function selectTemplate(id) {
    state.selectedTemplateId = id;
    document.getElementById('btnTplLoad').disabled = false;
    document.querySelectorAll('.tpl-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.tplId === id);
      const radio = el.querySelector('input[type=radio]');
      if (radio) radio.checked = el.dataset.tplId === id;
    });
    const tpl = state.templateList.find(t => t.id === id);
    const d   = tpl?.data || {};
    const cbCond = document.getElementById('tplRestoreConditions');
    const cbRmk  = document.getElementById('tplRestoreRemarks');
    if (cbCond) {
      const hasConditions = d.deliveryTerm !== undefined || d.deliveryMethod !== undefined ||
                            d.paymentTerm !== undefined  || d.validDays     !== undefined;
      cbCond.disabled = !hasConditions;
      cbCond.checked  = hasConditions;
    }
    if (cbRmk) {
      const hasRemarks = d.remarks !== undefined;
      cbRmk.disabled = !hasRemarks;
      cbRmk.checked  = hasRemarks;
    }
    const cbExcl = document.getElementById('tplRestoreExclusions');
    if (cbExcl) {
      const hasExclusions = Array.isArray(d.exclusions) && d.exclusions.length > 0;
      cbExcl.disabled = !hasExclusions;
      cbExcl.checked  = hasExclusions;
    }
    const cbPdf = document.getElementById('tplRestorePdf');
    if (cbPdf) {
      const hasPdf = !!(tpl?.pdfJson);
      cbPdf.disabled = !hasPdf;
      cbPdf.checked  = hasPdf;
    }
  }

  async function execTemplateLoad() {
    if (!state.selectedTemplateId) { showToast('テンプレートを選択してください', 'warn'); return; }
    const mode = document.querySelector('input[name="tplLoadMode"]:checked')?.value || 'add';

    // CRM からテンプレートJSON取得
    let tplData, pdfJsonStr;
    try {
      const res = await ZOHO.CRM.API.getRecord({
        Entity: 'CustomModule8', RecordID: state.selectedTemplateId,
      });
      const record = res?.data?.[0];
      if (!record?.JSON) { showToast('テンプレートデータが空です', 'warn'); return; }
      tplData = JSON.parse(record.JSON);
      pdfJsonStr = record.PDFJSON || null;
    } catch (e) {
      console.error('テンプレート読み込みエラー:', e);
      showToast('読み込みに失敗しました', 'err');
      return;
    }

    // FRP テンプレートの場合は frpItems を復元
    if (tplData.frpItems && Array.isArray(tplData.frpItems)) {
      if (!confirm('現在のFRPアイテムを置き換えますか？')) return;
      const soryoItems = state.frpItems.filter(i => i.type === 'soryo');
      state.frpItems = [...tplData.frpItems, ...soryoItems];
      renderFrpItems();
      updateFrpTotals();
      markDirty();
      document.getElementById('tplLoadModal').style.display = 'none';
      showToast('FRPテンプレートを読み込みました');
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
        item.dairiRate      = tplItem.dairiRate      ?? null;
        item.dairiUnitPrice = tplItem.dairiUnitPrice ?? null;
        item._dairiManual   = tplItem._dairiManual || (tplItem.dairiUnitPrice != null);
        item.calcCategory  = tplItem.calcCategory  || '';
        item.houdan        = tplItem.houdan        ?? 0;
        item.houkouDirect  = tplItem.houkouDirect  ?? 0;
        item.houkouKubun   = tplItem.houkouKubun   || '';
        item.gensuiKubun   = tplItem.gensuiKubun   || '';
        item.gensuiA       = tplItem.gensuiA       || 0;
        item.gensuiB       = tplItem.gensuiB       || 0;
        item.gensuiEnabled = tplItem.gensuiEnabled || false;
        item.kojiCategory      = tplItem.kojiCategory      || '';
        item.specLines         = Array.isArray(tplItem.specLines) ? [...tplItem.specLines] : [];
        item.machineSpec       = tplItem.machineSpec       || null;
        item.specMasterContent = tplItem.specMasterContent || null;
        item.machineSpecHidden = tplItem.machineSpecHidden || false;
        if (item.machineSpec && !item.specMasterContent) {
          item.specMasterContent = item.machineSpec.specs
            .map(s => s.value ? `${s.label}：${s.value}` : s.label).filter(Boolean).join('\n');
        }
        if (item.machineSpec || item.specMasterContent) {
          item.specMasterLoaded      = true;
          item.specMasterFromProducts = false;
        }
        if (!item.specMasterLoaded && item.model) {
          item.specMasterLoaded = true;
        }
        section.items.push(item);
      });
      if (section.items.length === 0) section.items.push(createItem());
      state.sections.push(section);
    });

    const restoreConditions = document.getElementById('tplRestoreConditions')?.checked;
    const restoreRemarks    = document.getElementById('tplRestoreRemarks')?.checked;
    const restoreExclusions = document.getElementById('tplRestoreExclusions')?.checked;
    const restorePdf        = document.getElementById('tplRestorePdf')?.checked;
    if (restoreConditions && tplData.deliveryTerm !== undefined) {
      setValue('deliveryTerm',   tplData.deliveryTerm   || '');
      setValue('deliveryMethod', tplData.deliveryMethod || '');
      setValue('paymentTerm',    tplData.paymentTerm    || '');
      setValue('validDays',      tplData.validDays      != null ? String(tplData.validDays) : '');
    }
    if (restoreRemarks && tplData.remarks !== undefined) {
      state.remarks = tplData.remarks || '';
      setValue('remarks', state.remarks);
    }
    if (restoreExclusions && Array.isArray(tplData.exclusions)) {
      state.exclusions = tplData.exclusions.slice();
      applyExclusionsToForm();
    }
    if (restorePdf && pdfJsonStr) {
      try { applyPdfSettings(JSON.parse(pdfJsonStr)); } catch(e) {}
    }

    markDirty();
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
    const hasDairiRate = globalRate != null || sec.items.some(i => i.dairiRate != null || i.dairiUnitPrice != null || i.finalDairiUnit != null);
    const dairiWrap = block.querySelector('.dairi-subtotal-wrap');
    const dairiVal  = block.querySelector('.dairi-subtotal-val');
    if (dairiWrap && dairiVal) {
      if (hasDairiRate) {
        const dairiSubtotal = sec.items.reduce((sum, i) => {
          const qty   = Number(i.qty) || 1;
          const dUnit = effectiveFinalDairiUnit(i);
          if (dUnit == null) return sum;
          return sum + dUnit * qty;
        }, 0);
        dairiVal.textContent = '¥' + dairiSubtotal.toLocaleString('ja-JP');
        const labelEl = dairiWrap.querySelector('.dairi-subtotal-label');
        if (labelEl) labelEl.textContent = '代理店';
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
      const frpItemsSafe     = state.frpItems || [];
      const frpPriceTotal    = frpItemsSafe.reduce((s, i) => s + i.price * (Number(i.qty)||1), 0);
      const frpShikiriTotal  = frpItemsSafe.reduce((s, i) => s + (i.priceA||0) * (Number(i.qty)||1), 0);

      // ③割引額 = ①小売価格合計 - ②仕切合計
      const frpWaribiki   = Math.max(0, frpPriceTotal - frpShikiriTotal);
      // 調整額（基本情報の入力値）
      const adjustAmount  = state.discountEnabled !== false ? (Number(getValue('discountAmount')) || 0) : 0;
      // 出精値引き = ③割引額 + 調整額
      const frpDiscount2  = frpWaribiki + adjustAmount;
      // 貴社お渡し価格 = ② - 調整額
      const frpDelivery   = Math.max(0, frpShikiriTotal - adjustAmount);

      state.dairiTotal       = frpShikiriTotal;
      state.waribikiAmount   = frpWaribiki;
      state.adjustAmount     = adjustAmount;
      state.deliveryPrice    = frpDelivery;

      const frpAraRi     = frpDelivery;
      const frpAraRiRate = frpDelivery > 0 ? 100.0 : 0;
      setText('basicGrandTotal',      frpPriceTotal.toLocaleString('ja-JP'));
      setText('basicDairiTotal',      frpShikiriTotal.toLocaleString('ja-JP'));
      setText('basicWaribikiAmount',  frpWaribiki.toLocaleString('ja-JP'));
      setText('basicSesseiWabiki',    frpDiscount2.toLocaleString('ja-JP'));
      setText('basicDeliveryPrice',   frpDelivery.toLocaleString('ja-JP'));
      setText('basicGenkaTotal',      '0');
      setText('basicAraRi',           frpAraRi.toLocaleString('ja-JP'));
      setText('basicAraRiRate',       frpAraRiRate.toFixed(1) + '%');

      const rowWaribikiEl = document.getElementById('rowWaribiki');
      if (rowWaribikiEl) rowWaribikiEl.style.display = frpWaribiki > 0 ? '' : 'none';
      const rowSesseiWabikiEl = document.getElementById('rowSesseiWabiki');
      if (rowSesseiWabikiEl) rowSesseiWabikiEl.style.display = frpWaribiki > 0 ? '' : 'none';

      const rowDairi = document.getElementById('rowDairiTotal');
      if (rowDairi) rowDairi.style.display = '';
      const dpHidden = document.getElementById('deliveryPrice');
      if (dpHidden) dpHidden.value = frpDelivery;
      const pdfModeGrp = document.getElementById('pdfPriceModeGroup');
      if (pdfModeGrp) pdfModeGrp.style.display = '';
      const pdfModeGrpKoujiF = document.getElementById('pdfPriceModeGroupKouji');
      if (pdfModeGrpKoujiF) pdfModeGrpKoujiF.style.display = 'none';
      updatePdfModeDesc();
      const subtotalBothGrpFrp = document.getElementById('subtotalBothGroup');
      if (subtotalBothGrpFrp) subtotalBothGrpFrp.style.display = '';

      setText('sum-quoteNo',   state.seqNo || '（未採番）');
      setText('sum-date',      formatDisplayDate(new Date(getValue('quoteDate') || Date.now())));
      setText('sum-customer',  getValue('customerName') || '-');
      setText('sum-project',   getValue('projectName')  || '-');
      setText('sum-sections',  frpItemsSafe.length + '件');
      setText('sum-total',     '¥' + frpPriceTotal.toLocaleString('ja-JP'));
      setText('sum-dairi',     '¥' + frpShikiriTotal.toLocaleString('ja-JP'));
      setText('sum-discount',  '¥0');
      setText('sum-delivery',  '¥' + frpDelivery.toLocaleString('ja-JP'));
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

    const isBuhanCalc = (state.quoteCategory || '').includes('物販');

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

        // ④工事費・⑤その他・⑥⑦行の単価・原価・金額を DOM に反映（減衰計算オン/オフ切替後など）
        if (item.calcCategory === '④工事費' || item.calcCategory === '⑤その他'
            || item.calcCategory === '⑥配管材料' || item.calcCategory === '⑦支持具・雑材費') {
          const priceEl    = row.querySelector('.item-price');
          const genkaEl2   = row.querySelector('.item-genka');
          const genkaAmtEl3 = row.querySelector('.item-genka-amount');
          const amountEl   = row.querySelector('.item-amount');
          if (priceEl    && priceEl    !== document.activeElement) priceEl.value    = item.unitPrice ? item.unitPrice.toLocaleString('ja-JP') : '';
          if (genkaEl2   && genkaEl2   !== document.activeElement) genkaEl2.value   = item.genka     ? item.genka                          : '';
          if (genkaAmtEl3) genkaAmtEl3.textContent = item.genka ? (item.genka * (Number(item.qty) || 1)).toLocaleString('ja-JP') : '';
          if (amountEl   && amountEl   !== document.activeElement) amountEl.value   = item.amount    ? item.amount.toLocaleString('ja-JP')    : '';
        }
      });

      // セクション小計・代理店価格小計を直接更新
      // （updateSectionSubtotal は内部で updateOutput を呼ぶため、ここでは直接更新する）
      const secSubtotal = sec.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const secQtyVal   = Math.max(1, Number(sec.secQty) || 1);
      const subtotalEl  = block.querySelector('.subtotal-val');
      if (subtotalEl) subtotalEl.textContent = '¥' + secSubtotal.toLocaleString('ja-JP');
      const hasDairiRate2 = state.mainRate != null || sec.items.some(i => i.dairiRate != null || i.dairiUnitPrice != null || i.finalDairiUnit != null);
      const dairiWrap2 = block.querySelector('.dairi-subtotal-wrap');
      const dairiVal2  = block.querySelector('.dairi-subtotal-val');
      if (dairiWrap2 && dairiVal2) {
        if (hasDairiRate2) {
          const dairiSub2 = sec.items.reduce((sum, i) => {
            const qty   = Number(i.qty) || 1;
            const dUnit = effectiveFinalDairiUnit(i);
            if (dUnit == null) return sum;
            return sum + dUnit * qty;
          }, 0);
          dairiVal2.textContent = '¥' + (dairiSub2 * secQtyVal).toLocaleString('ja-JP');
          const labelEl2 = dairiWrap2.querySelector('.dairi-subtotal-label');
          if (labelEl2) labelEl2.textContent = '代理店';
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

    // 代理店価格合計（main_rate または行ごとの掛率/手動単価が設定されている場合のみ）
    const mainRate = state.mainRate;
    const hasDairiAny = mainRate != null || sections.some(s => s.items.some(i => i.dairiRate != null || i.dairiUnitPrice != null || i.finalDairiUnit != null));
    const dairiTotal = hasDairiAny
      ? sections.reduce((sum, s) => {
          const secQty = Math.max(1, Number(s.secQty) || 1);
          const dairiSubtotal = s.items.reduce((ss, i) => {
            const qty   = Number(i.qty) || 1;
            const dUnit = effectiveFinalDairiUnit(i);
            return ss + (dUnit != null ? dUnit * qty : 0);
          }, 0);
          return sum + dairiSubtotal * secQty;
        }, 0)
      : null;
    state.dairiTotal = dairiTotal;

    // 作業↔工事 カテゴリ閾値チェック（100万円、仕切価格基準）
    checkCategoryThreshold(dairiTotal != null ? dairiTotal : grandTotal);

    const buhanDiscTotal = 0;
    state.buhanDiscTotal = 0;
    const adjustAmount   = state.discountEnabled !== false ? (Number(getValue('discountAmount')) || 0) : 0;
    // 割引額 = 定価合計 - 代理店価格合計（代理店価格がある場合のみ）
    const waribikiAmount = dairiTotal != null ? Math.max(0, grandTotal - dairiTotal) : 0;
    // 出精値引き = 割引額 + 調整額
    const discount       = waribikiAmount + adjustAmount;
    // 貴社お渡し価格 = 代理店価格がある場合は代理店ベース、なければ定価ベース
    const deliveryPrice  = dairiTotal != null
      ? Math.max(0, dairiTotal - adjustAmount)
      : Math.max(0, grandTotal - discount);

    // state に反映（saveToCRM/buildPdfData で使用）
    state.discount       = discount;
    state.adjustAmount   = adjustAmount;
    state.waribikiAmount = waribikiAmount;
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

    // フッター集計バー（全見積区分で常時表示）
    const footerBar = document.getElementById('itemsFooterBar');
    if (footerBar) {
      setText('footerTotal', '¥' + grandTotal.toLocaleString('ja-JP'));
      const footerDairiWrap = document.getElementById('footerDairiWrap');
      if (footerDairiWrap) {
        if (dairiTotal != null) {
          setText('footerDairi', '¥' + dairiTotal.toLocaleString('ja-JP'));
          const footerLabelEl = document.getElementById('footerDairiLabel');
          if (footerLabelEl) footerLabelEl.textContent = '代理店';
          footerDairiWrap.style.display = '';
        } else {
          footerDairiWrap.style.display = 'none';
        }
      }
      const footerGenkaWrap = document.getElementById('footerGenkaWrap');
      if (footerGenkaWrap) {
        footerGenkaWrap.style.display = genkaTotal > 0 ? '' : 'none';
        setText('footerGenka', '¥' + genkaTotal.toLocaleString('ja-JP'));
      }
      const araRiBase  = (dairiTotal != null && dairiTotal > 0) ? dairiTotal : grandTotal;
      const araRiF     = araRiBase - genkaTotal;
      const araRiRateF = araRiBase > 0 ? araRiF / araRiBase * 100 : null;
      setText('footerAraRi',     '¥' + araRiF.toLocaleString('ja-JP'));
      setText('footerAraRiRate', araRiRateF != null ? araRiRateF.toFixed(1) + '%' : '―');
    }

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
    // 割引額行（代理店価格あり場合に表示）
    const rowWaribikiEl = document.getElementById('rowWaribiki');
    if (rowWaribikiEl) rowWaribikiEl.style.display = dairiTotal != null ? '' : 'none';
    setText('basicWaribikiAmount', waribikiAmount.toLocaleString('ja-JP'));
    // 出精値引き合計行
    const rowSesseiWabikiEl = document.getElementById('rowSesseiWabiki');
    if (rowSesseiWabikiEl) rowSesseiWabikiEl.style.display = dairiTotal != null ? '' : 'none';
    setText('basicSesseiWabiki', discount.toLocaleString('ja-JP'));
    // 値引き（明細計）行（廃止のため常時非表示）
    const rowBuhanDiscEl = document.getElementById('rowBuhanDiscount');
    if (rowBuhanDiscEl) rowBuhanDiscEl.style.display = 'none';
    setText('basicDeliveryPrice', deliveryPrice.toLocaleString('ja-JP'));
    // 貴社お渡し価格行：代理店価格が未設定のとき非表示
    const rowDeliveryCalc = document.querySelector('.row-delivery-calc');
    if (rowDeliveryCalc) rowDeliveryCalc.style.display = dairiTotal != null ? '' : 'none';
    // PDF価格モード選択の表示切替
    const isKoujiCat = (state.quoteCategory || '').includes('工事');
    const pdfModeGrpKouji = document.getElementById('pdfPriceModeGroupKouji');
    if (pdfModeGrpKouji) pdfModeGrpKouji.style.display = (dairiTotal != null && isKoujiCat) ? '' : 'none';
    const pdfModeGrp = document.getElementById('pdfPriceModeGroup');
    if (pdfModeGrp) pdfModeGrp.style.display = (dairiTotal != null && !isKoujiCat) ? '' : 'none';
    updatePdfModeDesc();
    const subtotalBothGrp = document.getElementById('subtotalBothGroup');
    if (subtotalBothGrp) {
      const _sbModeN = (state.quoteCategory || '').includes('工事') ? 'pdfPriceModeKouji' : 'pdfPriceMode';
      const _sbModeV = ([...document.getElementsByName(_sbModeN)].find(r => r.checked)?.value || 'teika');
      subtotalBothGrp.style.display = (dairiTotal != null && _sbModeV === 'dairi') ? '' : 'none';
    }
    const buppanDeliveryLabelGrp = document.getElementById('buppanDeliveryLabelGroup');
    if (buppanDeliveryLabelGrp) {
      const showOpt = isBuhanCalc && dairiTotal != null && dairiTotal < 1000000;
      buppanDeliveryLabelGrp.style.display = showOpt ? '' : 'none';
      if (!showOpt) { const cb = document.getElementById('useBuppanDeliveryLabel'); if (cb) cb.checked = false; }
    }
    const dpHidden = document.getElementById('deliveryPrice');
    if (dpHidden) dpHidden.value = deliveryPrice;

    const legalRate    = (Number(getValue('legalWelfareRate')) || 14.6) / 100;
    // 工事費合計 = 労務チェック行の価格合計（定価モード時は定価、それ以外は代理店価格）
    const _pdfModeNameUO = (!state.frpMode && (state.quoteCategory || '').includes('工事')) ? 'pdfPriceModeKouji' : 'pdfPriceMode';
    const _pdfModeVal = ([...document.getElementsByName(_pdfModeNameUO)].find(r => r.checked)?.value || 'teika');
    const _isTeika = _pdfModeVal === 'teika';
    const _useTeikaForKouji = ['teika', 'dairi-discount', 'dairi'].includes(_pdfModeVal);
    const koujihi = state.sections.reduce((sum, s) =>
      sum + s.items.reduce((ss, i) => {
        if (!i.includeInLabor) return ss;
        const r = i.dairiRate ?? state.mainRate;
        const amt = Number(i.amount) || 0;
        return ss + (!_useTeikaForKouji && r != null ? Math.round(amt * r) : amt);
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
    const materialCost = (_isTeika ? grandTotal : deliveryPrice) - koujihi - anzenCost;

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
    const rowDeliverySum = document.querySelector('tr.row-delivery');
    if (rowDeliverySum) rowDeliverySum.style.display = dairiTotal != null ? '' : 'none';
    setText('sum-delivery',   '¥' + deliveryPrice.toLocaleString('ja-JP'));
    setText('sum-material',   '¥' + Math.max(0, materialCost).toLocaleString('ja-JP'));
    setText('sum-labor',      '¥' + laborCost.toLocaleString('ja-JP'));
    setText('sum-welfare',    '¥' + legalWelfare.toLocaleString('ja-JP'));
    setText('sum-welfare-label', `　3) 法定福利費(${(legalRate * 100).toFixed(1)}%)`);
    setText('sum-anzen',      '¥' + anzenCost.toLocaleString('ja-JP'));
    setText('grandTotalDisplay', '¥' + grandTotal.toLocaleString('ja-JP'));

    updateQuoteNoBadge();
    checkMultipleRates();
    updateAdjustHint();
    // 各セクションのセクション内掛率チェックも更新
    state.sections.forEach(sec => {
      const block = document.querySelector(`.section-block[data-section-id="${sec.id}"]`);
      if (block) updateSectionRateWarn(sec, block);
    });
  }

  // ── 残調整額ヒント ────────────────────────────────────────────────
  function updateAdjustHint() {
    const bar = document.getElementById('adjustHintBar');
    if (!bar) return;
    const adjustAmount = state.adjustAmount || 0;
    if (adjustAmount === 0 || state.frpMode) { bar.style.display = 'none'; return; }
    const hintInput = document.getElementById('adjustHintAmountInput');
    if (hintInput && hintInput !== document.activeElement) {
      hintInput.value = adjustAmount;
    }

    // マイナス調整額: 分配機能なし・金額表示のみ
    if (adjustAmount < 0) {
      const fmt = v => '¥' + Math.abs(v).toLocaleString('ja-JP');
      setText('adjustHintDone', '¥0');
      setText('adjustHintRest', '▲' + fmt(adjustAmount));
      const restEl = document.getElementById('adjustHintRest');
      if (restEl) restEl.classList.remove('done');
      const prog = document.getElementById('adjustHintProgress');
      if (prog) prog.style.width = '0%';
      const syncWrap = document.getElementById('adjustHintSyncWrap');
      if (syncWrap) syncWrap.style.display = 'none';
      state._adjustRest = adjustAmount;
      bar.style.display = '';
      return;
    }

    // 元の調整額（ユーザーが入力した基準値）を使って「調整済み」を計算
    const baseAdjust = state.baseAdjustAmount !== 0 ? state.baseAdjustAmount : adjustAmount;

    let totalLocked = 0;
    state.sections.forEach(sec => {
      (sec.items || []).forEach(item => {
        if (item.dairiUnitPrice == null) return;
        const rate = item.dairiRate ?? state.mainRate;
        if (rate == null) return;
        const baseUnit = item.unitPrice != null ? item.unitPrice
          : (item.amount != null ? Math.round(Number(item.amount) / (Number(item.qty) || 1)) : null);
        if (baseUnit == null) return;
        let autoUnit = Math.round(baseUnit * rate);
        if (state.roundingEnabled) autoUnit = roundUpNormal(autoUnit);
        const diff = autoUnit - item.dairiUnitPrice;
        if (diff > 0) totalLocked += diff * (Number(item.qty) || 1);
      });
    });

    const done = Math.min(totalLocked, baseAdjust);
    const rest = Math.max(0, baseAdjust - done);
    const pct  = Math.min(100, baseAdjust > 0 ? Math.round(done / baseAdjust * 100) : 0);
    const fmt  = v => '¥' + v.toLocaleString('ja-JP');

    state._adjustRest = rest;

    setText('adjustHintDone', fmt(done));
    setText('adjustHintRest', fmt(rest));
    const restEl = document.getElementById('adjustHintRest');
    if (restEl) restEl.classList.toggle('done', rest === 0);
    const prog = document.getElementById('adjustHintProgress');
    if (prog) prog.style.width = pct + '%';

    // 残額更新ボタン: 何かしら手動値引きがある場合は常に表示（rest=0でも）
    const syncWrap = document.getElementById('adjustHintSyncWrap');
    if (syncWrap) {
      if (totalLocked > 0) {
        document.getElementById('adjustHintSyncLabel').textContent = fmt(rest);
        syncWrap.style.display = '';
      } else {
        syncWrap.style.display = 'none';
      }
    }

    bar.style.display = '';
  }


  function updateAdjustAmountToRest() {
    const rest = state._adjustRest;
    if (rest == null) return;
    const discEl = document.getElementById('discountAmount');
    if (!discEl) return;
    if (rest <= 0) {
      // 全額適用済み: discountAmount を 0 にリセット（調整完了と同じ動作）
      discEl.value = '';
      state.baseAdjustAmount = 0;
    } else {
      discEl.value = rest;
      // baseAdjustAmount は更新しない（元の基準額を保持してdone計算を継続）
    }
    updateOutput();
  }

  function syncAdjustAmountFromHint(value) {
    const discEl = document.getElementById('discountAmount');
    if (!discEl) return;
    discEl.value = value || '';
    discEl.dispatchEvent(new Event('input'));
  }

  // ── Excel インポート/エクスポート ──────────────────────────────────

  function openExcelModal() {
    const modal = document.getElementById('excelModal');
    if (modal) modal.style.display = 'flex';
  }

  function closeExcelModal() {
    const modal = document.getElementById('excelModal');
    if (modal) modal.style.display = 'none';
  }

  async function downloadExcelTemplate() {
    try {
      const ExcelJS = window.ExcelJS;
      if (!ExcelJS) {
        showToast('ExcelJSライブラリが読み込まれていません', 'error');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('見積明細');

      // ヘッダー行
      worksheet.columns = [
        { header: '大項目', key: 'section', width: 20 },
        { header: '商品コード', key: 'productCode', width: 15 },
        { header: '品名', key: 'name', width: 30 },
        { header: '型式', key: 'model', width: 20 },
        { header: '仕様', key: 'spec', width: 30 },
        { header: '数量', key: 'qty', width: 10 },
        { header: '単位', key: 'unit', width: 10 },
        { header: '単価', key: 'unitPrice', width: 15 },
        { header: '金額', key: 'amount', width: 15 },
        { header: '原価', key: 'genka', width: 15 },
        { header: '算出カテゴリ', key: 'calcCategory', width: 20 },
        { header: '代理店掛率', key: 'dairiRate', width: 12 },
        { header: '備考', key: 'bikou', width: 30 }
      ];

      // ヘッダーのスタイル
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // サンプルデータ（記入例）
      const sampleData = [
        {
          section: '衛生設備',
          productCode: 'BOT-200',
          name: 'オイルタンク BOT-200',
          model: 'BOT-200',
          spec: '容量：200L',
          qty: 1,
          unit: '台',
          unitPrice: 10000,
          amount: 10000,
          genka: 6000,
          calcCategory: '①機器',
          dairiRate: 0.8,
          bikou: ''
        },
        {
          section: '衛生設備',
          productCode: '',
          name: '配管材料',
          model: '',
          spec: 'VP管 φ50',
          qty: 10,
          unit: 'm',
          unitPrice: 500,
          amount: 5000,
          genka: 300,
          calcCategory: '②部材',
          dairiRate: '',
          bikou: ''
        },
        {
          section: '衛生設備',
          productCode: '',
          name: '配管工事',
          model: '',
          spec: '',
          qty: 1,
          unit: '式',
          unitPrice: 50000,
          amount: 50000,
          genka: 30000,
          calcCategory: '④工事費',
          dairiRate: '',
          bikou: '基礎工事含む'
        }
      ];

      sampleData.forEach(data => {
        const row = worksheet.addRow(data);
        // サンプル行の背景色を薄い黄色に
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFF0' }
        };
      });

      // 説明行を追加（最下部にコメント）
      worksheet.addRow({});
      const noteRow = worksheet.addRow({
        section: '※ 上記はサンプルデータです。削除して実際のデータを入力してください。',
        productCode: '',
        name: '',
        model: '',
        spec: '',
        qty: '',
        unit: '',
        unitPrice: '',
        amount: '',
        genka: '',
        calcCategory: '',
        dairiRate: '',
        bikou: ''
      });
      noteRow.font = { italic: true, color: { argb: 'FF888888' } };

      // ファイル名
      const fileName = `見積明細テンプレート_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // ダウンロード
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      showToast('✅ テンプレートをダウンロードしました', 'success');
    } catch (err) {
      console.error('テンプレート生成エラー:', err);
      showToast('テンプレート生成に失敗しました: ' + err.message, 'error');
    }
  }

  async function exportItemsToExcel() {
    try {
      const ExcelJS = window.ExcelJS;
      if (!ExcelJS) {
        showToast('ExcelJSライブラリが読み込まれていません', 'error');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('見積明細');

      // ヘッダー行
      worksheet.columns = [
        { header: '大項目', key: 'section', width: 20 },
        { header: '商品コード', key: 'productCode', width: 15 },
        { header: '品名', key: 'name', width: 30 },
        { header: '型式', key: 'model', width: 20 },
        { header: '仕様', key: 'spec', width: 30 },
        { header: '数量', key: 'qty', width: 10 },
        { header: '単位', key: 'unit', width: 10 },
        { header: '単価', key: 'unitPrice', width: 15 },
        { header: '金額', key: 'amount', width: 15 },
        { header: '原価', key: 'genka', width: 15 },
        { header: '算出カテゴリ', key: 'calcCategory', width: 20 },
        { header: '代理店掛率', key: 'dairiRate', width: 12 },
        { header: '備考', key: 'bikou', width: 30 }
      ];

      // ヘッダーのスタイル
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // データ行
      state.sections.forEach(sec => {
        sec.items.forEach(item => {
          worksheet.addRow({
            section: sec.name || '',
            productCode: item.productCode || '',
            name: item.name || '',
            model: item.model || '',
            spec: item.spec || '',
            qty: item.qty || 0,
            unit: item.unit || '',
            unitPrice: item.unitPrice || '',
            amount: item.amount || '',
            genka: item.genka || '',
            calcCategory: item.calcCategory || '',
            dairiRate: item.dairiRate != null ? item.dairiRate : '',
            bikou: item.bikou || ''
          });
        });
      });

      // ファイル名
      const fileName = `見積明細_${state.dealName || 'テンプレート'}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // ダウンロード
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      showToast(`✅ Excelファイルをエクスポートしました（${worksheet.rowCount - 1}行）`, 'success');
    } catch (err) {
      console.error('Excel エクスポートエラー:', err);
      showToast('Excelエクスポートに失敗しました: ' + err.message, 'error');
    }
  }

  async function importItemsFromExcel(file) {
    if (!file) return;

    try {
      const ExcelJS = window.ExcelJS;
      if (!ExcelJS) {
        showToast('ExcelJSライブラリが読み込まれていません', 'error');
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        showToast('Excelファイルにシートが見つかりません', 'error');
        return;
      }

      const rows = [];
      let headerRow = null;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          headerRow = row.values;
          return;
        }
        const rowData = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headerRow[colNumber];
          rowData[header] = cell.value;
        });
        rows.push(rowData);
      });

      // データ検証とインポート
      let importedCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const rowData of rows) {
        try {
          // 必須項目チェック
          if (!rowData['品名'] || !rowData['数量']) {
            errorCount++;
            errors.push(`品名または数量が空の行をスキップしました`);
            continue;
          }

          // セクションを取得または作成
          const sectionName = rowData['大項目'] || '（未分類）';
          let section = state.sections.find(s => s.name === sectionName);
          if (!section) {
            section = {
              id: state.nextSectionId++,
              name: sectionName,
              items: []
            };
            state.sections.push(section);
          }

          // アイテムを作成
          const item = {
            id: state.nextItemId++,
            productCode: rowData['商品コード'] || '',
            name: rowData['品名'] || '',
            model: rowData['型式'] || '',
            spec: rowData['仕様'] || '',
            qty: Number(rowData['数量']) || 0,
            unit: rowData['単位'] || '式',
            unitPrice: rowData['単価'] ? Number(rowData['単価']) : null,
            amount: rowData['金額'] ? Number(rowData['金額']) : null,
            genka: rowData['原価'] ? Number(rowData['原価']) : null,
            calcCategory: rowData['算出カテゴリ'] || '',
            dairiRate: rowData['代理店掛率'] ? Number(rowData['代理店掛率']) : null,
            bikou: rowData['備考'] || ''
          };

          // 商品コードがある場合、商品マスタと紐づけを試みる
          if (item.productCode) {
            // TODO: 商品検索APIで商品マスタを取得し、データを上書き
            // 現在は手動入力として扱う
          }

          section.items.push(item);
          importedCount++;
        } catch (err) {
          errorCount++;
          errors.push(`行${importedCount + errorCount + 1}: ${err.message}`);
        }
      }

      // 画面を更新
      renderSections();
      updateOutput();
      markDirty();

      // 結果を表示
      if (importedCount > 0) {
        let message = `✅ ${importedCount}行をインポートしました`;
        if (errorCount > 0) {
          message += `（エラー: ${errorCount}行）`;
        }
        showToast(message, errorCount > 0 ? 'warn' : 'success');

        if (errors.length > 0 && errors.length <= 5) {
          console.warn('インポートエラー:', errors);
        }
      } else {
        showToast('インポートできる行がありませんでした', 'warn');
      }

      // ファイル入力をリセット
      const fileInput = document.getElementById('excelImportInput');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error('Excel インポートエラー:', err);
      showToast('Excelインポートに失敗しました: ' + err.message, 'error');
    }
  }

  // ── 掛率複数検知 ───────────────────────────────────────────────────
  function checkMultipleRates() {
    const warnEl = document.getElementById('multiRateWarn');
    if (!warnEl) return;
    const mainRate = state.mainRate;
    if (state.frpMode || mainRate == null) { warnEl.style.display = 'none'; return; }
    const rateSet = new Set();
    state.sections.forEach(s => (s.items || []).forEach(i => {
      rateSet.add(i.dairiRate ?? mainRate);
    }));
    if (rateSet.size > 1) {
      const list = [...rateSet].sort((a, b) => a - b).map(r => (r * 100).toFixed(1) + '%').join(' / ');
      warnEl.textContent = `⚠ 掛率が複数設定されています（${list}）`;
      warnEl.style.display = '';
    } else {
      warnEl.style.display = 'none';
    }
  }

  // ── 作業↔工事 カテゴリ閾値チェック ──────────────────────────────

  let _pendingCategoryChange = null;

  function checkCategoryThreshold(grandTotal) {
    if (_skipThresholdCheck) return;
    const cat = state.quoteCategory || '';
    const isSagyo = cat.includes('作業');
    const isKouji = cat.includes('工事');
    if (!isSagyo && !isKouji) { state._thresholdSide = null; return; }

    const currentSide = grandTotal >= 1_000_000 ? 'over' : 'under';
    if (state._thresholdSide === null) {
      state._thresholdSide = currentSide; // 初回は通知せずに初期化
      return;
    }
    if (state._thresholdSide === currentSide) return;
    state._thresholdSide = currentSide;

    if (isSagyo && currentSide === 'over') {
      showCategoryChangeDialog('工事（100万超）', grandTotal);
    } else if (isKouji && currentSide === 'under') {
      showCategoryChangeDialog('作業（100万以下）', grandTotal);
    }
  }

  function showCategoryChangeDialog(newCategory, grandTotal) {
    _pendingCategoryChange = newCategory;
    const msgEl = document.getElementById('categoryChangeModalMsg');
    if (msgEl) {
      msgEl.innerHTML =
        `見積金額が <strong>¥${grandTotal.toLocaleString('ja-JP')}</strong> になりました。<br>` +
        `見積区分を「<strong>${state.quoteCategory}</strong>」から` +
        `「<strong>${newCategory}</strong>」に変更しますか？`;
    }
    const seqNoteEl = document.getElementById('categoryChangeSeqNote');
    if (seqNoteEl) {
      seqNoteEl.textContent = state.seqNo
        ? `採番「${state.seqNo}」はクリアされます。`
        : '';
    }
    const modal = document.getElementById('categoryChangeModal');
    if (modal) modal.style.display = 'flex';
  }

  function confirmCategoryChange() {
    const newCategory = _pendingCategoryChange;
    if (!newCategory) return;
    _pendingCategoryChange = null;
    const modal = document.getElementById('categoryChangeModal');
    if (modal) modal.style.display = 'none';

    state.quoteCategory  = newCategory;
    state.seqNo          = '';
    state.koujiCategory  = '';
    state._thresholdSide = null; // 次回 updateOutput() で再初期化

    const catEl = document.getElementById('quoteCategoryDisplay');
    if (catEl) catEl.value = state.quoteCategory || '';
    initColVisibility();
    applyStateToForm(); // 採番UI・カテゴリ依存UIを一括更新
    updateOutput();

    try { ZDK.Page.getField('field63').setValue(newCategory); } catch(e) { console.warn('[category] ZDK setValue failed', e); }
  }

  function onCategorySelectChange(newCategory) {
    if (!newCategory || newCategory === state.quoteCategory) return;
    state.quoteCategory  = newCategory;
    state.seqNo          = '';
    state.koujiCategory  = '';
    state._thresholdSide = null;

    const catEl = document.getElementById('quoteCategoryDisplay');
    if (catEl) catEl.value = state.quoteCategory || '';
    initColVisibility();
    applyStateToForm();
    updateOutput();

    try { ZDK.Page.getField('field63').setValue(newCategory); } catch(e) { console.warn('[category] ZDK setValue failed', e); }
  }

  function declineCategoryChange() {
    _pendingCategoryChange = null;
    const modal = document.getElementById('categoryChangeModal');
    if (modal) modal.style.display = 'none';
    // _thresholdSide は変更済みのため、同じ側に留まる限り再表示しない
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
    state.customerHonorific = getValue('customerHonorific') || '御中';
    state.contactName    = getValue('contactName') || '';
    state.contactHonorific = getValue('contactHonorific') || '様';
    state.projectName    = getValue('projectName');
    state.projectName2   = getValue('projectName2') || '';
    state.projectName3   = getValue('projectName3') || '';
    state.ownerName      = getValue('ownerName');
    state.updaterName    = getValue('updaterName') || '';
    state.shochoName     = getValue('shochoName')  || '';
    state.deliveryTerm   = getValue('deliveryTerm');
    state.deliveryMethod = getValue('deliveryMethod');
    state.paymentTerm    = getValue('paymentTerm');
    state.validDays      = getValue('validDays') || '';
    state.remarks        = getValue('remarks') || '';
    state.remarkTableEnabled = document.getElementById('remarkTableEnabled')?.checked || false;
    state.discount       = Number(getValue('discountAmount')) || 0;
    state.laborCost      = getValue('laborCost') ? Number(getValue('laborCost')) : null;
    state.anzenCost      = Number(getValue('anzenCost')) || 0;
    state.legalWelfareRate = Number(getValue('legalWelfareRate')) || 14.6;
    state.branchKey      = getValue('branchSelect');
    const dateVal = getValue('quoteDate');
    state.submitDate = dateVal ? new Date(dateVal) : null;
    state.date = state.submitDate || null;
    // 掛率入力欄の現在値を state へ反映（適用ボタン未押しでも保存対象にする）
    const _rMain = parseFloat(document.getElementById('rateMain')?.value);
    if (!isNaN(_rMain) && _rMain > 0) state.mainRate = _rMain;
    const _rItem = parseFloat(document.getElementById('rateItem')?.value);
    if (!isNaN(_rItem) && _rItem > 0) state.itemRate = _rItem;
    const _rParts = parseFloat(document.getElementById('rateParts')?.value);
    if (!isNaN(_rParts) && _rParts > 0) state.partsRate = _rParts;
    const _rPurchase = parseFloat(document.getElementById('ratePurchase')?.value);
    if (!isNaN(_rPurchase) && _rPurchase > 0) state.purchaseRate = _rPurchase;
  }

  // ── カスタム確認ダイアログ（confirm()はZoho blob URL環境でブロックされるため使用不可）──
  function showCustomConfirm(message, okLabel) {
    return new Promise(resolve => {
      const modal   = document.getElementById('customConfirmModal');
      const msgEl   = document.getElementById('customConfirmMessage');
      const okBtn   = document.getElementById('customConfirmOk');
      const cancelBtn = document.getElementById('customConfirmCancel');
      if (!modal) { resolve(true); return; }
      msgEl.textContent = message;
      okBtn.textContent = okLabel || 'OK';
      modal.style.display = 'flex';
      function cleanup() {
        modal.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
      }
      function onOk()      { cleanup(); resolve(true);  }
      function onCancel()  { cleanup(); resolve(false); }
      function onBackdrop(e) { if (e.target === modal) { cleanup(); resolve(false); } }
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
    });
  }

  // ── PDF 生成 ─────────────────────────────────────────────────

  function showPdfAddressDialog() {
    return new Promise(resolve => {
      const modal = document.getElementById('pdfAddressModal');
      if (!modal) { resolve({ override: false }); return; }
      document.getElementById('pdfAddressCompany').value   = state.customerName    || '';
      document.getElementById('pdfAddressContact').value   = state.contactName     || '';
      document.getElementById('pdfAddressHonorific').value = state.contactHonorific || '様';
      const rate96El = document.getElementById('pdfAddressRate96');
      if (rate96El) rate96El.checked = false; // 初期値は常にOFF
      modal.style.display = '';
      const cleanup = result => { modal.style.display = 'none'; resolve(result); };
      const getRate96 = () => !!(document.getElementById('pdfAddressRate96')?.checked);
      document.getElementById('pdfAddressCancel').onclick   = () => cleanup(null);
      document.getElementById('pdfAddressDefault').onclick  = () => cleanup({ override: false, applyRate96: getRate96() });
      document.getElementById('pdfAddressOverride').onclick = () => cleanup({
        override:         true,
        applyRate96:      getRate96(),
        customerName:     document.getElementById('pdfAddressCompany').value.trim(),
        contactName:      document.getElementById('pdfAddressContact').value.trim() || undefined,
        contactHonorific: document.getElementById('pdfAddressHonorific').value || '様',
      });
    });
  }

  async function generatePDF(mode = 'detail') {
    readFormToState();

    if (!state.seqNo) {
      if (!confirm('見積番号が未設定です。このまま生成しますか？')) return;
    }

    const _adjWarn = (state.discountEnabled !== false) ? (Number(getValue('discountAmount')) || 0) : 0;
    if (_adjWarn !== 0) {
      const ok = await showCustomConfirm('調整額が投入されています！\nこのまま印刷しますか？', 'このまま印刷');
      if (!ok) return;
    }

    // 原価未入力チェック（停止中）
    // const missingGenkaItems = state.sections.flatMap(sec =>
    //   (sec.items || []).filter(item => !item.genka).map(item => item.name || '（名称未入力）')
    // );
    // if (missingGenkaItems.length > 0) {
    //   const list = missingGenkaItems.map((n, i) => `${i + 1}. ${n}`).join('\n');
    //   if (!confirm(`原価が未入力の項目が ${missingGenkaItems.length} 件あります。\n\n${list}\n\nこのまま印刷しますか？`)) return;
    // }

    const addrResult = await showPdfAddressDialog();
    if (!addrResult) return;

    const btnSimple = document.getElementById('btnSimplePDF');
    const btnDetail = document.getElementById('btnDetailPDF');
    const btn = mode === 'simple' ? btnSimple : btnDetail;
    if (btnSimple) btnSimple.disabled = true;
    if (btnDetail) btnDetail.disabled = true;
    if (btn) btn.textContent = '⏳ 生成中...';
    const statusEl = document.getElementById('pdfStatus');
    statusEl.textContent = '';

    try {
      updateOutput();
      const data = buildPdfData(mode);
      if (addrResult.override) {
        data.customerName     = addrResult.customerName;
        data.contactName      = addrResult.contactName;
        data.contactHonorific = addrResult.contactHonorific;
        data.showContactName  = !!addrResult.contactName;
      }
      if (addrResult.applyRate96) {
        // 96%適用の警告メッセージ
        const confirmApply = await showCustomConfirm(
          '96%掛率を適用すると、印刷データと保存データの金額が異なります。\nよろしいですか？',
          'このまま出力'
        );
        if (!confirmApply) {
          if (btnSimple) { btnSimple.disabled = false; btnSimple.textContent = '📄 簡略印刷'; }
          if (btnDetail) { btnDetail.disabled = false; btnDetail.textContent = '📋 詳細印刷'; }
          return;
        }

        const r96 = 0.96;
        data.mainRate = r96;

        // FRPモードの場合はfrpItemsに96%を適用
        if (state.frpMode) {
          data.frpItems = (state.frpItems || []).map(item => {
            // 送料は96%適用の対象外
            const isSouryo = item.type === 'soryo';
            if (isSouryo) {
              return { ...item };
            } else {
              // それ以外の行は96%を適用
              return {
                ...item,
                frpRate: r96,
                priceA: Math.round((item.price || 0) * r96),
                priceB: Math.round((item.price || 0) * r96),
              };
            }
          });
        } else {
          // 通常モードの場合はsectionsに96%を適用
          data.sections = (state.sections || []).map(sec => ({
            ...sec,
            items: (sec.items || []).map(item => {
              // 手入力した代理店単価と送料は96%適用の対象外
              const isManual = item._dairiManual === true;
              const isSouryo = (item.name || '').includes('送料') || (item.name || '').includes('諸経費');

              if (isManual || isSouryo) {
                // 手入力値または送料はそのまま維持
                return { ...item };
              } else {
                // 自動計算の行のみ96%を適用
                return {
                  ...item,
                  dairiRate:      r96,
                  dairiUnitPrice: null,
                  _dairiManual:   false,
                  finalDairiUnit: null,
                };
              }
            }),
          }));
        }

        const dairiTotal96 = data.sections.reduce((sum, sec) => {
          const secQty = Math.max(1, Number(sec.secQty) || 1);
          const sub = (sec.items || []).reduce((ss, item) => {
            const qty  = Number(item.qty) || 1;
            const base = item.unitPrice != null ? item.unitPrice
              : (item.amount != null ? Math.round(Number(item.amount) / qty) : null);
            return ss + (base != null ? Math.round(base * r96) * qty : 0);
          }, 0);
          return sum + sub * secQty;
        }, 0);
        const grandTotal96     = state.grandTotal || dairiTotal96;
        const adjustAmount96   = state.adjustAmount || 0;
        const waribikiAmount96 = Math.max(0, grandTotal96 - dairiTotal96);
        data.dairiTotal     = dairiTotal96;
        data.waribikiAmount = waribikiAmount96;
        data.discount       = waribikiAmount96 + adjustAmount96;
        data.deliveryPrice  = Math.max(0, dairiTotal96 - adjustAmount96);
      }
      const blob = await QuotationPDF.getBlob(data);
      const quoteNo  = data.quoteNoStr || data.seqNo || '未採番';
      const suffix   = mode === 'simple' ? '簡略' : '詳細';
      const fname    = `御見積書_${suffix}_${quoteNo}_${data.customerName || ''}.pdf`;
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
      if (btnSimple) { btnSimple.disabled = false; btnSimple.textContent = '📄 簡略印刷'; }
      if (btnDetail) { btnDetail.disabled = false; btnDetail.textContent = '📋 詳細印刷'; }
    }
  }

  let _pdfPreviewObjectUrl = null;

  async function previewPDF(mode = 'detail') {
    readFormToState();

    const _adjWarn = (state.discountEnabled !== false) ? (Number(getValue('discountAmount')) || 0) : 0;
    if (_adjWarn !== 0) {
      const ok = await showCustomConfirm('調整額が投入されています！\nこのままプレビューしますか？', 'このままプレビュー');
      if (!ok) return;
    }

    // プレビューでも宛先変更ダイアログを表示（96%適用の選択を可能に）
    const addrResult = await showPdfAddressDialog();
    if (!addrResult) return;

    // 96%適用の警告メッセージ（モーダル表示前に確認）
    if (addrResult.applyRate96) {
      const confirmApply = await showCustomConfirm(
        '96%掛率を適用すると、印刷データと保存データの金額が異なります。\nよろしいですか？',
        'このまま出力'
      );
      if (!confirmApply) return;
    }

    const modal   = document.getElementById('pdfPreviewModal');
    const frame   = document.getElementById('pdfPreviewFrame');
    const loading = document.getElementById('pdfPreviewLoading');
    if (!modal || !frame || !loading) return;

    modal.style.display = 'flex';
    loading.style.display = 'flex';
    frame.style.display  = 'none';
    frame.src = '';

    if (_pdfPreviewObjectUrl) { URL.revokeObjectURL(_pdfPreviewObjectUrl); _pdfPreviewObjectUrl = null; }

    try {
      updateOutput();
      const data = buildPdfData(mode);

      // 宛先変更の適用
      if (addrResult.override) {
        data.customerName     = addrResult.customerName;
        data.contactName      = addrResult.contactName;
        data.contactHonorific = addrResult.contactHonorific;
        data.showContactName  = !!addrResult.contactName;
      }

      // 96%適用の処理（generatePDF と同じロジック）
      if (addrResult.applyRate96) {
        const r96 = 0.96;
        data.mainRate = r96;

        // FRPモードの場合はfrpItemsに96%を適用
        if (state.frpMode) {
          data.frpItems = (state.frpItems || []).map(item => {
            // 送料は96%適用の対象外
            const isSouryo = item.type === 'soryo';
            if (isSouryo) {
              return { ...item };
            } else {
              // それ以外の行は96%を適用
              return {
                ...item,
                frpRate: r96,
                priceA: Math.round((item.price || 0) * r96),
                priceB: Math.round((item.price || 0) * r96),
              };
            }
          });
        } else {
          // 通常モードの場合はsectionsに96%を適用
          data.sections = (state.sections || []).map(sec => ({
            ...sec,
            items: (sec.items || []).map(item => {
              const isManual = item._dairiManual === true;
              const isSouryo = (item.name || '').includes('送料') || (item.name || '').includes('諸経費');
              if (isManual || isSouryo) {
                return { ...item };
              } else {
                return {
                  ...item,
                  dairiRate:      r96,
                  dairiUnitPrice: null,
                  _dairiManual:   false,
                  finalDairiUnit: null,
                };
              }
            }),
          }));
        }

        const dairiTotal96 = data.sections.reduce((sum, sec) => {
          const secQty = Math.max(1, Number(sec.secQty) || 1);
          const sub = (sec.items || []).reduce((ss, item) => {
            const qty  = Number(item.qty) || 1;
            const base = item.unitPrice != null ? item.unitPrice
              : (item.amount != null ? Math.round(Number(item.amount) / qty) : null);
            return ss + (base != null ? Math.round(base * r96) * qty : 0);
          }, 0);
          return sum + sub * secQty;
        }, 0);
        const grandTotal96     = state.grandTotal || dairiTotal96;
        const adjustAmount96   = state.adjustAmount || 0;
        const waribikiAmount96 = Math.max(0, grandTotal96 - dairiTotal96);
        data.dairiTotal     = dairiTotal96;
        data.waribikiAmount = waribikiAmount96;
        data.discount       = waribikiAmount96 + adjustAmount96;
        data.deliveryPrice  = Math.max(0, dairiTotal96 - adjustAmount96);
      }

      const blob = await QuotationPDF.getBlob(data);
      _pdfPreviewObjectUrl = URL.createObjectURL(blob);
      frame.src = _pdfPreviewObjectUrl;
      loading.style.display = 'none';
      frame.style.display   = 'block';
    } catch (e) {
      console.error('PDF プレビューエラー:', e);
      loading.textContent = '❌ PDF生成失敗: ' + e.message;
    }
  }

  function closePdfPreview() {
    const modal = document.getElementById('pdfPreviewModal');
    const frame = document.getElementById('pdfPreviewFrame');
    const loading = document.getElementById('pdfPreviewLoading');
    if (modal)   modal.style.display = 'none';
    if (frame)   { frame.src = ''; frame.style.display = 'none'; }
    if (loading) { loading.style.display = 'flex'; loading.textContent = '⏳ PDF生成中...'; }
    if (_pdfPreviewObjectUrl) { URL.revokeObjectURL(_pdfPreviewObjectUrl); _pdfPreviewObjectUrl = null; }
  }

  function collectPdfSettings() {
    const getChk   = id => { const el = document.getElementById(id); return el ? el.checked : undefined; };
    const getRadio = name => document.querySelector(`input[name="${name}"]:checked`)?.value;
    return {
      printPageMode:            getRadio('printPageMode')            || 'detail',
      printNaiyaku:             getChk('printNaiyaku'),
      printShocho:              getChk('printShocho'),
      printTaxIncluded:         getChk('printTaxIncluded'),
      printProductCodeCover:    getChk('printProductCodeCover'),
      productCodeCoverPosition: getRadio('productCodeCoverPosition') || 'right',
      printProductCode:         getChk('printProductCode'),
      productCodePosition:      getRadio('productCodePosition')      || 'right',
      printBikou:               getChk('printBikou'),
      printTeikaTotal:          getChk('printTeikaTotal'),
      printSubtotalBoth:        getChk('printSubtotalBoth'),
      useBuppanDeliveryLabel:   getChk('useBuppanDeliveryLabel'),
      pdfPriceMode:             getRadio('pdfPriceMode')             || 'teika',
      pdfPriceModeKouji:        getRadio('pdfPriceModeKouji')        || 'teika',
      dateFormat:               document.getElementById('dateFormat')?.value || 'seireki',
    };
  }

  function applyPdfSettings(s) {
    const setChk = (id, val) => { if (val === undefined) return; const el = document.getElementById(id); if (el) el.checked = val; };
    const setRadio = (name, val) => {
      if (!val) return;
      document.querySelectorAll(`input[name="${name}"]`).forEach(r => { r.checked = r.value === val; });
    };
    setRadio('printPageMode', s.printPageMode);
    setChk('printNaiyaku', s.printNaiyaku);
    setChk('printShocho', s.printShocho);
    setChk('printTaxIncluded', s.printTaxIncluded);
    if (s.printProductCodeCover !== undefined) {
      setChk('printProductCodeCover', s.printProductCodeCover);
      const grp = document.getElementById('productCodeCoverPositionGroup');
      if (grp) grp.style.display = s.printProductCodeCover ? '' : 'none';
    }
    setRadio('productCodeCoverPosition', s.productCodeCoverPosition);
    if (s.printProductCode !== undefined) {
      setChk('printProductCode', s.printProductCode);
      const grp = document.getElementById('productCodePositionGroup');
      if (grp) grp.style.display = s.printProductCode ? '' : 'none';
    }
    setRadio('productCodePosition', s.productCodePosition);
    setChk('printBikou', s.printBikou);
    setChk('printTeikaTotal', s.printTeikaTotal);
    setChk('printSubtotalBoth', s.printSubtotalBoth);
    setChk('useBuppanDeliveryLabel', s.useBuppanDeliveryLabel);
    setRadio('pdfPriceMode', s.pdfPriceMode);
    setRadio('pdfPriceModeKouji', s.pdfPriceModeKouji);
    const dfEl = document.getElementById('dateFormat');
    if (dfEl && s.dateFormat) dfEl.value = s.dateFormat;
  }

  function exportCsv() {
    if (!state.sections || state.sections.length === 0) {
      showToast('明細がありません', 'warn');
      return;
    }

    const mainRate = state.mainRate ?? 0;

    const headers = [
      '大項目No', '大項目名', 'カテゴリ',
      '品名', '型式', '品目コード',
      '数量', '単位',
      '単価', '金額',
      '仕切単価', '仕切金額',
      '原価', '計算区分',
    ];

    const rows = [headers];
    state.sections.forEach(sec => {
      (sec.items || []).forEach(item => {
        if (!item.name && !item.spec && !item.unitPrice && !item.amount) return;
        const rate = item.dairiRate ?? mainRate;
        const dairiUnit = item.dairiUnitPrice != null
          ? item.dairiUnitPrice
          : (item.unitPrice != null ? Math.round(item.unitPrice * rate) : '');
        const dairiAmount = (dairiUnit !== '' && item.qty != null)
          ? Math.round(Number(dairiUnit) * Number(item.qty))
          : '';
        rows.push([
          sec.no ?? '',
          sec.name ?? '',
          sec.cat  ?? '',
          item.name        ?? '',
          item.spec        ?? '',
          item.productCode ?? '',
          item.qty         ?? '',
          item.unit        ?? '',
          item.unitPrice   ?? '',
          item.amount      ?? '',
          dairiUnit,
          dairiAmount,
          item.genka       ?? '',
          item.calcCategory ?? '',
        ]);
      });
    });

    const csv = rows.map(r =>
      r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const quoteNo = state.seqNo || '';
    const customer = state.customerName || getValue('customerName') || '';
    const filename = [quoteNo, customer, '明細'].filter(Boolean).join('_') + '.csv';

    const blob = new Blob(['﻿' + csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Excel出力（ExcelJS使用） - 複数シート対応 */
  async function exportExcel() {
    if (!state.sections || state.sections.length === 0) {
      showToast('明細がありません', 'warn');
      return;
    }

    try {
      // ヘルパー関数
      const getRadio = name => document.querySelector(`input[name="${name}"]:checked`)?.value;

      // ExcelJS Workbook作成
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ネポン株式会社';
      workbook.created = new Date();

      // シート1: 鏡ページ（セクション小計 + 内訳）
      const wsCover = workbook.addWorksheet('鏡ページ', {
        pageSetup: { paperSize: 9, orientation: 'portrait' },
        views: [{ showGridLines: false }]
      });

      // シート2: 明細ページ（全明細行）
      const wsDetail = workbook.addWorksheet('明細ページ', {
        pageSetup: { paperSize: 9, orientation: 'portrait' },
        views: [{ showGridLines: false }]
      });

      // ===== 共通データ取得 =====
      const customer = state.customerName || '';
      const customerHonorific = state.customerHonorific || '御中';
      const contactName = state.contactName || '';
      const contactHonorific = state.contactHonorific || '様';
      const projectName = state.projectName || '';
      const dateStr = state.submitDate || state.date || '';

      // 価格モード判定
      const cat = state.quoteCategory || '';
      const priceModeName = (!state.frpMode && cat.includes('工事')) ? 'pdfPriceModeKouji' : 'pdfPriceMode';
      const pdfPriceMode = getRadio(priceModeName) || 'teika';
      const mainRate = state.mainRate ?? 0;
      const isDairiMode = pdfPriceMode !== 'teika' && mainRate > 0;

      // 品目コード表示判定
      const showProductCode = (() => {
        const cb = document.getElementById('printProductCode');
        return cb ? cb.checked : false;
      })();

      // 合計金額計算
      const grandTotal = state.sections.reduce((sum, s) => {
        const sQty = Number(s.secQty) || 1;
        const subtotal = (s.items || []).reduce((itemSum, item) => itemSum + (Number(item.amount) || 0), 0);
        return sum + (subtotal * sQty);
      }, 0);

      // 代理店価格合計
      const dairiGrandTotal = isDairiMode ? state.sections.reduce((sum, s) => {
        const sQty = Number(s.secQty) || 1;
        const dairiSubtotal = (s.items || []).reduce((itemSum, item) => {
          const rate = item.dairiRate ?? mainRate;
          const dairiUnit = item.dairiUnitPrice != null
            ? item.dairiUnitPrice
            : (item.unitPrice != null ? Math.round(item.unitPrice * rate) : 0);
          const qty = Number(item.qty) || 1;
          return itemSum + (dairiUnit * qty);
        }, 0);
        return sum + (dairiSubtotal * sQty);
      }, 0) : 0;

      // 内訳計算
      const deliveryPrice = Number(state.deliveryPrice) || grandTotal;

      // 労務費・法定福利費計算（画面表示と同じロジック）
      const legalRate = (Number(state.legalWelfareRate) || 14.6) / 100;
      const useTeikaForKouji = ['teika', 'dairi-discount'].includes(pdfPriceMode);
      const koujihi = state.sections.reduce((sum, s) =>
        sum + s.items.reduce((ss, i) => {
          if (!i.includeInLabor) return ss;
          const r = i.dairiRate ?? state.mainRate;
          const amt = Number(i.amount) || 0;
          return ss + (!useTeikaForKouji && r != null ? Math.round(amt * r) : amt);
        }, 0), 0);

      const manualLaborCost = state.laborCost != null ? state.laborCost : 0;
      const laborCost = manualLaborCost > 0
        ? manualLaborCost
        : Math.round(koujihi / (1 + legalRate));
      const legalWelfare = manualLaborCost > 0
        ? Math.round(manualLaborCost * legalRate)
        : koujihi - laborCost;
      const anzenCost = Number(state.anzenCost) || 0;
      const uchiwakeBase = isDairiMode ? dairiGrandTotal : deliveryPrice;
      const materialCost = uchiwakeBase - laborCost - legalWelfare - anzenCost;

      // ===== シート1: 鏡ページ =====
      let currentRow = 1;

      // ===== ヘッダー部分 =====
      wsCover.getCell(`A${currentRow}`).value = '御見積書';
      wsCover.getCell(`A${currentRow}`).font = { size: 18, bold: true, name: 'メイリオ' };
      wsCover.mergeCells(`A${currentRow}:F${currentRow}`);
      wsCover.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
      currentRow += 2;

      // 顧客情報
      wsCover.getCell(`A${currentRow}`).value = `${customer} ${customerHonorific}`;
      wsCover.getCell(`A${currentRow}`).font = { size: 12, bold: true };
      currentRow++;

      if (contactName) {
        wsCover.getCell(`A${currentRow}`).value = `${contactName} ${contactHonorific}`;
        wsCover.getCell(`A${currentRow}`).font = { size: 11 };
        currentRow++;
      }

      currentRow++;

      // 工事名
      if (projectName) {
        wsCover.getCell(`A${currentRow}`).value = `工事名: ${projectName}`;
        wsCover.getCell(`A${currentRow}`).font = { size: 11 };
        currentRow++;
      }

      // 見積金額
      const displayTotal = isDairiMode ? dairiGrandTotal : grandTotal;
      wsCover.getCell(`A${currentRow}`).value = `見積金額: ¥${displayTotal.toLocaleString()}`;
      wsCover.getCell(`A${currentRow}`).font = { size: 14, bold: true };
      currentRow++;

      // 日付
      if (dateStr) {
        wsCover.getCell(`A${currentRow}`).value = `日付: ${dateStr}`;
        wsCover.getCell(`A${currentRow}`).font = { size: 10 };
        currentRow++;
      }

      currentRow += 2;

      // ===== シート1: セクション小計テーブル =====
      // ヘッダー行
      const coverHeaders = isDairiMode
        ? ['No.', '項目', '数量', '単位', '単価', '合計', '仕切単価', '仕切合計']
        : ['No.', '項目', '数量', '単位', '単価', '合計'];

      coverHeaders.forEach((h, idx) => {
        const col = String.fromCharCode(65 + idx);
        const cell = wsCover.getCell(`${col}${currentRow}`);
        cell.value = h;
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      currentRow++;

      // セクション小計行
      state.sections.forEach((sec, sIdx) => {
        const sQty = Number(sec.secQty) || 1;
        const subtotal = (sec.items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const secTotal = subtotal * sQty;

        const dairiSubtotal = isDairiMode ? (sec.items || []).reduce((sum, item) => {
          const rate = item.dairiRate ?? mainRate;
          const dairiUnit = item.dairiUnitPrice != null
            ? item.dairiUnitPrice
            : (item.unitPrice != null ? Math.round(item.unitPrice * rate) : 0);
          const qty = Number(item.qty) || 1;
          return sum + (dairiUnit * qty);
        }, 0) : 0;
        const secDairiTotal = dairiSubtotal * sQty;

        const row = wsCover.getRow(currentRow);
        row.getCell(1).value = sec.no || sIdx + 1;
        row.getCell(2).value = sec.name || '';
        row.getCell(3).value = sQty;
        row.getCell(4).value = '式';
        row.getCell(5).value = subtotal;
        row.getCell(6).value = secTotal;

        if (isDairiMode) {
          row.getCell(7).value = dairiSubtotal;
          row.getCell(8).value = secDairiTotal;
        }

        // 数値書式
        row.getCell(5).numFmt = '#,##0';
        row.getCell(6).numFmt = '#,##0';
        if (isDairiMode) {
          row.getCell(7).numFmt = '#,##0';
          row.getCell(8).numFmt = '#,##0';
        }

        // 罫線
        const maxColCover = isDairiMode ? 8 : 6;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (colNumber <= maxColCover) {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          }
        });

        // 配置
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'left' };
        row.getCell(3).alignment = { horizontal: 'right' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'right' };
        row.getCell(6).alignment = { horizontal: 'right' };
        if (isDairiMode) {
          row.getCell(7).alignment = { horizontal: 'right' };
          row.getCell(8).alignment = { horizontal: 'right' };
        }

        currentRow++;
      });

      // 合計行（シート1）
      const coverTotalRow = wsCover.getRow(currentRow);
      wsCover.mergeCells(`A${currentRow}:E${currentRow}`);
      coverTotalRow.getCell(1).value = '合計';
      coverTotalRow.getCell(1).font = { bold: true, size: 12 };
      coverTotalRow.getCell(1).alignment = { horizontal: 'right' };
      coverTotalRow.getCell(6).value = displayTotal;
      coverTotalRow.getCell(6).numFmt = '#,##0';
      coverTotalRow.getCell(6).font = { bold: true, size: 12 };
      coverTotalRow.getCell(6).alignment = { horizontal: 'right' };

      if (isDairiMode) {
        coverTotalRow.getCell(8).value = dairiGrandTotal;
        coverTotalRow.getCell(8).numFmt = '#,##0';
        coverTotalRow.getCell(8).font = { bold: true, size: 12 };
        coverTotalRow.getCell(8).alignment = { horizontal: 'right' };
      }

      const maxColCover = isDairiMode ? 8 : 6;
      coverTotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= maxColCover) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9D9D9' }
          };
          cell.border = {
            top: { style: 'medium' },
            left: { style: 'thin' },
            bottom: { style: 'medium' },
            right: { style: 'thin' }
          };
        }
      });

      currentRow += 2;

      // ===== 内訳 =====
      wsCover.getCell(`A${currentRow}`).value = '内訳';
      wsCover.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      currentRow++;

      const uchiwakeRows = [
        ['資材費', materialCost],
        ['労務費', laborCost],
        ['法定福利費', legalWelfare],
        ['安全費', anzenCost]
      ];

      uchiwakeRows.forEach(([label, value]) => {
        const row = wsCover.getRow(currentRow);
        wsCover.mergeCells(`A${currentRow}:E${currentRow}`);
        row.getCell(1).value = label;
        row.getCell(1).alignment = { horizontal: 'right' };
        row.getCell(6).value = value;
        row.getCell(6).numFmt = '#,##0';
        row.getCell(6).alignment = { horizontal: 'right' };
        currentRow++;
      });

      // 列幅設定（シート1）
      wsCover.getColumn(1).width = 6;
      wsCover.getColumn(2).width = 40;
      wsCover.getColumn(3).width = 8;
      wsCover.getColumn(4).width = 8;
      wsCover.getColumn(5).width = 15;
      wsCover.getColumn(6).width = 15;
      if (isDairiMode) {
        wsCover.getColumn(7).width = 15;
        wsCover.getColumn(8).width = 15;
      }

      // ===== シート2: 明細ページ =====
      let detailRow = 1;

      // ヘッダー
      wsDetail.getCell(`A${detailRow}`).value = '見積明細';
      wsDetail.getCell(`A${detailRow}`).font = { size: 16, bold: true, name: 'メイリオ' };
      wsDetail.mergeCells(`A${detailRow}:F${detailRow}`);
      wsDetail.getCell(`A${detailRow}`).alignment = { horizontal: 'center' };
      detailRow += 2;

      // テーブルヘッダー
      const detailHeaders = showProductCode
        ? (isDairiMode
          ? ['No.', '品目コード', '項目', '数量', '単位', '単価', '合計', '仕切単価', '仕切合計']
          : ['No.', '品目コード', '項目', '数量', '単位', '単価', '合計'])
        : (isDairiMode
          ? ['No.', '項目', '数量', '単位', '単価', '合計', '仕切単価', '仕切合計']
          : ['No.', '項目', '数量', '単位', '単価', '合計']);

      detailHeaders.forEach((h, idx) => {
        const col = String.fromCharCode(65 + idx);
        const cell = wsDetail.getCell(`${col}${detailRow}`);
        cell.value = h;
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      detailRow++;

      // 明細行
      let itemNo = 1;
      const maxColDetail = (showProductCode ? 1 : 0) + (isDairiMode ? 8 : 6);
      const colOffset = showProductCode ? 1 : 0;

      state.sections.forEach((sec, sIdx) => {
        // セクションヘッダー
        if (sec.name && sec.name.trim()) {
          const cell = wsDetail.getCell(`A${detailRow}`);
          cell.value = `${sec.no || sIdx + 1}. ${sec.name}`;
          cell.font = { bold: true, size: 11 };
          const mergeEnd = String.fromCharCode(64 + maxColDetail);
          wsDetail.mergeCells(`A${detailRow}:${mergeEnd}${detailRow}`);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE7E6E6' }
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          detailRow++;
        }

        // アイテム行
        (sec.items || []).forEach(item => {
          if (!item.name && !item.unitPrice && !item.amount) return;

          const row = wsDetail.getRow(detailRow);
          let col = 1;
          row.getCell(col++).value = itemNo++;
          if (showProductCode) row.getCell(col++).value = item.productCode || '';
          row.getCell(col++).value = item.name || '';
          row.getCell(col++).value = item.qty || '';
          row.getCell(col++).value = item.unit || '';
          row.getCell(col++).value = item.unitPrice || '';
          row.getCell(col++).value = item.amount || '';

          if (isDairiMode) {
            const rate = item.dairiRate ?? mainRate;
            const dairiUnit = item.dairiUnitPrice != null
              ? item.dairiUnitPrice
              : (item.unitPrice != null ? Math.round(item.unitPrice * rate) : '');
            const dairiAmount = (dairiUnit !== '' && item.qty != null)
              ? Math.round(Number(dairiUnit) * Number(item.qty))
              : '';
            row.getCell(col++).value = dairiUnit;
            row.getCell(col++).value = dairiAmount;

            if (dairiUnit) row.getCell(col - 2).numFmt = '#,##0';
            if (dairiAmount) row.getCell(col - 1).numFmt = '#,##0';
          }

          // 数値書式
          const priceCol = 2 + colOffset + 3;
          const amountCol = 2 + colOffset + 4;
          if (item.unitPrice) row.getCell(priceCol).numFmt = '#,##0';
          if (item.amount) row.getCell(amountCol).numFmt = '#,##0';

          // 罫線
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= maxColDetail) {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
            }
          });

          // 配置
          row.getCell(1).alignment = { horizontal: 'center' };
          if (showProductCode) row.getCell(2).alignment = { horizontal: 'left' };
          row.getCell(2 + colOffset).alignment = { horizontal: 'left' };
          row.getCell(3 + colOffset).alignment = { horizontal: 'right' };
          row.getCell(4 + colOffset).alignment = { horizontal: 'center' };
          row.getCell(5 + colOffset).alignment = { horizontal: 'right' };
          row.getCell(6 + colOffset).alignment = { horizontal: 'right' };
          if (isDairiMode) {
            row.getCell(7 + colOffset).alignment = { horizontal: 'right' };
            row.getCell(8 + colOffset).alignment = { horizontal: 'right' };
          }

          detailRow++;
        });
      });

      // 合計行（シート2）
      const detailTotalRow = wsDetail.getRow(detailRow);
      const detailMergeTo = (showProductCode ? 1 : 0) + (isDairiMode ? 7 : 5);
      const detailMergeToCol = String.fromCharCode(64 + detailMergeTo);
      wsDetail.mergeCells(`A${detailRow}:${detailMergeToCol}${detailRow}`);
      detailTotalRow.getCell(1).value = '合計';
      detailTotalRow.getCell(1).font = { bold: true, size: 12 };
      detailTotalRow.getCell(1).alignment = { horizontal: 'right' };
      const detailTotalCol = 6 + colOffset;
      detailTotalRow.getCell(detailTotalCol).value = grandTotal;
      detailTotalRow.getCell(detailTotalCol).numFmt = '#,##0';
      detailTotalRow.getCell(detailTotalCol).font = { bold: true, size: 12 };
      detailTotalRow.getCell(detailTotalCol).alignment = { horizontal: 'right' };

      if (isDairiMode) {
        const detailDairiTotalCol = 8 + colOffset;
        detailTotalRow.getCell(detailDairiTotalCol).value = dairiGrandTotal;
        detailTotalRow.getCell(detailDairiTotalCol).numFmt = '#,##0';
        detailTotalRow.getCell(detailDairiTotalCol).font = { bold: true, size: 12 };
        detailTotalRow.getCell(detailDairiTotalCol).alignment = { horizontal: 'right' };
      }

      detailTotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= maxColDetail) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9D9D9' }
          };
          cell.border = {
            top: { style: 'medium' },
            left: { style: 'thin' },
            bottom: { style: 'medium' },
            right: { style: 'thin' }
          };
        }
      });

      // 列幅設定（シート2）
      let detailColIdx = 1;
      wsDetail.getColumn(detailColIdx++).width = 6;
      if (showProductCode) wsDetail.getColumn(detailColIdx++).width = 15;
      wsDetail.getColumn(detailColIdx++).width = 40;
      wsDetail.getColumn(detailColIdx++).width = 8;
      wsDetail.getColumn(detailColIdx++).width = 8;
      wsDetail.getColumn(detailColIdx++).width = 15;
      wsDetail.getColumn(detailColIdx++).width = 15;
      if (isDairiMode) {
        wsDetail.getColumn(detailColIdx++).width = 15;
        wsDetail.getColumn(detailColIdx++).width = 15;
      }

      // ===== ファイル出力 =====
      const buffer = await workbook.xlsx.writeBuffer();

      const quoteNo = state.seqNo || '';
      const filename = [quoteNo, customer, '見積書'].filter(Boolean).join('_') + '.xlsx';

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);

      showToast('Excel出力が完了しました', 'success');

    } catch (err) {
      console.error('[Excel出力エラー]', err);
      showToast('Excel出力に失敗しました: ' + err.message, 'error');
    }
  }

  /** PDF 生成用データオブジェクトを組み立てる */
  function buildPdfData(mode = 'detail') {
    collectExclusions();
    return {
      seqNo:           state.seqNo,
      quoteNoStr:      state.seqNo || '',
      revision:        state.revision,
      date:            state.submitDate || state.date || null,
      customerName:    state.customerName,
      customerHonorific: state.customerHonorific || '御中',
      contactName:     state.contactName || undefined,
      contactHonorific: state.contactHonorific || '様',
      showContactName: (() => {
        const cb = document.getElementById('printContactName');
        return cb ? cb.checked : false;
      })(),
      projectName:     state.projectName,
      projectName2:    state.projectName2 || undefined,
      projectName3:    state.projectName3 || undefined,
      ownerName:       state.ownerName,
      updaterName:     state.updaterName || undefined,
      showOwnerName: (() => {
        const cb = document.getElementById('printOwnerName');
        return cb ? cb.checked : false;
      })(),
      deliveryTerm:    state.deliveryTerm,
      deliveryMethod:  state.deliveryMethod,
      paymentTerm:     state.paymentTerm,
      validDays:       state.validDays,
      deliveryPrice:   state.deliveryPrice,
      laborCost:       (() => {
        const cat = state.quoteCategory || '';
        const modeName = (!state.frpMode && cat.includes('工事')) ? 'pdfPriceModeKouji' : 'pdfPriceMode';
        const modeVal = ([...document.getElementsByName(modeName)].find(r => r.checked)?.value || 'teika');
        // 'dairi'（定価+仕切併記）は仕切りベースで労務費を計算する
        const useTeikaForKouji = ['teika', 'dairi-discount'].includes(modeVal);
        const koujihi = state.sections.reduce((sum, s) =>
          sum + s.items.reduce((ss, i) => {
            if (!i.includeInLabor) return ss;
            const r = i.dairiRate ?? state.mainRate;
            const amt = Number(i.amount) || 0;

            // 定価がない場合、代理店単価を使う
            if (amt === 0) {
              const dairiUnit = i.dairiUnitPrice != null
                ? i.dairiUnitPrice
                : (i.unitPrice != null && r != null ? Math.round(i.unitPrice * r) : 0);
              const qty = Number(i.qty) || 1;
              return ss + (dairiUnit * qty);
            }

            return ss + (!useTeikaForKouji && r != null ? Math.round(amt * r) : amt);
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
      sections:        state.sections.map(sec => ({
        ...sec,
        items: sec.items.map(item => {
          // item.specを改行で分割してspecLinesに追加（見積画面で編集した仕様を反映）
          let specLines = [...(item.specLines || [])];
          if (item.spec && item.spec.trim() && specLines.length === 0) {
            const lines = item.spec.split('\n').filter(l => l.trim());
            specLines = lines;
          }
          return { ...item, specLines };
        })
      })),
      exclusions:      state.exclusions.length > 0 ? state.exclusions : undefined,
      remarks:         state.remarks || undefined,
      discount:        state.discountEnabled !== false ? (state.discount || undefined) : undefined,
      adjustAmount:    state.adjustAmount || 0,
      waribikiAmount:  state.waribikiAmount || 0,
      discountEnabled: state.discountEnabled !== false,
      buhanDiscTotal:  0,
      quoteCategory:   state.quoteCategory || '',
      printCover:      (() => {
        const cb = document.getElementById('printCoverPage');
        return cb ? cb.checked : true;
      })(),
      printDetail:     (() => {
        if (state.frpMode) return true; // FRPは常に明細印刷
        // ※ 工事であっても強制trueにしないこと。チェックボックス/ラジオの値に従う。
        const cb = document.getElementById('printDetailPages');
        return cb ? cb.checked : true;
      })(),
      dairiTotal:      state.dairiTotal != null ? state.dairiTotal : undefined,
      mainRate:        state.mainRate   != null ? state.mainRate   : undefined,
      pdfPriceMode:    (() => {
        const cat = state.quoteCategory || '';
        const name = (!state.frpMode && cat.includes('工事')) ? 'pdfPriceModeKouji' : 'pdfPriceMode';
        const radios = document.getElementsByName(name);
        for (const r of radios) { if (r.checked) return r.value; }
        return 'teika';
      })(),
      showUchiwake:     (() => {
        const cat = state.quoteCategory || '';
        if (cat.includes('物販')) return false;
        const cb = document.getElementById('printNaiyaku');
        return cb ? cb.checked : true;
      })(),
      printMode:        mode,
      showSubtotalBoth: (() => {
        const cb = document.getElementById('printSubtotalBoth');
        return cb ? cb.checked : false;
      })(),
      pdfScaleToFit: (() => {
        const cb = document.getElementById('pdfAutoShrink');
        return cb ? cb.checked : true; // デフォルト: 縮小有効
      })(),
      useBuppanDeliveryLabel: (() => {
        const cb = document.getElementById('useBuppanDeliveryLabel');
        return cb ? cb.checked : false;
      })(),

      roundingEnabled: state.roundingEnabled || false,
      remarkTableEnabled: state.remarkTableEnabled || false,

      frpMode:       state.frpMode  || false,
      frpAB:         state.frpAB    || 'A',
      frpItems:      state.frpMode ? (state.frpItems || []) : undefined,
      frpDiscount:   state.frpMode ? (state.frpDiscount || 0) : 0,
      frpFooterText: state.frpMode ? (() => {
        const secs = state.frpFooterSections || [];
        return secs
          .filter(s => s.enabled !== false && (s.text || '').trim())
          .map(s => `----${s.title}----\n${s.text}`)
          .join('\n\n');
      })() : '',
      frpShowZuban:  state.frpMode ? (state.frpShowZuban !== false) : true,
      frpShowSpecs:  state.frpMode ? (state.frpShowSpecs !== false) : true,
      frpArea:       state.frpMode ? (state.frpArea || undefined) : undefined,
      frpDealerCode: state.frpMode ? (state.frpDealerCode || undefined) : undefined,
      dateFormat: getValue('dateFormat') || 'seireki',
      showProductCode: (() => {
        const cb = document.getElementById('printProductCode');
        return cb ? cb.checked : false;
      })(),
      productCodePosition: (() => {
        const r = document.querySelector('input[name="productCodePosition"]:checked');
        return r ? r.value : 'right';
      })(),
      showProductCodeCover: (() => {
        const cb = document.getElementById('printProductCodeCover');
        return cb ? cb.checked : false;
      })(),
      productCodePositionCover: (() => {
        const r = document.querySelector('input[name="productCodeCoverPosition"]:checked');
        return r ? r.value : 'right';
      })(),
      shochoName: state.shochoName || '',
      showShocho: (() => {
        const cb = document.getElementById('printShocho');
        return cb ? cb.checked : false;
      })(),
      showTaxIncluded: (() => {
        const cb = document.getElementById('printTaxIncluded');
        return cb ? cb.checked : false;
      })(),
      showBikou: (() => {
        const cb = document.getElementById('printBikou');
        return cb ? cb.checked : false;
      })(),
      showTeikaTotal: (() => {
        const cb = document.getElementById('printTeikaTotal');
        return cb ? cb.checked : true;
      })(),
    };
  }

  // ── CRM 保存 ─────────────────────────────────────────────────

  // 1つ前の枝番の見積番号を返す（枝番=1なら null）
  function buildPrevEdabanSeqNo(seqNo) {
    if (!seqNo || !seqNo.includes('-')) return null;
    const parts = seqNo.split('-');
    if (parts.length >= 6) {
      const edaban = parseInt(parts[5]) || 1;
      if (edaban <= 1) return null;
      const p = [...parts];
      p[5] = String(edaban - 1);
      return p.join('-');
    } else if (parts.length === 2) {
      const suffix = parts[1];
      const base   = suffix.substring(0, 6);
      const edaban = parseInt(suffix.substring(6)) || 1;
      if (edaban <= 1) return null;
      return `${parts[0]}-${base}${edaban - 1}`;
    }
    return null;
  }

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
      // 作成所課（部門）の未入力チェック
      const _deptEl = document.getElementById('createDept');
      if (_deptEl && _deptEl.value) state.createDeptCode = _deptEl.value;
      // createDeptCode から shoka（Quotes.field15 の値）を同期
      if (state.createDeptCode) {
        const _deptEntry = DEPT_LIST.find(d => d.code === state.createDeptCode);
        if (_deptEntry) state.shoka = _deptEntry.name;
      }
      if (!state.createDeptCode) {
        showToast('部門（作成所課）を選択してください', 'err');
        statusEl.textContent = '⚠️ 部門が未入力です';
        btn.disabled = false;
        return;
      }

      // 同一見積番号の重複チェック
      if (state.seqNo && zohoReady) {
        const dupRes = await ZOHO.CRM.API.searchRecord({
          Entity: 'Quotes',
          Type:   'criteria',
          Query:  `(field55:equals:${state.seqNo})`,
        });
        const dupRecords = (dupRes?.data || []).filter(r => r.id !== state.quoteId);
        if (dupRecords.length > 0) {
          showToast(`見積番号「${state.seqNo}」はすでに他の見積で使用されています。枝番＋１または採番クリアで番号を変更してください。`, 'err');
          statusEl.textContent = '⚠️ 見積番号が重複しています';
          btn.disabled = false;
          return;
        }
      }
      // 見積提出日の時系列バリデーション（枝番>1の場合、前版より新しい日付か確認）
      if (state.submitDate && state.seqNo && zohoReady) {
        const prevSeqNo = buildPrevEdabanSeqNo(state.seqNo);
        if (prevSeqNo) {
          try {
            const prevRes = await ZOHO.CRM.API.searchRecord({
              Entity: 'Quotes',
              Type:   'criteria',
              Query:  `(field55:equals:${prevSeqNo})`,
            });
            const prevRecords = prevRes?.data || [];
            if (prevRecords.length > 0 && prevRecords[0].field64) {
              const prevDate = new Date(prevRecords[0].field64);
              if (state.submitDate < prevDate) {
                const prevDateStr = formatDateInput(prevDate);
                const curDateStr  = formatDateInput(state.submitDate);
                showToast(`見積提出日（${curDateStr}）が前版（${prevDateStr}）より前の日付です。日付を確認してください。`, 'err');
                statusEl.textContent = '⚠️ 見積提出日の順序が不正です';
                btn.disabled = false;
                return;
              }
            }
          } catch (e) {
            console.warn('前版の日付チェックに失敗:', e);
          }
        }
      }

      console.log('保存開始 quoteId:', state.quoteId, 'sections:', state.sections.length);

      // 保存直前DOM同期: onItemInput で未反映の代理店単価を救済する
      // (dairiUnitPrice=null かつ DOM値が自動計算値と異なる場合のみ適用)
      const _syncCont = document.getElementById('sectionsContainer');
      if (_syncCont) {
        state.sections.forEach(sec => {
          const _sb = _syncCont.querySelector(`[data-section-id="${sec.id}"]`);
          if (!_sb) return;
          sec.items.forEach(item => {
            const _sr = _sb.querySelector(`[data-item-id="${item.id}"]`);
            if (!_sr) return;
            // 代理店単価: is-manualクラス、_dairiManualフラグ、またはdairiUnitPrice設定済みなら手動扱い
            {
              const _duEl = _sr.querySelector('.item-dairi-unit');
              if (_duEl) {
                const _isManualDOM = _duEl.classList.contains('is-manual') || item._dairiManual || item.dairiUnitPrice != null;
                if (_isManualDOM) {
                  const _raw = _duEl.value.replace(/,/g, '').trim();
                  const _num = _raw !== '' ? (Number(_raw) || null) : null;
                  if (_num !== null) {
                    item.dairiUnitPrice = _num;
                    item._dairiManual   = true;
                  } else if (item.dairiUnitPrice != null) {
                    // DOMが空欄だが、stateに値がある場合は維持
                    // （ユーザーが削除した場合はonItemInputで既にnullになっているはず）
                  }
                } else {
                  const _raw = _duEl.value.replace(/,/g, '').trim();
                  const _num = _raw !== '' ? (Number(_raw) || null) : null;
                  if (_num !== null) {
                    const _auto = effectiveDairiUnit(item);
                    if (_num !== _auto) {
                      item.dairiUnitPrice = _num;
                      item._dairiManual   = true;
                    } else {
                      // 自動計算値と同じ場合、手動フラグをクリア
                      item.dairiUnitPrice = null;
                      item._dairiManual   = false;
                    }
                  } else {
                    // 自動計算モードで値が空の場合、手動入力をクリア
                    item.dairiUnitPrice = null;
                    item._dairiManual   = false;
                  }
                }
              }
            }
            // 最終代理店単価
            if (item.finalDairiUnit == null) {
              const _fdEl = _sr.querySelector('.item-final-dairi');
              if (_fdEl) {
                const _raw2 = _fdEl.value.replace(/,/g, '').trim();
                const _num2 = _raw2 !== '' ? (Number(_raw2) || null) : null;
                if (_num2 !== null) {
                  const _auto2 = effectiveFinalDairiUnit(item);
                  if (_num2 !== _auto2) {
                    console.warn('[preSaveSync] 最終代理店単価 DOM→state補正 itemId:', item.id, 'DOM:', _num2, 'auto:', _auto2);
                    item.finalDairiUnit = _num2;
                  }
                }
              }
            }
          });
        });
      }

      collectExclusions();
      const jsonStr = JSON.stringify({
        sections:      state.sections,
        deliveryPrice: state.deliveryPrice,
        laborCost:     state.laborCost,
        seqNo:         state.seqNo,
        revision:      state.revision,
        exclusions:    state.exclusions,
        remarks:        state.remarks        || undefined,
        discount:       state.adjustAmount    || undefined,
        adjustAmount:   state.adjustAmount   || undefined,
        subformRowIds:  state.subformRowIds?.length ? state.subformRowIds : undefined,
        // FRP
        frpMode:        state.frpMode  || undefined,
        frpAB:          state.frpMode ? state.frpAB : undefined,
        frpItems:       state.frpMode && state.frpItems.length ? state.frpItems : undefined,
        frpArea:        state.frpMode ? (state.frpArea || undefined) : undefined,
        frpDealerCode:  state.frpMode ? (state.frpDealerCode || undefined) : undefined,
        roundingEnabled:  state.roundingEnabled  || undefined,
        remarkTableEnabled: state.remarkTableEnabled || undefined,
        discountEnabled:  state.discountEnabled === false ? false : undefined,
        shochoName:       state.shochoName       || undefined,
        branchKey:        state.branchKey         || undefined,
      });

      // field60/61/62 用に金額を再計算
      const saveGrandTotal    = state.sections.reduce((sum, s) =>
        sum + s.items.reduce((ss, i) => ss + (Number(i.amount) || 0), 0), 0);
      const saveDiscount      = state.adjustAmount || 0;  // field61 には調整額を保存
      const saveDairiTotal    = state.dairiTotal;
      const saveDeliveryPrice = state.deliveryPrice;

      const apiData = {
        id:      state.quoteId,
        JSON:    jsonStr.slice(0, 32000),
        JSON2:   jsonStr.length > 32000 ? jsonStr.slice(32000) : '',
        field55: state.seqNo      ? String(state.seqNo)      : '',
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
        field63: state.quoteCategory || undefined, // 見積区分
        field15: state.shokaId      || undefined, // 所課（ルックアップID）
        field8:  state.projectName2 || undefined, // 件名2行目
        field7:  state.projectName3 || undefined, // 件名3行目
        main_rate:     state.mainRate     != null ? state.mainRate     : undefined, // 代理店掛率
        item_rate:     state.itemRate     != null ? state.itemRate     : undefined, // 製品掛率
        parts_rate:    state.partsRate    != null ? state.partsRate    : undefined, // 部品掛率
        purchase_rate: state.purchaseRate != null ? state.purchaseRate : undefined, // 仕入れ品掛率
        FRPmode:       state.frpMode, // FRPモードフラグ（真偽値）
        // サブフォームは後続の処理で deleteRecord + updateRecord で個別処理
        // ここでは挿入データのみ準備する
        _subformCurrentItems: state.frpMode
          ? state.frpItems
              .filter(item => item.hinmei || item.price)
              .map(item => ({
                name:      item.hinmei   || '',
                spec:      item.itemnum  || '',
                qty:       item.qty      || 1,
                unit:      item.unit     || '台',
                unitPrice: item.price    || 0,
                amount:    (item.price   || 0) * (item.qty || 1),
                genka:     item.priceA   || 0,
              }))
          : state.sections.flatMap(sec =>
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
      delete apiDataMain._subformCurrentItems;
      const updateRes = await ZOHO.CRM.API.updateRecord({
        Entity:  'Quotes',
        APIData: apiDataMain,
        Trigger: [],
      });

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
      // ②-a 旧行を LinkingModule1 レコードとして直接削除
      // ※ getRecord/getRelatedRecords はサブフォームデータを返さないため state.subformRowIds のIDに依存
      const idsToDelete = state.subformRowIds?.length ? [...state.subformRowIds] : [];
      if (idsToDelete.length > 0) {
        await ZOHO.CRM.API.deleteRecord({
          Entity:   'LinkingModule1',
          RecordID: idsToDelete,
        });
      }
      state.subformRowIds = [];

      // ②-b 現在の明細を新規挿入
      let newIds = [];
      if (currentItems.length > 0) {
        const insertRows = currentItems.map(item => ({
          quoteType:    item.name              || '',
          Product_Code: item.productCode        || '',
          quantity:     Number(item.qty)       || 1,
          Usage_Unit:   item.unit              || '式',
          Unit_Price:   Number(item.unitPrice) || 0,
          field10:      Number(item.amount)    || 0,
          field15:      Math.round((Number(item.genka) || 0) * (Number(item.qty) || 1)),
          field8:       item.name              || '',
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
        remarks:          state.remarks        || undefined,
        discount:         state.adjustAmount   || undefined,
        adjustAmount:     state.adjustAmount   || undefined,
        discountEnabled:  state.discountEnabled === false ? false : undefined,
        subformRowIds:    newIds.length ? newIds : undefined,
        // FRP
        frpMode:          state.frpMode || undefined,
        frpAB:            state.frpMode ? state.frpAB : undefined,
        frpItems:         state.frpMode && state.frpItems.length ? state.frpItems : undefined,
        frpArea:          state.frpMode ? (state.frpArea || undefined) : undefined,
        frpDealerCode:    state.frpMode ? (state.frpDealerCode || undefined) : undefined,
        roundingEnabled:  state.roundingEnabled || undefined,
        remarkTableEnabled: state.remarkTableEnabled || undefined,
        shochoName:       state.shochoName      || undefined,
        branchKey:        state.branchKey        || undefined,
      });
      await ZOHO.CRM.API.updateRecord({
        Entity:  'Quotes',
        APIData: {
          id:    state.quoteId,
          JSON:  updatedJson.slice(0, 32000),
          JSON2: updatedJson.length > 32000 ? updatedJson.slice(32000) : '',
        },
        Trigger: ['workflow'],   // 2026/08/16 「CRMに保存」で見積書のワークフローを発火
      });
      statusEl.textContent = '✅ 保存しました（' + new Date().toLocaleTimeString('ja-JP') + '）';
      showToast('CRMに保存しました');
      markClean();
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

  let _pendingTab = null;

  function _showAdjustWarnModal(tabName) {
    _pendingTab = tabName || null;
    const rest        = state._adjustRest;
    const adjAmount   = state.adjustAmount || 0;
    const fmt         = v => '¥' + v.toLocaleString('ja-JP');
    const msg         = document.getElementById('adjustWarnMsg');
    if (msg) {
      if (adjAmount < 0) {
        msg.textContent = `調整額 ▲${fmt(Math.abs(adjAmount))} が入力されています。見積金額が増加しています。印刷前に確認してください。`;
      } else {
        msg.textContent = `調整額 ${fmt(adjAmount)} に対し、代理店単価への反映残額が ${fmt(rest)} あります。①基本情報と②見積明細の金額が一致していません。`;
      }
    }
    document.getElementById('adjustWarnModal').style.display = '';
  }

  function _adjustWarnCancel() {
    _pendingTab = null;
    document.getElementById('adjustWarnModal').style.display = 'none';
  }

  function _adjustWarnIgnore() {
    document.getElementById('adjustWarnModal').style.display = 'none';
    const tab = _pendingTab;
    _pendingTab = null;
    if (tab) goToTab(tab);
  }

  function _needsAdjustUpdate() {
    if (state.frpMode) return false;
    const adjAmount = state.adjustAmount || 0;
    if (adjAmount === 0) return false;
    if (adjAmount < 0) return true; // マイナス調整は常に警告
    const rest = state._adjustRest;
    return rest != null && rest > 0;
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (_needsAdjustUpdate() && btn.dataset.tab === 'output') {
        _showAdjustWarnModal(btn.dataset.tab);
        return;
      }
      goToTab(btn.dataset.tab);
    });
  });

  // ── 見積まとめ（集計表）─────────────────────────────────────────

  const SUMMARY_CATEGORIES = {
    '①': '①配管部材',
    '②': '②支持具・雑部材',
    '③': '③配線部材',
    '④': '④工事費',
    '⑥': '⑥配管材料',
    '⑦': '⑦支持具・雑材費',
  };
  const SUMMARY_ORDER = ['①', '②', '③', '④', '⑥', '⑦'];

  function renderSummaryTable() {
    const container = document.getElementById('summaryTableContainer');
    if (!container) return;

    if (state.sections.length === 0) {
      container.innerHTML = '<p style="color:#888;padding:16px;">明細データがありません。②見積明細でデータを入力してください。</p>';
      return;
    }

    const rate = state.mainRate != null ? state.mainRate : null;
    const fmtN = n => (n != null ? Number(n).toLocaleString('ja-JP') : '');
    const dairiUnit = item => effectiveDairiUnit(item);
    const dairiAmt  = item => {
      const u = effectiveDairiUnit(item);
      return u != null ? u * (Number(item.qty) || 1) : null;
    };

    let grandTotal = 0;
    let grandDairi = 0;
    let grandGenka = 0;
    let html = '';

    state.sections.forEach(sec => {
      const secQty = Math.max(1, Number(sec.secQty) || 1);
      const catTotals      = {};
      const catDairiTotals = {};
      const catGenkaTotals = {};
      const normalItems    = [];

      (sec.items || []).forEach(item => {
        const prefix = (item.calcCategory || '').trim().charAt(0);
        if (SUMMARY_CATEGORIES[prefix]) {
          catTotals[prefix]      = (catTotals[prefix]      || 0) + (Number(item.amount) || 0);
          catDairiTotals[prefix] = (catDairiTotals[prefix] || 0) + (dairiAmt(item) ?? 0);
          catGenkaTotals[prefix] = (catGenkaTotals[prefix] || 0) + (Number(item.genka) || 0) * (Number(item.qty) || 1);
        } else {
          normalItems.push(item);
        }
      });

      const secSubtotal = (sec.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const secSubDairi = rate != null
        ? (sec.items || []).reduce((s, i) => s + (dairiAmt(i) ?? 0), 0)
        : null;
      const secTotal      = secSubtotal * secQty;
      const secDairiTotal = secSubDairi != null ? secSubDairi * secQty : null;
      grandTotal += secTotal;
      if (secDairiTotal != null) grandDairi += secDairiTotal;
      const secGenka = (sec.items || []).reduce((ss, i) => ss + (Number(i.genka) || 0) * (Number(i.qty) || 1), 0);
      grandGenka += secGenka * secQty;

      html += `<div class="summary-section-block">
        <div class="summary-section-header">No.${sec.no}　${escHtml(sec.name || '')}</div>
        <table class="summary-detail-table">
          <thead><tr>
            <th>項目</th><th>数量</th><th>単位</th>
            <th>単価</th><th>金額</th>
            <th>代理店単価</th><th>代理店価格</th>
            <th>原価</th><th>原価合計</th>
          </tr></thead>
          <tbody>`;

      normalItems.forEach(item => {
        const du = dairiUnit(item);
        const da = dairiAmt(item);
        const genkaU = item.genka ? Number(item.genka) : null;
        const genkaA = genkaU != null ? genkaU * (Number(item.qty) || 1) : null;
        html += `<tr>
          <td>${escHtml(item.name || '')}</td>
          <td class="num">${item.qty || 1}</td>
          <td class="center">${escHtml(item.unit || '式')}</td>
          <td class="num">${item.unitPrice ? fmtN(item.unitPrice) : ''}</td>
          <td class="num">${fmtN(item.amount)}</td>
          <td class="num dairi-col">${du != null ? fmtN(du) : (rate == null ? '―' : '')}</td>
          <td class="num dairi-col">${da != null ? fmtN(da) : (rate == null ? '―' : '')}</td>
          <td class="num">${genkaU != null ? fmtN(genkaU) : ''}</td>
          <td class="num">${genkaA != null ? fmtN(genkaA) : ''}</td>
        </tr>`;
      });

      SUMMARY_ORDER.forEach(prefix => {
        const amount = catTotals[prefix];
        if (!amount) return;
        const cd = catDairiTotals[prefix];
        const cg = catGenkaTotals[prefix] || 0;
        html += `<tr class="summary-cat-row">
          <td>${escHtml(SUMMARY_CATEGORIES[prefix])}</td>
          <td class="num">1</td><td class="center">式</td>
          <td class="num"></td>
          <td class="num">${fmtN(amount)}</td>
          <td class="num dairi-col"></td>
          <td class="num dairi-col">${rate != null ? fmtN(cd) : '―'}</td>
          <td class="num"></td>
          <td class="num">${cg > 0 ? fmtN(cg) : ''}</td>
        </tr>`;
      });

      const dairiColspan = rate != null ? '' : '―';
      let tfootHtml = '';
      if (secQty > 1) {
        tfootHtml = `
          <tr class="summary-subtotal-per">
            <td colspan="4" class="center">小　計</td>
            <td class="num">${fmtN(secSubtotal)}</td>
            <td class="num dairi-col"></td>
            <td class="num dairi-col">${secSubDairi != null ? fmtN(secSubDairi) : dairiColspan}</td>
            <td class="num"></td>
            <td class="num">${secGenka > 0 ? fmtN(secGenka) : ''}</td>
          </tr>
          <tr class="summary-subtotal">
            <td colspan="4" class="center">×${secQty}式　合計</td>
            <td class="num">${fmtN(secTotal)}</td>
            <td class="num dairi-col"></td>
            <td class="num dairi-col">${secDairiTotal != null ? fmtN(secDairiTotal) : dairiColspan}</td>
            <td class="num"></td>
            <td class="num">${secGenka > 0 ? fmtN(secGenka * secQty) : ''}</td>
          </tr>`;
      } else {
        tfootHtml = `
          <tr class="summary-subtotal">
            <td colspan="4" class="center">小　計</td>
            <td class="num">${fmtN(secTotal)}</td>
            <td class="num dairi-col"></td>
            <td class="num dairi-col">${secDairiTotal != null ? fmtN(secDairiTotal) : dairiColspan}</td>
            <td class="num"></td>
            <td class="num">${secGenka > 0 ? fmtN(secGenka) : ''}</td>
          </tr>`;
      }
      html += `</tbody>
          <tfoot>${tfootHtml}</tfoot>
        </table>
      </div>`;
    });

    const araRiBase = (state.deliveryPrice > 0) ? state.deliveryPrice : grandTotal;
    const araRi     = araRiBase - grandGenka;
    const araRiRate = araRiBase > 0 ? araRi / araRiBase * 100 : null;
    const adjustAmount = state.discountEnabled !== false ? (state.adjustAmount || 0) : 0;
    const dairiStr  = rate != null
      ? `<span class="sgf-sep">／</span><span class="sgf-item"><span class="sgf-label">代理店合計</span> <span>¥${fmtN(grandDairi - adjustAmount)}</span></span>`
      : '';
    const genkaStr  = grandGenka > 0
      ? `<span class="sgf-sep">／</span><span class="sgf-item"><span class="sgf-label">原価合計</span> <span>¥${fmtN(grandGenka)}</span></span>`
      : '';
    const araRiStr  = grandGenka > 0
      ? `<span class="sgf-sep">｜</span><span class="sgf-item"><span class="sgf-label">粗利</span> <span>¥${fmtN(araRi)}</span></span>` +
        `<span class="sgf-sep">｜</span><span class="sgf-item"><span class="sgf-label">粗利率</span> <span>${araRiRate != null ? araRiRate.toFixed(1) + '%' : '―'}</span></span>`
      : '';
    html += `<div class="summary-grand-total">
      <span class="sgf-item"><span class="sgf-label">合　計</span> <span>¥${fmtN(grandTotal)}</span></span>${dairiStr}${genkaStr}${araRiStr}
    </div>`;

    container.innerHTML = html;
  }

  function generateSummaryPDF() {
    const data = buildPdfData();
    const cb = document.getElementById('summaryShowDairi');
    data.summaryShowDairi = cb ? cb.checked : false;
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

  // ── 代理店単価 切り上げ表示 ──────────────────────────────────────

  function roundUp(price) {
    if (!price || price < 100) return price;
    if (price < 10000)   return Math.ceil(price / 10)   * 10;
    if (price < 1000000) return Math.ceil(price / 100)  * 100;
    return                      Math.ceil(price / 1000) * 1000;
  }

  function roundUpNormal(price) {
    if (!price || price < 100) return price;
    if (price < 10000)   return Math.ceil(price / 10)   * 10;
    if (price < 1000000) return Math.ceil(price / 100)  * 100;
    return                      Math.ceil(price / 1000) * 1000;
  }

  // 代理店単価の有効値（ユーザー手動設定 > 掛率計算）
  function effectiveDairiUnit(item) {
    // dairiUnitPriceが設定されていれば手動値を常に優先（_dairiManualフラグに依存しない）
    if (item.dairiUnitPrice != null) return item.dairiUnitPrice;
    const rate = item.dairiRate ?? state.mainRate;
    if (rate != null) {
      // unitPriceがnullのとき amount/qty から単価を逆算
      const baseUnit = item.unitPrice != null ? item.unitPrice
        : (item.amount != null && item.amount > 0 ? Math.round(Number(item.amount) / (Number(item.qty) || 1)) : null);
      if (baseUnit != null) {
        const auto = Math.round(baseUnit * rate);
        return state.roundingEnabled ? roundUpNormal(auto) : auto;
      }
    }
    return null;
  }

  function effectiveFinalDairiUnit(item) {
    return item.finalDairiUnit != null ? item.finalDairiUnit : effectiveDairiUnit(item);
  }

  function toggleRounding() {
    state.roundingEnabled = !state.roundingEnabled;
    const btn = document.getElementById('btnToggleRounding');
    if (btn) btn.classList.toggle('is-active', state.roundingEnabled);
    const btnFrp = document.getElementById('btnToggleRoundingFrp');
    if (btnFrp) btnFrp.classList.toggle('is-active', state.roundingEnabled);
    if (state.frpMode) {
      renderFrpItems();
      updateFrpTotals();
    } else {
      state.sections.forEach(sec => {
        const block = document.querySelector(`.section-block[data-section-id="${sec.id}"]`);
        if (block) renderSection(sec, block);
      });
    }
    updateOutput();
  }

  function markDirty() {
    isDirty = true;
    const banner = document.getElementById('unsavedBanner');
    if (banner) banner.style.display = '';
  }

  function markClean() {
    isDirty = false;
    const banner = document.getElementById('unsavedBanner');
    if (banner) banner.style.display = 'none';
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


  // 代理店単価の手動上書きをクリアして自動計算に戻す
  function onPriceRankChange(el) {
    const row = el.closest('tr');
    if (!row) return;
    const block = row.closest('.section-block');
    const sec   = state.sections.find(s => s.id === Number(block?.dataset.sectionId));
    const item  = sec?.items.find(i => i.id === Number(row.dataset.itemId));
    if (!item) return;
    item.priceRank = el.value;
    const prices = { S: item.priceS || 0, A: item.priceA || 0, B: item.priceB || 0, C: item.priceC || 0 };
    const selected = el.value ? prices[el.value] : 0;
    item.dairiUnitPrice = selected > 0 ? selected : (item.unitPrice || null);
    item._dairiManual   = item.dairiUnitPrice != null;
    markDirty();
    if (block) renderSection(sec, block);
    updateOutput();
  }

  function clearDairiUnitPrice(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const block = row.closest('.section-block');
    const sec   = state.sections.find(s => s.id === Number(block?.dataset.sectionId));
    const item  = sec?.items.find(i => i.id === Number(row.dataset.itemId));
    if (!item) return;
    item.dairiUnitPrice = null;
    item._dairiManual   = false;
    item.priceRank = '';
    const rankEl = row.querySelector('.item-price-rank');
    if (rankEl) rankEl.value = '';
    const dairiUnitEl = row.querySelector('.item-dairi-unit');
    if (dairiUnitEl) {
      const effectiveRate = item.dairiRate ?? state.mainRate;
      const autoUnit = (effectiveRate != null && item.unitPrice != null)
        ? Math.round(item.unitPrice * effectiveRate) : null;
      dairiUnitEl.value = autoUnit != null ? Number(autoUnit).toLocaleString('ja-JP') : '';
      dairiUnitEl.classList.remove('is-manual');
    }
    btn.style.display = 'none';
    const dairiEl = row.querySelector('.item-dairi');
    if (dairiEl) {
      const qty = Number(item.qty) || 1;
      const fUnit = effectiveFinalDairiUnit(item);
      dairiEl.textContent = fUnit != null ? (fUnit * qty).toLocaleString('ja-JP') : '';
    }
    // 最終代理店単価が自動の場合、表示も更新
    const finalInputEl = row.querySelector('.item-final-dairi');
    if (finalInputEl && item.finalDairiUnit == null) {
      const fUnit2 = effectiveFinalDairiUnit(item);
      finalInputEl.value = fUnit2 != null ? Number(fUnit2).toLocaleString('ja-JP') : '';
    }
    if (block) { updateSectionSubtotal(block); }
  }

  function clearFinalDairiUnit(btn) {
    const row   = btn.closest('tr');
    const block = row?.closest('.section-block');
    const sec   = state.sections.find(s => s.id === Number(block?.dataset.sectionId));
    const item  = sec?.items.find(i => i.id === Number(row?.dataset.itemId));
    if (!item) return;
    item.finalDairiUnit = null;
    const finalInputEl = row.querySelector('.item-final-dairi');
    if (finalInputEl) {
      const auto = effectiveDairiUnit(item);
      finalInputEl.value = auto != null ? Number(auto).toLocaleString('ja-JP') : '';
      finalInputEl.classList.remove('is-manual');
    }
    btn.style.display = 'none';
    const dairiEl = row.querySelector('.item-dairi');
    if (dairiEl) {
      const qty = Number(item.qty) || 1;
      const fUnit = effectiveFinalDairiUnit(item);
      dairiEl.textContent = fUnit != null ? (fUnit * qty).toLocaleString('ja-JP') : '';
    }
    if (block) { updateSectionSubtotal(block); updateOutput(); }
  }

  // ── 印刷価格モード説明 ─────────────────────────────────────────
  const PDF_MODE_DESC = {
    teika:          '小売価格のみ印刷。代理店価格列は表示しません。',
    'dairi-kouji':  '小売価格に加えて代理店仕切合計（列）を追加表示します。',
    'dairi-bulk':   '表示は小売価格。仕切は合計を一括表示。',
    'dairi-discount': '小売価格合計から値引き額を差し引いた形式で表示します。',
    dairi:          '各行に小売価格及び仕切の単価、合計を表示。',
    'dairi-only':   '仕切単価・仕切合計のみ表示',
  };

  function updatePdfModeDesc() {
    const groupKouji = document.getElementById('pdfPriceModeGroupKouji');
    const descKouji  = document.getElementById('pdfPriceModeDescKouji');
    if (descKouji) {
      const r = groupKouji && groupKouji.style.display !== 'none'
        ? [...document.getElementsByName('pdfPriceModeKouji')].find(r => r.checked)
        : null;
      descKouji.textContent = r ? (PDF_MODE_DESC[r.value] || '') : '';
      descKouji.classList.toggle('visible', !!r);
    }
    const group = document.getElementById('pdfPriceModeGroup');
    const desc  = document.getElementById('pdfPriceModeDesc');
    if (desc) {
      const r = group && group.style.display !== 'none'
        ? [...document.getElementsByName('pdfPriceMode')].find(r => r.checked)
        : null;
      desc.textContent = r ? (PDF_MODE_DESC[r.value] || '') : '';
      desc.classList.toggle('visible', !!r);
    }
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
    duplicateSection,
    // カテゴリタブ
    switchCatTab,
    switchStandardSub,
    execCatAdd,
    execKoujiAdd,
    onKoujiKubunChange,
    // 明細行
    addItem,
    removeItem,
    moveItemUp,
    moveItemDown,
    applyBulkRate,
    // 機器仕様
    showMachineSpecModal,
    closeMachineSpecModal,
    searchMachineSpecs,
    selectMachineSpecModel,
    addMachineSpecItem,
    _selectMachineSpecChip,
    onMainRateInput,
    applyGlobalRate,
    // 商品検索
    searchProducts,
    selectProduct,
    // 管材・電材・機器検索
    searchKanzai,
    onKanzaiCatChange,
    onKanzaiItemChange,
    execKanzaiRowAdd,
    onDenzaiCatChange,
    onDenzaiItemChange,
    execDenzaiRowAdd,
    searchDenzai,
    searchKiki,
    execKikiAdd,
    onKikiCatChange,
    onKikiItemChange,
    execKikiRowAdd,
    execMaterialAdd,
    // 採番
    autoNumber,
    incrementSeqNo,
    incrementEdaban,
    resetSeqNo,
    undoSeqNo,
    // 営業所
    onBranchChange,
    // 標準項
    execStandardAdd,
    execProductAdd,
    onBuppanCatChange,
    execBuppanStandardAdd,
    onEiseiCatChange,
    onEiseiChuChange,
    onEiseiShoChange,
    execEiseiAdd,
    // 見積外工事
    onExclusionChange,
    updateExclusionCount,
    addCustomExclusion,
    removeCustomExclusion,
    applyExclusionPreset,
    // PDF / CSV / Excel
    generatePDF,
    previewPDF,
    exportCsv,
    exportExcel,
    closePdfPreview,
    generateSummaryPDF,
    updatePdfModeDesc,
    updateOutput,
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
    // 機器仕様マスタ
    showSpecMasterModal,
    closeSpecMasterModal,
    saveSpecMaster,
    resetToProductSpec,
    applyDeptSpec,
    toggleMachineSpecHidden,
    toggleModelPrint,
    setAllModelPrint,
    // 列表示・列幅
    toggleColDropdown,
    setColVisibility,
    resetColWidths,
    // テンプレート
    showTemplateSaveDialog,
    execTemplateSave,
    onTplOverwriteTargetChange,
    showTemplateLoadDialog,
    filterTemplates,
    onTplCatChange,
    toggleTplDetail,
    deleteTemplate,
    selectTemplate,
    execTemplateLoad,
    showSetProductDialog,
    selectSetProduct,
    toggleSetProductDetail,
    execAddSetProduct,
    showSetProductSaveDialog,
    calcSetProductNormal,
    execSetProductSave,
    // 単位ピッカー
    toggleUnitDropdown,
    // 減衰計算サマリー折りたたみ
    toggleGensuiSummary: () => {
      document.getElementById('gensuiSummary')?.classList.toggle('is-collapsed');
    },
    // カテゴリ変更確認ダイアログ
    confirmCategoryChange,
    declineCategoryChange,
    onCategorySelectChange,
    // CRM保存
    saveToCRM,
    // FRPモード
    switchFrpMode, setFrpAB,
    addFrpManualItem,
    openSoryoModal, addFrpSoryoFromMaster,
    _frpAddKonzaiSoryo, _frpOpenCharterModal, _frpAddCharterSoryo,
    removeFrpItem,
    removeFrpSpec,
    addFrpSpec,
    toggleFrpSpecs,
    openFrpZubanModal, execFrpZubanSave,
    _frpWizardOpenPdf,
    moveFrpItem,
    openFrpWizard,
    onFrpAreaChange,
    onFrpDealerSelect,
    _frpWizardSetHz,
    _frpWizardSetShubetsu,
    _frpWizardSetChubunrui,
    _frpWizardSetKashira,
    _frpWizardNext,
    _frpWizardBack,
    _frpWizardSkip,
    _frpWizardSelect,
    _frpWizardSearchStep5,
    openFrpSettings,
    saveFrpSettings,
    resetFrpSettings,
    // 代理店単価ロック解除・SABCランク選択
    onPriceRankChange,
    clearDairiUnitPrice,
    clearFinalDairiUnit,
    // 備考プリセット
    selectRemarkPreset,
    insertSelectedRemark,
    // 切り上げ表示
    toggleRounding,
    // 調整額
    updateAdjustAmountToRest,
    syncAdjustAmountFromHint,
    _adjustWarnCancel,
    _adjustWarnIgnore,
    // Excel インポート/エクスポート
    openExcelModal,
    closeExcelModal,
    downloadExcelTemplate,
    exportItemsToExcel,
    importItemsFromExcel,
    // デバッグ・テスト用
    _state: state,
    _renderFrpItems: renderFrpItems,
    _updateOutput: updateOutput,
    injectFrpTest(frpItems, options = {}) {
      state.frpMode     = true;
      state.frpAB       = options.frpAB       ?? 'A';
      state.frpDiscount = options.frpDiscount  ?? 0;
      state.frpItems    = frpItems;
      state.nextFrpId   = frpItems.length > 0 ? Math.max(...frpItems.map(i => i.id)) + 1 : 1;
      applyFrpModeUI();
      renderFrpItems();
      updateOutput();
      console.log('[injectFrpTest] 完了:', frpItems.length + '件');
    },
  };

})();

// ── 起動 ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.app = app;
  document.getElementById('btnAutoNumber').addEventListener('click', () => app.autoNumber());

  // 金額系の入力欄にカンマ表示を追加（blur時）
  document.body.addEventListener('blur', (e) => {
    const target = e.target;
    // 金額系の入力欄のみ対象
    if (!target.value) return;

    // type="number" の要素は除外（カンマを含む値を設定すると無効化されるため）
    if (target.type === 'number') return;

    const isMoneyInput = target.classList && (
                          target.classList.contains('item-price') ||
                          target.classList.contains('item-amount') ||
                          target.classList.contains('item-dairi-unit') ||
                          target.classList.contains('item-final-dairi') ||
                          target.classList.contains('item-buhan-discount') ||
                          target.classList.contains('item-genka'));

    if (isMoneyInput) {
      const rawValue = target.value.replace(/,/g, '').trim();
      if (rawValue !== '' && !isNaN(rawValue)) {
        target.value = Number(rawValue).toLocaleString('ja-JP');
      }
    }
  }, true);

  // 金額系の入力欄のカンマを削除（focus時・入力しやすくする）
  document.body.addEventListener('focus', (e) => {
    const target = e.target;
    if (!target.value) return;

    // type="number" の要素は除外
    if (target.type === 'number') return;

    const isMoneyInput = target.classList && (
                          target.classList.contains('item-price') ||
                          target.classList.contains('item-amount') ||
                          target.classList.contains('item-dairi-unit') ||
                          target.classList.contains('item-final-dairi') ||
                          target.classList.contains('item-buhan-discount') ||
                          target.classList.contains('item-genka'));

    if (isMoneyInput) {
      target.value = target.value.replace(/,/g, '');
    }
  }, true);

  app.init();
});
