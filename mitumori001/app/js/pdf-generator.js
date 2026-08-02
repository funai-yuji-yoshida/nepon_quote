/**
 * ネポン 御見積書 PDF生成モジュール
 * pdfmake + NotoSansJP フォントを使用
 *
 * 出力形式:
 *   1ページ目: 御見積書（表紙）
 *   2ページ目以降: 見積明細書
 */

const QuotationPDF = (() => {

  // ── 営業所マスタ ──────────────────────────────────────────────
  const BRANCH_INFO = {
    honbu: {
      name:    '営業サービス本部',
      postal:  '〒243-0215',
      address: '神奈川県厚木市上古沢411番地',
      tel:     '046-247-3269',
      fax:     '046-248-6317',
    },
  };

  // ── ユーティリティ ────────────────────────────────────────────

  /** 半角カナを全角カナに変換 */
  function toZenkana(str) {
    if (!str) return str;
    const baseMap = {
      'ｦ':'ヲ','ｧ':'ァ','ｨ':'ィ','ｩ':'ゥ','ｪ':'ェ','ｫ':'ォ',
      'ｬ':'ャ','ｭ':'ュ','ｮ':'ョ','ｯ':'ッ','ｰ':'ー',
      'ｱ':'ア','ｲ':'イ','ｳ':'ウ','ｴ':'エ','ｵ':'オ',
      'ｶ':'カ','ｷ':'キ','ｸ':'ク','ｹ':'ケ','ｺ':'コ',
      'ｻ':'サ','ｼ':'シ','ｽ':'ス','ｾ':'セ','ｿ':'ソ',
      'ﾀ':'タ','ﾁ':'チ','ﾂ':'ツ','ﾃ':'テ','ﾄ':'ト',
      'ﾅ':'ナ','ﾆ':'ニ','ﾇ':'ヌ','ﾈ':'ネ','ﾉ':'ノ',
      'ﾊ':'ハ','ﾋ':'ヒ','ﾌ':'フ','ﾍ':'ヘ','ﾎ':'ホ',
      'ﾏ':'マ','ﾐ':'ミ','ﾑ':'ム','ﾒ':'メ','ﾓ':'モ',
      'ﾔ':'ヤ','ﾕ':'ユ','ﾖ':'ヨ',
      'ﾗ':'ラ','ﾘ':'リ','ﾙ':'ル','ﾚ':'レ','ﾛ':'ロ',
      'ﾜ':'ワ','ﾝ':'ン',
    };
    const dakuMap = {
      'カ':'ガ','キ':'ギ','ク':'グ','ケ':'ゲ','コ':'ゴ',
      'サ':'ザ','シ':'ジ','ス':'ズ','セ':'ゼ','ソ':'ゾ',
      'タ':'ダ','チ':'ヂ','ツ':'ヅ','テ':'デ','ト':'ド',
      'ハ':'バ','ヒ':'ビ','フ':'ブ','ヘ':'ベ','ホ':'ボ',
      'ウ':'ヴ',
    };
    const handakuMap = {
      'ハ':'パ','ヒ':'ピ','フ':'プ','ヘ':'ペ','ホ':'ポ',
    };
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      const next = str[i + 1];
      const full = baseMap[c];
      if (full) {
        if (next === 'ﾞ' && dakuMap[full]) { result += dakuMap[full]; i++; }
        else if (next === 'ﾟ' && handakuMap[full]) { result += handakuMap[full]; i++; }
        else { result += full; }
      } else {
        result += c;
      }
    }
    return result;
  }

  /** 数値をカンマ区切り文字列に変換 */
  function fmt(n) {
    if (n === null || n === undefined || n === '') return '';
    const num = Number(n);
    if (isNaN(num)) return '';
    return num.toLocaleString('ja-JP');
  }

  function roundUp(price) {
    if (!price || price < 100) return price;
    if (price < 10000)   return Math.ceil(price / 10)   * 10;
    if (price < 1000000) return Math.ceil(price / 100)  * 100;
    return                      Math.ceil(price / 1000) * 1000;
  }

  /** Date → 和暦文字列（例: 令和8年4月7日） */
  function toJpDate(date) {
    try {
      return new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
        era: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }).format(date);
    } catch {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    }
  }

  /** Date → 西暦文字列（例: 2026年5月21日） */
  function toSeikiDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }

  /** dateFormat に応じて日付文字列を返す */
  function formatDate(date, dateFormat) {
    return dateFormat === 'seireki' ? toSeikiDate(date) : toJpDate(date);
  }

  /** ArrayBuffer → base64 */
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // ── フォント読み込み ──────────────────────────────────────────

  let fontLoaded = false;

  /**
   * NotoSansJP フォントを読み込み pdfMake に登録する
   * @returns {Promise<boolean>} 成功/失敗
   */
  async function loadJapaneseFont() {
    if (fontLoaded) return true;

    // CDNからフォントを取得（Latin + 日本語の両方を含む完全なフォントが必要）
    // ※ OTFはpdfmake 0.1.xでTTFとして解析されハングするためTTFのみ使用する
    const candidates = [
      // 旧字体対応 NotoSansCJKjp VF（funai-yuji-yoshida/neppon-fonts）を優先
      'https://funai-yuji-yoshida.github.io/neppon-fonts/NotoSansCJKjp-VF.ttf',
      // fallback: minoryorg ミラー
      'https://cdn.jsdelivr.net/gh/minoryorg/Noto-Sans-CJK-JP/fonts/NotoSansCJKjp-Regular.ttf',
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        // 拡張子で登録名を決める（pdfmakeはfontkit経由でフォーマット自動判定）
        pdfMake.vfs['NotoSansJP.ttf'] = b64;
        pdfMake.fonts = Object.assign({}, pdfMake.fonts || {}, {
          NotoSansJP: {
            normal:      'NotoSansJP.ttf',
            bold:        'NotoSansJP.ttf',
            italics:     'NotoSansJP.ttf',
            bolditalics: 'NotoSansJP.ttf',
          }
        });
        fontLoaded = true;
        console.log('フォント読み込み成功:', url);
        return true;
      } catch (e) {
        console.warn('フォント読み込み失敗:', url, e);
      }
    }
    return false;
  }

  // ── PDF 文書定義 生成 ────────────────────────────────────────

  /**
   * pdfmake 文書定義を生成する
   * @param {Object} data - 見積データ
   * @returns {Object} pdfmake docDefinition
   */
  function buildDocDefinition(data) {
    const branch = BRANCH_INFO[data.branchKey] || {
      name:    data.branchName    || '営業サービス本部',
      postal:  data.branchPostal  || '〒243-0215',
      address: data.branchAddress || '神奈川県厚木市上古沢411番地',
      tel:     data.branchTel     || '046-247-3269',
      fax:     data.branchFax     || '046-248-6317',
    };

    const sections = (data.sections || []).map(s => ({
      ...s,
      name:  toZenkana(s.name  || ''),
      items: (s.items || []).map(i => ({
        ...i,
        name: toZenkana(i.denpyoName || i.name || ''),
        unit: toZenkana(i.unit || ''),
      })),
    }));
    const frpMode  = data.frpMode  || false;
    const frpItems = data.frpItems || [];

    // FRPモード用合計
    const roundingEnabled = data.roundingEnabled || false;
    const frpPriceTotal   = frpItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    const frpShikiriTotal = frpItems.reduce((s, i) => {
      const v = roundingEnabled ? roundUp(Number(i.priceA) || 0) : (Number(i.priceA) || 0);
      return s + v * (Number(i.qty) || 1);
    }, 0);

    const dateStr    = data.date ? formatDate(data.date, data.dateFormat) : '';
    const quoteNoStr = data.quoteNoStr || (data.seqNo ? `CQR${data.seqNo}-${String(data.revision || 1).padStart(5, '0')}` : '');

    // セクション小計の計算
    let sectionTotals, grandTotal;
    if (frpMode) {
      sectionTotals = [];
      grandTotal    = frpShikiriTotal;
    } else {
      sectionTotals = sections
        .map(s => {
          const subtotal = (s.items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
          const secQty   = Math.max(1, Number(s.secQty) || 1);
          return { ...s, subtotal, secQty, effectiveTotal: subtotal * secQty };
        })
        .filter(s => {
          // 大項目名が入力されているセクションは必ず印刷
          if ((s.name || '').trim()) return true;
          // 大項目名が空でも、明細行に内容があれば印刷
          return (s.items || []).some(i => (i.name || '').trim() || (i.unitPrice != null) || (i.amount > 0));
        });
      grandTotal = sectionTotals.reduce((sum, s) => sum + s.effectiveTotal, 0);
    }
    const discountEnabled  = data.discountEnabled !== false;
    const discount         = discountEnabled ? (Number(data.discount) || 0) : 0;
    const adjustAmount     = discountEnabled ? (Number(data.adjustAmount) || 0) : 0;
    const waribikiAmount   = Number(data.waribikiAmount) || 0;
    const quoteCategory   = data.quoteCategory || '';
    const deliveryPrice   = Number(data.deliveryPrice) || grandTotal;
    const legalRate     = (Number(data.legalWelfareRate) || 14.6) / 100;
    const laborCost     = Number(data.laborCost) || 0;
    const legalWelfare  = Math.round(laborCost * legalRate);
    const anzenCost     = Number(data.anzenCost) || 0;
    // 内訳基準: teika=定価合計, dairi-discount=定価-出精値引き, それ以外=仕切(deliveryPrice)
    const uchiwakeBase  = data.pdfPriceMode === 'teika' ? grandTotal
      : data.pdfPriceMode === 'dairi-discount' ? Math.max(0, grandTotal - discount)
      : deliveryPrice;
    const materialCost  = uchiwakeBase - laborCost - legalWelfare - anzenCost;
    const showUchiwake   = data.showUchiwake !== false;

    const font = fontLoaded ? 'NotoSansJP' : 'Roboto';

    return {
      pageSize:    'A4',
      pageMargins: [18, 38, 18, 18],

      defaultStyle: {
        font:       font,
        fontSize:   8.5,
        lineHeight: 1.25,
      },

      styles: {
        docTitle:    { fontSize: 22, bold: true, characterSpacing: 8 },
        tableHeader: { bold: true, alignment: 'center', fontSize: 8, noWrap: true },
        sectionHdr:  { bold: true, fontSize: 8.5 },
        amountBig:   { fontSize: 18, bold: true },
        subtotalRow: { bold: true, fillColor: '#f8f8f8' },
        totalRow:    { bold: true },
        pageHdr:     { fontSize: 8, color: '#000' },
      },

      // ページヘッダー（2ページ目以降）
      header(currentPage, pageCount) {
        if (currentPage === 1 || frpMode) return null;
        return {
          margin: [18, 8, 18, 0],
          table: {
            widths: ['*', 80],
            body: [[
              {
                text: [quoteNoStr, data.projectName ? `　${data.projectName}` : ''],
                style: 'pageHdr',
                border: [false, false, false, true],
              },
              {
                text: `${currentPage - 1}／${pageCount - 1}`,
                style: 'pageHdr',
                alignment: 'right',
                border: [false, false, false, true],
              },
            ]],
          },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0 },
        };
      },

      content: [
        // ====================================================
        // 御見積書ヘッダー（常に出力）
        // printCover=true のとき独立ページ → 改ページ後に明細
        // printCover=false のとき明細と同一ページから続ける
        // ====================================================
        ...buildCoverPage({
          quoteNoStr, dateStr, branch,
          data, sectionTotals, grandTotal, discount, discountEnabled, quoteCategory,
          deliveryPrice, materialCost, laborCost, legalWelfare, legalRate, anzenCost,
          buhanDiscTotal: data.buhanDiscTotal || 0,
          mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal,
          showUchiwake,
          showProductCode: data.showProductCodeCover,
          frpMode, frpItems, frpPriceTotal, frpShikiriTotal,
          frpShowZuban: data.frpShowZuban !== false,
          frpShowSpecs: data.frpShowSpecs !== false,
          frpDiscount:  data.frpDiscount || 0,
          roundingEnabled,
          sections,
          adjustAmount, waribikiAmount,
          printDetail: data.printDetail !== false,
          showTaxIncluded: data.showTaxIncluded || false,
          showBikou: data.showBikou !== false,
          showTeikaTotal: data.showTeikaTotal !== false,
        }),

        // ====================================================
        // 明細書（FRPモードは鏡のみ1ページ構成のため出力しない）
        // ====================================================
        ...(!frpMode && data.printDetail !== false ? [
          { text: '', pageBreak: 'after' },
          ...(quoteCategory.includes('工事')
            ? (data.printMode === 'simple'
                ? buildKoujiSummaryDetailPages({ sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, discount, discountEnabled: data.discountEnabled !== false, adjustAmount, waribikiAmount, showBikou: data.showBikou !== false })
                : buildKoujiDetailPages({ quoteNoStr, sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, showSubtotalBoth: data.showSubtotalBoth, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, discount, discountEnabled: data.discountEnabled !== false, adjustAmount, waribikiAmount, showBikou: data.showBikou !== false }))
            : (data.printMode === 'simple'
                ? buildBuppanSagyoSummaryDetailPages({ sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, quoteCategory, useBuppanDeliveryLabel: data.useBuppanDeliveryLabel || false, adjustAmount, showBikou: data.showBikou !== false })
                : buildBuppanSagyoDetailPages({ quoteNoStr, sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, showSubtotalBoth: data.showSubtotalBoth, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, quoteCategory, useBuppanDeliveryLabel: data.useBuppanDeliveryLabel || false, adjustAmount, showBikou: data.showBikou !== false }))
          ),
        ] : []),
      ],
    };
  }

  // ── 1ページ目（表紙）────────────────────────────────────────

  function buildCoverPage({ quoteNoStr, dateStr, branch, data, sectionTotals,
    grandTotal, discount, discountEnabled, quoteCategory, deliveryPrice, materialCost, laborCost, legalWelfare, legalRate, anzenCost, buhanDiscTotal = 0,
    mainRate, pdfPriceMode, dairiTotal, showUchiwake, showProductCode = false,
    frpMode, frpItems, frpPriceTotal, frpShikiriTotal,
    frpShowZuban = true, frpShowSpecs = true, frpDiscount = 0,
    roundingEnabled = false, sections = [],
    adjustAmount = 0, waribikiAmount = 0, printDetail = false, showTaxIncluded = false, showBikou = true, showTeikaTotal = true }) {
    const isDairiAvailable = mainRate != null || dairiTotal != null;
    const isActiveDairi = pdfPriceMode !== 'teika' && isDairiAvailable;
    const isKoujiDairi = pdfPriceMode === 'dairi-kouji' && isDairiAvailable;
    const isBulk = pdfPriceMode === 'dairi-bulk' && isDairiAvailable;
    const useDairiColumns = pdfPriceMode === 'dairi' && isDairiAvailable;
    const isShikiOnly = pdfPriceMode === 'dairi-only' && isDairiAvailable;
    const useDairi = useDairiColumns || isKoujiDairi;
    const dairiUnit = (item) => {
      if (item?.finalDairiUnit != null) return item.finalDairiUnit;
      if (item?._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice;
      const rate = (item?.dairiRate ?? mainRate) ?? mainRate;
      if (rate == null) return null;
      const baseUnit = item?.unitPrice != null ? item.unitPrice
        : (item?.amount != null ? Math.round(Number(item.amount) / (Number(item?.qty) || 1)) : null);
      if (!baseUnit) return null;
      const auto = Math.round(baseUnit * rate);
      return roundingEnabled ? roundUp(auto) : auto;
    };
    const dairi = (v, item) => {
      const qty = Number(item?.qty) || 1;
      if (item?.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item?._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice * qty;
      const rate = (item?.dairiRate ?? mainRate) ?? mainRate;
      if (rate == null) return 0;
      if (roundingEnabled && item?.unitPrice) return roundUp(Math.round(item.unitPrice * rate)) * qty;
      return Math.round((Number(v) || 0) * rate);
    };
    // 値引き額ラベル: 工事を含む場合→「出精値引き」、物販・作業→「値引き額」
    const discountLabel = (quoteCategory || '').includes('工事') ? '出精値引き' : '値引き額';
    const isTeika = pdfPriceMode === 'teika';
    const useDiscountStyle = pdfPriceMode === 'dairi-discount' && isDairiAvailable;
    // dairi-discount は仕切を無視して「定価 - 出精値引き」を御見積金額にする
    const discountStylePrice = useDiscountStyle ? Math.max(0, grandTotal - discount) : deliveryPrice;
    const eiseiSections = frpMode
      ? (sections || []).filter(s => (s.items || []).some(i => (i.name || '').trim()))
      : [];
    const eiseiItems = eiseiSections.flatMap(s => (s.items || []).filter(i => (i.name || '').trim()));
    const eiseiPriceTotal   = eiseiItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const eiseiShikiriTotal = eiseiItems.reduce((sum, i) => {
      const u = dairiUnit(i);
      return sum + (u != null ? u * (Number(i.qty) || 1) : 0);
    }, 0);
    const combinedPriceTotal   = frpPriceTotal   + eiseiPriceTotal;
    const combinedShikiriTotal = frpShikiriTotal + eiseiShikiriTotal;
    const displayPrice = frpMode
      ? (isTeika
        ? (frpDiscount > 0 ? Math.max(0, combinedPriceTotal - frpDiscount) : combinedPriceTotal)
        : (frpDiscount > 0 ? Math.max(0, combinedShikiriTotal - frpDiscount) : combinedShikiriTotal))
      : (isTeika ? grandTotal : discountStylePrice);
    const taxAmt  = showTaxIncluded ? Math.round(displayPrice * 0.1) : 0;
    const taxIncl = displayPrice + taxAmt;

    // 工事モードは鏡に品目行が表示されないため品目コード列は不要
    if ((quoteCategory || '').includes('工事')) showProductCode = false;
    // 代理店モード: 8列（単価・合計・仕切単価・仕切合計）、定価モード: 6列
    // FRPモード: 定価のみ=6列（定価単価・定価合計）、仕切あり=8列（定価単価・定価合計・仕切単価・仕切合計）
    const bk = showBikou ? 1 : 0;
    const _cwRaw = frpMode
      ? (isTeika ? [22, '*', 25, 20, 58, 58, 44] : [22, '*', 25, 20, 58, 58, 50, 50, 44])
      : (showProductCode
        ? (useDairi ? [22, '*', 50, 24, 44, 52, 58, 52, 58, 44] : [22, '*', 50, 36, 44, 58, 58, 44])
        : (useDairi ? [22, '*', 24, 44, 52, 58, 52, 58, 44] : [22, '*', 36, 44, 58, 58, 44]));
    const COL_WIDTHS = showBikou ? _cwRaw : _cwRaw.slice(0, -1);
    const COLS = (frpMode ? (isTeika ? 7 : 9) : (useDairi ? (showProductCode ? 10 : 9) : (showProductCode ? 8 : 7))) - (showBikou ? 0 : 1);
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));

    // ── サマリーテーブルの行 ──────────────────────────────────
    const tableRows = [];

    // ヘッダー行
    if (frpMode) {
      tableRows.push([
        { text: 'No',       style: 'tableHeader' },
        { text: '品　　　名', style: 'tableHeader' },
        { text: '数量',     style: 'tableHeader' },
        { text: '単位',     style: 'tableHeader' },
        { text: '単　価', style: 'tableHeader' },
        { text: '金　　額', style: 'tableHeader' },
        ...(isTeika ? [] : [
          { text: '仕切単価', style: 'tableHeader' },
          { text: '仕切合計', style: 'tableHeader' },
        ]),
        ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
      ]);
    } else {
      tableRows.push(useDairi ? [
        { text: 'No.', style: 'tableHeader' },
        { text: '品　　　名', style: 'tableHeader' },
        ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
        { text: '数量', style: 'tableHeader' },
        { text: '単位', style: 'tableHeader' },
        { text: '単　価', style: 'tableHeader' },
        { text: '合　計', style: 'tableHeader' },
        { text: '仕切単価', style: 'tableHeader' },
        { text: '仕切合計', style: 'tableHeader' },
        ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
      ] : isShikiOnly ? [
        { text: 'No.', style: 'tableHeader' },
        { text: '品　　　名', style: 'tableHeader' },
        ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
        { text: '数量', style: 'tableHeader' },
        { text: '単位', style: 'tableHeader' },
        { text: '仕切単価', style: 'tableHeader' },
        { text: '仕切合計', style: 'tableHeader' },
        ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
      ] : [
        { text: 'No.', style: 'tableHeader' },
        { text: '品　　　名', style: 'tableHeader' },
        ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
        { text: '数量', style: 'tableHeader' },
        { text: '単位', style: 'tableHeader' },
        { text: '単　価', style: 'tableHeader' },
        { text: '金　　額', style: 'tableHeader' },
        ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
      ]);
    }

    // セクション行
    // 物販・作業の場合はアイテム行を直接表示、工事はセクション集計行
    const isKouji  = (quoteCategory || '').includes('工事');
    const isBuppan = (quoteCategory || '').includes('物販');

    // 見積外工事を先に定義（行数カウントに含めるため）
    const exclusions = (data.exclusions && data.exclusions.length > 0)
      ? data.exclusions : [];
    const exRowCount = Math.ceil(exclusions.length / 2);

    // 第1パス: 行データを収集してカウント（フォントサイズ決定のため）
    const mirrorEntries = [];
    if (!frpMode) {
      const singleSection = sectionTotals.length === 1;
      const hasSections = sectionTotals.some(s => (s.name || '').trim());
      // 物販+大項目あり+鏡+明細 の場合は大項目のみ表示
      const buppanShowSectionOnly = isBuppan && printDetail && hasSections;
      sectionTotals.forEach((s, sIdx) => {
        if (isKouji || (!isBuppan && !singleSection) || buppanShowSectionOnly) {
          // 工事: 常に大項目のみ表示 / 作業（大項目複数）: 大項目のみ表示
          // 物販+大項目+鏡+明細: 大項目のみ表示
          mirrorEntries.push({ type: 'section', s, sIdx });
        } else {
          // 物販（鏡のみ）、または大項目が1つの作業: 個別アイテムを表示
          if (s.name && s.name.trim()) {
            mirrorEntries.push({ type: 'sectionHeader', s });
          }
          // 単価0円のアイテムも名前があれば表示する
          (s.items || []).forEach((item, idx) => {
            if (!item.name || !item.name.trim()) return;
            mirrorEntries.push({ type: 'item', item, idx });
            if (!item.machineSpecHidden) {
              // machineSpec アイテムは品名が型式名そのものなので型式行は出さない
              if (!item.machineSpec) {
                const _modelToShow = item.specMasterContent ? '' : (item.printModel !== false ? (item.model || item.spec || '') : '');
                if (_modelToShow) {
                  mirrorEntries.push({ type: 'machineSpecModel', model: _modelToShow });
                }
              }
              if (item.machineSpec) {
                mirrorEntries.push({ type: 'machineSpecHeader' });
                (item.machineSpec.specs || []).forEach(spec => {
                  mirrorEntries.push({ type: 'machineSpecLine', spec });
                });
              }
            }
            const _specLines = (item.specLines || []).filter(l => l.trim());
            _specLines.forEach(line => mirrorEntries.push({ type: 'specLine', text: line }));
          });
        }
      });
    } else {
      // FRPモード: 送料以外のFRPアイテム → 衛生アイテム → 送料の順で追加
      const frpSoryo = [];
      frpItems.forEach(item => {
        const subEntries = [];
        if (frpShowSpecs && item.type !== 'option' && item.specsHidden === false) {
          (item.specs || []).forEach(spec => subEntries.push({ type: 'frpSpec', text: spec }));
        }
        if (item.type === 'soryo') {
          frpSoryo.push({ item, subEntries });
        } else {
          mirrorEntries.push({ type: 'frpItem', item, hasSubRows: subEntries.length > 0 });
          subEntries.forEach((e, i) => {
            mirrorEntries.push({ ...e, isLastSub: i === subEntries.length - 1 });
          });
        }
      });
      // 衛生アイテム
      eiseiItems.forEach(item => {
        mirrorEntries.push({ type: 'eiseiItem', item });
      });
      // 送料を最後に
      frpSoryo.forEach(({ item, subEntries }) => {
        mirrorEntries.push({ type: 'frpItem', item, hasSubRows: subEntries.length > 0 });
        subEntries.forEach((e, i) => {
          mirrorEntries.push({ ...e, isLastSub: i === subEntries.length - 1 });
        });
      });
    }
    // 見積外工事行・固定行も含めてトータル行数を算出
    // FRPモードで枠外文言がある場合、その高さ相当の仮想行を加算してitemFsを縮小
    const showUchiwakeInCover = showUchiwake;
    const footerVirtualRows = (frpMode && data.frpFooterText) ? 10 : 0;
    const mirrorRowCount = mirrorEntries.length + exRowCount +
      (showUchiwakeInCover ? 8 : isTeika ? 1 : 3) + footerVirtualRows;

    // 行数に応じてフォントサイズ・パディング・マージンを動的調整（1ページ収容のため）
    // 行数が少ない場合は拡大・多い場合は縮小の双方向スケーリング
    let itemFs;
    if      (mirrorRowCount <= 5)  itemFs = 12.5;
    else if (mirrorRowCount <= 8)  itemFs = 11.0;
    else if (mirrorRowCount <= 11) itemFs = 10.0;
    else if (mirrorRowCount <= 14) itemFs =  9.0;
    else if (mirrorRowCount <= 18) itemFs =  8.5;
    else if (mirrorRowCount <= 26) itemFs =  7.5;
    else if (mirrorRowCount <= 34) itemFs =  7.0;
    else if (mirrorRowCount <= 42) itemFs =  6.5;
    else                           itemFs =  6.0;

    const cellPad   = mirrorRowCount <= 5  ? 6   :
                      mirrorRowCount <= 8  ? 5   :
                      mirrorRowCount <= 11 ? 4   :
                      mirrorRowCount <= 14 ? 3   :
                      mirrorRowCount <= 20 ? 2   :
                      mirrorRowCount <= 30 ? 1.5 : 1;

    const topMargin = mirrorRowCount > 18 ? 20 : 14;

    // 第2パス: 決定したフォントサイズで行を生成
    let rowNo = 1;
    mirrorEntries.forEach(entry => {
      const emptyPc = (fs) => showProductCode ? [{ text: '', fontSize: fs }] : [];
      if (entry.type === 'frpItem') {
        const item = entry.item;
        const shikiriRaw = Number(item.priceA) || 0;
        const shikiri = roundingEnabled ? roundUp(shikiriRaw) : shikiriRaw;
        const qty = Number(item.qty) || 1;
        const priceTotal   = (Number(item.price) || 0) * qty;
        const shikiriTotal = shikiri * qty;
        const nameParts = [];
        if (item.type === 'option') {
          if (item.hinmei)    nameParts.push({ text: item.hinmei,    bold: true, fontSize: itemFs });
          if (item.chubunrui) nameParts.push({ text: item.chubunrui, fontSize: Math.max(6, itemFs - 1), color: '#000' });
          const line3 = qty >= 2 ? (item.optSpec5 || '') : (item.name3 || '');
          if (line3) nameParts.push({ text: line3, fontSize: Math.max(6, itemFs - 1), color: '#000' });
        } else {
          if (item.hinmei)  nameParts.push({ text: item.hinmei,  bold: true, fontSize: itemFs });
          if (item.itemnum) nameParts.push({ text: item.itemnum, bold: true, fontSize: item.type === 'soryo' ? itemFs : itemFs + 1.5 });
          if (frpShowZuban) {
            const zp = [];
            if (item.zuban)  zp.push(`図番　${item.zuban}`);
            if (item.hinban) zp.push(`品番　${item.hinban}`);
            if (zp.length) nameParts.push({ text: zp.join('　'), fontSize: Math.max(5.5, itemFs - 1.5), color: '#000' });
          }
        }
        const nameCell = nameParts.length > 0 ? { stack: nameParts } : { text: item.name || '', bold: true, fontSize: itemFs };
        const frpColSpan = COLS - 1;
        const frpPad = Array.from({ length: frpColSpan - 1 }, () => ({ text: '' }));
        const btm = !entry.hasSubRows;
        tableRows.push([
          { text: String(rowNo++), alignment: 'center', fontSize: itemFs, border: [true, true, true, btm] },
          { ...nameCell, border: [true, true, true, btm] },
          { text: String(qty),          alignment: 'center', fontSize: itemFs, border: [true, true, true, btm] },
          { text: item.unit || '',       alignment: 'center', fontSize: itemFs, border: [true, true, true, btm] },
          { text: fmt(item.price) || '', alignment: 'right',  fontSize: itemFs, border: [true, true, true, btm] },
          { text: fmt(priceTotal),       alignment: 'right',  fontSize: itemFs, border: [true, true, true, btm] },
          ...(isTeika ? [] : [
            { text: fmt(shikiri) || '',    alignment: 'right',  fontSize: itemFs, border: [true, true, true, btm] },
            { text: fmt(shikiriTotal),     alignment: 'right',  fontSize: itemFs, border: [true, true, true, btm] },
          ]),
          ...(showBikou ? [{ text: '', fontSize: itemFs, border: [true, true, true, btm] }] : []),
        ]);
        return;
      }
      if (entry.type === 'frpNote') {
        const subBtm = entry.isLastSub ? true : false;
        tableRows.push(
          Array.from({ length: COLS }, (_, c) => ({
            text: c === 1 ? `  ${entry.text}` : '',
            fontSize: c === 1 ? Math.max(6, itemFs - 1.5) : itemFs,
            color: c === 1 ? '#c00' : undefined,
            border: [true, false, c === COLS - 1, subBtm],
          }))
        );
        return;
      }
      if (entry.type === 'frpSpec') {
        const subBtm = entry.isLastSub ? true : false;
        tableRows.push(
          Array.from({ length: COLS }, (_, c) => ({
            text: c === 1 ? `　${entry.text}` : '',
            fontSize: c === 1 ? Math.max(6, itemFs - 1) : itemFs,
            color: c === 1 ? '#555' : undefined,
            border: [true, false, c === COLS - 1, subBtm],
          }))
        );
        return;
      }
      if (entry.type === 'eiseiItem') {
        const item   = entry.item;
        const qty    = Number(item.qty) || 1;
        const uPrice = item.unitPrice || (Number(item.amount) > 0 ? Math.round(Number(item.amount) / qty) : 0);
        const total  = Number(item.amount) || 0;
        tableRows.push([
          { text: String(rowNo++), alignment: 'center', fontSize: itemFs, border: [true, true, true, true] },
          { text: item.name || '', bold: true, fontSize: itemFs, border: [true, true, true, true] },
          { text: String(qty),     alignment: 'center', fontSize: itemFs, border: [true, true, true, true] },
          { text: item.unit || '', alignment: 'center', fontSize: itemFs, border: [true, true, true, true] },
          { text: uPrice > 0 ? fmt(uPrice) : '', alignment: 'right', fontSize: itemFs, border: [true, true, true, true] },
          { text: total  > 0 ? fmt(total)  : '', alignment: 'right', fontSize: itemFs, border: [true, true, true, true] },
          ...(isTeika ? [] : [
            { text: dairiUnit(item) != null ? fmt(dairiUnit(item)) : '', alignment: 'right', fontSize: itemFs, border: [true, true, true, true] },
            { text: dairi(item.amount, item) > 0 ? fmt(dairi(item.amount, item)) : '', alignment: 'right', fontSize: itemFs, border: [true, true, true, true] },
          ]),
          ...(showBikou ? [{ text: item.bikou || '', fontSize: itemFs, border: [true, true, true, true] }] : []),
        ]);
        return;
      }
      if (entry.type === 'section') {
        const s = entry.s;
        const dairiSubtotal = (s.items || []).reduce((sum, i) => {
          const qty = Number(i.qty) || 1;
          if (i.finalDairiUnit != null) return sum + i.finalDairiUnit * qty;
          if (i._dairiManual === true && i.dairiUnitPrice != null) return sum + i.dairiUnitPrice * qty;
          const rate = (i.dairiRate ?? mainRate) ?? mainRate;
          return sum + (rate != null ? Math.round((Number(i.amount) || 0) * rate) : 0);
        }, 0);
        const secN = s.secQty || 1;
        const row = [
          { text: String(s.no || entry.sIdx + 1), alignment: 'center', fontSize: itemFs },
          { text: s.name || '', fontSize: itemFs },
          ...emptyPc(itemFs),
          { text: String(secN), alignment: 'center', fontSize: itemFs },
          { text: '式', alignment: 'center', fontSize: itemFs },
          { text: secN > 1 ? fmt(s.subtotal) : '', alignment: 'right', fontSize: itemFs },
          { text: fmt(s.effectiveTotal), alignment: 'right', fontSize: itemFs },
        ];
        if (useDairi) {
          row.push({ text: secN > 1 ? fmt(dairiSubtotal) : '', alignment: 'right', fontSize: itemFs });
          row.push({ text: fmt(dairiSubtotal * secN), alignment: 'right', fontSize: itemFs });
        }
        if (showBikou) row.push({ text: s.bikou || '', fontSize: itemFs });
        tableRows.push(row);
      } else if (entry.type === 'sectionHeader') {
        const s = entry.s;
        const row = [
          { text: sectionTotals.length === 1 ? '' : String(s.no || ''), alignment: 'center', fontSize: itemFs },
          { text: s.name, bold: true, fontSize: itemFs },
          ...emptyPc(itemFs),
          { text: '', fontSize: itemFs }, { text: '', fontSize: itemFs },
          { text: '', fontSize: itemFs }, { text: '', fontSize: itemFs },
        ];
        if (useDairi) { row.push({ text: '', fontSize: itemFs }); row.push({ text: '', fontSize: itemFs }); }
        if (showBikou) row.push({ text: '', fontSize: itemFs });
        tableRows.push(row);
      } else if (entry.type === 'specLinesHeader') {
        // ＜仕様＞ヘッダー行は出力しない
      } else if (entry.type === 'specLine') {
        const specFs = Math.max(5.5, itemFs - 0.5);
        const row = [
          { text: '', fontSize: specFs },
          { text: entry.text, fontSize: specFs, color: '#000', margin: [8, 0, 0, 0] },
          ...emptyPc(specFs),
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
        ];
        if (useDairi) { row.push({ text: '', fontSize: specFs }); row.push({ text: '', fontSize: specFs }); }
        if (showBikou) row.push({ text: '', fontSize: specFs });
        tableRows.push(row);
      } else if (entry.type === 'machineSpecModel') {
        const specFs = Math.max(5.5, itemFs - 0.5);
        const row = [
          { text: '', fontSize: specFs },
          { text: `　型式　${entry.model}`, fontSize: specFs },
          ...emptyPc(specFs),
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
        ];
        if (useDairi) { row.push({ text: '', fontSize: specFs }); row.push({ text: '', fontSize: specFs }); }
        if (showBikou) row.push({ text: '', fontSize: specFs });
        tableRows.push(row);
      } else if (entry.type === 'machineSpecHeader') {
        // 標準仕様ヘッダー行は出力しない
      } else if (entry.type === 'machineSpecLine') {
        const specFs = Math.max(5.0, itemFs - 1.0);
        const row = [
          { text: '', fontSize: specFs },
          { text: `${entry.spec.label}：${entry.spec.value}`, fontSize: specFs, color: '#000', margin: [8, 0, 0, 0] },
          ...emptyPc(specFs),
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
        ];
        if (useDairi) { row.push({ text: '', fontSize: specFs }); row.push({ text: '', fontSize: specFs }); }
        if (showBikou) row.push({ text: '', fontSize: specFs });
        tableRows.push(row);
      } else {
        const item = entry.item;
        // 熱機ヘッダー行（タイトル）: 数量・単位・単価・金額なし、No.あり
        if (item.isNetsukiHeader) {
          const row = [
            { text: String(rowNo++), alignment: 'right', fontSize: itemFs },
            { text: (item.name || '').replace(/（[^）]*）\s*$/, '').trim(), fontSize: itemFs },
            ...(showProductCode ? [{ text: '', fontSize: itemFs }] : []),
            { text: '', fontSize: itemFs }, { text: '', fontSize: itemFs },
            { text: '', fontSize: itemFs }, { text: '', fontSize: itemFs },
          ];
          if (useDairi) { row.push({ text: '', fontSize: itemFs }); row.push({ text: '', fontSize: itemFs }); }
          if (showBikou) row.push({ text: '', fontSize: itemFs });
          tableRows.push(row);
          return;
        }
        const rowNoText = item.isNetsukiMain ? '' : String(rowNo++);
        const row = [
          { text: rowNoText, alignment: 'right', fontSize: itemFs },
          { text: item.name || '', fontSize: itemFs },
          ...(showProductCode ? [{ text: item.productCode || '', fontSize: itemFs, noWrap: true }] : []),
          { text: String(item.qty || 1), alignment: 'center', fontSize: itemFs },
          { text: item.unit || '式', alignment: 'center', fontSize: Math.min(itemFs, 9) },
          { text: isShikiOnly ? (dairiUnit(item) != null ? fmt(dairiUnit(item)) : '') : (item.unitPrice ? fmt(item.unitPrice) : ''), alignment: 'right', fontSize: itemFs },
          { text: isShikiOnly ? fmt(dairi(item.amount, item)) : fmt(item.amount), alignment: 'right', fontSize: itemFs },
        ];
        if (useDairi) {
          row.push({ text: dairiUnit(item) != null ? fmt(dairiUnit(item)) : '', alignment: 'right', fontSize: itemFs });
          row.push({ text: fmt(dairi(item.amount, item)), alignment: 'right', fontSize: itemFs });
        }
        if (showBikou) row.push({ text: item.bikou || '', fontSize: itemFs });
        tableRows.push(row);
      }
    });

    // 空白行（行数が少ない場合ほど多めに挿入してページを埋める）
    // 備考の行数が多いと1ページを超えるため、追加行数分を差し引く
    const remarksExtraLines = data.remarks ? Math.max(0, data.remarks.split('\n').length - 1) : 0;
    const emptyTarget = mirrorRowCount <= 5  ? 10 :
                        mirrorRowCount <= 8  ? 13 :
                        mirrorRowCount <= 11 ? 16 :
                        mirrorRowCount <= 18 ? 18 :
                        mirrorRowCount <= 26 ? 26 : 10;
    const emptyRows = Math.max(0, emptyTarget - mirrorRowCount - remarksExtraLines);
    for (let i = 0; i < emptyRows; i++) {
      const er = Array.from({ length: COLS }, () => ({ text: ' ', fontSize: itemFs }));
      tableRows.push(er);
    }

    const spanMid = COLS - 2 - bk;
    const dairiGrandTotal = data.dairiTotal || sectionTotals.reduce((sum, s) =>
      sum + (s.items || []).reduce((ss, i) => {
        const qty = Number(i.qty) || 1;
        if (i._dairiManual === true && i.dairiUnitPrice != null) return ss + i.dairiUnitPrice * qty;
        return ss + Math.round((Number(i.amount) || 0) * ((i.dairiRate ?? mainRate) ?? mainRate));
      }, 0) * (s.secQty || 1), 0);
    // 物販で代理店価格合計100万未満の場合のみ「販売価格合計」、それ以外は「貴社お渡し価格」
    const buppanDeliveryLabel = (isBuppan && (data.useBuppanDeliveryLabel || false)) ? '販売価格合計' : '貴社お渡し価格';

    if (frpMode) {
      if (isTeika) {
        // 定価のみモード: 6列（仕切列なし）
        tableRows.push([
          { text: '', border: [true, true, false, false], fillColor: '#e8f0f8' },
          { text: '合　　計', alignment: 'center', bold: true, fontSize: itemFs, colSpan: 4,
            border: [false, true, false, false], fillColor: '#e8f0f8' },
          { text: '' }, { text: '' }, { text: '' },
          { text: fmt(combinedPriceTotal), alignment: 'right', bold: true, fontSize: itemFs,
            border: [false, true, true, false], fillColor: '#e8f0f8' },
          ...(showBikou ? [{ text: '', border: [false, true, true, false], fillColor: '#e8f0f8' }] : []),
        ]);
        if (frpDiscount > 0) {
          tableRows.push([
            { text: '', border: [true, false, false, false], fillColor: '#fff' },
            { text: '出精値引き', alignment: 'center', fontSize: itemFs, colSpan: 4,
              border: [false, false, false, false], fillColor: '#fff' },
            { text: '' }, { text: '' }, { text: '' },
            { text: `▲ ${fmt(frpDiscount)}`, alignment: 'right', fontSize: itemFs, noWrap: true,
              border: [false, false, true, false], fillColor: '#fff' },
            ...(showBikou ? [{ text: '', border: [false, false, true, false], fillColor: '#fff' }] : []),
          ]);
          const grandFrpTeika = Math.max(0, combinedPriceTotal - frpDiscount);
          tableRows.push([
            { text: '', border: [true, false, false, false], fillColor: '#dce8f7' },
            { text: '御見積金額（税別）', alignment: 'center', bold: true, fontSize: itemFs, colSpan: 4,
              border: [false, false, false, false], fillColor: '#dce8f7' },
            { text: '' }, { text: '' }, { text: '' },
            { text: fmt(grandFrpTeika), alignment: 'right', bold: true, fontSize: itemFs,
              border: [false, false, true, false], fillColor: '#dce8f7' },
            ...(showBikou ? [{ text: '', border: [false, false, true, false], fillColor: '#dce8f7' }] : []),
          ]);
        }
      } else {
      // FRPモード専用合計行（8列: No/品名/数量/単位/定価単価/定価合計/仕切単価/仕切合計）
      tableRows.push([
        { text: '', border: [true, true, false, false], fillColor: '#e8f0f8' },
        { text: '合　　計', alignment: 'center', bold: true, fontSize: itemFs, colSpan: 4,
          border: [false, true, false, false], fillColor: '#e8f0f8' },
        { text: '' }, { text: '' }, { text: '' },
        { text: fmt(combinedPriceTotal),   alignment: 'right', bold: true, fontSize: itemFs,
          border: [false, true, false, false], fillColor: '#e8f0f8' },
        { text: '', border: [false, true, false, false], fillColor: '#e8f0f8' },
        { text: fmt(combinedShikiriTotal), alignment: 'right', bold: true, fontSize: itemFs,
          border: [false, true, true, false], fillColor: '#e8f0f8' },
        ...(showBikou ? [{ text: '', border: [false, true, true, false], fillColor: '#e8f0f8' }] : []),
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
          ...(showBikou ? [{ text: '', border: [false, false, true, false], fillColor: '#fff' }] : []),
        ]);
        const grandFrp = Math.max(0, combinedShikiriTotal - frpDiscount);
        tableRows.push([
          { text: '', border: [true, false, false, false], fillColor: '#dce8f7' },
          { text: '御見積金額（税別）', alignment: 'center', bold: true, fontSize: itemFs, colSpan: 4,
            border: [false, false, false, false], fillColor: '#dce8f7' },
          { text: '' }, { text: '' }, { text: '' },
          { text: '', border: [false, false, false, false], fillColor: '#dce8f7' },
          { text: '', border: [false, false, false, false], fillColor: '#dce8f7' },
          { text: fmt(grandFrp), alignment: 'right', bold: true, fontSize: itemFs,
            border: [false, false, true, false], fillColor: '#dce8f7' },
          ...(showBikou ? [{ text: '', border: [false, false, true, false], fillColor: '#dce8f7' }] : []),
        ]);
      }
      } // end !isTeika
    } else if (useDairiColumns) {
      // showProductCode時は9列、通常は8列
      // colSpan を showProductCode に合わせて調整
      const dColSpan = showProductCode ? 5 : 4;
      const dPh = showProductCode
        ? [{ text: '' }, { text: '' }, { text: '' }, { text: '' }]
        : [{ text: '' }, { text: '' }, { text: '' }];
      // 合計行（定価合計 + 仕切合計を1行に集約）
      tableRows.push([
        { text: '', border: [true, true, false, false] },
        { text: '合　　計', alignment: 'center', bold: true, fontSize: itemFs, colSpan: dColSpan, border: [false, true, false, false] },
        ...dPh,
        { text: fmt(grandTotal), alignment: 'right', fontSize: itemFs, border: [false, true, false, false] },
        { text: '', border: [false, true, false, false] },
        { text: fmt(dairiGrandTotal), alignment: 'right', fontSize: itemFs, bold: true, border: [false, true, true, false] },
        ...(showBikou ? [{ text: '', border: [false, true, true, false] }] : []),
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: buppanDeliveryLabel, alignment: 'center', fontSize: itemFs, colSpan: dColSpan, border: [false, false, false, false] },
        ...dPh,
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: fmt(deliveryPrice), alignment: 'right', fontSize: itemFs, bold: true, border: [false, false, true, false] },
        ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
      ]);
    } else if (isBulk) {
      // 6列一括仕切モード
      tableRows.push([
        { text: '', border: [true, true, false, false] },
        { text: '合　　計', alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, true, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(grandTotal), alignment: 'right', fontSize: itemFs, border: [false, true, true, false] },
        ...(showBikou ? [{ text: '', border: [false, true, true, false] }] : []),
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: buppanDeliveryLabel, alignment: 'center', bold: true, fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(deliveryPrice), alignment: 'right', fontSize: itemFs, bold: true, border: [false, false, true, false] },
        ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
      ]);
    } else if (isKoujiDairi) {
      // 8列工事代理店価格モード (旧動作: 仕切合計のみ表示)
      if (!(discountEnabled && discount === 0)) {
        tableRows.push([
          { text: '', border: [true, true, false, false] },
          { text: '合　　計', alignment: 'center', bold: true, fontSize: itemFs, colSpan: spanMid, border: [false, true, false, false] },
          ...emp(spanMid - 1),
          { text: fmt(dairiGrandTotal), alignment: 'right', fontSize: itemFs, border: [false, true, true, false] },
          ...(showBikou ? [{ text: '', border: [false, true, true, false] }] : []),
        ]);
      }
      if (discountEnabled) {
        if (discount > 0) {
          tableRows.push([
            { text: '', border: [true, false, false, false] },
            { text: discountLabel, alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
            ...emp(spanMid - 1),
            { text: '▲ ' + fmt(discount), alignment: 'right', fontSize: itemFs, noWrap: true, border: [false, false, true, false] },
            ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
          ]);
        }
        const oshiTop = discount === 0;
        tableRows.push([
          { text: '', border: [true, oshiTop, false, false] },
          { text: buppanDeliveryLabel, alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, oshiTop, false, false] },
          ...emp(spanMid - 1),
          { text: fmt(deliveryPrice), alignment: 'right', fontSize: itemFs, bold: true, border: [false, oshiTop, true, false] },
          ...(showBikou ? [{ text: '', border: [false, oshiTop, true, false] }] : []),
        ]);
      }
    } else if (useDiscountStyle) {
      // 6列出精値引きモード (Mode 3: dairi-discount)
      // 定価合計 - 仕切合計 を出精値引きとして自動計算して表示する
      const dairiDiscountAmt = Math.max(0, grandTotal - deliveryPrice);
      tableRows.push([
        { text: '', border: [true, true, false, false] },
        { text: '合　　計', alignment: 'center', bold: true, fontSize: itemFs, colSpan: spanMid, border: [false, true, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(grandTotal), alignment: 'right', fontSize: itemFs, bold: true, border: [false, true, true, false] },
        ...(showBikou ? [{ text: '', border: [false, true, true, false] }] : []),
      ]);
      if (dairiDiscountAmt > 0) {
        tableRows.push([
          { text: '', border: [true, false, false, false] },
          { text: discountLabel, alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
          ...emp(spanMid - 1),
          { text: '▲ ' + fmt(dairiDiscountAmt), alignment: 'right', fontSize: itemFs, noWrap: true, border: [false, false, true, false] },
          ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
        ]);
      }
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: buppanDeliveryLabel, alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(deliveryPrice), alignment: 'right', fontSize: itemFs, bold: true, border: [false, false, true, false] },
        ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
      ]);
    } else if (isShikiOnly) {
      // 6列 仕切表示のみ (Mode 5: dairi-only)
      tableRows.push([
        { text: '', border: [true, true, false, false] },
        { text: '合　　計', alignment: 'center', bold: true, fontSize: itemFs, colSpan: spanMid, border: [false, true, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(dairiGrandTotal), alignment: 'right', fontSize: itemFs, bold: true, border: [false, true, true, false] },
        ...(showBikou ? [{ text: '', border: [false, true, true, false] }] : []),
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: buppanDeliveryLabel, alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(deliveryPrice), alignment: 'right', fontSize: itemFs, bold: true, border: [false, false, true, false] },
        ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
      ]);
    } else {
      // 6列 (Mode 1: teika、または代理店価格未設定時のフォールバック)
      tableRows.push([
        { text: '', border: [true, true, false, false] },
        { text: '合　　計', alignment: 'center', bold: true, fontSize: itemFs, colSpan: spanMid, border: [false, true, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(grandTotal), alignment: 'right', fontSize: itemFs, bold: true, border: [false, true, true, false] },
        ...(showBikou ? [{ text: '', border: [false, true, true, false] }] : []),
      ]);
      if (!isTeika && discountEnabled && discount > 0) {
        tableRows.push([
          { text: '', border: [true, false, false, false] },
          { text: discountLabel, alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
          ...emp(spanMid - 1),
          { text: '▲ ' + fmt(discount), alignment: 'right', fontSize: itemFs, noWrap: true, border: [false, false, true, false] },
          ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
        ]);
      }
    }

    if (showUchiwakeInCover) {
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: '＜内訳＞', alignment: 'center', fontSize: itemFs, colSpan: COLS - 1, border: [false, false, true, false] },
        ...emp(COLS - 2),
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: '1）資材費他', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(materialCost), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
        ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: '2）労務費', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(laborCost), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
        ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: `3）法定福利費（${(legalRate * 100).toFixed(1)}%）`, fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(legalWelfare), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
        ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
      ]);
      // 内訳 4) 安全衛生経費
      if (anzenCost > 0) {
        tableRows.push([
          { text: '', border: [true, false, false, false] },
          { text: '4）安全衛生経費', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
          ...emp(spanMid - 1),
          { text: fmt(anzenCost), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
          ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
        ]);
      }
    }

    // ── 税込み合計行 ─────────────────────────────────────────────
    if (showTaxIncluded) {
      tableRows.push([
        { text: '', border: [true, true, false, false] },
        { text: '合計（税抜き）', alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, true, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(displayPrice), alignment: 'right', fontSize: itemFs, border: [false, true, true, false] },
        ...(showBikou ? [{ text: '', border: [false, true, true, false] }] : []),
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: '消費税（10%）', alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(taxAmt), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
        ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, true] },
        { text: '合計（税込み）', alignment: 'center', bold: true, fontSize: itemFs, colSpan: spanMid, border: [false, false, false, true] },
        ...emp(spanMid - 1),
        { text: fmt(taxIncl), alignment: 'right', bold: true, fontSize: itemFs, border: [false, false, true, true] },
        ...(showBikou ? [{ text: '', border: [false, false, true, true] }] : []),
      ]);
    }

    // ── 見積外工事リスト（選択なしの場合は非表示）──────────────
    const half = Math.ceil(exclusions.length / 2);
    const leftCol  = exclusions.slice(0, half);
    const rightCol = exclusions.slice(half);
    const exRows   = leftCol.map((item, i) => [
      { text: `${i + 1}. ${item}は含みません。`, fontSize: itemFs, border: [false, false, false, false] },
      { text: rightCol[i] ? `${i + half + 1}. ${rightCol[i]}は含みません。` : '', fontSize: itemFs, border: [false, false, false, false] },
    ]);

    // ── スタンプボックス（2行×2列 = 4ボックス） ─────────────────
    // 幅: サマリーテーブルの単価(58pt)+金額(58pt)列と左右端を合わせる
    const STAMP_W       = 58;  // 各セル幅（単価・金額列に合わせる）
    const STAMP_LABEL_H = mirrorRowCount > 18 ? 10 : 12;
    const STAMP_BODY_H  = mirrorRowCount > 18 ? 22 : 32;
    const stampTable = {
      table: {
        widths:  [STAMP_W, STAMP_W],
        heights: [STAMP_LABEL_H, STAMP_BODY_H, STAMP_LABEL_H, STAMP_BODY_H],
        body: [
          // ── 上段ラベル行 ──
          [
            { text: '検　印', alignment: 'center', fontSize: 7 },
            { text: '検　印', alignment: 'center', fontSize: 7 },
          ],
          // ── 上段印鑑エリア行 ──
          [
            { text: '', alignment: 'center' },
            { text: '', alignment: 'center' },
          ],
          // ── 下段ラベル行 ──
          [
            { text: '検　印', alignment: 'center', fontSize: 7 },
            { text: '担　当', alignment: 'center', fontSize: 7 },
          ],
          // ── 下段印鑑エリア行 ──
          [
            { text: '', alignment: 'center' },
            { text: '', alignment: 'center' },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
      },
    };

    // 最終行の下枠線を表示（cell.borderのbottomフラグを上書き）
    const lastRow = tableRows[tableRows.length - 1];
    if (lastRow) {
      lastRow.forEach(cell => {
        if (cell && typeof cell === 'object' && Array.isArray(cell.border)) {
          cell.border[3] = true;
        }
      });
    }

    // 行数に応じたヘッダー部フォントサイズ
    const compact = mirrorRowCount > 18;
    const titleFs    = compact ? 17 : 22;
    // 顧客名の文字数に応じてフォントサイズを自動縮小（利用可能幅 ≒ 324pt）
    const _custFullLen = ((data.customerName || '') +
      (data.customerHonorific && data.customerHonorific !== 'ー' ? '　' + data.customerHonorific : '')).length;
    const custFs = compact ? 12 :
      _custFullLen <= 15 ? 16 :
      _custFullLen <= 19 ? 14 :
      _custFullLen <= 24 ? 12 : 10;
    const midFs      = compact ? 9  : 12;
    const amountBigFs= compact ? 14 : 18;
    const hdrLineH   = compact ? 1.3 : 1.6;
    const amountMgn  = compact ? 3   : 6;

    return [
      // ── タイトル（A4全幅センタリング） ──
      { text: '御　見　積　書', fontSize: titleFs, bold: true, characterSpacing: 8, alignment: 'center' },
      // ── 定型文（左列）＋ 社印・会社情報（右列） ──
      {
        columns: [
          {
            width: '*',
            stack: [
              // 顧客名
              {
                margin: [25, topMargin, 0, 0],
                text: [
                  { text: (data.customerName || ''), fontSize: custFs, bold: true },
                  ...(data.customerHonorific && data.customerHonorific !== 'ー'
                    ? [{ text: '　' + data.customerHonorific, fontSize: custFs }]
                    : []),
                ],
              },
              // 顧客担当者（会社名と同サイズ）
              ...(data.showContactName && data.contactName ? [{
                margin: [25, 2, 0, 0],
                text: (data.contactName || '') + '　' + (data.contactHonorific || '様'),
                fontSize: custFs,
              }] : []),
              // 工事名 / 件名
              {
                margin: [25, compact ? 4 : 8, 0, 0],
                columns: [
                  { width: 42, text: isKouji ? '工 事 名' : '件　　名', fontSize: 9 },
                  { width: '*', text: data.projectName || '', decoration: 'underline', fontSize: 9 },
                ],
              },
              // 件名2行目
              ...(data.projectName2 ? [{
                margin: [67, 1, 0, 0],
                text: data.projectName2,
                decoration: 'underline', fontSize: 9,
              }] : []),
              // 件名3行目
              ...(data.projectName3 ? [{
                margin: [67, 1, 0, 0],
                text: data.projectName3,
                decoration: 'underline', fontSize: 9,
              }] : []),
              // 定型文
              {
                margin: [25, compact ? 3 : 5, 0, 0],
                text: '下記の通り御見積申し上げます。\n何卒ご用命くださいますよう御願い申し上げます。',
                fontSize: compact ? 7.5 : 8.5,
                lineHeight: hdrLineH,
              },
            ],
          },
          {
            width: 210,
            stack: [
              { text: quoteNoStr, alignment: 'right', fontSize: 9, font: fontLoaded ? 'NotoSansJP' : 'Roboto' },
              { text: dateStr, alignment: 'right', fontSize: 9, margin: [0, 4, 0, 0] },
              { text: branch.postal,  fontSize: 8, alignment: 'right', margin: [0, compact ? 2 : 4, 0, 0] },
              { text: branch.address, fontSize: 7.5, alignment: 'right' },
              { text: 'ネポン株式会社', fontSize: 9, bold: true, alignment: 'right' },
              { text: branch.name,    fontSize: 9, bold: true, alignment: 'right' },
              ...(data.showShocho && data.shochoName ? [{ text: `所長　：${data.shochoName}`, fontSize: 8, alignment: 'right' }] : []),
              { text: `TEL　${branch.tel}`, fontSize: 8, alignment: 'right' },
              { text: `FAX　${branch.fax}`, fontSize: 8, alignment: 'right' },
              ...(data.showOwnerName && data.ownerName ? [{ text: `担当者：${data.ownerName}（営業）${data.updaterName ? `　${data.updaterName}（事務）` : ''}`, fontSize: 8, alignment: 'right' }] : []),
              ...(data.branchNote ? [{ text: data.branchNote, fontSize: 8, alignment: 'right' }] : []),
            ],
          },
        ],
      },

      // ── 金額 + 条件 + スタンプ ──────────────────────────
      {
        margin: [25, compact ? 3 : 6, 0, 0],
        columns: [
          {
            width: '*',
            stack: [
              {
                columns: [
                  { width: 75, text: '御 見 積 金 額', fontSize: compact ? 8 : 10, margin: [0, compact ? 2 : 4, 0, 0] },
                  {
                    width: '*',
                    stack: [
                      {
                        text: `¥${fmt(showTaxIncluded ? taxIncl : displayPrice)}`,
                        fontSize: amountBigFs,
                        bold: true,
                        decoration: 'underline',
                      },
                      ...(!isBuppan ? [{ text: '（法定福利費事業主負担金を含む）', fontSize: 7, margin: [0, 1, 0, 0] }] : []),
                    ],
                  },
                ],
              },
              // 希望小売合計（定価合計）を teika・仕切のみ以外のモードで表示
              ...(() => {
                const _teikaTotal = frpMode ? frpPriceTotal : grandTotal;
                const _showTeika  = showTeikaTotal && !isTeika && !isShikiOnly && !isBulk && _teikaTotal > 0 && _teikaTotal !== displayPrice;
                return _showTeika ? [{
                  columns: [
                    { width: 75, text: '希望小売合計', fontSize: 8, margin: [0, 2, 0, 0] },
                    { width: '*', text: `¥${fmt(_teikaTotal)}`, fontSize: 8, margin: [0, 2, 0, 0] },
                  ],
                }] : [];
              })(),
              {
                margin: [0, amountMgn, 0, 0],
                table: {
                  widths: [70, '*'],
                  body: [
                    [{ text: '納期（御注文後）', fontSize: 8 }, { text: data.deliveryTerm || '', fontSize: 8 }],
                    [{ text: '受 渡 し 方 法', fontSize: 8 }, { text: data.deliveryMethod || '', fontSize: 8 }],
                    [{ text: '支 払 い 条 件', fontSize: 8 }, { text: data.paymentTerm || '', fontSize: 8 }],
                  ],
                },
                layout: {
                  defaultBorder: false,
                  paddingLeft: () => 0,
                  paddingRight: () => 2,
                  paddingTop: () => 0,
                  paddingBottom: () => 2,
                },
              },
              { text: `${data.validDays || ''}`, fontSize: 8, margin: [0, compact ? 1 : 3, 0, 0] },
            ],
          },
          {
            width: 116,
            ...stampTable,
          },
          { width: 25, text: '' },
        ],
      },

      // ── サマリーテーブル ─────────────────────────────────
      {
        margin: [0, 6, 0, 0],
        table: {
          widths:     COL_WIDTHS,
          headerRows: 1,
          body:       tableRows,
        },
        layout: {
          hLineWidth: (i, node) => {
            if (i === 0 || i === 1 || i === node.table.body.length) return 0.8;
            return 0.4;
          },
          vLineWidth: ()        => 0.5,
          paddingLeft:   () => 3,
          paddingRight:  () => 3,
          paddingTop:    () => cellPad,
          paddingBottom: () => cellPad,
          hLineColor: () => '#555',
          vLineColor: () => '#888',
        },
      },

      // ── 見積外工事（選択がある場合のみ）──────────────────────
      ...(exclusions.length > 0 ? [
        {
          margin: [0, cellPad * 2, 0, 0],
          table: {
            widths: ['*'],
            body: [[{
              text: isKouji ? '見積外工事' : '見積外事項',
              bold: true,
              fontSize: itemFs,
              border: [false, true, false, false],
              margin: [0, cellPad, 0, cellPad],
            }]],
          },
          layout: {
            hLineWidth: () => 0.6, vLineWidth: () => 0,
            paddingTop: () => cellPad, paddingBottom: () => cellPad,
            paddingLeft: () => 2, paddingRight: () => 2,
          },
        },
        {
          table: {
            widths: ['50%', '50%'],
            body: exRows,
          },
          layout: {
            hLineWidth: () => 0, vLineWidth: () => 0,
            paddingTop: () => cellPad, paddingBottom: () => cellPad,
            paddingLeft: () => 2, paddingRight: () => 2,
          },
        },
      ] : []),

      // ── 備考（入力がある場合のみ）────────────────────────────
      ...(data.remarks ? [
        {
          margin: [0, cellPad * 2, 0, 0],
          table: {
            widths: ['*'],
            body: [[{
              text: '備　考',
              bold: true,
              fontSize: itemFs,
              border: [false, true, false, false],
              margin: [0, cellPad, 0, cellPad],
            }]],
          },
          layout: {
            hLineWidth: () => 0.6, vLineWidth: () => 0,
            paddingTop: () => cellPad, paddingBottom: () => cellPad,
            paddingLeft: () => 2, paddingRight: () => 2,
          },
        },
        {
          text: data.remarks,
          fontSize: itemFs,
          margin: [4, 0, 0, 0],
          lineHeight: 1.4,
        },
      ] : []),

      // ── 缶体温度設定テーブル（チェックON時のみ）─────────────────
      ...(data.remarkTableEnabled ? [{
        margin: [4, cellPad * 2, 0, 0],
        table: {
          widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'リモコン表示', bold: true, fontSize: itemFs, alignment: 'center' },
              { text: '1', fontSize: itemFs, alignment: 'center' },
              { text: '2', fontSize: itemFs, alignment: 'center' },
              { text: '3', fontSize: itemFs, alignment: 'center' },
              { text: '4', fontSize: itemFs, alignment: 'center' },
              { text: '5', fontSize: itemFs, alignment: 'center' },
              { text: '6', fontSize: itemFs, alignment: 'center' },
              { text: '7', fontSize: itemFs, alignment: 'center' },
            ],
            [
              { text: '目安温度', bold: true, fontSize: itemFs, alignment: 'center' },
              { text: '13℃', fontSize: itemFs, alignment: 'center' },
              { text: '23℃', fontSize: itemFs, alignment: 'center' },
              { text: '34℃', fontSize: itemFs, alignment: 'center' },
              { text: '43℃', fontSize: itemFs, alignment: 'center' },
              { text: '48℃', fontSize: itemFs, alignment: 'center' },
              { text: '70℃', fontSize: itemFs, alignment: 'center' },
              { text: '83.5℃', fontSize: itemFs, alignment: 'center' },
            ],
          ],
        },
        layout: 'lightHorizontalLines',
      }] : []),

      // FRPモード: 枠外文言を2列レイアウトで鏡ページ末尾に追加
      ...(frpMode && data.frpFooterText ? (() => {
        const sections = data.frpFooterText.split(/\n\n+/);
        const mid = Math.ceil(sections.length / 2);
        const leftText  = sections.slice(0, mid).join('\n\n');
        const rightText = sections.slice(mid).join('\n\n');
        return [{
          columns: [
            { text: leftText,  fontSize: 7, lineHeight: 1.3, preserveLeadingSpaces: true, color: '#000', width: '*' },
            { text: rightText, fontSize: 7, lineHeight: 1.3, preserveLeadingSpaces: true, color: '#000', width: '*' },
          ],
          columnGap: 12,
          margin: [0, 10, 0, 0],
        }];
      })() : []),
    ];
  }

  // ── FRP専用明細ページ ─────────────────────────────────────────

  function buildFrpDetailPages({ quoteNoStr, frpItems, frpPriceTotal, frpShikiriTotal,
      frpDiscount = 0, frpFooterText = '', frpShowZuban = true }) {
    const COL_WIDTHS    = [22, '*', 25, 20, 58, 58, 50, 50];
    const shikiriLabel  = '仕切単価';
    const shikiriTLabel = '仕切合計';

    const headerRow = [
      { text: 'No',          style: 'tableHeader' },
      { text: '品名',        style: 'tableHeader' },
      { text: '数量',        style: 'tableHeader' },
      { text: '単位',        style: 'tableHeader' },
      { text: '小売単価',     style: 'tableHeader' },
      { text: '小売合計',     style: 'tableHeader' },
      { text: shikiriLabel,  style: 'tableHeader' },
      { text: shikiriTLabel, style: 'tableHeader' },
    ];

    const rows = [headerRow];
    let rowNo = 1;

    frpItems.forEach(item => {
      const shikiri      = Number(item.priceA) || 0;
      const qty          = Number(item.qty) || 1;
      const priceTotal   = (Number(item.price) || 0) * qty;
      const shikiriTotal = shikiri * qty;

      // 品名: オプション品は3段（hinmei/chubunrui/name3(qty<2) or optSpec5(qty>=2)）、製品は通常
      const nameParts = [];
      if (item.type === 'option') {
        if (item.hinmei)    nameParts.push({ text: item.hinmei,    bold: true, fontSize: 9 });
        if (item.chubunrui) nameParts.push({ text: item.chubunrui, fontSize: 8, color: '#000' });
        const line3 = qty >= 2 ? (item.optSpec5 || '') : (item.name3 || '');
        if (line3) nameParts.push({ text: line3, fontSize: 8, color: '#000' });
      } else {
        if (item.hinmei)  nameParts.push({ text: item.hinmei, bold: true, fontSize: 9 });
        if (item.itemnum) nameParts.push({ text: item.itemnum, bold: true, fontSize: item.type === 'soryo' ? 9 : 11 });
        if (frpShowZuban) {
          const zp = [];
          if (item.zuban)  zp.push(`図番　${item.zuban}`);
          if (item.hinban) zp.push(`品番　${item.hinban}`);
          if (zp.length) nameParts.push({ text: zp.join('　'), fontSize: 7, color: '#000' });
        }
      }
      const nameCell = nameParts.length > 0
        ? { stack: nameParts }
        : { text: item.name || '', bold: true };

      // サブ行（送料注意文・仕様補足）を先に組み立て、有無で main 行の下線を決定
      const subRows = [];
      if (item.soryoNote) {
        subRows.push([
          { text: '', border: [true, false, false, false] },
          { text: `  ${item.soryoNote}`, fontSize: 7, color: '#c00', colSpan: 7,
            border: [false, false, true, false] },
          { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
        ]);
      }
      if (item.type !== 'option' && item.specsHidden === false) {
        (item.specs || []).forEach(spec => {
          subRows.push([
            { text: '', border: [true, false, false, false] },
            { text: `　${spec}`, fontSize: 8, color: '#000', colSpan: 7,
              border: [false, false, true, false] },
            { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
          ]);
        });
      }
      // 最後のサブ行に下線を付ける
      if (subRows.length > 0) {
        const last = subRows[subRows.length - 1];
        last[0].border[3] = true;
        last[1].border[3] = true;
      }
      const btm = subRows.length === 0;
      rows.push([
        { text: String(rowNo++), alignment: 'center', border: [true, true, true, btm] },
        { ...nameCell, border: [true, true, true, btm] },
        { text: String(qty), alignment: 'center', border: [true, true, true, btm] },
        { text: item.unit || '', alignment: 'center', border: [true, true, true, btm] },
        { text: fmt(item.price),   alignment: 'right', border: [true, true, true, btm] },
        { text: fmt(priceTotal),   alignment: 'right', border: [true, true, true, btm] },
        { text: fmt(shikiri),      alignment: 'right', border: [true, true, true, btm] },
        { text: fmt(shikiriTotal), alignment: 'right', border: [true, true, true, btm] },
      ]);
      subRows.forEach(r => rows.push(r));
    });

    // 空白行（最低2行）
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

    const tableBlock = {
      table: {
        widths:     COL_WIDTHS,
        headerRows: 1,
        body:       rows,
      },
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
        color: '#000',
        margin: [0, 12, 0, 0],
        lineHeight: 1.5,
        preserveLeadingSpaces: true,
      });
    }

    return content;
  }

  // ── FRP衛生設備ページ ─────────────────────────────────────────
  // 価格なし4列: No / 品名 / 数量 / 単位

  function buildEiseiSection({ sections, mainRate, pdfPriceMode, dairiTotal, roundingEnabled = false }) {
    const isDairiAvailable = mainRate != null || dairiTotal != null;
    const useDairi    = (pdfPriceMode === 'dairi' || pdfPriceMode === 'dairi-kouji') && isDairiAvailable;
    const isBulk      = pdfPriceMode === 'dairi-bulk'  && isDairiAvailable;
    const isShikiOnly = pdfPriceMode === 'dairi-only'  && isDairiAvailable;

    const dairiUnitFn = (item) => {
      if (item.finalDairiUnit != null) return item.finalDairiUnit;
      if (item.priceS != null && item.priceS > 0) return item.priceS;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return null;
      const baseUnit = item.unitPrice || (item.amount != null ? Math.round(Number(item.amount) / (Number(item.qty) || 1)) : null);
      if (!baseUnit) return null;
      const auto = Math.round(baseUnit * rate);
      return roundingEnabled ? roundUp(auto) : auto;
    };
    const dairiAmtFn = (item) => {
      const qty = Number(item.qty) || 1;
      if (item.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item.priceS != null && item.priceS > 0) return item.priceS * qty;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return 0;
      if (roundingEnabled && item.unitPrice) return roundUp(Math.round(item.unitPrice * rate)) * qty;
      return Math.round((Number(item.amount) || 0) * rate);
    };
    const effectiveUnit = (item) => {
      if (item.unitPrice) return item.unitPrice;
      const qty = Number(item.qty) || 1;
      return Math.round(Number(item.amount) / qty);
    };

    const COL_WIDTHS = useDairi
      ? [20, '*', 22, 44, 52, 58, 52, 58]
      : [22, '*', 36, 44, 58, 58];
    const COLS = useDairi ? 8 : 6;
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));

    const headerRow = useDairi ? [
      { text: 'No.',    style: 'tableHeader' },
      { text: '品　　　名', style: 'tableHeader' },
      { text: '数量',   style: 'tableHeader' },
      { text: '単位',   style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '合　計', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
    ] : (isBulk || isShikiOnly) ? [
      { text: 'No.',    style: 'tableHeader' },
      { text: '品　　　名', style: 'tableHeader' },
      { text: '数量',   style: 'tableHeader' },
      { text: '単位',   style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
    ] : [
      { text: 'No.',    style: 'tableHeader' },
      { text: '品　　　名', style: 'tableHeader' },
      { text: '数量',   style: 'tableHeader' },
      { text: '単位',   style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ];

    const rows = [headerRow];
    let rowNo = 1;
    let hasItems = false;

    sections.forEach(section => {
      const validItems = (section.items || []).filter(i => (i.name || '').trim());
      if (validItems.length === 0) return;

      if ((section.name || '').trim()) {
        rows.push([
          { text: '',           border: [true, true, false, true], fillColor: '#f0f0f0' },
          { text: section.name, bold: true, colSpan: COLS - 1,
            border: [false, true, true, true], fillColor: '#f0f0f0' },
          ...emp(COLS - 2),
        ]);
      }

      validItems.forEach(item => {
        hasItems = true;
        const qtyStr = item.qty != null && item.qty !== '' ? String(item.qty) : '';
        const noCell = { text: String(rowNo++), alignment: 'right', fontSize: 8 };
        if (useDairi) {
          rows.push([
            noCell,
            { text: item.name || '' },
            { text: qtyStr, alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: fmt(effectiveUnit(item)), alignment: 'right' },
            { text: fmt(Number(item.amount) || 0), alignment: 'right' },
            { text: fmt(dairiUnitFn(item)), alignment: 'right' },
            { text: fmt(dairiAmtFn(item)), alignment: 'right' },
          ]);
        } else {
          rows.push([
            noCell,
            { text: item.name || '' },
            { text: qtyStr, alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: (isBulk || isShikiOnly) ? (dairiUnitFn(item) != null ? fmt(dairiUnitFn(item)) : '') : fmt(effectiveUnit(item)), alignment: 'right' },
            { text: (isBulk || isShikiOnly) ? fmt(dairiAmtFn(item)) : fmt(Number(item.amount) || 0), alignment: 'right' },
          ]);
        }
        (item.specLines || []).filter(l => (l || '').trim()).forEach(line => {
          rows.push([
            { text: '' },
            { text: line, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] },
            ...emp(COLS - 2),
          ]);
        });
      });
    });

    if (!hasItems) return [];

    return [
      { text: '衛生設備', bold: true, fontSize: 10, margin: [0, 0, 0, 4] },
      {
        table: { widths: COL_WIDTHS, body: rows },
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
      },
    ];
  }

  // ── FRP+衛生設備 合体明細ページ ───────────────────────────────
  // FRPモードで衛生設備セクションが存在する場合に使用する
  // 単一テーブル（希望小売単価/合計・仕切単価/合計）にFRP行と衛生行を通し番号で並べる

  function buildFrpCombinedDetailPage({
    frpItems, frpPriceTotal, frpShikiriTotal, frpDiscount = 0,
    frpFooterText = '', frpShowZuban = true,
    sections, mainRate, roundingEnabled = false,
  }) {
    const COL_WIDTHS = [22, '*', 25, 20, 58, 58, 50, 50];
    const COLS = 8;

    const dairiUnitFn = (item) => {
      if (item.finalDairiUnit != null) return item.finalDairiUnit;
      if (item.priceS != null && item.priceS > 0) return item.priceS;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return null;
      const base = item.unitPrice || (item.amount != null ? Math.round(Number(item.amount) / (Number(item.qty) || 1)) : null);
      if (!base) return null;
      const auto = Math.round(base * rate);
      return roundingEnabled ? roundUp(auto) : auto;
    };
    const dairiAmtFn = (item) => {
      const qty = Number(item.qty) || 1;
      if (item.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item.priceS != null && item.priceS > 0) return item.priceS * qty;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return 0;
      if (roundingEnabled && item.unitPrice) return roundUp(Math.round(item.unitPrice * rate)) * qty;
      return Math.round((Number(item.amount) || 0) * rate);
    };

    const mkSecRow = (label) => [
      { text: '', border: [true, true, false, true], fillColor: '#d0d8e8' },
      { text: label, bold: true, fontSize: 9, colSpan: COLS - 1,
        border: [false, true, true, true], fillColor: '#d0d8e8' },
      ...Array.from({ length: COLS - 2 }, () => ({ text: '' })),
    ];

    const rows = [[
      { text: 'No',          style: 'tableHeader' },
      { text: '品名',         style: 'tableHeader' },
      { text: '数量',         style: 'tableHeader' },
      { text: '単位',         style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
      { text: '仕切単価',     style: 'tableHeader' },
      { text: '仕切合計',     style: 'tableHeader' },
    ]];
    let rowNo = 1;

    // FRP セクション
    rows.push(mkSecRow('FRP'));
    frpItems.forEach(item => {
      const qty          = Number(item.qty) || 1;
      const priceTotal   = (Number(item.price)  || 0) * qty;
      const shikiri      = Number(item.priceA) || 0;
      const shikiriTotal = shikiri * qty;

      const nameParts = [];
      if (item.type === 'option') {
        if (item.hinmei)    nameParts.push({ text: item.hinmei,    bold: true, fontSize: 9 });
        if (item.chubunrui) nameParts.push({ text: item.chubunrui, fontSize: 8, color: '#000' });
        const line3 = qty >= 2 ? (item.optSpec5 || '') : (item.name3 || '');
        if (line3) nameParts.push({ text: line3, fontSize: 8, color: '#000' });
      } else {
        if (item.hinmei)  nameParts.push({ text: item.hinmei,  bold: true, fontSize: 9 });
        if (item.itemnum) nameParts.push({ text: item.itemnum, bold: true, fontSize: item.type === 'soryo' ? 9 : 11 });
        if (frpShowZuban) {
          const zp = [];
          if (item.zuban)  zp.push(`図番　${item.zuban}`);
          if (item.hinban) zp.push(`品番　${item.hinban}`);
          if (zp.length)   nameParts.push({ text: zp.join('　'), fontSize: 7, color: '#000' });
        }
      }
      const nameCell = nameParts.length > 0 ? { stack: nameParts } : { text: item.name || '', bold: true };

      const subRows = [];
      if (item.soryoNote) {
        subRows.push([
          { text: '', border: [true, false, true, false] },
          { text: `  ${item.soryoNote}`, fontSize: 7, color: '#c00', border: [true, false, true, false] },
          { text: '', border: [true, false, true, false] },
          { text: '', border: [true, false, true, false] },
          { text: '', border: [true, false, true, false] },
          { text: '', border: [true, false, true, false] },
          { text: '', border: [true, false, true, false] },
          { text: '', border: [true, false, true, false] },
        ]);
      }
      if (item.type !== 'option' && item.specsHidden === false) {
        (item.specs || []).forEach(spec => {
          subRows.push([
            { text: '', border: [true, false, true, false] },
            { text: `　${spec}`, fontSize: 8, color: '#000', border: [true, false, true, false] },
            { text: '', border: [true, false, true, false] },
            { text: '', border: [true, false, true, false] },
            { text: '', border: [true, false, true, false] },
            { text: '', border: [true, false, true, false] },
            { text: '', border: [true, false, true, false] },
            { text: '', border: [true, false, true, false] },
          ]);
        });
      }
      if (subRows.length > 0) {
        const last = subRows[subRows.length - 1];
        last.forEach(cell => { cell.border[3] = true; });
      }
      const btm = subRows.length === 0;
      rows.push([
        { text: String(rowNo++), alignment: 'center', border: [true, true, true, btm] },
        { ...nameCell,            border: [true, true, true, btm] },
        { text: String(qty),      alignment: 'center', border: [true, true, true, btm] },
        { text: item.unit || '',  alignment: 'center', border: [true, true, true, btm] },
        { text: fmt(item.price) || '', alignment: 'right', border: [true, true, true, btm] },
        { text: fmt(priceTotal),       alignment: 'right', border: [true, true, true, btm] },
        { text: fmt(shikiri),          alignment: 'right', border: [true, true, true, btm] },
        { text: fmt(shikiriTotal),     alignment: 'right', border: [true, true, true, btm] },
      ]);
      subRows.forEach(r => rows.push(r));
    });

    // 衛生設備 セクション
    let eiseiPriceTotal   = 0;
    let eiseiShikiriTotal = 0;
    const eiseiSections = sections.filter(s => (s.items || []).some(i => (i.name || '').trim()));
    if (eiseiSections.length > 0) {
      rows.push(mkSecRow('衛生設備'));
      eiseiSections.forEach(section => {
        (section.items || []).filter(i => (i.name || '').trim()).forEach(item => {
          const qty    = Number(item.qty) || 1;
          const uPrice = item.unitPrice || Math.round(Number(item.amount) / qty);
          const total  = Number(item.amount) || 0;
          const dUnit  = dairiUnitFn(item);
          const dAmt   = dairiAmtFn(item);
          eiseiPriceTotal   += total;
          eiseiShikiriTotal += dAmt;
          const specLines = (item.specLines || []).filter(l => (l || '').trim());
          const btm = specLines.length === 0;
          rows.push([
            { text: String(rowNo++), alignment: 'center', fontSize: 8, border: [true, true, true, btm] },
            { text: item.name || '', border: [true, true, true, btm] },
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right', border: [true, true, true, btm] },
            { text: item.unit || '', alignment: 'center', border: [true, true, true, btm] },
            { text: fmt(uPrice), alignment: 'right', border: [true, true, true, btm] },
            { text: fmt(total),  alignment: 'right', border: [true, true, true, btm] },
            { text: dUnit != null ? fmt(dUnit) : '', alignment: 'right', border: [true, true, true, btm] },
            { text: fmt(dAmt),   alignment: 'right', border: [true, true, true, btm] },
          ]);
          specLines.forEach((line, li) => {
            const isLast = li === specLines.length - 1;
            rows.push([
              { text: '', border: [true, false, true, isLast] },
              { text: line, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0], border: [true, false, true, isLast] },
              { text: '', border: [true, false, true, isLast] },
              { text: '', border: [true, false, true, isLast] },
              { text: '', border: [true, false, true, isLast] },
              { text: '', border: [true, false, true, isLast] },
              { text: '', border: [true, false, true, isLast] },
              { text: '', border: [true, false, true, isLast] },
            ]);
          });
        });
      });
    }

    // 空白行
    for (let i = 0; i < 2; i++) {
      rows.push([
        { text: '', border: [true, false, true, false] },
        ...Array.from({ length: COLS - 2 }, () => ({ text: '', border: [false, false, false, false] })),
        { text: '', border: [false, false, true, false] },
      ]);
    }

    // 合計行
    const combinedPriceTotal   = frpPriceTotal   + eiseiPriceTotal;
    const combinedShikiriTotal = frpShikiriTotal + eiseiShikiriTotal;
    rows.push([
      { text: '', border: [true, true, false, false], fillColor: '#e8f0f8' },
      { text: '合　　計', alignment: 'center', bold: true, colSpan: 4,
        border: [false, true, false, false], fillColor: '#e8f0f8' },
      { text: '' }, { text: '' }, { text: '' },
      { text: fmt(combinedPriceTotal),   alignment: 'right', bold: true,
        border: [false, true, false, false], fillColor: '#e8f0f8' },
      { text: '', border: [false, true, false, false], fillColor: '#e8f0f8' },
      { text: fmt(combinedShikiriTotal), alignment: 'right', bold: true,
        border: [false, true, true, false], fillColor: '#e8f0f8' },
    ]);
    if (frpDiscount > 0) {
      const grandTotal = Math.max(0, combinedShikiriTotal - frpDiscount);
      rows.push([
        { text: '', border: [true, false, false, true], fillColor: '#fff' },
        { text: '出精値引き', alignment: 'center', colSpan: 4,
          border: [false, false, false, true], fillColor: '#fff' },
        { text: '' }, { text: '' }, { text: '' },
        { text: '', border: [false, false, false, true], fillColor: '#fff' },
        { text: '', border: [false, false, false, true], fillColor: '#fff' },
        { text: `▲ ${fmt(frpDiscount)}`, alignment: 'right',
          border: [false, false, true, true], fillColor: '#fff' },
      ]);
      rows.push([
        { text: '', border: [true, false, false, true], fillColor: '#dce8f7' },
        { text: '御見積金額（税別）', alignment: 'center', bold: true, colSpan: 4,
          border: [false, false, false, true], fillColor: '#dce8f7' },
        { text: '' }, { text: '' }, { text: '' },
        { text: '', border: [false, false, false, true], fillColor: '#dce8f7' },
        { text: '', border: [false, false, false, true], fillColor: '#dce8f7' },
        { text: fmt(grandTotal), alignment: 'right', bold: true,
          border: [false, false, true, true], fillColor: '#dce8f7' },
      ]);
    }

    const content = [{
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
    }];
    if (frpFooterText) {
      const ftrSecs = frpFooterText.split(/\n\n+/);
      const mid = Math.ceil(ftrSecs.length / 2);
      content.push({
        columns: [
          { text: ftrSecs.slice(0, mid).join('\n\n'), fontSize: 7, lineHeight: 1.3, preserveLeadingSpaces: true, color: '#000', width: '*' },
          { text: ftrSecs.slice(mid).join('\n\n'),    fontSize: 7, lineHeight: 1.3, preserveLeadingSpaces: true, color: '#000', width: '*' },
        ],
        columnGap: 12,
        margin: [0, 10, 0, 0],
      });
    }
    return content;
  }

  // ── 2ページ目以降（見積まとめモード・工事）────────────────────

  function buildKoujiSummaryDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal, roundingEnabled, showProductCode, discount = 0, discountEnabled = true, adjustAmount = 0, waribikiAmount = 0, showBikou = true }) {
    const useDairi        = pdfPriceMode === 'dairi'          && (mainRate != null || dairiTotal != null);
    const isBulk          = pdfPriceMode === 'dairi-bulk'     && (mainRate != null || dairiTotal != null);
    const isShikiOnly     = pdfPriceMode === 'dairi-only'     && (mainRate != null || dairiTotal != null);
    const isDiscountStyle = pdfPriceMode === 'dairi-discount' && (mainRate != null || dairiTotal != null);
    const dairiItemUnit = (item) => {
      if (item._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return null;
      const baseUnit = item.unitPrice || (item.amount != null ? Math.round(Number(item.amount) / (Number(item.qty) || 1)) : null);
      if (!baseUnit) return null;
      const auto = Math.round(baseUnit * rate);
      return roundingEnabled ? roundUp(auto) : auto;
    };
    const dairiItemAmt = (item) => {
      const qty = Number(item.qty) || 1;
      if (item.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice * qty;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return 0;
      if (roundingEnabled && item.unitPrice) return roundUp(Math.round(item.unitPrice * rate)) * qty;
      return Math.round((Number(item.amount) || 0) * rate);
    };
    const bk = showBikou ? 1 : 0;
    const _cwRaw = showProductCode
      ? (useDairi ? [20, '*', 58, 22, 44, 52, 58, 52, 58, 44] : [22, '*', 58, 36, 44, 58, 58, 44])
      : (useDairi ? [20, '*', 22, 44, 52, 58, 52, 58, 44] : [22, '*', 36, 44, 58, 58, 44]);
    const COL_WIDTHS = showBikou ? _cwRaw : _cwRaw.slice(0, -1);
    const COLS = (useDairi ? (showProductCode ? 10 : 9) : (showProductCode ? 8 : 7)) - (showBikou ? 0 : 1);
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));
    const result = [];

    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '合　計', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : isShikiOnly ? [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ];

    sectionTotals.forEach((section, sIdx) => {
      const rows = [makeHeaderRow()];

      if ((section.name || '').trim()) {
        rows.push([
          { text: String(section.no || sIdx + 1), alignment: 'center', style: 'sectionHdr' },
          { text: section.name, style: 'sectionHdr', colSpan: COLS - 1 },
          ...emp(COLS - 2),
        ]);
      }

      const catTotals = {};
      const catDairiTotals = {};
      const normalItems = [];
      (section.items || []).forEach(item => {
        const prefix = (item.calcCategory || '').trim().charAt(0);
        if (CALC_CATEGORY_LABELS[prefix]) {
          catTotals[prefix]      = (catTotals[prefix]      || 0) + (Number(item.amount) || 0);
          catDairiTotals[prefix] = (catDairiTotals[prefix] || 0) + dairiItemAmt(item);
        } else {
          normalItems.push(item);
        }
      });

      let itemNo = 1;
      normalItems.forEach(item => {
        // 熱機ヘッダー行（タイトル）
        if (item.isNetsukiHeader) {
          rows.push([{ text: '' }, { text: item.name || '' }, ...emp(COLS - 2)]);
          return;
        }
        const noCell = { text: String(itemNo++), alignment: 'right' };
        if (useDairi) {
          rows.push([
            noCell,
            { text: item.name || '' },
            ...(showProductCode ? [{ text: item.productCode || '', noWrap: true }] : []),
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
            { text: fmt(item.amount), alignment: 'right' },
            { text: dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '', alignment: 'right' },
            { text: fmt(dairiItemAmt(item)), alignment: 'right' },
            ...(showBikou ? [{ text: item.bikou || '' }] : []),
          ]);
        } else {
          rows.push([
            noCell,
            { text: item.name || '' },
            ...(showProductCode ? [{ text: item.productCode || '', noWrap: true }] : []),
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: isShikiOnly ? (dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '') : (item.unitPrice ? fmt(item.unitPrice) : ''), alignment: 'right' },
            { text: isShikiOnly ? fmt(dairiItemAmt(item)) : fmt(item.amount), alignment: 'right' },
            ...(showBikou ? [{ text: item.bikou || '' }] : []),
          ]);
        }
        const _sl = (item.specLines || []).filter(l => (l || '').trim());
        _sl.forEach(line => rows.push([{ text: '' }, { text: line, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]));
      });

      // カテゴリあり → 集計行
      CALC_CATEGORY_ORDER.forEach(prefix => {
        const amount = (useDairi || isShikiOnly) ? catDairiTotals[prefix] : catTotals[prefix];
        if (!amount) return;
        const noCell = { text: String(itemNo++), alignment: 'right' };
        if (useDairi) {
          rows.push([
            noCell,
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            ...(showProductCode ? [{ text: '' }] : []),
            { text: '1', alignment: 'right' },
            { text: '式', alignment: 'center' },
            { text: '', alignment: 'right' },
            { text: fmt(catTotals[prefix] || 0), alignment: 'right' },
            { text: '', alignment: 'right' },
            { text: fmt(amount), alignment: 'right' },
            ...(showBikou ? [{ text: '' }] : []),
          ]);
        } else {
          rows.push([
            noCell,
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            ...(showProductCode ? [{ text: '' }] : []),
            { text: '1', alignment: 'right' },
            { text: '式', alignment: 'center' },
            { text: '', alignment: 'right' },
            { text: fmt(amount), alignment: 'right' },
            ...(showBikou ? [{ text: '' }] : []),
          ]);
        }
      });

      // 空白行
      for (let i = 0; i < 2; i++) {
        const er = [
          { text: '', border: [true, false, true, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, true, false] },
          ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
        ];
        if (useDairi) er.splice(5, 0, { text: '', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] });
        if (showProductCode) er.splice(2, 0, { text: '', border: [false, false, false, false] });
        rows.push(er);
      }

      // 小計行
      const dairiSub = (section.items || []).reduce((sum, i) => sum + dairiItemAmt(i), 0);
      rows.push([
        { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
        { text: '─────小計─────', alignment: 'center', bold: true, colSpan: COLS - 3, border: [true, true, true, true], fillColor: '#f0f0f0' },
        ...emp(COLS - 4),
        { text: fmt((useDairi || isShikiOnly) ? dairiSub : section.subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
        { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
      ]);

      // 合計N式行（1式単価を表示）
      if ((section.secQty || 1) > 1) {
        const secN = section.secQty || 1;
        const spanCols = useDairi ? COLS - 5 - bk : COLS - 3 - bk;
        const b = [true, false, true, true];
        const bg = '#e8f0f8';
        const nRow = [
          { text: '', border: b, fillColor: bg },
          { text: `${section.name || '合計'}　${secN}式`, alignment: 'center', bold: true, colSpan: spanCols, border: b, fillColor: bg },
          ...emp(spanCols - 1),
        ];
        if (useDairi) {
          nRow.push({ text: fmt(section.subtotal),       alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(section.effectiveTotal), alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(dairiSub),               alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(dairiSub * secN),        alignment: 'right', bold: true, border: b, fillColor: bg });
          if (showBikou) nRow.push({ text: '', border: b, fillColor: bg });
        } else {
          nRow.push({ text: fmt(isShikiOnly ? dairiSub : section.subtotal),              alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(isShikiOnly ? dairiSub * secN : section.effectiveTotal), alignment: 'right', bold: true, border: b, fillColor: bg });
          if (showBikou) nRow.push({ text: '', border: b, fillColor: bg });
        }
        rows.push(nRow);
      }

      result.push({
        table: { widths: COL_WIDTHS, headerRows: 0, body: rows, dontBreakRows: false },
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
        margin: sIdx > 0 ? [0, 12, 0, 0] : [0, 0, 0, 0],
      });
    });

    // 合計行
    if (sectionTotals.length > 0) {
      const totalDairi = sectionTotals.reduce((sum, s) =>
        sum + (s.items || []).reduce((ss, i) => ss + dairiItemAmt(i), 0) * (s.secQty || 1), 0);
      const totalLayout = {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.5,
        paddingLeft:   () => 3,
        paddingRight:  () => 3,
        paddingTop:    () => 3,
        paddingBottom: () => 3,
      };
      const mkTotalRow = (label, val, top) => [
        { text: '', border: [true, top, false, true], fillColor: '#e8f0f8' },
        { text: label, alignment: 'center', bold: true, colSpan: COLS - 2 - bk, border: [false, top, false, true], fillColor: '#e8f0f8' },
        ...emp(COLS - 3 - bk),
        { text: val, alignment: 'right', bold: true, border: [false, top, true, true], fillColor: '#e8f0f8' },
        ...(showBikou ? [{ text: '', border: [false, top, true, true], fillColor: '#e8f0f8' }] : []),
      ];
      if (isBulk) {
        // 一括仕切モード: 合計(定価) → 貴社お渡し価格(仕切合計-調整額)
        const bulkBase = dairiTotal != null ? dairiTotal : totalDairi;
        const adjAmt = discountEnabled ? adjustAmount : 0;
        const body = [mkTotalRow('合　　計', fmt(grandTotal), true)];
        body.push(mkTotalRow('貴社お渡し価格', fmt(Math.max(0, bulkBase - adjAmt)), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (useDairi) {
        // 仕切表示モード: 定価合計 → 合計（仕切合計）→ [出精値引き → 貴社お渡し価格]
        const body = [mkTotalRow('希望小売価格合計', fmt(grandTotal), true)];
        body.push(mkTotalRow('合　　計', fmt(totalDairi), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isDiscountStyle) {
        const adjAmt = discountEnabled ? discount : 0;
        const body = [mkTotalRow('合　　計', fmt(grandTotal), true)];
        if (adjAmt > 0) body.push(mkTotalRow('出精値引き', '▲ ' + fmt(adjAmt), false));
        body.push(mkTotalRow('貴社お渡し価格', fmt(Math.max(0, grandTotal - adjAmt)), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isShikiOnly) {
        const shikiBase = dairiTotal != null ? dairiTotal : totalDairi;
        const shikiAdj = discountEnabled ? adjustAmount : 0;
        const body = [mkTotalRow('合　　計', fmt(shikiBase), true)];
        body.push(mkTotalRow('貴社お渡し価格', fmt(Math.max(0, shikiBase - shikiAdj)), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else {
        result.push({
          margin: [0, 0, 0, 0],
          table: {
            widths: COL_WIDTHS,
            body: [[
              { text: '', border: [true, true, false, true], fillColor: '#e8f0f8' },
              { text: '合　　計', alignment: 'center', bold: true, colSpan: COLS - 2 - bk, border: [false, true, false, true], fillColor: '#e8f0f8' },
              ...emp(COLS - 3 - bk),
              { text: fmt(grandTotal), alignment: 'right', bold: true, border: [false, true, true, true], fillColor: '#e8f0f8' },
              ...(showBikou ? [{ text: '', border: [false, true, true, true], fillColor: '#e8f0f8' }] : []),
            ]],
          },
          layout: totalLayout,
        });
      }
    }

    return result;
  }

  // ── 2ページ目以降（見積まとめモード・物販/作業）────────────────

  function buildBuppanSagyoSummaryDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal, roundingEnabled, showProductCode, quoteCategory, useBuppanDeliveryLabel = false, adjustAmount = 0, showBikou = true }) {
    const useDairi = (pdfPriceMode === 'dairi' || pdfPriceMode === 'dairi-kouji') && (mainRate != null || dairiTotal != null);
    const isBulk = pdfPriceMode === 'dairi-bulk' && (mainRate != null || dairiTotal != null);
    const isShikiOnly = pdfPriceMode === 'dairi-only' && (mainRate != null || dairiTotal != null);
    const isDiscountStyle = pdfPriceMode === 'dairi-discount' && (mainRate != null || dairiTotal != null);
    const dairiItemUnit = (item) => {
      if (item._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return null;
      const baseUnit = item.unitPrice || (item.amount != null ? Math.round(Number(item.amount) / (Number(item.qty) || 1)) : null);
      if (!baseUnit) return null;
      const auto = Math.round(baseUnit * rate);
      return roundingEnabled ? roundUp(auto) : auto;
    };
    const dairiItemAmt = (item) => {
      const qty = Number(item.qty) || 1;
      if (item.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice * qty;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return 0;
      if (roundingEnabled && item.unitPrice) return roundUp(Math.round(item.unitPrice * rate)) * qty;
      return Math.round((Number(item.amount) || 0) * rate);
    };
    const bk = showBikou ? 1 : 0;
    const _cwRaw = showProductCode
      ? (useDairi ? [20, '*', 58, 22, 44, 52, 58, 52, 58, 44] : [22, '*', 58, 36, 44, 58, 58, 44])
      : (useDairi ? [20, '*', 22, 44, 52, 58, 52, 58, 44] : [22, '*', 36, 44, 58, 58, 44]);
    const COL_WIDTHS = showBikou ? _cwRaw : _cwRaw.slice(0, -1);
    const COLS = (useDairi ? (showProductCode ? 10 : 9) : (showProductCode ? 8 : 7)) - (showBikou ? 0 : 1);
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));
    const result = [];

    const nameHeader = (quoteCategory || '').includes('物販') ? '品　　　名' : '項　　　目';
    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      { text: nameHeader, style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '合　計', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : isShikiOnly ? [
      { text: 'No.', style: 'tableHeader' },
      { text: nameHeader, style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : [
      { text: 'No.', style: 'tableHeader' },
      { text: nameHeader, style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ];

    sectionTotals.forEach((section, sIdx) => {
      const rows = [makeHeaderRow()];

      if ((section.name || '').trim()) {
        rows.push([
          { text: sectionTotals.length === 1 ? '' : String(section.no || sIdx + 1), alignment: 'center', style: 'sectionHdr' },
          { text: section.name, style: 'sectionHdr', colSpan: COLS - 1 },
          ...emp(COLS - 2),
        ]);
      }

      const catTotals = {};
      const catDairiTotals = {};
      const normalItems = [];
      (section.items || []).forEach((item, idx) => {
        const prefix = (item.calcCategory || '').trim().charAt(0);
        if (CALC_CATEGORY_LABELS[prefix]) {
          catTotals[prefix]      = (catTotals[prefix]      || 0) + (Number(item.amount) || 0);
          catDairiTotals[prefix] = (catDairiTotals[prefix] || 0) + dairiItemAmt(item);
        } else {
          normalItems.push({ item, idx });
        }
      });

      let bsItemNo = 1;
      normalItems.forEach(({ item }) => {
        const noCell = item.isNetsukiMain
          ? { text: '', alignment: 'right', fontSize: 8 }
          : { text: String(bsItemNo++), alignment: 'right', fontSize: 8 };
        if (useDairi) {
          rows.push([
            noCell,
            { text: item.name || '' },
            ...(showProductCode ? [{ text: item.productCode || '', noWrap: true }] : []),
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
            { text: fmt(item.amount), alignment: 'right' },
            { text: dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '', alignment: 'right' },
            { text: fmt(dairiItemAmt(item)), alignment: 'right' },
            ...(showBikou ? [{ text: item.bikou || '' }] : []),
          ]);
        } else {
          rows.push([
            noCell,
            { text: item.name || '' },
            ...(showProductCode ? [{ text: item.productCode || '', noWrap: true }] : []),
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: isShikiOnly ? (dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '') : (item.unitPrice ? fmt(item.unitPrice) : ''), alignment: 'right' },
            { text: isShikiOnly ? fmt(dairiItemAmt(item)) : fmt(item.amount), alignment: 'right' },
            ...(showBikou ? [{ text: item.bikou || '' }] : []),
          ]);
        }
        if (!item.machineSpecHidden) {
          const _koujiModel = (item.machineSpec && item.machineSpec.model)
            || (item.specMasterContent ? '' : (item.printModel !== false ? (item.model || item.spec || '') : ''));
          if (_koujiModel) {
            rows.push([{ text: '' }, { text: `　型式　${_koujiModel}`, fontSize: 8 }, ...emp(COLS - 2)]);
          }
          if (item.machineSpec) {
            (item.machineSpec.specs || []).forEach(spec => {
              rows.push([{ text: '' }, { text: `${spec.label}：${spec.value}`, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]);
            });
          }
        }
        const _sl = (item.specLines || []).filter(l => (l || '').trim());
        _sl.forEach(line => rows.push([{ text: '' }, { text: line, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]));
      });

      // カテゴリあり → 集計行
      CALC_CATEGORY_ORDER.forEach(prefix => {
        const amount = (useDairi || isShikiOnly) ? catDairiTotals[prefix] : catTotals[prefix];
        if (!amount) return;
        if (useDairi) {
          rows.push([
            { text: '' },
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            ...(showProductCode ? [{ text: '' }] : []),
            { text: '1', alignment: 'right' },
            { text: '式', alignment: 'center' },
            { text: '', alignment: 'right' },
            { text: fmt(catTotals[prefix] || 0), alignment: 'right' },
            { text: '', alignment: 'right' },
            { text: fmt(amount), alignment: 'right' },
            ...(showBikou ? [{ text: '' }] : []),
          ]);
        } else {
          rows.push([
            { text: '' },
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            ...(showProductCode ? [{ text: '' }] : []),
            { text: '1', alignment: 'right' },
            { text: '式', alignment: 'center' },
            { text: '', alignment: 'right' },
            { text: fmt(amount), alignment: 'right' },
            ...(showBikou ? [{ text: '' }] : []),
          ]);
        }
      });

      // 空白行
      for (let i = 0; i < 2; i++) {
        const tb = i === 0; // 最初の空白行のみ上辺を表示（最終明細行の下線）
        const er = [
          { text: ' ', border: [true, tb, true, false] },
          { text: ' ', border: [false, tb, false, false] },
          { text: ' ', border: [false, tb, false, false] },
          { text: ' ', border: [false, tb, false, false] },
          { text: ' ', border: [false, tb, false, false] },
          { text: ' ', border: [false, tb, true, false] },
          ...(showBikou ? [{ text: ' ', border: [false, tb, true, false] }] : []),
        ];
        if (useDairi) er.splice(5, 0, { text: ' ', border: [false, tb, false, false] }, { text: ' ', border: [false, tb, false, false] });
        if (showProductCode) er.splice(2, 0, { text: ' ', border: [false, tb, false, false] });
        rows.push(er);
      }

      const dairiSub = (section.items || []).reduce((sum, i) => sum + dairiItemAmt(i), 0);
      rows.push([
        { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
        { text: '─────小計─────', alignment: 'center', bold: true, colSpan: COLS - 3, border: [true, true, true, true], fillColor: '#f0f0f0' },
        ...emp(COLS - 4),
        { text: fmt((useDairi || isShikiOnly) ? dairiSub : section.subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
        { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
      ]);

      if ((section.secQty || 1) > 1) {
        const secN = section.secQty || 1;
        const spanCols = useDairi ? COLS - 5 - bk : COLS - 3 - bk;
        const b = [true, false, true, true];
        const bg = '#e8f0f8';
        const nRow = [
          { text: '', border: b, fillColor: bg },
          { text: `${section.name || '合計'}　${secN}式`, alignment: 'center', bold: true, colSpan: spanCols, border: b, fillColor: bg },
          ...emp(spanCols - 1),
        ];
        if (useDairi) {
          nRow.push({ text: fmt(section.subtotal),       alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(section.effectiveTotal), alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(dairiSub),               alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(dairiSub * secN),        alignment: 'right', bold: true, border: b, fillColor: bg });
          if (showBikou) nRow.push({ text: '', border: b, fillColor: bg });
        } else {
          nRow.push({ text: fmt(isShikiOnly ? dairiSub : section.subtotal),              alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(isShikiOnly ? dairiSub * secN : section.effectiveTotal), alignment: 'right', bold: true, border: b, fillColor: bg });
          if (showBikou) nRow.push({ text: '', border: b, fillColor: bg });
        }
        rows.push(nRow);
      }

      result.push({
        table: { widths: COL_WIDTHS, headerRows: 0, body: rows, dontBreakRows: false },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.8 : 0.5,
          vLineWidth: () => 0.5,
          paddingLeft:   () => 3,
          paddingRight:  () => 3,
          paddingTop:    () => 2,
          paddingBottom: () => 2,
          hLineColor: () => '#555',
          vLineColor: () => '#888',
        },
        margin: sIdx > 0 ? [0, 12, 0, 0] : [0, 0, 0, 0],
      });
    });

    if (sectionTotals.length > 0) {
      const totalDairi = sectionTotals.reduce((sum, s) =>
        sum + (s.items || []).reduce((ss, i) => ss + dairiItemAmt(i), 0) * (s.secQty || 1), 0);
      const totalLayout = {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.5,
        paddingLeft:   () => 3,
        paddingRight:  () => 3,
        paddingTop:    () => 3,
        paddingBottom: () => 3,
      };
      const mkRow = (label, val, topBorder) => [
        { text: '', border: [true, topBorder, false, true], fillColor: '#e8f0f8' },
        { text: label, alignment: 'center', bold: true, colSpan: COLS - 2 - bk, border: [false, topBorder, false, true], fillColor: '#e8f0f8' },
        ...emp(COLS - 3 - bk),
        { text: val, alignment: 'right', bold: true, border: [false, topBorder, true, true], fillColor: '#e8f0f8' },
        ...(showBikou ? [{ text: '', border: [false, topBorder, true, true], fillColor: '#e8f0f8' }] : []),
      ];
      if (isDiscountStyle) {
        // 出精値引きモード: 定価合計 → 出精値引き（仕切差額＋調整額）→ 貴社お渡し価格
        const autoDisc = Math.max(0, grandTotal - totalDairi) + adjustAmount;
        const deliveryVal = Math.max(0, totalDairi - adjustAmount);
        const body = [mkRow('合　　計', fmt(grandTotal), true)];
        if (autoDisc > 0) body.push(mkRow('出精値引き', '▲ ' + fmt(autoDisc), false));
        body.push(mkRow('貴社お渡し価格', fmt(deliveryVal), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isBulk) {
        const bulkBase = Math.max(0, (dairiTotal != null ? dairiTotal : totalDairi) - adjustAmount);
        const isBuppanLocal = (quoteCategory || '').includes('物販');
        const buppanLabel = (isBuppanLocal && useBuppanDeliveryLabel) ? '販売価格合計' : '貴社お渡し価格';
        const body = [mkRow('合　　計', fmt(grandTotal), true)];
        body.push(mkRow(buppanLabel, fmt(bulkBase), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (useDairi) {
        const mkRow2 = (label, v1, v2, top) => [
          { text: '', border: [true, top, false, true], fillColor: '#e8f0f8' },
          { text: label, alignment: 'center', bold: true, colSpan: COLS - 4 - bk, border: [false, top, false, true], fillColor: '#e8f0f8' },
          ...emp(COLS - 5 - bk),
          { text: v1, alignment: 'right', bold: true, border: [false, top, false, true], fillColor: '#e8f0f8' },
          { text: '', border: [false, top, false, true], fillColor: '#e8f0f8' },
          { text: v2, alignment: 'right', bold: true, border: [false, top, true, true], fillColor: '#e8f0f8' },
          ...(showBikou ? [{ text: '', border: [false, top, true, true], fillColor: '#e8f0f8' }] : []),
        ];
        const dairiBody = [mkRow2('合　　計', fmt(grandTotal), fmt(totalDairi), true)];
        result.push({
          margin: [0, 0, 0, 0],
          table: { widths: COL_WIDTHS, body: dairiBody },
          layout: totalLayout,
        });
      } else if (isShikiOnly) {
        const isoDelivery = Math.max(0, totalDairi - adjustAmount);
        const isBuppanLocal = (quoteCategory || '').includes('物販');
        const buppanLabel = (isBuppanLocal && useBuppanDeliveryLabel) ? '販売価格合計' : '貴社お渡し価格';
        const adjLabel = (quoteCategory || '').includes('工事') ? '出精値引き' : '値引き額';
        const body = [mkRow('合　　計', fmt(totalDairi), true)];
        body.push(mkRow(buppanLabel, fmt(isoDelivery), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else {
        result.push({
          margin: [0, 0, 0, 0],
          table: {
            widths: COL_WIDTHS,
            body: [mkRow('合　　計', fmt(grandTotal), true)],
          },
          layout: totalLayout,
        });
      }
    }

    return result;
  }

  // ── 2ページ目以降（明細書・工事）────────────────────────────

  function buildKoujiDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal, showSubtotalBoth, roundingEnabled, showProductCode, discount = 0, discountEnabled = true, adjustAmount = 0, waribikiAmount = 0, showBikou = true }) {
    const useDairi        = pdfPriceMode === 'dairi'          && (mainRate != null || dairiTotal != null);
    const isBulk          = pdfPriceMode === 'dairi-bulk'     && (mainRate != null || dairiTotal != null);
    const isShikiOnly     = pdfPriceMode === 'dairi-only'     && (mainRate != null || dairiTotal != null);
    const isDiscountStyle = pdfPriceMode === 'dairi-discount' && (mainRate != null || dairiTotal != null);
    const dairiItemUnit = (item) => {
      if (item.finalDairiUnit != null) return item.finalDairiUnit;
      if (item._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return null;
      const baseUnit = item.unitPrice || (item.amount != null ? Math.round(Number(item.amount) / (Number(item.qty) || 1)) : null);
      if (!baseUnit) return null;
      const auto = Math.round(baseUnit * rate);
      return roundingEnabled ? roundUp(auto) : auto;
    };
    const dairiItemAmt = (item) => {
      const qty = Number(item.qty) || 1;
      if (item.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice * qty;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return 0;
      if (roundingEnabled && item.unitPrice) return roundUp(Math.round(item.unitPrice * rate)) * qty;
      return Math.round((Number(item.amount) || 0) * rate);
    };
    const effectiveUnitPrice = (item) => {
      if (item.unitPrice) return item.unitPrice;
      const qty = Number(item.qty) || 1;
      return Math.round(Number(item.amount) / qty);
    };
    const effectiveDairiUnit = (item) => {
      const u = dairiItemUnit(item);
      if (u != null) return u;
      const qty = Number(item.qty) || 1;
      return Math.round(dairiItemAmt(item) / qty);
    };
    const bk = showBikou ? 1 : 0;
    const _cwRaw = showProductCode
      ? (useDairi ? [20, '*', 58, 22, 44, 52, 58, 52, 58, 44] : [22, '*', 58, 36, 44, 58, 58, 44])
      : (useDairi ? [20, '*', 22, 44, 52, 58, 52, 58, 44] : [22, '*', 36, 44, 58, 58, 44]);
    const COL_WIDTHS = showBikou ? _cwRaw : _cwRaw.slice(0, -1);
    const COLS = (useDairi ? (showProductCode ? 10 : 9) : (showProductCode ? 8 : 7)) - (showBikou ? 0 : 1);
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));
    const result = [];

    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '合　計', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : isShikiOnly ? [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ];

    sectionTotals.forEach((section, sIdx) => {
      const rows = [makeHeaderRow()];

      // セクションヘッダー行
      if ((section.name || '').trim()) {
        rows.push([
          { text: String(section.no || sIdx + 1), alignment: 'center', style: 'sectionHdr' },
          { text: section.name, style: 'sectionHdr', colSpan: COLS - 1 },
          ...emp(COLS - 2),
        ]);
      }

      // 明細行（個別）
      let itemNo = 1;
      (section.items || []).forEach(item => {
        const qtyStr = item.qty != null && item.qty !== '' ? String(item.qty) : '';

        // 熱機ヘッダー行（品名のみ、数量・価格なし・No.あり）
        if (item.isNetsukiHeader) {
          rows.push([{ text: String(itemNo++), alignment: 'right' }, { text: (item.name || '').replace(/（[^）]*）\s*$/, '').trim() }, ...emp(COLS - 2)]);
          return;
        }

        // 熱機本機行は No. なし（ヘッダー行の続きとして扱う）
        const noCell = item.isNetsukiMain
          ? { text: '', alignment: 'right' }
          : { text: String(itemNo++), alignment: 'right' };
        if (useDairi) {
          rows.push([
            noCell,
            { text: item.name || '' },
            ...(showProductCode ? [{ text: item.productCode || '', noWrap: true }] : []),
            { text: qtyStr, alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: fmt(effectiveUnitPrice(item)), alignment: 'right' },
            { text: fmt(item.amount), alignment: 'right' },
            { text: fmt(effectiveDairiUnit(item)), alignment: 'right' },
            { text: fmt(dairiItemAmt(item)), alignment: 'right' },
            ...(showBikou ? [{ text: item.bikou || '' }] : []),
          ]);
        } else {
          rows.push([
            noCell,
            { text: item.name || '' },
            ...(showProductCode ? [{ text: item.productCode || '', noWrap: true }] : []),
            { text: qtyStr, alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: (isBulk || isShikiOnly) ? (dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '') : fmt(effectiveUnitPrice(item)), alignment: 'right' },
            { text: (isBulk || isShikiOnly) ? fmt(dairiItemAmt(item)) : fmt(item.amount), alignment: 'right' },
            ...(showBikou ? [{ text: item.bikou || '' }] : []),
          ]);
        }
        // 型式行（machineSpecアイテムは品名が型式名・品目コード列表示時は省略）
        if (!showProductCode && !item.machineSpecHidden && !item.machineSpec) {
          const _detModel = item.specMasterContent ? '' : (item.printModel !== false ? (item.model || item.spec || '') : '');
          if (_detModel) {
            rows.push([{ text: '' }, { text: `　型式　${_detModel}`, fontSize: 7.5, color: '#000' }, ...emp(COLS - 2)]);
          }
        }
        // 仕様行
        if (!item.machineSpecHidden && item.specMasterContent) {
          // 熱機仕様：specMasterContentを行ごとに表示し、付属品リスト（specLines）を続けて表示
          item.specMasterContent.split('\n').filter(l => l.trim()).forEach(line => {
            rows.push([{ text: '' }, { text: line, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]);
          });
          (item.specLines || []).filter(l => (l || '').trim()).forEach(line => {
            rows.push([{ text: '' }, { text: line, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]);
          });
        } else {
          const _sl1 = (item.specLines || []).filter(l => (l || '').trim());
          _sl1.forEach(line => rows.push([{ text: '' }, { text: line, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]));
        }
      });

      // 空白行（最低2行）
      for (let i = 0; i < 2; i++) {
        const er = [
          { text: '', border: [true, false, true, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, true, false] },
          ...(showBikou ? [{ text: '', border: [false, false, true, false] }] : []),
        ];
        if (useDairi) er.splice(5, 0, { text: '', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] });
        if (showProductCode) er.splice(2, 0, { text: '', border: [false, false, false, false] });
        rows.push(er);
      }

      // 小計行
      const dairiSub = (section.items || []).reduce((sum, i) => sum + dairiItemAmt(i), 0);
      if (useDairi && showSubtotalBoth) {
        rows.push([
          { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
          { text: '─────小計─────', alignment: 'center', bold: true, colSpan: COLS - 4 - bk, border: [true, true, true, true], fillColor: '#f0f0f0' },
          ...emp(COLS - 5 - bk),
          { text: fmt(section.subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
          { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
          { text: fmt(dairiSub), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
          ...(showBikou ? [{ text: '', border: [true, true, true, true], fillColor: '#f0f0f0' }] : []),
        ]);
      } else {
        rows.push([
          { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
          { text: '─────小計─────', alignment: 'center', bold: true, colSpan: COLS - 2 - bk, border: [true, true, true, true], fillColor: '#f0f0f0' },
          ...emp(COLS - 3 - bk),
          { text: fmt((useDairi || isShikiOnly) ? dairiSub : section.subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
          ...(showBikou ? [{ text: '', border: [true, true, true, true], fillColor: '#f0f0f0' }] : []),
        ]);
      }

      // 合計 N式行（secQty > 1 のときのみ、1式単価を表示）
      if ((section.secQty || 1) > 1) {
        const secN = section.secQty || 1;
        const spanCols = useDairi ? COLS - 5 - bk : COLS - 3 - bk;
        const b = [true, false, true, true];
        const bg = '#e8f0f8';
        const nRow = [
          { text: '', border: b, fillColor: bg },
          { text: `${section.name || '合計'}　${secN}式`, alignment: 'center', bold: true, colSpan: spanCols, border: b, fillColor: bg },
          ...emp(spanCols - 1),
        ];
        if (useDairi) {
          nRow.push({ text: fmt(section.subtotal),       alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(section.effectiveTotal), alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(dairiSub),               alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(dairiSub * secN),        alignment: 'right', bold: true, border: b, fillColor: bg });
          if (showBikou) nRow.push({ text: '', border: b, fillColor: bg });
        } else {
          nRow.push({ text: fmt(isShikiOnly ? dairiSub : section.subtotal),              alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(isShikiOnly ? dairiSub * secN : section.effectiveTotal), alignment: 'right', bold: true, border: b, fillColor: bg });
          if (showBikou) nRow.push({ text: '', border: b, fillColor: bg });
        }
        rows.push(nRow);
      }

      result.push({
        table: {
          widths:     COL_WIDTHS,
          headerRows: 0,
          body:       rows,
          dontBreakRows: false,
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.8 : 0.3,
          vLineWidth: ()        => 0.5,
          paddingLeft:   () => 3,
          paddingRight:  () => 3,
          paddingTop:    () => 2,
          paddingBottom: () => 2,
          hLineColor: () => '#555',
          vLineColor: () => '#888',
        },
        margin: sIdx > 0 ? [0, 12, 0, 0] : [0, 0, 0, 0],
      });
    });

    // 合計行（最終ページ末尾）
    if (sectionTotals.length > 0) {
      const grandDairi = sectionTotals.reduce((sum, s) =>
        sum + (s.items || []).reduce((ss, i) => ss + dairiItemAmt(i), 0) * (s.secQty || 1), 0);
      const totalLayout = {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.5,
        paddingLeft:   () => 3,
        paddingRight:  () => 3,
        paddingTop:    () => 3,
        paddingBottom: () => 3,
      };
      const mkRow = (label, val, topBorder) => [
        { text: '', border: [true, topBorder, false, true], fillColor: '#e8f0f8' },
        { text: label, alignment: 'center', bold: true, colSpan: COLS - 2 - bk, border: [false, topBorder, false, true], fillColor: '#e8f0f8' },
        ...emp(COLS - 3 - bk),
        { text: val, alignment: 'right', bold: true, border: [false, topBorder, true, true], fillColor: '#e8f0f8' },
        ...(showBikou ? [{ text: '', border: [false, topBorder, true, true], fillColor: '#e8f0f8' }] : []),
      ];
      if (isDiscountStyle) {
        // 出精値引きモード: 定価合計 → 出精値引き（waribikiAmount+adjustAmount）→ 貴社お渡し価格
        const autoDisc = discountEnabled ? discount : 0;
        const deliveryVal = Math.max(0, grandTotal - autoDisc);
        const body = [mkRow('合　　計', fmt(grandTotal), true)];
        if (autoDisc > 0) body.push(mkRow('出精値引き', '▲ ' + fmt(autoDisc), false));
        body.push(mkRow('貴社お渡し価格', fmt(deliveryVal), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isBulk) {
        // 一括仕切モード: 合計(定価) → 貴社お渡し価格(仕切合計-調整額)
        const bulkBase = dairiTotal != null ? dairiTotal : grandDairi;
        const adjAmt = discountEnabled ? adjustAmount : 0;
        const body = [mkRow('合　　計', fmt(grandTotal), true)];
        body.push(mkRow('貴社お渡し価格', fmt(Math.max(0, bulkBase - adjAmt)), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (useDairi) {
        // 仕切表示モード: 合計（定価合計 + 仕切合計を1行に集約）
        const mkRow2 = (label, v1, v2, top) => [
          { text: '', border: [true, top, false, true], fillColor: '#e8f0f8' },
          { text: label, alignment: 'center', bold: true, colSpan: COLS - 4 - bk, border: [false, top, false, true], fillColor: '#e8f0f8' },
          ...emp(COLS - 5 - bk),
          { text: v1, alignment: 'right', bold: true, border: [false, top, false, true], fillColor: '#e8f0f8' },
          { text: '', border: [false, top, false, true], fillColor: '#e8f0f8' },
          { text: v2, alignment: 'right', bold: true, border: [false, top, true, true], fillColor: '#e8f0f8' },
          ...(showBikou ? [{ text: '', border: [false, top, true, true], fillColor: '#e8f0f8' }] : []),
        ];
        const body = [mkRow2('合　　計', fmt(grandTotal), fmt(grandDairi), true)];
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isShikiOnly) {
        const shikiBase = dairiTotal != null ? dairiTotal : grandDairi;
        const shikiAdj = discountEnabled ? adjustAmount : 0;
        const body = [mkRow('合　　計', fmt(shikiBase), true)];
        body.push(mkRow('貴社お渡し価格', fmt(Math.max(0, shikiBase - shikiAdj)), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else {
        result.push({
          margin: [0, 0, 0, 0],
          table: {
            widths: COL_WIDTHS,
            body: [mkRow('合　　計', fmt(grandTotal), true)],
          },
          layout: totalLayout,
        });
      }
    }

    return result;
  }

  // ── 2ページ目以降（明細書・物販/作業）──────────────────────────

  function buildBuppanSagyoDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal, showSubtotalBoth, roundingEnabled, showProductCode, quoteCategory, useBuppanDeliveryLabel = false, adjustAmount = 0, showBikou = true }) {
    const useDairi = (pdfPriceMode === 'dairi' || pdfPriceMode === 'dairi-kouji') && (mainRate != null || dairiTotal != null);
    const isBulk = pdfPriceMode === 'dairi-bulk' && (mainRate != null || dairiTotal != null);
    const isShikiOnly = pdfPriceMode === 'dairi-only' && (mainRate != null || dairiTotal != null);
    const isDiscountStyle = pdfPriceMode === 'dairi-discount' && (mainRate != null || dairiTotal != null);
    const dairiItemUnit = (item) => {
      if (item.finalDairiUnit != null) return item.finalDairiUnit;
      if (item._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return null;
      const baseUnit = item.unitPrice || (item.amount != null ? Math.round(Number(item.amount) / (Number(item.qty) || 1)) : null);
      if (!baseUnit) return null;
      const auto = Math.round(baseUnit * rate);
      return roundingEnabled ? roundUp(auto) : auto;
    };
    const dairiItemAmt = (item) => {
      const qty = Number(item.qty) || 1;
      if (item.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice * qty;
      const rate = item.dairiRate ?? mainRate;
      if (rate == null) return 0;
      if (roundingEnabled && item.unitPrice) return roundUp(Math.round(item.unitPrice * rate)) * qty;
      return Math.round((Number(item.amount) || 0) * rate);
    };
    const effectiveUnitPrice = (item) => {
      if (item.unitPrice) return item.unitPrice;
      const qty = Number(item.qty) || 1;
      return Math.round(Number(item.amount) / qty);
    };
    const effectiveDairiUnit = (item) => {
      const u = dairiItemUnit(item);
      if (u != null) return u;
      const qty = Number(item.qty) || 1;
      return Math.round(dairiItemAmt(item) / qty);
    };
    const bk = showBikou ? 1 : 0;
    const _cwRaw = showProductCode
      ? (useDairi ? [20, '*', 58, 22, 44, 52, 58, 52, 58, 44] : [22, '*', 58, 36, 44, 58, 58, 44])
      : (useDairi ? [20, '*', 22, 44, 52, 58, 52, 58, 44] : [22, '*', 36, 44, 58, 58, 44]);
    const COL_WIDTHS = showBikou ? _cwRaw : _cwRaw.slice(0, -1);
    const COLS = (useDairi ? (showProductCode ? 10 : 9) : (showProductCode ? 8 : 7)) - (showBikou ? 0 : 1);
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));
    const result = [];

    const nameHeader = (quoteCategory || '').includes('物販') ? '品　　　名' : '項　　　目';
    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      { text: nameHeader, style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '合　計', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : isShikiOnly ? [
      { text: 'No.', style: 'tableHeader' },
      { text: nameHeader, style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : [
      { text: 'No.', style: 'tableHeader' },
      { text: nameHeader, style: 'tableHeader' },
      ...(showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ];

    sectionTotals.forEach((section, sIdx) => {
      const rows = [makeHeaderRow()];

      if ((section.name || '').trim()) {
        rows.push([
          { text: sectionTotals.length === 1 ? '' : String(section.no || sIdx + 1), alignment: 'center', style: 'sectionHdr' },
          { text: section.name, style: 'sectionHdr', colSpan: COLS - 1 },
          ...emp(COLS - 2),
        ]);
      }

      let itemNo = 1;
      (section.items || []).forEach(item => {
        // 熱機ヘッダー行（タイトル）: 数量・価格なし・No.あり
        if (item.isNetsukiHeader) {
          rows.push([{ text: String(itemNo++), alignment: 'right', fontSize: 8 }, { text: (item.name || '').replace(/（[^）]*）\s*$/, '').trim() }, ...emp(COLS - 2)]);
          return;
        }
        const qtyStr = item.qty != null && item.qty !== '' ? String(item.qty) : '';
        // 熱機本機行は No. なし（ヘッダー行の続きとして扱う）
        const noCell = item.isNetsukiMain
          ? { text: '', alignment: 'right', fontSize: 8 }
          : { text: String(itemNo++), alignment: 'right', fontSize: 8 };
        if (useDairi) {
          rows.push([
            noCell,
            { text: item.name || '' },
            ...(showProductCode ? [{ text: item.productCode || '', noWrap: true }] : []),
            { text: qtyStr, alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: fmt(effectiveUnitPrice(item)), alignment: 'right' },
            { text: fmt(item.amount), alignment: 'right' },
            { text: fmt(effectiveDairiUnit(item)), alignment: 'right' },
            { text: fmt(dairiItemAmt(item)), alignment: 'right' },
            ...(showBikou ? [{ text: item.bikou || '' }] : []),
          ]);
        } else {
          rows.push([
            noCell,
            { text: item.name || '' },
            ...(showProductCode ? [{ text: item.productCode || '', noWrap: true }] : []),
            { text: qtyStr, alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: (isBulk || isShikiOnly) ? (dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '') : fmt(effectiveUnitPrice(item)), alignment: 'right' },
            { text: (isBulk || isShikiOnly) ? fmt(dairiItemAmt(item)) : fmt(item.amount), alignment: 'right' },
            ...(showBikou ? [{ text: item.bikou || '' }] : []),
          ]);
        }
        // 型式行（商品マスタの型式。品目コード列表示時・machineSpecアイテムは省略）
        if (!item.machineSpecHidden) {
          if (item.model && !item.machineSpec && !showProductCode && item.printModel !== false) {
            rows.push([{ text: '' }, { text: `　型式：${item.model}`, fontSize: 7.5, color: '#000' }, ...emp(COLS - 2)]);
          }
          if (item.machineSpec) {
            // machineSpecアイテムは品名が型式名なので型式行は出さない
            (item.machineSpec.specs || []).forEach(spec => {
              rows.push([{ text: '' }, { text: `${spec.label}：${spec.value}`, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]);
            });
          }
        }
        const _sl2 = (item.specLines || []).filter(l => (l || '').trim());
        _sl2.forEach(line => rows.push([{ text: '' }, { text: line, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]));
      });

      for (let i = 0; i < 2; i++) {
        const tb = i === 0; // 最初の空白行のみ上辺を表示（最終明細行の下線）
        const er = [
          { text: ' ', border: [true, tb, true, false] },
          { text: ' ', border: [false, tb, false, false] },
          { text: ' ', border: [false, tb, false, false] },
          { text: ' ', border: [false, tb, false, false] },
          { text: ' ', border: [false, tb, false, false] },
          { text: ' ', border: [false, tb, true, false] },
          ...(showBikou ? [{ text: ' ', border: [false, tb, true, false] }] : []),
        ];
        if (useDairi) er.splice(5, 0, { text: ' ', border: [false, tb, false, false] }, { text: ' ', border: [false, tb, false, false] });
        if (showProductCode) er.splice(2, 0, { text: ' ', border: [false, tb, false, false] });
        rows.push(er);
      }

      const dairiSub = (section.items || []).reduce((sum, i) => sum + dairiItemAmt(i), 0);
      if (useDairi && showSubtotalBoth) {
        rows.push([
          { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
          { text: '─────小計─────', alignment: 'center', bold: true, colSpan: COLS - 4 - bk, border: [true, true, true, true], fillColor: '#f0f0f0' },
          ...emp(COLS - 5 - bk),
          { text: fmt(section.subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
          { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
          { text: fmt(dairiSub), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
          ...(showBikou ? [{ text: '', border: [true, true, true, true], fillColor: '#f0f0f0' }] : []),
        ]);
      } else {
        rows.push([
          { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
          { text: '─────小計─────', alignment: 'center', bold: true, colSpan: COLS - 2 - bk, border: [true, true, true, true], fillColor: '#f0f0f0' },
          ...emp(COLS - 3 - bk),
          { text: fmt((useDairi || isShikiOnly) ? dairiSub : section.subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
          ...(showBikou ? [{ text: '', border: [true, true, true, true], fillColor: '#f0f0f0' }] : []),
        ]);
      }

      if ((section.secQty || 1) > 1) {
        const secN = section.secQty || 1;
        const spanCols = useDairi ? COLS - 5 - bk : COLS - 3 - bk;
        const b = [true, false, true, true];
        const bg = '#e8f0f8';
        const nRow = [
          { text: '', border: b, fillColor: bg },
          { text: `${section.name || '合計'}　${secN}式`, alignment: 'center', bold: true, colSpan: spanCols, border: b, fillColor: bg },
          ...emp(spanCols - 1),
        ];
        if (useDairi) {
          nRow.push({ text: fmt(section.subtotal),       alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(section.effectiveTotal), alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(dairiSub),               alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(dairiSub * secN),        alignment: 'right', bold: true, border: b, fillColor: bg });
          if (showBikou) nRow.push({ text: '', border: b, fillColor: bg });
        } else {
          nRow.push({ text: fmt(isShikiOnly ? dairiSub : section.subtotal),              alignment: 'right', bold: true, border: b, fillColor: bg });
          nRow.push({ text: fmt(isShikiOnly ? dairiSub * secN : section.effectiveTotal), alignment: 'right', bold: true, border: b, fillColor: bg });
          if (showBikou) nRow.push({ text: '', border: b, fillColor: bg });
        }
        rows.push(nRow);
      }

      result.push({
        table: { widths: COL_WIDTHS, headerRows: 0, body: rows, dontBreakRows: false },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.8 : 0.5,
          vLineWidth: () => 0.5,
          paddingLeft:   () => 3,
          paddingRight:  () => 3,
          paddingTop:    () => 2,
          paddingBottom: () => 2,
          hLineColor: () => '#555',
          vLineColor: () => '#888',
        },
        margin: sIdx > 0 ? [0, 12, 0, 0] : [0, 0, 0, 0],
      });
    });

    if (sectionTotals.length > 0) {
      const grandDairi = sectionTotals.reduce((sum, s) =>
        sum + (s.items || []).reduce((ss, i) => ss + dairiItemAmt(i), 0) * (s.secQty || 1), 0);
      const totalLayout = {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.5,
        paddingLeft:   () => 3,
        paddingRight:  () => 3,
        paddingTop:    () => 3,
        paddingBottom: () => 3,
      };
      const mkRow = (label, val, top) => [
        { text: '', border: [true, top, false, true], fillColor: '#e8f0f8' },
        { text: label, alignment: 'center', bold: true, colSpan: COLS - 2 - bk, border: [false, top, false, true], fillColor: '#e8f0f8' },
        ...emp(COLS - 3 - bk),
        { text: val, alignment: 'right', bold: true, border: [false, top, true, true], fillColor: '#e8f0f8' },
        ...(showBikou ? [{ text: '', border: [false, top, true, true], fillColor: '#e8f0f8' }] : []),
      ];
      if (isDiscountStyle) {
        const autoDisc = Math.max(0, grandTotal - grandDairi) + adjustAmount;
        const deliveryVal = Math.max(0, grandDairi - adjustAmount);
        const body = [mkRow('合　　計', fmt(grandTotal), true)];
        if (autoDisc > 0) body.push(mkRow('出精値引き', '▲ ' + fmt(autoDisc), false));
        body.push(mkRow('貴社お渡し価格', fmt(deliveryVal), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isBulk) {
        const bulkBase = Math.max(0, (dairiTotal != null ? dairiTotal : grandDairi) - adjustAmount);
        const isBuppanLocal = (quoteCategory || '').includes('物販');
        const buppanLabel = (isBuppanLocal && useBuppanDeliveryLabel) ? '販売価格合計' : '貴社お渡し価格';
        result.push({
          margin: [0, 0, 0, 0],
          table: { widths: COL_WIDTHS, body: [mkRow('合　　計', fmt(grandTotal), true), mkRow(buppanLabel, fmt(bulkBase), false)] },
          layout: totalLayout,
        });
      } else if (isShikiOnly) {
        const isoDelivery = Math.max(0, grandDairi - adjustAmount);
        const isBuppanLocal = (quoteCategory || '').includes('物販');
        const buppanLabel2 = (isBuppanLocal && useBuppanDeliveryLabel) ? '販売価格合計' : '貴社お渡し価格';
        const adjLabel = (quoteCategory || '').includes('工事') ? '出精値引き' : '値引き額';
        const body2 = [mkRow('合　　計', fmt(grandDairi), true)];
        body2.push(mkRow(buppanLabel2, fmt(isoDelivery), false));
        result.push({ margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body: body2 }, layout: totalLayout });
      } else {
        result.push({
          margin: [0, 0, 0, 0],
          table: {
            widths: COL_WIDTHS,
            body: [[
              { text: '', border: [true, true, false, true], fillColor: '#e8f0f8' },
              { text: '合　　計', alignment: 'center', bold: true, colSpan: COLS - 2 - bk, border: [false, true, false, true], fillColor: '#e8f0f8' },
              ...emp(COLS - 3 - bk),
              { text: fmt(useDairi ? grandDairi : grandTotal), alignment: 'right', bold: true, border: [false, true, true, true], fillColor: '#e8f0f8' },
              ...(showBikou ? [{ text: '', border: [false, true, true, true], fillColor: '#e8f0f8' }] : []),
            ]],
          },
          layout: totalLayout,
        });
      }
    }

    return result;
  }

  // ── 集計表PDF ─────────────────────────────────────────────────

  const CALC_CATEGORY_LABELS = {
    '①': '①配管部材',
    '②': '②支持具・雑部材',
    '③': '③配線部材',
    '④': '④工事費',
    '⑥': '⑥配管材料',
    '⑦': '⑦支持具・雑材費',
  };
  const CALC_CATEGORY_ORDER = ['①', '②', '③', '④', '⑥', '⑦'];

  function buildSummaryDocDefinition(data) {
    const font      = fontLoaded ? 'NotoSansJP' : 'Roboto';
    const dateStr   = data.date ? formatDate(data.date, data.dateFormat) : '';
    const quoteNoStr = data.quoteNoStr || (data.seqNo ? `CQR${data.seqNo}-${String(data.revision || 1).padStart(5, '0')}` : '');
    const sections  = data.sections || [];
    const showDairi = data.summaryShowDairi && data.mainRate != null;
    const rate      = data.mainRate;

    const dairiItemAmt  = item => {
      if (item._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice * (Number(item.qty) || 1);
      return Math.round((Number(item.amount) || 0) * rate);
    };
    const dairiItemUnit = item => {
      if (item._dairiManual === true && item.dairiUnitPrice != null) return item.dairiUnitPrice;
      return item.unitPrice ? Math.round(Number(item.unitPrice) * rate) : null;
    };

    // セクション別・カテゴリ別集計
    const sectionRows = sections.map(sec => {
      const catTotals      = {};
      const catDairiTotals = {};
      const noCategory     = [];

      (sec.items || []).forEach(item => {
        const prefix = (item.calcCategory || '').trim().charAt(0);
        if (CALC_CATEGORY_LABELS[prefix]) {
          catTotals[prefix]      = (catTotals[prefix]      || 0) + (Number(item.amount) || 0);
          catDairiTotals[prefix] = (catDairiTotals[prefix] || 0) + dairiItemAmt(item);
        } else {
          noCategory.push(item);
        }
      });

      return { sec, catTotals, catDairiTotals, noCategory };
    });

    // テーブル列定義
    const colWidths = showDairi ? [22, '*', 30, 46, 48, 48, 48, 48] : [22, '*', 36, 46, 58, 58];
    const colCount  = colWidths.length;
    const hdrSpan   = colCount - 2; // No.列と金額列を除いた span 数

    const hdr = (text) => ({ text, style: 'tableHeader', alignment: 'center' });
    const headerRow = showDairi
      ? [hdr('No.'), hdr('品　　　名'), hdr('数量'), hdr('単位'), hdr('単　価'), hdr('金　　額'), hdr('代理店単価'), hdr('代理店価格')]
      : [hdr('No.'), hdr('品　　　名'), hdr('数量'), hdr('単位'), hdr('単　価'), hdr('金　　額')];

    const tableRows = [headerRow];
    const empties = (n) => Array.from({ length: n }, () => ({ text: '' }));

    sectionRows.forEach(({ sec, catTotals, catDairiTotals, noCategory }) => {
      // セクションヘッダー
      tableRows.push([
        { text: String(sec.no || ''), alignment: 'center', bold: true, fillColor: '#e8edf5' },
        { text: sec.name || '', bold: true, colSpan: colCount - 1, fillColor: '#e8edf5' },
        ...empties(colCount - 2),
      ]);

      // カテゴリなし → 個別行
      noCategory.forEach(item => {
        const row = [
          { text: '' },
          { text: item.name || '' },
          { text: item.qty != null ? String(item.qty) : '1', alignment: 'right' },
          { text: item.unit || '式', alignment: 'center' },
          { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
          { text: fmt(item.amount), alignment: 'right' },
        ];
        if (showDairi) {
          const du = dairiItemUnit(item);
          row.push({ text: du != null ? fmt(du) : '', alignment: 'right' });
          row.push({ text: fmt(dairiItemAmt(item)), alignment: 'right' });
        }
        tableRows.push(row);
      });

      // カテゴリあり → 集計行
      CALC_CATEGORY_ORDER.forEach(prefix => {
        const amount = catTotals[prefix];
        if (!amount) return;
        const row = [
          { text: '' },
          { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
          { text: '1', alignment: 'right' },
          { text: '式', alignment: 'center' },
          { text: '', alignment: 'right' },
          { text: fmt(amount), alignment: 'right' },
        ];
        if (showDairi) {
          row.push({ text: '', alignment: 'right' });
          row.push({ text: fmt(catDairiTotals[prefix] || 0), alignment: 'right' });
        }
        tableRows.push(row);
      });

      // セクション小計
      // 列構成: [No.] [─小計─(colSpan:4)] [{}{}{}] [金額] ([代理店単価] [代理店価格])
      const secQtyPdf     = Math.max(1, Number(sec.secQty) || 1);
      const subtotal      = (sec.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const subtotalDairi = showDairi ? (sec.items || []).reduce((s, i) => s + dairiItemAmt(i), 0) : 0;
      const F = '#f5f5f5';
      const subtotalRow = [
        { text: '', border: [true, true, true, true], fillColor: F },
        { text: '─ 小 計 ─', alignment: 'center', bold: true, colSpan: 4, border: [true, true, true, true], fillColor: F },
        { text: '' }, { text: '' }, { text: '' },
        { text: fmt(subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: F },
      ];
      if (showDairi) {
        subtotalRow.push({ text: '', border: [true, true, true, true], fillColor: F });
        subtotalRow.push({ text: fmt(subtotalDairi), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: F });
      }
      tableRows.push(subtotalRow);
      if (secQtyPdf > 1) {
        const G = '#e8edf5';
        const secTotalRow = [
          { text: '', border: [true, false, true, true], fillColor: G },
          { text: `×${secQtyPdf}式　合計`, alignment: 'center', bold: true, colSpan: 4, border: [true, false, true, true], fillColor: G },
          { text: '' }, { text: '' }, { text: '' },
          { text: fmt(subtotal * secQtyPdf), alignment: 'right', bold: true, border: [true, false, true, true], fillColor: G },
        ];
        if (showDairi) {
          secTotalRow.push({ text: '', border: [true, false, true, true], fillColor: G });
          secTotalRow.push({ text: fmt(subtotalDairi * secQtyPdf), alignment: 'right', bold: true, border: [true, false, true, true], fillColor: G });
        }
        tableRows.push(secTotalRow);
      }
    });

    // 全体合計
    // 列構成: [No.] [合計(colSpan:4)] [{}{}{}] [金額] ([代理店単価] [代理店価格])
    const grandTotal      = sections.reduce((s, sec) => {
      const sQty = Math.max(1, Number(sec.secQty) || 1);
      return s + (sec.items || []).reduce((ss, i) => ss + (Number(i.amount) || 0), 0) * sQty;
    }, 0);
    const grandDairiTotal = showDairi ? sections.reduce((s, sec) => {
      const sQty = Math.max(1, Number(sec.secQty) || 1);
      return s + (sec.items || []).reduce((ss, i) => ss + dairiItemAmt(i), 0) * sQty;
    }, 0) : 0;
    const grandRow = [
      { text: '', border: [true, true, false, false] },
      { text: '合　　計', alignment: 'center', bold: true, colSpan: 4, border: [false, true, false, false] },
      { text: '' }, { text: '' }, { text: '' },
      { text: fmt(grandTotal), alignment: 'right', bold: true, border: [false, true, true, false] },
    ];
    if (showDairi) {
      grandRow.push({ text: '', border: [false, true, false, false] });
      grandRow.push({ text: fmt(grandDairiTotal), alignment: 'right', bold: true, border: [false, true, true, false] });
    }
    tableRows.push(grandRow);

    return {
      pageSize: 'A4',
      pageMargins: [30, 40, 30, 40],
      defaultStyle: { font, fontSize: 9 },
      styles: {
        tableHeader: { bold: true, fontSize: 9, fillColor: '#1a4d8f', color: '#ffffff', alignment: 'center', noWrap: true },
        sectionHdr:  { bold: true, fontSize: 9, fillColor: '#e8edf5' },
      },
      content: [
        { text: '見積集計表', style: { fontSize: 14, bold: true }, margin: [0, 0, 0, 4] },
        { text: [quoteNoStr, data.customerName, data.projectName, data.projectName2, data.projectName3, dateStr]
            .filter(Boolean).join('　'), fontSize: 9, margin: [0, 0, 0, 8] },
        {
          table: {
            headerRows: 1,
            widths: colWidths,
            body: tableRows,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#aaaaaa',
            vLineColor: () => '#aaaaaa',
          },
        },
      ],
    };
  }

  // ── 公開API ───────────────────────────────────────────────────

  return {
    /**
     * フォントを初期化する（ウィジェット起動時に呼ぶ）
     * @returns {Promise<boolean>}
     */
    init: loadJapaneseFont,

    /**
     * PDFを生成してダウンロードする
     * @param {Object} data - 見積データ
     * @param {string} filename - ファイル名（省略可）
     */
    download(data, filename) {
      const docDef  = buildDocDefinition(data);
      const quoteNo = data.quoteNoStr || (data.seqNo ? `CQR${data.seqNo}-${String(data.revision || 1).padStart(5, '0')}` : '未採番');
      const fname   = filename || `御見積書_${quoteNo}_${data.customerName || ''}.pdf`;
      pdfMake.createPdf(docDef).download(fname);
    },

    /**
     * PDFをブラウザウィンドウで開く（プレビュー）
     * @param {Object} data
     */
    preview(data) {
      const docDef = buildDocDefinition(data);
      pdfMake.createPdf(docDef).open();
    },

    /**
     * PDF の Blob を返す（Zoho ファイル添付等に利用）
     * @param {Object} data
     * @returns {Promise<Blob>}
     */
    getBlob(data) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('PDF生成タイムアウト（30秒）')), 30000);
        try {
          console.log('[PDF] buildDocDefinition 開始');
          const docDef = buildDocDefinition(data);
          console.log('[PDF] content構造:', docDef.content.length + '件',
            docDef.content.map((c, i) => i + ':' +
              (!c || typeof c !== 'object' ? 'prim' :
               c.table ? 'table' + (Array.isArray(c.table.widths) ? c.table.widths.length : '?') :
               c.columns ? 'cols' + c.columns.length :
               c.stack ? 'stack' :
               c.text !== undefined ? 'text' :
               Object.keys(c).join('-'))));
          console.log('[PDF] buildDocDefinition 完了, createPdf 開始');
          // テーブルのセルをスキャンしてundefinedを探す
          (function scanTables(node, path) {
            if (!node || typeof node !== 'object') return;
            if (node.table && Array.isArray(node.table.body)) {
              const colCount = Array.isArray(node.table.widths) ? node.table.widths.length : null;
              node.table.body.forEach((row, ri) => {
                if (!Array.isArray(row)) { console.error('[PDF] 不正な行:', path, 'row', ri, row); return; }
                if (colCount !== null && row.length !== colCount) {
                  console.error('[PDF] 列数不一致:', path, 'row', ri, '期待:', colCount, '実際:', row.length, row);
                }
                for (let ci = 0; ci < (colCount || row.length); ci++) {
                  const cell = row[ci];
                  if (cell === undefined || cell === null || cell === false) {
                    console.error('[PDF] 不正なセル:', path, 'row', ri, 'col', ci, '=', cell);
                  }
                }
              });
            }
            if (Array.isArray(node)) { node.forEach((item, i) => scanTables(item, path + '[' + i + ']')); return; }
            if (node.content)  scanTables(node.content,  path + '.content');
            if (node.stack)    scanTables(node.stack,    path + '.stack');
            if (node.columns)  scanTables(node.columns,  path + '.columns');
            if (node.header)   { try { scanTables(node.header(2, 10), path + '.header'); } catch(e) {} }
          })(docDef.content, 'content');
          pdfMake.createPdf(docDef).getBase64((base64) => {
            console.log('[PDF] getBase64 コールバック受信, base64長:', base64 ? base64.length : 'null');
            clearTimeout(timer);
            try {
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              resolve(new Blob([bytes], { type: 'application/pdf' }));
            } catch (e2) {
              reject(e2);
            }
          });
        } catch (e) {
          console.error('[PDF] エラー:', e);
          clearTimeout(timer);
          reject(e);
        }
      });
    },

    /**
     * 集計表PDFをダウンロード
     * @param {Object} data - 見積データ
     */
    downloadSummary(data) {
      const docDef  = buildSummaryDocDefinition(data);
      const quoteNo = data.quoteNoStr || (data.seqNo ? `CQR${data.seqNo}-${String(data.revision || 1).padStart(5, '0')}` : '未採番');
      const fname   = `見積集計表_${quoteNo}_${data.customerName || ''}.pdf`;
      pdfMake.createPdf(docDef).download(fname);
    },

    get fontLoaded() { return fontLoaded; },
  };

})();
