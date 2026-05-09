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

  /** 数値をカンマ区切り文字列に変換 */
  function fmt(n) {
    if (n === null || n === undefined || n === '') return '';
    const num = Number(n);
    if (isNaN(num)) return '';
    return num.toLocaleString('ja-JP');
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
    // ※ サブセット(japanese-only)はLatinが含まれず数字・英字が表示されない
    const candidates = [
      // 1st: NotoSansJP SubsetOTF（Google Fonts GitHub）- Latin+日本語含む、約5MB
      'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetOTF/JP/NotoSansJP-Regular.otf',
      // 2nd: minoryorg ミラー（TTF形式）
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
        pdfMake.fonts = {
          NotoSansJP: {
            normal:      'NotoSansJP.ttf',
            bold:        'NotoSansJP.ttf',
            italics:     'NotoSansJP.ttf',
            bolditalics: 'NotoSansJP.ttf',
          }
        };
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

    const sections   = data.sections || [];
    const frpMode  = data.frpMode  || false;
    const frpAB    = data.frpAB    || 'A';
    const frpItems = data.frpItems || [];

    // FRPモード用合計
    const frpPriceTotal   = frpItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    const frpShikiriTotal = frpItems.reduce((s, i) => {
      const p = frpAB === 'A' ? (Number(i.priceA) || 0) : (Number(i.priceB) || 0);
      return s + p * (Number(i.qty) || 1);
    }, 0);

    const dateStr    = toJpDate(data.date || new Date());
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
    const discountEnabled = data.discountEnabled !== false;
    const discount        = discountEnabled ? (Number(data.discount) || 0) : 0;
    const quoteCategory   = data.quoteCategory || '';
    const deliveryPrice   = Number(data.deliveryPrice) || grandTotal;
    const legalRate     = (Number(data.legalWelfareRate) || 14.6) / 100;
    const laborCost     = Number(data.laborCost) || 0;
    const legalWelfare  = Math.round(laborCost * legalRate);
    const anzenCost     = Number(data.anzenCost) || 0;
    const materialCost  = deliveryPrice - laborCost - legalWelfare - anzenCost;
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
        tableHeader: { bold: true, alignment: 'center', fontSize: 8 },
        sectionHdr:  { bold: true, fontSize: 8.5 },
        amountBig:   { fontSize: 18, bold: true },
        subtotalRow: { bold: true, fillColor: '#f8f8f8' },
        totalRow:    { bold: true },
        pageHdr:     { fontSize: 8, color: '#333' },
      },

      // ページヘッダー（2ページ目以降）
      header(currentPage, pageCount) {
        if (currentPage === 1) return null;
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
          frpMode, frpItems, frpAB, frpPriceTotal, frpShikiriTotal,
        }),

        // ====================================================
        // 明細書
        // ====================================================
        ...(data.printDetail !== false ? [
          { text: '', pageBreak: 'after' },
          ...(frpMode
            ? buildFrpDetailPages({ quoteNoStr, frpItems, frpAB, frpPriceTotal, frpShikiriTotal })
            : quoteCategory.includes('工事')
              ? (data.printMode === 'simple'
                  ? buildKoujiSummaryDetailPages({ sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal })
                  : buildKoujiDetailPages({ quoteNoStr, sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal }))
              : (data.printMode === 'simple'
                  ? buildBuppanSagyoSummaryDetailPages({ sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal })
                  : buildBuppanSagyoDetailPages({ quoteNoStr, sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal }))
          ),
        ] : []),
      ],
    };
  }

  // ── 1ページ目（表紙）────────────────────────────────────────

  function buildCoverPage({ quoteNoStr, dateStr, branch, data, sectionTotals,
    grandTotal, discount, discountEnabled, quoteCategory, deliveryPrice, materialCost, laborCost, legalWelfare, legalRate, anzenCost, buhanDiscTotal = 0,
    mainRate, pdfPriceMode, dairiTotal, showUchiwake,
    frpMode, frpItems, frpAB, frpPriceTotal, frpShikiriTotal }) {
    const useDairi = pdfPriceMode === 'dairi' && (mainRate != null || dairiTotal != null);
    const dairi = (v, item) => {
      const qty = Number(item?.qty) || 1;
      if (item?.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item?.dairiUnitPrice != null) return item.dairiUnitPrice * qty;
      const rate = (item?.dairiRate ?? mainRate) ?? mainRate;
      return rate != null ? Math.round((Number(v) || 0) * rate) : 0;
    };
    const dairiUnit = (item) => {
      if (item?.finalDairiUnit != null) return item.finalDairiUnit;
      if (item?.dairiUnitPrice != null) return item.dairiUnitPrice;
      const rate = (item?.dairiRate ?? mainRate) ?? mainRate;
      return item?.unitPrice && rate != null ? Math.round(item.unitPrice * rate) : null;
    };
    // 値引き額ラベル: 工事を含む場合→「出精値引き」、物販・作業→「値引き額」
    const discountLabel = (quoteCategory || '').includes('工事') ? '出精値引き' : '値引き額';
    // 御見積金額: 定価モードは grandTotal（表に値引き行を出さないため）、代理店モードは deliveryPrice（代理店合計 − 値引き）
    const displayPrice = useDairi ? deliveryPrice : grandTotal;

    // 代理店モード: 7列（単価・貴社仕切・金額）、定価モード: 6列
    const COL_WIDTHS = useDairi ? [22, '*', 30, 24, 46, 46, 50] : [22, '*', 36, 30, 58, 58];
    const COLS = useDairi ? 7 : 6;
    const emp = (n) => Array.from({ length: n }, () => ({}));

    // ── サマリーテーブルの行 ──────────────────────────────────
    const tableRows = [];

    // ヘッダー行
    tableRows.push(useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '貴社仕切', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ] : [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ]);

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
      sectionTotals.forEach(s => {
        if (isKouji) {
          mirrorEntries.push({ type: 'section', s });
        } else {
          if (s.name && s.name.trim()) {
            mirrorEntries.push({ type: 'sectionHeader', s });
          }
          // 単価0円のアイテムも名前があれば表示する
          (s.items || []).forEach((item, idx) => {
            if (!item.name || !item.name.trim()) return;
            mirrorEntries.push({ type: 'item', item, idx });
            (item.specLines || []).filter(l => l.trim()).forEach(line => {
              mirrorEntries.push({ type: 'specLine', text: line });
            });
            if (item.machineSpec) {
              mirrorEntries.push({ type: 'machineSpecModel', model: item.machineSpec.model });
              mirrorEntries.push({ type: 'machineSpecHeader' });
              (item.machineSpec.specs || []).forEach(spec => {
                mirrorEntries.push({ type: 'machineSpecLine', spec });
              });
            }
          });
        }
      });
    } else {
      mirrorEntries.push({ type: 'frp' });
    }
    const isTeika = pdfPriceMode !== 'dairi';
    // 見積外工事行・固定行も含めてトータル行数を算出
    const mirrorRowCount = mirrorEntries.length + exRowCount +
      (isTeika ? 1 : showUchiwake ? 8 : 3);

    // 行数に応じてフォントサイズ・パディング・マージンを動的調整（1ページ収容のため）
    let itemFs = 8.5;
    if (mirrorRowCount > 18) itemFs = 7.5;
    if (mirrorRowCount > 26) itemFs = 7.0;
    if (mirrorRowCount > 34) itemFs = 6.5;
    if (mirrorRowCount > 42) itemFs = 6.0;
    const cellPad   = mirrorRowCount > 30 ? 1 : mirrorRowCount > 20 ? 1.5 : 2;
    const topMargin = mirrorRowCount > 26 ? 10 : mirrorRowCount > 18 ? 20 : 50;

    // 第2パス: 決定したフォントサイズで行を生成
    mirrorEntries.forEach(entry => {
      if (entry.type === 'frp') {
        tableRows.push([
          { text: '1', alignment: 'center', fontSize: itemFs },
          { text: 'FRP機器一式', fontSize: itemFs },
          { text: '1', alignment: 'center', fontSize: itemFs },
          { text: '式', alignment: 'center', fontSize: itemFs },
          { text: '', fontSize: itemFs },
          { text: fmt(frpShikiriTotal), alignment: 'right', fontSize: itemFs },
        ]);
        return;
      }
      if (entry.type === 'section') {
        const s = entry.s;
        const dairiSubtotal = (s.items || []).reduce((sum, i) => {
          const qty = Number(i.qty) || 1;
          if (i.finalDairiUnit != null) return sum + i.finalDairiUnit * qty;
          if (i.dairiUnitPrice != null) return sum + i.dairiUnitPrice * qty;
          const rate = (i.dairiRate ?? mainRate) ?? mainRate;
          return sum + (rate != null ? Math.round((Number(i.amount) || 0) * rate) : 0);
        }, 0);
        const row = [
          { text: String(s.no || ''), alignment: 'center', fontSize: itemFs },
          { text: s.name || '', fontSize: itemFs },
          { text: String(s.secQty || 1), alignment: 'center', fontSize: itemFs },
          { text: '式', alignment: 'center', fontSize: itemFs },
          { text: '', fontSize: itemFs },
          { text: fmt(useDairi ? dairiSubtotal * (s.secQty || 1) : s.effectiveTotal), alignment: 'right', fontSize: itemFs },
        ];
        if (useDairi) row.splice(5, 0, { text: '', fontSize: itemFs });
        tableRows.push(row);
      } else if (entry.type === 'sectionHeader') {
        const s = entry.s;
        const row = [
          { text: String(s.no || ''), alignment: 'center', fontSize: itemFs },
          { text: s.name, bold: true, fontSize: itemFs },
          { text: '', fontSize: itemFs }, { text: '', fontSize: itemFs },
          { text: '', fontSize: itemFs }, { text: '', fontSize: itemFs },
        ];
        if (useDairi) row.push({ text: '', fontSize: itemFs });
        tableRows.push(row);
      } else if (entry.type === 'specLine') {
        const specFs = Math.max(5.5, itemFs - 0.5);
        const row = [
          { text: '', fontSize: specFs },
          { text: `　${entry.text}`, fontSize: specFs, color: '#444' },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
        ];
        if (useDairi) row.push({ text: '', fontSize: specFs });
        tableRows.push(row);
      } else if (entry.type === 'machineSpecModel') {
        const specFs = Math.max(5.5, itemFs - 0.5);
        const row = [
          { text: '', fontSize: specFs },
          { text: `　型式　${entry.model}`, fontSize: specFs },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
        ];
        if (useDairi) row.push({ text: '', fontSize: specFs });
        tableRows.push(row);
      } else if (entry.type === 'machineSpecHeader') {
        const specFs = Math.max(5.5, itemFs - 0.5);
        const row = [
          { text: '', fontSize: specFs },
          { text: '　＜標準仕様＞', fontSize: specFs, bold: true },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
        ];
        if (useDairi) row.push({ text: '', fontSize: specFs });
        tableRows.push(row);
      } else if (entry.type === 'machineSpecLine') {
        const specFs = Math.max(5.0, itemFs - 1.0);
        const row = [
          { text: '', fontSize: specFs },
          { text: `　　${entry.spec.label}：${entry.spec.value}`, fontSize: specFs, color: '#444' },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
          { text: '', fontSize: specFs }, { text: '', fontSize: specFs },
        ];
        if (useDairi) row.push({ text: '', fontSize: specFs });
        tableRows.push(row);
      } else {
        const item = entry.item;
        const row = [
          { text: String((entry.idx ?? 0) + 1), alignment: 'center', fontSize: itemFs },
          { text: item.name || '', fontSize: itemFs },
          { text: String(item.qty || 1), alignment: 'center', fontSize: itemFs },
          { text: item.unit || '式', alignment: 'center', fontSize: itemFs },
          { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right', fontSize: itemFs },
          { text: fmt(useDairi ? dairi(item.amount, item) : item.amount), alignment: 'right', fontSize: itemFs },
        ];
        if (useDairi) row.splice(5, 0, { text: dairiUnit(item) != null ? fmt(dairiUnit(item)) : '', alignment: 'right', fontSize: itemFs });
        tableRows.push(row);
      }
    });

    // 空白行（行数が少ない場合のみ余白を確保）
    const emptyRows = Math.max(0, 10 - mirrorRowCount);
    for (let i = 0; i < emptyRows; i++) {
      const er = [
        { text: '', border: [true, false, true, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, true, false] },
      ];
      if (useDairi) er.splice(5, 0, { text: '', border: [false, false, false, false] });
      tableRows.push(er);
    }

    const spanMid = COLS - 2;
    const dairiGrandTotal = data.dairiTotal || sectionTotals.reduce((sum, s) =>
      sum + (s.items || []).reduce((ss, i) => {
        const qty = Number(i.qty) || 1;
        if (i.dairiUnitPrice != null) return ss + i.dairiUnitPrice * qty;
        return ss + Math.round((Number(i.amount) || 0) * ((i.dairiRate ?? mainRate) ?? mainRate));
      }, 0) * (s.secQty || 1), 0);

    // 合計行
    tableRows.push([
      { text: '', border: [true, true, false, false] },
      { text: '合　　計', alignment: 'center', bold: true, fontSize: itemFs, colSpan: spanMid, border: [false, true, false, false] },
      ...emp(spanMid - 1),
      { text: fmt(useDairi ? dairiGrandTotal : grandTotal), alignment: 'right', fontSize: itemFs, border: [false, true, true, false] },
    ]);

    if (!isTeika && discountEnabled && !isBuppan) {
    // 値引き額：値引きがある場合のみ表示
    if (discount > 0) {
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: discountLabel, alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: '▲ ' + fmt(discount), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
      ]);
    }

    // お渡し価格：代理店価格が設定されている場合のみ表示
    if (useDairi) {
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: '貴社お渡し価格', alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(deliveryPrice), alignment: 'right', fontSize: itemFs, bold: true, border: [false, false, true, false] },
      ]);
    }
    } // end !isTeika && !isBuppan

    if (!isTeika && isBuppan && buhanDiscTotal > 0) {
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: '値引き（明細計）', alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: '▲ ' + fmt(buhanDiscTotal), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: '販売価格合計', alignment: 'center', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(deliveryPrice), alignment: 'right', fontSize: itemFs, bold: true, border: [false, false, true, false] },
      ]);
    }

    if (!isTeika && showUchiwake) {
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
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: '2）労務費', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(laborCost), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
      ]);
      tableRows.push([
        { text: '', border: [true, false, false, false] },
        { text: `3）法定福利費（${(legalRate * 100).toFixed(1)}%）`, fontSize: itemFs, colSpan: spanMid, border: [false, false, false, false] },
        ...emp(spanMid - 1),
        { text: fmt(legalWelfare), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
      ]);
      // 内訳 4) 安全衛生経費 ※後日実装予定のため一時非表示
      // tableRows.push([
      //   { text: '', border: [true, false, false, true] },
      //   { text: '4）安全衛生経費', fontSize: itemFs, colSpan: spanMid, border: [false, false, false, true] },
      //   ...emp(spanMid - 1),
      //   { text: fmt(anzenCost), alignment: 'right', fontSize: itemFs, border: [false, false, true, true] },
      // ]);
    }

    // ── 見積外工事リスト（選択なしの場合は非表示）──────────────
    const half = Math.ceil(exclusions.length / 2);
    const leftCol  = exclusions.slice(0, half);
    const rightCol = exclusions.slice(half);
    const exRows   = leftCol.map((item, i) => [
      { text: `${i + 1}. ${item}`, fontSize: itemFs, border: [false, false, false, false] },
      { text: rightCol[i] ? `${i + half + 1}. ${rightCol[i]}` : '', fontSize: itemFs, border: [false, false, false, false] },
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
            { text: data.ownerName || '', alignment: 'center', fontSize: 8, bold: true },
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
    const custFs     = compact ? 11 : 14;
    const midFs      = compact ? 9  : 12;
    const amountBigFs= compact ? 14 : 18;
    const hdrLineH   = compact ? 1.3 : 1.6;
    const amountMgn  = compact ? 3   : 6;

    return [
      // ── タイトル〜定型文（左列）＋ 社印・会社情報（右列） ──
      {
        columns: [
          {
            width: '*',
            stack: [
              // タイトル
              { text: '御　見　積　書', fontSize: titleFs, bold: true, characterSpacing: 8, alignment: 'center' },
              // 顧客名
              {
                margin: [25, topMargin, 0, 0],
                text: [
                  { text: (data.customerName || ''), fontSize: custFs, bold: true },
                  { text: '　御中', fontSize: midFs },
                ],
              },
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
              { text: dateStr, alignment: 'right', fontSize: 9 },
              {
                margin: [0, 2, 0, 0],
                table: {
                  widths: [195],
                  heights: [compact ? 22 : 28],
                  body: [[{
                    stack: [
                      { text: 'ネポン株式会社', alignment: 'center', fontSize: 9, bold: true },
                      { text: '【社印エリア】', alignment: 'center', fontSize: 7, color: '#999', margin: [0, 2, 0, 0] },
                    ],
                    alignment: 'center',
                  }]],
                },
                layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
              },
              { text: branch.name,    fontSize: 9, bold: true, alignment: 'center', margin: [0, compact ? 2 : 4, 0, 0] },
              { text: branch.postal,  fontSize: 8 },
              { text: branch.address, fontSize: 7.5 },
              { text: `TEL　${branch.tel}`, fontSize: 8 },
              { text: `FAX　${branch.fax}`, fontSize: 8 },
              ...(data.branchNote ? [{ text: data.branchNote, fontSize: 8 }] : []),
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
                        text: `¥${fmt(displayPrice)}`,
                        fontSize: amountBigFs,
                        bold: true,
                        decoration: 'underline',
                      },
                      ...(!isBuppan ? [{ text: '（法定福利費事業主負担金を含む）', fontSize: 7, margin: [0, 1, 0, 0] }] : []),
                    ],
                  },
                ],
              },
              { text: `納期（御注文後）　${data.deliveryTerm || ''}`, fontSize: 8, margin: [0, amountMgn, 0, 0] },
              { text: `受 渡 し 方 法　　${data.deliveryMethod || ''}`, fontSize: 8 },
              { text: `支 払 い 条 件　　${data.paymentTerm || ''}`, fontSize: 8 },
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
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.8 : 0.4,
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
              text: '見積外工事',
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
    ];
  }

  // ── FRP専用明細ページ ─────────────────────────────────────────

  function buildFrpDetailPages({ quoteNoStr, frpItems, frpAB, frpPriceTotal, frpShikiriTotal }) {
    const COL_WIDTHS = [22, '*', 25, 20, 45, 45, 50, 50];
    const shikiriLabel      = `仕切単価(${frpAB}価)`;
    const shikiriTotalLabel = `仕切合計(${frpAB}価)`;

    const headerRow = [
      { text: 'No',            style: 'tableHeader' },
      { text: '品名',          style: 'tableHeader' },
      { text: '数量',          style: 'tableHeader' },
      { text: '単位',          style: 'tableHeader' },
      { text: '定価単価',      style: 'tableHeader' },
      { text: '定価合計',      style: 'tableHeader' },
      { text: shikiriLabel,    style: 'tableHeader' },
      { text: shikiriTotalLabel, style: 'tableHeader' },
    ];

    const rows = [headerRow];
    let rowNo = 1;

    frpItems.forEach(item => {
      const shikiri      = frpAB === 'A' ? (Number(item.priceA) || 0) : (Number(item.priceB) || 0);
      const qty          = Number(item.qty) || 1;
      const priceTotal   = (Number(item.price) || 0) * qty;
      const shikiriTotal = shikiri * qty;
      const displayName  = `${item.name || ''} ${item.itemnum || ''}`.trim();

      rows.push([
        { text: String(rowNo++), alignment: 'center' },
        { text: displayName, bold: true },
        { text: String(qty), alignment: 'center' },
        { text: item.unit || '', alignment: 'center' },
        { text: fmt(item.price),   alignment: 'right' },
        { text: fmt(priceTotal),   alignment: 'right' },
        { text: fmt(shikiri),      alignment: 'right' },
        { text: fmt(shikiriTotal), alignment: 'right' },
      ]);

      (item.specs || []).forEach(spec => {
        rows.push([
          { text: '', border: [true, false, false, false] },
          { text: `　${spec}`, fontSize: 8, color: '#555', colSpan: 7,
            border: [false, false, true, false] },
          {}, {}, {}, {}, {}, {},
        ]);
      });
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
      {}, {}, {},
      { text: fmt(frpPriceTotal),   alignment: 'right', bold: true,
        border: [false, true, false, true], fillColor: '#e8f0f8' },
      { text: '', border: [false, true, false, true], fillColor: '#e8f0f8' },
      { text: fmt(frpShikiriTotal), alignment: 'right', bold: true,
        border: [false, true, true, true], fillColor: '#e8f0f8' },
    ]);

    return [{
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
    }];
  }

  // ── 2ページ目以降（見積まとめモード・工事）────────────────────

  function buildKoujiSummaryDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal }) {
    const useDairi = pdfPriceMode === 'dairi' && (mainRate != null || dairiTotal != null);
    const dairiItemAmt = (item) => {
      const qty = Number(item.qty) || 1;
      if (item.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item.dairiUnitPrice != null) return item.dairiUnitPrice * qty;
      const rate = item.dairiRate ?? mainRate;
      return rate != null ? Math.round((Number(item.amount) || 0) * rate) : 0;
    };
    const dairiItemUnit = (item) => {
      if (item.dairiUnitPrice != null) return item.dairiUnitPrice;
      return item.unitPrice ? Math.round(item.unitPrice * (item.dairiRate ?? mainRate)) : null;
    };
    const COL_WIDTHS = useDairi ? [22, '*', 36, 30, 48, 48, 52] : [22, '*', 36, 30, 58, 58];
    const COLS = useDairi ? 7 : 6;
    const emp = (n) => Array.from({ length: n }, () => ({}));
    const result = [];

    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '貴社仕切', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ] : [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ];

    sectionTotals.forEach((section, sIdx) => {
      const rows = [makeHeaderRow()];

      rows.push([
        { text: String(section.no || sIdx + 1), alignment: 'center', style: 'sectionHdr' },
        { text: `※${section.name || ''}`, style: 'sectionHdr', colSpan: COLS - 1 },
        ...emp(COLS - 2),
      ]);

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

      normalItems.forEach(item => {
        if (useDairi) {
          rows.push([
            { text: '' },
            { text: item.name || '' },
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
            { text: dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '', alignment: 'right' },
            { text: fmt(dairiItemAmt(item)), alignment: 'right' },
          ]);
        } else {
          rows.push([
            { text: '' },
            { text: item.name || '' },
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
            { text: fmt(item.amount), alignment: 'right' },
          ]);
        }
      });

      // カテゴリあり → 集計行
      CALC_CATEGORY_ORDER.forEach(prefix => {
        const amount = useDairi ? catDairiTotals[prefix] : catTotals[prefix];
        if (!amount) return;
        if (useDairi) {
          rows.push([
            { text: '' },
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            { text: '1', alignment: 'right' },
            { text: '式', alignment: 'center' },
            { text: '', alignment: 'right' },
            { text: '', alignment: 'right' },
            { text: fmt(amount), alignment: 'right' },
          ]);
        } else {
          rows.push([
            { text: '' },
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            { text: '1', alignment: 'right' },
            { text: '式', alignment: 'center' },
            { text: '', alignment: 'right' },
            { text: fmt(amount), alignment: 'right' },
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
        ];
        if (useDairi) er.splice(5, 0, { text: '', border: [false, false, false, false] });
        rows.push(er);
      }

      // 小計行
      const dairiSub = (section.items || []).reduce((sum, i) => sum + dairiItemAmt(i), 0);
      rows.push([
        { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
        { text: '─────小計─────', alignment: 'center', bold: true, colSpan: COLS - 2, border: [true, true, true, true], fillColor: '#f0f0f0' },
        ...emp(COLS - 3),
        { text: fmt(useDairi ? dairiSub : section.subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
      ]);

      // 合計N式行
      if ((section.secQty || 1) > 1) {
        rows.push([
          { text: '', border: [true, false, true, true], fillColor: '#e8f0f8' },
          { text: `${section.name || '合計'}　${section.secQty}式`, alignment: 'center', bold: true, colSpan: COLS - 2, border: [true, false, true, true], fillColor: '#e8f0f8' },
          ...emp(COLS - 3),
          { text: fmt(useDairi ? dairiSub * (section.secQty || 1) : section.effectiveTotal), alignment: 'right', bold: true, border: [true, false, true, true], fillColor: '#e8f0f8' },
        ]);
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
      result.push({
        margin: [0, 0, 0, 0],
        table: {
          widths: COL_WIDTHS,
          body: [[
            { text: '', border: [true, true, false, true], fillColor: '#e8f0f8' },
            { text: '合　　計', alignment: 'center', bold: true, colSpan: COLS - 2, border: [false, true, false, true], fillColor: '#e8f0f8' },
            ...emp(COLS - 3),
            { text: fmt(useDairi ? totalDairi : grandTotal), alignment: 'right', bold: true, border: [false, true, true, true], fillColor: '#e8f0f8' },
          ]],
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.5,
          paddingLeft:   () => 3,
          paddingRight:  () => 3,
          paddingTop:    () => 3,
          paddingBottom: () => 3,
        },
      });
    }

    return result;
  }

  // ── 2ページ目以降（見積まとめモード・物販/作業）────────────────

  function buildBuppanSagyoSummaryDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal }) {
    const useDairi = pdfPriceMode === 'dairi' && (mainRate != null || dairiTotal != null);
    const dairiItemAmt = (item) => {
      const qty = Number(item.qty) || 1;
      if (item.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item.dairiUnitPrice != null) return item.dairiUnitPrice * qty;
      const rate = item.dairiRate ?? mainRate;
      return rate != null ? Math.round((Number(item.amount) || 0) * rate) : 0;
    };
    const dairiItemUnit = (item) => {
      if (item.dairiUnitPrice != null) return item.dairiUnitPrice;
      return item.unitPrice ? Math.round(item.unitPrice * (item.dairiRate ?? mainRate)) : null;
    };
    const COL_WIDTHS = useDairi ? [22, '*', 36, 30, 48, 48, 52] : [22, '*', 36, 30, 58, 58];
    const COLS = useDairi ? 7 : 6;
    const emp = (n) => Array.from({ length: n }, () => ({}));
    const result = [];

    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '貴社仕切', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ] : [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ];

    sectionTotals.forEach((section, sIdx) => {
      const rows = [makeHeaderRow()];

      rows.push([
        { text: String(section.no || sIdx + 1), alignment: 'center', style: 'sectionHdr' },
        { text: `※${section.name || ''}`, style: 'sectionHdr', colSpan: COLS - 1 },
        ...emp(COLS - 2),
      ]);

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

      normalItems.forEach(({ item, idx }) => {
        const noCell = { text: String(idx + 1), alignment: 'center', fontSize: 8 };
        if (useDairi) {
          rows.push([
            noCell,
            { text: item.name || '' },
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
            { text: dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '', alignment: 'right' },
            { text: fmt(dairiItemAmt(item)), alignment: 'right' },
          ]);
        } else {
          rows.push([
            noCell,
            { text: item.name || '' },
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
            { text: fmt(item.amount), alignment: 'right' },
          ]);
        }
        if (item.machineSpec) {
          rows.push([{ text: '' }, { text: `　型式　${item.machineSpec.model}`, fontSize: 8 }, ...emp(COLS - 2)]);
          rows.push([{ text: '' }, { text: '　＜標準仕様＞', fontSize: 8, bold: true }, ...emp(COLS - 2)]);
          (item.machineSpec.specs || []).forEach(spec => {
            rows.push([{ text: '' }, { text: `　　${spec.label}：${spec.value}`, fontSize: 7.5, color: '#444' }, ...emp(COLS - 2)]);
          });
        }
      });

      // カテゴリあり → 集計行
      CALC_CATEGORY_ORDER.forEach(prefix => {
        const amount = useDairi ? catDairiTotals[prefix] : catTotals[prefix];
        if (!amount) return;
        if (useDairi) {
          rows.push([
            { text: '' },
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            { text: '1', alignment: 'right' },
            { text: '式', alignment: 'center' },
            { text: '', alignment: 'right' },
            { text: '', alignment: 'right' },
            { text: fmt(amount), alignment: 'right' },
          ]);
        } else {
          rows.push([
            { text: '' },
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            { text: '1', alignment: 'right' },
            { text: '式', alignment: 'center' },
            { text: '', alignment: 'right' },
            { text: fmt(amount), alignment: 'right' },
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
        ];
        if (useDairi) er.splice(5, 0, { text: '', border: [false, false, false, false] });
        rows.push(er);
      }

      const dairiSub = (section.items || []).reduce((sum, i) => sum + dairiItemAmt(i), 0);
      rows.push([
        { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
        { text: '─────小計─────', alignment: 'center', bold: true, colSpan: COLS - 2, border: [true, true, true, true], fillColor: '#f0f0f0' },
        ...emp(COLS - 3),
        { text: fmt(useDairi ? dairiSub : section.subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
      ]);

      if ((section.secQty || 1) > 1) {
        rows.push([
          { text: '', border: [true, false, true, true], fillColor: '#e8f0f8' },
          { text: `${section.name || '合計'}　${section.secQty}式`, alignment: 'center', bold: true, colSpan: COLS - 2, border: [true, false, true, true], fillColor: '#e8f0f8' },
          ...emp(COLS - 3),
          { text: fmt(useDairi ? dairiSub * (section.secQty || 1) : section.effectiveTotal), alignment: 'right', bold: true, border: [true, false, true, true], fillColor: '#e8f0f8' },
        ]);
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

    if (sectionTotals.length > 0) {
      const totalDairi = sectionTotals.reduce((sum, s) =>
        sum + (s.items || []).reduce((ss, i) => ss + dairiItemAmt(i), 0) * (s.secQty || 1), 0);
      result.push({
        margin: [0, 0, 0, 0],
        table: {
          widths: COL_WIDTHS,
          body: [[
            { text: '', border: [true, true, false, true], fillColor: '#e8f0f8' },
            { text: '合　　計', alignment: 'center', bold: true, colSpan: COLS - 2, border: [false, true, false, true], fillColor: '#e8f0f8' },
            ...emp(COLS - 3),
            { text: fmt(useDairi ? totalDairi : grandTotal), alignment: 'right', bold: true, border: [false, true, true, true], fillColor: '#e8f0f8' },
          ]],
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.5,
          paddingLeft:   () => 3,
          paddingRight:  () => 3,
          paddingTop:    () => 3,
          paddingBottom: () => 3,
        },
      });
    }

    return result;
  }

  // ── 2ページ目以降（明細書・工事）────────────────────────────

  function buildKoujiDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal }) {
    const useDairi = pdfPriceMode === 'dairi' && (mainRate != null || dairiTotal != null);
    const dairiItemUnit = (item) => {
      if (item.finalDairiUnit != null) return item.finalDairiUnit;
      if (item.dairiUnitPrice != null) return item.dairiUnitPrice;
      const rate = item.dairiRate ?? mainRate;
      return item.unitPrice && rate != null ? Math.round(item.unitPrice * rate) : null;
    };
    const dairiItemAmt = (item) => {
      const qty = Number(item.qty) || 1;
      if (item.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item.dairiUnitPrice != null) return item.dairiUnitPrice * qty;
      const rate = item.dairiRate ?? mainRate;
      return rate != null ? Math.round((Number(item.amount) || 0) * rate) : 0;
    };
    const COL_WIDTHS = useDairi ? [22, '*', 36, 30, 48, 48, 52] : [22, '*', 36, 30, 58, 58];
    const COLS = useDairi ? 7 : 6;
    const emp = (n) => Array.from({ length: n }, () => ({}));
    const result = [];

    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '貴社仕切', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ] : [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ];

    sectionTotals.forEach((section, sIdx) => {
      const rows = [makeHeaderRow()];

      // セクションヘッダー行
      rows.push([
        { text: String(section.no || sIdx + 1), alignment: 'center', style: 'sectionHdr' },
        { text: `※${section.name || ''}`, style: 'sectionHdr', colSpan: COLS - 1 },
        ...emp(COLS - 2),
      ]);

      // 明細行（個別）
      (section.items || []).forEach(item => {
        const qtyStr = item.qty != null && item.qty !== '' ? String(item.qty) : '';
        if (useDairi) {
          rows.push([
            { text: '' },
            { text: item.name || '' },
            { text: qtyStr, alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
            { text: dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '', alignment: 'right' },
            { text: fmt(dairiItemAmt(item)), alignment: 'right' },
          ]);
        } else {
          rows.push([
            { text: '' },
            { text: item.name || '' },
            { text: qtyStr, alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
            { text: fmt(item.amount), alignment: 'right' },
          ]);
        }
        // 仕様行
        (item.specLines || []).filter(l => (l || '').trim()).forEach(line => {
          rows.push([
            { text: '' },
            { text: `　${line}`, fontSize: 7.5, color: '#444' },
            ...emp(COLS - 2),
          ]);
        });
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
        ];
        if (useDairi) er.splice(5, 0, { text: '', border: [false, false, false, false] });
        rows.push(er);
      }

      // 小計行
      const dairiSub = (section.items || []).reduce((sum, i) => sum + dairiItemAmt(i), 0);
      rows.push([
        { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
        { text: '─────小計─────', alignment: 'center', bold: true, colSpan: COLS - 2, border: [true, true, true, true], fillColor: '#f0f0f0' },
        ...emp(COLS - 3),
        { text: fmt(useDairi ? dairiSub : section.subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
      ]);

      // 合計 N式行（secQty > 1 のときのみ）
      if ((section.secQty || 1) > 1) {
        rows.push([
          { text: '', border: [true, false, true, true], fillColor: '#e8f0f8' },
          { text: `${section.name || '合計'}　${section.secQty}式`, alignment: 'center', bold: true, colSpan: COLS - 2, border: [true, false, true, true], fillColor: '#e8f0f8' },
          ...emp(COLS - 3),
          { text: fmt(useDairi ? dairiSub * (section.secQty || 1) : section.effectiveTotal), alignment: 'right', bold: true, border: [true, false, true, true], fillColor: '#e8f0f8' },
        ]);
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
      result.push({
        margin: [0, 0, 0, 0],
        table: {
          widths: COL_WIDTHS,
          body: [[
            { text: '', border: [true, true, false, true], fillColor: '#e8f0f8' },
            { text: '合　　計', alignment: 'center', bold: true, colSpan: COLS - 2, border: [false, true, false, true], fillColor: '#e8f0f8' },
            ...emp(COLS - 3),
            { text: fmt(useDairi ? grandDairi : grandTotal), alignment: 'right', bold: true, border: [false, true, true, true], fillColor: '#e8f0f8' },
          ]],
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.5,
          paddingLeft:   () => 3,
          paddingRight:  () => 3,
          paddingTop:    () => 3,
          paddingBottom: () => 3,
        },
      });
    }

    return result;
  }

  // ── 2ページ目以降（明細書・物販/作業）──────────────────────────

  function buildBuppanSagyoDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal }) {
    const useDairi = pdfPriceMode === 'dairi' && (mainRate != null || dairiTotal != null);
    const dairiItemUnit = (item) => {
      if (item.finalDairiUnit != null) return item.finalDairiUnit;
      if (item.dairiUnitPrice != null) return item.dairiUnitPrice;
      const rate = item.dairiRate ?? mainRate;
      return item.unitPrice && rate != null ? Math.round(item.unitPrice * rate) : null;
    };
    const dairiItemAmt = (item) => {
      const qty = Number(item.qty) || 1;
      if (item.finalDairiUnit != null) return item.finalDairiUnit * qty;
      if (item.dairiUnitPrice != null) return item.dairiUnitPrice * qty;
      const rate = item.dairiRate ?? mainRate;
      return rate != null ? Math.round((Number(item.amount) || 0) * rate) : 0;
    };
    const COL_WIDTHS = useDairi ? [22, '*', 36, 30, 48, 48, 52] : [22, '*', 36, 30, 58, 58];
    const COLS = useDairi ? 7 : 6;
    const emp = (n) => Array.from({ length: n }, () => ({}));
    const result = [];

    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '貴社仕切', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ] : [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ];

    sectionTotals.forEach((section, sIdx) => {
      const rows = [makeHeaderRow()];

      rows.push([
        { text: String(section.no || sIdx + 1), alignment: 'center', style: 'sectionHdr' },
        { text: `※${section.name || ''}`, style: 'sectionHdr', colSpan: COLS - 1 },
        ...emp(COLS - 2),
      ]);

      (section.items || []).forEach((item, itemIdx) => {
        const qtyStr = item.qty != null && item.qty !== '' ? String(item.qty) : '';
        const noCell = { text: String(itemIdx + 1), alignment: 'center', fontSize: 8 };
        if (useDairi) {
          rows.push([
            noCell,
            { text: item.name || '' },
            { text: qtyStr, alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
            { text: dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '', alignment: 'right' },
            { text: fmt(dairiItemAmt(item)), alignment: 'right' },
          ]);
        } else {
          rows.push([
            noCell,
            { text: item.name || '' },
            { text: qtyStr, alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
            { text: fmt(item.amount), alignment: 'right' },
          ]);
        }
        (item.specLines || []).filter(l => (l || '').trim()).forEach(line => {
          rows.push([
            { text: '' },
            { text: `　${line}`, fontSize: 7.5, color: '#444' },
            ...emp(COLS - 2),
          ]);
        });
        if (item.machineSpec) {
          rows.push([{ text: '' }, { text: `　型式　${item.machineSpec.model}`, fontSize: 8 }, ...emp(COLS - 2)]);
          rows.push([{ text: '' }, { text: '　＜標準仕様＞', fontSize: 8, bold: true }, ...emp(COLS - 2)]);
          (item.machineSpec.specs || []).forEach(spec => {
            rows.push([{ text: '' }, { text: `　　${spec.label}：${spec.value}`, fontSize: 7.5, color: '#444' }, ...emp(COLS - 2)]);
          });
        }
      });

      for (let i = 0; i < 2; i++) {
        const er = [
          { text: '', border: [true, false, true, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, true, false] },
        ];
        if (useDairi) er.splice(5, 0, { text: '', border: [false, false, false, false] });
        rows.push(er);
      }

      const dairiSub = (section.items || []).reduce((sum, i) => sum + dairiItemAmt(i), 0);
      rows.push([
        { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
        { text: '─────小計─────', alignment: 'center', bold: true, colSpan: COLS - 2, border: [true, true, true, true], fillColor: '#f0f0f0' },
        ...emp(COLS - 3),
        { text: fmt(useDairi ? dairiSub : section.subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f0f0f0' },
      ]);

      if ((section.secQty || 1) > 1) {
        rows.push([
          { text: '', border: [true, false, true, true], fillColor: '#e8f0f8' },
          { text: `${section.name || '合計'}　${section.secQty}式`, alignment: 'center', bold: true, colSpan: COLS - 2, border: [true, false, true, true], fillColor: '#e8f0f8' },
          ...emp(COLS - 3),
          { text: fmt(useDairi ? dairiSub * (section.secQty || 1) : section.effectiveTotal), alignment: 'right', bold: true, border: [true, false, true, true], fillColor: '#e8f0f8' },
        ]);
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

    if (sectionTotals.length > 0) {
      const grandDairi = sectionTotals.reduce((sum, s) =>
        sum + (s.items || []).reduce((ss, i) => ss + dairiItemAmt(i), 0) * (s.secQty || 1), 0);
      result.push({
        margin: [0, 0, 0, 0],
        table: {
          widths: COL_WIDTHS,
          body: [[
            { text: '', border: [true, true, false, true], fillColor: '#e8f0f8' },
            { text: '合　　計', alignment: 'center', bold: true, colSpan: COLS - 2, border: [false, true, false, true], fillColor: '#e8f0f8' },
            ...emp(COLS - 3),
            { text: fmt(useDairi ? grandDairi : grandTotal), alignment: 'right', bold: true, border: [false, true, true, true], fillColor: '#e8f0f8' },
          ]],
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.5,
          paddingLeft:   () => 3,
          paddingRight:  () => 3,
          paddingTop:    () => 3,
          paddingBottom: () => 3,
        },
      });
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
    const dateStr   = toJpDate(data.date || new Date());
    const quoteNoStr = data.quoteNoStr || (data.seqNo ? `CQR${data.seqNo}-${String(data.revision || 1).padStart(5, '0')}` : '');
    const sections  = data.sections || [];
    const showDairi = data.summaryShowDairi && data.mainRate != null;
    const rate      = data.mainRate;

    const dairiItemAmt  = item => {
      if (item.dairiUnitPrice != null) return item.dairiUnitPrice * (Number(item.qty) || 1);
      return Math.round((Number(item.amount) || 0) * rate);
    };
    const dairiItemUnit = item => {
      if (item.dairiUnitPrice != null) return item.dairiUnitPrice;
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
    const colWidths = showDairi ? [22, '*', 30, 24, 48, 48, 48, 48] : [22, '*', 36, 30, 58, 58];
    const colCount  = colWidths.length;
    const hdrSpan   = colCount - 2; // No.列と金額列を除いた span 数

    const hdr = (text) => ({ text, style: 'tableHeader', alignment: 'center' });
    const headerRow = showDairi
      ? [hdr('No.'), hdr('項　　　目'), hdr('数量'), hdr('単位'), hdr('単　価'), hdr('金　　額'), hdr('代理店単価'), hdr('代理店価格')]
      : [hdr('No.'), hdr('項　　　目'), hdr('数量'), hdr('単位'), hdr('単　価'), hdr('金　　額')];

    const tableRows = [headerRow];
    const empties = (n) => Array(n).fill({});

    sectionRows.forEach(({ sec, catTotals, catDairiTotals, noCategory }) => {
      // セクションヘッダー
      tableRows.push([
        { text: String(sec.no || ''), alignment: 'center', bold: true, fillColor: '#e8edf5' },
        { text: `※${sec.name || ''}`, bold: true, colSpan: colCount - 1, fillColor: '#e8edf5' },
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
        {}, {}, {},
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
          {}, {}, {},
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
      {}, {}, {},
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
        tableHeader: { bold: true, fontSize: 9, fillColor: '#1a4d8f', color: '#ffffff', alignment: 'center' },
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
          const docDef = buildDocDefinition(data);
          pdfMake.createPdf(docDef).getBlob(blob => { clearTimeout(timer); resolve(blob); });
        } catch (e) {
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
