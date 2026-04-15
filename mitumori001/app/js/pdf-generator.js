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
    const dateStr    = toJpDate(data.date || new Date());
    const quoteNoStr = `CQR${data.seqNo}-${String(data.revision || 1).padStart(5, '0')}`;

    // セクション小計の計算
    const sectionTotals = sections.map(s => {
      const subtotal = (s.items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      return { ...s, subtotal };
    });
    const grandTotal      = sectionTotals.reduce((sum, s) => sum + s.subtotal, 0);
    const discount        = Number(data.discount) || 0;
    const quoteCategory   = data.quoteCategory || '';
    const deliveryPrice   = Number(data.deliveryPrice) || grandTotal;
    const legalRate     = (Number(data.legalWelfareRate) || 14.6) / 100;
    const laborCost     = Number(data.laborCost) || Math.round(deliveryPrice * 0.115);
    const legalWelfare  = Math.round(laborCost * legalRate);
    const materialCost  = deliveryPrice - laborCost - legalWelfare;

    const font = fontLoaded ? 'NotoSansJP' : 'Roboto';

    return {
      pageSize:    'A4',
      pageMargins: [18, 18, 18, 18],

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
          margin: [18, 10, 18, 0],
          table: {
            widths: ['*', 80],
            body: [[
              {
                text: [quoteNoStr, data.projectName, data.projectName2, data.projectName3]
                  .filter(Boolean).join('　'),
                style: 'pageHdr',
                border: [false, false, false, true],
              },
              {
                text: `頁　${currentPage - 1}／${pageCount - 1}`,
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
        // 1ページ目: 御見積書（表紙）
        // ====================================================
        ...buildCoverPage({
          quoteNoStr, dateStr, branch,
          data, sectionTotals, grandTotal, discount, quoteCategory,
          deliveryPrice, materialCost, laborCost, legalWelfare, legalRate,
        }),

        // ====================================================
        // 2ページ目以降: 見積明細書（printDetail=falseの場合はスキップ）
        // ====================================================
        ...(data.printDetail !== false ? [
          { text: '', pageBreak: 'after' },
          ...buildDetailPages({ quoteNoStr, sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode }),
        ] : []),
      ],
    };
  }

  // ── 1ページ目（表紙）────────────────────────────────────────

  function buildCoverPage({ quoteNoStr, dateStr, branch, data, sectionTotals,
    grandTotal, discount, quoteCategory, deliveryPrice, materialCost, laborCost, legalWelfare, legalRate }) {
    // 値引き額ラベル: 工事を含む場合→「出精値引き」、物販・作業→「値引き額」
    const discountLabel = (quoteCategory || '').includes('工事') ? '出精値引き' : '値引き額';

    const COL_WIDTHS = [22, '*', 36, 30, 58, 58];   // No|項目|数量|単位|単価|金額

    // ── サマリーテーブルの行 ──────────────────────────────────
    const tableRows = [];

    // ヘッダー行
    tableRows.push([
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ]);

    // セクション行
    // 物販・作業の場合はアイテム行を直接表示、工事はセクション集計行
    const isKouji = (quoteCategory || '').includes('工事');

    // 見積外工事を先に定義（行数カウントに含めるため）
    const exclusions = (data.exclusions && data.exclusions.length > 0)
      ? data.exclusions : [];
    const exRowCount = Math.ceil(exclusions.length / 2);

    // 第1パス: 行データを収集してカウント（フォントサイズ決定のため）
    const mirrorEntries = [];
    sectionTotals.forEach(s => {
      if (isKouji) {
        mirrorEntries.push({ type: 'section', s });
      } else {
        if (s.name && s.name.trim()) {
          mirrorEntries.push({ type: 'sectionHeader', s });
        }
        // 単価0円のアイテムも名前があれば表示する
        (s.items || []).filter(i => i.name && i.name.trim()).forEach(item => {
          mirrorEntries.push({ type: 'item', item });
          (item.specLines || []).filter(l => l.trim()).forEach(line => {
            mirrorEntries.push({ type: 'specLine', text: line });
          });
        });
      }
    });
    // 見積外工事行・固定行（合計+内訳7行）も含めてトータル行数を算出
    const mirrorRowCount = mirrorEntries.length + exRowCount + 7;

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
      if (entry.type === 'section') {
        const s = entry.s;
        tableRows.push([
          { text: String(s.no || ''), alignment: 'center', fontSize: itemFs },
          { text: s.name || '', fontSize: itemFs },
          { text: '1', alignment: 'center', fontSize: itemFs },
          { text: '式', alignment: 'center', fontSize: itemFs },
          { text: '', fontSize: itemFs },
          { text: fmt(s.subtotal), alignment: 'right', fontSize: itemFs },
        ]);
      } else if (entry.type === 'sectionHeader') {
        const s = entry.s;
        tableRows.push([
          { text: String(s.no || ''), alignment: 'center', fontSize: itemFs },
          { text: s.name, bold: true, fontSize: itemFs },
          { text: '', alignment: 'center', fontSize: itemFs },
          { text: '', alignment: 'center', fontSize: itemFs },
          { text: '', alignment: 'right', fontSize: itemFs },
          { text: '', alignment: 'right', fontSize: itemFs },
        ]);
      } else if (entry.type === 'specLine') {
        const specFs = Math.max(5.5, itemFs - 0.5);
        tableRows.push([
          { text: '', fontSize: specFs },
          { text: `　${entry.text}`, fontSize: specFs, color: '#444' },
          { text: '', fontSize: specFs },
          { text: '', fontSize: specFs },
          { text: '', fontSize: specFs },
          { text: '', fontSize: specFs },
        ]);
      } else {
        const item = entry.item;
        tableRows.push([
          { text: '', fontSize: itemFs },
          { text: item.name || '', fontSize: itemFs },
          { text: String(item.qty || 1), alignment: 'center', fontSize: itemFs },
          { text: item.unit || '式', alignment: 'center', fontSize: itemFs },
          { text: fmt(item.unitPrice), alignment: 'right', fontSize: itemFs },
          { text: fmt(item.amount), alignment: 'right', fontSize: itemFs },
        ]);
      }
    });

    // 空白行（行数が少ない場合のみ余白を確保）
    const emptyRows = Math.max(0, 10 - mirrorRowCount);
    for (let i = 0; i < emptyRows; i++) {
      tableRows.push([
        { text: '', border: [true, false, true, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, false, false] },
        { text: '', border: [false, false, true, false] },
      ]);
    }

    // 合計行
    tableRows.push([
      { text: '', border: [true, true, false, false] },
      { text: '合　　計', alignment: 'center', bold: true, fontSize: itemFs, colSpan: 4, border: [false, true, false, false] },
      {}, {}, {},
      { text: fmt(grandTotal), alignment: 'right', fontSize: itemFs, border: [false, true, true, false] },
    ]);

    // 値引き額（0の場合も表示）
    tableRows.push([
      { text: '', border: [true, false, false, false] },
      { text: discountLabel, alignment: 'center', fontSize: itemFs, colSpan: 4, border: [false, false, false, false] },
      {}, {}, {},
      { text: discount > 0 ? '▲ ' + fmt(discount) : fmt(0), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
    ]);

    // お渡し価格
    tableRows.push([
      { text: '', border: [true, false, false, false] },
      { text: '貴社お渡し価格', alignment: 'center', fontSize: itemFs, colSpan: 4, border: [false, false, false, false] },
      {}, {}, {},
      { text: fmt(deliveryPrice), alignment: 'right', fontSize: itemFs, bold: true, border: [false, false, true, false] },
    ]);

    // 内訳ヘッダー
    tableRows.push([
      { text: '', border: [true, false, false, false] },
      { text: '＜内訳＞', alignment: 'center', fontSize: itemFs, colSpan: 5, border: [false, false, true, false] },
      {}, {}, {}, {},
    ]);

    // 内訳 1) 資材費
    tableRows.push([
      { text: '', border: [true, false, false, false] },
      { text: '1）資材費他', fontSize: itemFs, colSpan: 4, border: [false, false, false, false] },
      {}, {}, {},
      { text: fmt(materialCost), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
    ]);

    // 内訳 2) 労務費
    tableRows.push([
      { text: '', border: [true, false, false, false] },
      { text: '2）労務費', fontSize: itemFs, colSpan: 4, border: [false, false, false, false] },
      {}, {}, {},
      { text: fmt(laborCost), alignment: 'right', fontSize: itemFs, border: [false, false, true, false] },
    ]);

    // 内訳 3) 法定福利費
    tableRows.push([
      { text: '', border: [true, false, false, true] },
      { text: `3）法定福利費（${(legalRate * 100).toFixed(1)}%）`, fontSize: itemFs, colSpan: 4, border: [false, false, false, true] },
      {}, {}, {},
      { text: fmt(legalWelfare), alignment: 'right', fontSize: itemFs, border: [false, false, true, true] },
    ]);

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
              // 工事名
              {
                margin: [25, compact ? 4 : 8, 0, 0],
                columns: [
                  { width: 42, text: '工 事 名', fontSize: 9 },
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
                        text: `¥${fmt(deliveryPrice)}`,
                        fontSize: amountBigFs,
                        bold: true,
                        decoration: 'underline',
                      },
                      { text: '（法定福利費事業主負担金を含む）', fontSize: 7, margin: [0, 1, 0, 0] },
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

  // ── 2ページ目以降（明細書）──────────────────────────────────

  function buildDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode }) {
    const useDairi = pdfPriceMode === 'dairi' && mainRate != null;
    const COL_WIDTHS = [22, '*', 36, 30, 58, 58];
    const result = [];

    // テーブルヘッダー行（各ページ先頭で繰り返す用）
    const headerRow = [
      { text: 'No.', style: 'tableHeader' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '金　　額', style: 'tableHeader' },
    ];

    sectionTotals.forEach((section, sIdx) => {
      const rows = [headerRow];

      // セクションヘッダー行
      rows.push([
        { text: String(section.no || sIdx + 1), alignment: 'center', style: 'sectionHdr' },
        {
          text: `※${section.name || ''}`,
          style: 'sectionHdr',
          colSpan: 5,
        },
        {}, {}, {}, {},
      ]);

      // 明細行（個別）
      (section.items || []).forEach(item => {
        rows.push([
          { text: '' },
          { text: item.name || '' },
          { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
          { text: item.unit || '', alignment: 'center' },
          { text: item.unitPrice ? fmt(useDairi ? Math.round(item.unitPrice * mainRate) : item.unitPrice) : '', alignment: 'right' },
          { text: fmt(useDairi ? Math.round((Number(item.amount) || 0) * mainRate) : item.amount), alignment: 'right' },
        ]);
        // 仕様行
        (item.specLines || []).filter(l => (l || '').trim()).forEach(line => {
          rows.push([
            { text: '' },
            { text: `　${line}`, fontSize: 7.5, color: '#444' },
            { text: '' },
            { text: '' },
            { text: '' },
            { text: '' },
          ]);
        });
      });

      // 空白行（最低2行）
      const minRows = 2;
      const emptyCount = Math.max(minRows, 0);
      for (let i = 0; i < emptyCount; i++) {
        rows.push([
          { text: '', border: [true, false, true, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, true, false] },
        ]);
      }

      // 小計行
      rows.push([
        { text: '', border: [true, true, true, true], fillColor: '#f0f0f0' },
        {
          text: '─────小計─────',
          alignment: 'center',
          bold: true,
          colSpan: 4,
          border: [true, true, true, true],
          fillColor: '#f0f0f0',
        },
        {}, {}, {},
        {
          text: fmt(section.subtotal),
          alignment: 'right',
          bold: true,
          border: [true, true, true, true],
          fillColor: '#f0f0f0',
        },
      ]);

      result.push({
        table: {
          widths:     COL_WIDTHS,
          headerRows: 1,
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
      result.push({
        margin: [0, 0, 0, 0],
        table: {
          widths: COL_WIDTHS,
          body: [[
            { text: '', border: [true, true, false, true], fillColor: '#e8f0f8' },
            {
              text: '合　　計',
              alignment: 'center',
              bold: true,
              colSpan: 4,
              border: [false, true, false, true],
              fillColor: '#e8f0f8',
            },
            {}, {}, {},
            {
              text: useDairi
                ? fmt(sectionTotals.reduce((sum, s) =>
                    sum + (s.items || []).reduce((ss, i) => ss + Math.round((Number(i.amount) || 0) * mainRate), 0), 0))
                : fmt(grandTotal),
              alignment: 'right',
              bold: true,
              border: [false, true, true, true],
              fillColor: '#e8f0f8',
            },
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
  };
  const CALC_CATEGORY_ORDER = ['①', '②', '③', '④'];

  function buildSummaryDocDefinition(data) {
    const font      = fontLoaded ? 'NotoSansJP' : 'Roboto';
    const dateStr   = toJpDate(data.date || new Date());
    const quoteNoStr = `CQR${data.seqNo}-${String(data.revision || 1).padStart(5, '0')}`;
    const sections  = data.sections || [];

    // セクション別・カテゴリ別集計
    const sectionRows = sections.map(sec => {
      const catTotals = {};
      const noCategory = [];

      (sec.items || []).forEach(item => {
        const prefix = (item.calcCategory || '').trim().charAt(0);
        if (CALC_CATEGORY_LABELS[prefix]) {
          if (!catTotals[prefix]) catTotals[prefix] = 0;
          catTotals[prefix] += Number(item.amount) || 0;
        } else {
          noCategory.push(item);
        }
      });

      return { sec, catTotals, noCategory };
    });

    // テーブル行を組み立て
    const tableRows = [[
      { text: 'No.', style: 'tableHeader', alignment: 'center' },
      { text: '項　　　目', style: 'tableHeader' },
      { text: '数量', style: 'tableHeader', alignment: 'center' },
      { text: '単位', style: 'tableHeader', alignment: 'center' },
      { text: '単　価', style: 'tableHeader', alignment: 'center' },
      { text: '金　　額', style: 'tableHeader', alignment: 'center' },
    ]];

    sectionRows.forEach(({ sec, catTotals, noCategory }) => {
      // セクションヘッダー
      tableRows.push([
        { text: String(sec.no || ''), alignment: 'center', bold: true, fillColor: '#e8edf5' },
        { text: `※${sec.name || ''}`, bold: true, colSpan: 5, fillColor: '#e8edf5' },
        {}, {}, {}, {},
      ]);

      // カテゴリなし → 個別行
      noCategory.forEach(item => {
        tableRows.push([
          { text: '' },
          { text: item.name || '' },
          { text: item.qty != null ? String(item.qty) : '1', alignment: 'right' },
          { text: item.unit || '式', alignment: 'center' },
          { text: item.unitPrice ? fmt(item.unitPrice) : '', alignment: 'right' },
          { text: fmt(item.amount), alignment: 'right' },
        ]);
      });

      // カテゴリあり → 集計行
      CALC_CATEGORY_ORDER.forEach(prefix => {
        const amount = catTotals[prefix];
        if (!amount) return;
        tableRows.push([
          { text: '' },
          { text: CALC_CATEGORY_LABELS[prefix] },
          { text: '1', alignment: 'right' },
          { text: '式', alignment: 'center' },
          { text: '', alignment: 'right' },
          { text: fmt(amount), alignment: 'right' },
        ]);
      });

      // セクション小計
      const subtotal = (sec.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
      tableRows.push([
        { text: '', border: [true, true, true, true], fillColor: '#f5f5f5' },
        { text: '─ 小 計 ─', alignment: 'center', bold: true, colSpan: 4, border: [true, true, true, true], fillColor: '#f5f5f5' },
        {}, {}, {},
        { text: fmt(subtotal), alignment: 'right', bold: true, border: [true, true, true, true], fillColor: '#f5f5f5' },
      ]);
    });

    // 全体合計
    const grandTotal = sections.reduce((s, sec) =>
      s + (sec.items || []).reduce((ss, i) => ss + (Number(i.amount) || 0), 0), 0);
    tableRows.push([
      { text: '', border: [true, true, false, false] },
      { text: '合　　計', alignment: 'center', bold: true, colSpan: 4, border: [false, true, false, false] },
      {}, {}, {},
      { text: fmt(grandTotal), alignment: 'right', bold: true, border: [false, true, true, false] },
    ]);

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
            widths: [22, '*', 36, 30, 58, 58],
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
      const quoteNo = `CQR${data.seqNo}-${String(data.revision || 1).padStart(5, '0')}`;
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
        try {
          const docDef = buildDocDefinition(data);
          pdfMake.createPdf(docDef).getBlob(resolve);
        } catch (e) {
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
      const quoteNo = `CQR${data.seqNo}-${String(data.revision || 1).padStart(5, '0')}`;
      const fname   = `見積集計表_${quoteNo}_${data.customerName || ''}.pdf`;
      pdfMake.createPdf(docDef).download(fname);
    },

    get fontLoaded() { return fontLoaded; },
  };

})();
