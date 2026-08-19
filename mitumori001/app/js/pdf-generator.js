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

  // ── ネポンロゴ（SVG） ──────────────────────────────────────
  const NEPON_LOGO_SVG = `<svg version="1.0" xmlns="http://www.w3.org/2000/svg"
 width="339.000000pt" height="138.000000pt" viewBox="0 0 339.000000 138.000000"
 preserveAspectRatio="xMidYMid meet">

<g transform="translate(0.000000,138.000000) scale(0.100000,-0.100000)"
fill="#000000" stroke="none">
<path d="M195 1244 c-56 -30 -55 -23 -55 -360 l0 -312 26 -31 c19 -23 34 -31
60 -31 l34 0 2 308 3 307 63 -240 c75 -286 85 -315 118 -346 22 -20 36 -24 91
-24 60 0 67 2 94 33 l29 32 0 270 c0 256 1 270 19 280 13 7 407 10 1205 10
1064 0 1186 -2 1200 -16 14 -13 16 -49 16 -240 0 -123 -2 -224 -4 -224 -2 0
-34 82 -72 183 -73 196 -95 229 -159 241 -50 10 -109 -9 -139 -45 l-26 -31 0
-249 0 -250 46 3 c38 2 51 8 68 31 19 26 21 45 26 224 l5 195 75 -198 c86
-230 102 -254 175 -254 52 0 99 21 115 49 6 12 10 131 10 313 0 273 -1 295
-20 325 -41 68 53 64 -1339 61 l-1259 -3 -27 -25 c-48 -45 -50 -53 -55 -313
l-5 -248 -70 268 c-80 310 -87 323 -172 323 -26 -1 -61 -8 -78 -16z"/>
<path d="M854 1026 c-17 -8 -40 -26 -52 -41 -21 -26 -22 -38 -22 -215 0 -185
0 -187 25 -214 13 -14 36 -31 50 -36 15 -6 116 -10 226 -10 l199 0 0 55 0 55
-163 0 c-113 0 -167 4 -175 12 -7 7 -12 29 -12 50 l0 38 175 0 175 0 0 55 0
55 -175 0 -175 0 0 40 c0 29 5 42 19 50 11 6 87 10 175 10 l156 0 0 55 0 55
-197 0 c-143 -1 -207 -5 -229 -14z"/>
<path d="M1400 775 l0 -265 75 0 75 0 0 100 0 100 145 0 c163 0 192 8 225 63
14 23 20 50 20 95 0 88 -19 128 -72 152 -38 17 -67 20 -255 20 l-213 0 0 -265z
m372 138 c20 -18 23 -45 8 -74 -10 -17 -22 -19 -120 -19 l-110 0 0 55 0 55
102 0 c80 0 105 -3 120 -17z"/>
<path d="M2134 1026 c-17 -7 -40 -26 -52 -41 -21 -26 -22 -38 -22 -215 0 -185
0 -187 25 -214 38 -41 65 -46 236 -46 173 0 199 6 238 56 19 25 21 39 21 200
0 95 -4 184 -9 197 -5 14 -25 35 -43 48 -31 23 -43 24 -198 26 -123 2 -173 -1
-196 -11z m277 -106 c17 -10 19 -22 19 -143 0 -90 -4 -137 -12 -145 -16 -16
-180 -16 -196 0 -8 8 -12 55 -12 145 0 115 2 133 18 142 22 14 158 14 183 1z"/>
<path d="M852 391 c-20 -12 -11 -55 12 -59 27 -6 48 25 35 49 -10 20 -26 24
-47 10z m38 -26 c0 -8 -9 -15 -20 -15 -20 0 -26 11 -13 23 12 13 33 7 33 -8z"/>
<path d="M267 330 c-4 -17 -14 -20 -66 -20 -54 0 -61 -2 -61 -20 0 -18 8 -20
113 -22 l112 -3 -65 -32 c-36 -18 -86 -36 -112 -39 -45 -6 -48 -8 -48 -37 l0
-30 65 6 65 6 0 -29 c0 -29 1 -30 50 -30 49 0 50 1 50 30 0 29 2 31 33 26 17
-3 48 -7 67 -8 32 -3 35 0 38 25 3 28 1 30 -51 42 l-29 6 41 29 c29 22 41 37
41 55 0 24 -2 25 -66 25 -57 0 -67 3 -71 20 -4 16 -14 20 -53 20 -39 0 -49 -4
-53 -20z"/>
<path d="M670 330 c0 -18 -7 -20 -66 -20 -57 0 -65 -2 -62 -17 3 -15 16 -19
66 -21 l62 -3 0 -94 0 -95 60 0 60 0 0 95 0 95 65 0 c58 0 65 2 65 20 0 18 -7
20 -65 20 -58 0 -65 2 -65 20 0 18 -7 20 -60 20 -53 0 -60 -2 -60 -20z"/>
<path d="M950 330 c0 -18 7 -20 85 -20 78 0 85 2 85 20 0 18 -7 20 -85 20 -78
0 -85 -2 -85 -20z"/>
<path d="M1390 325 c0 -20 -5 -25 -25 -25 -16 0 -25 -6 -25 -15 0 -10 10 -15
28 -15 l27 -1 -27 -20 c-24 -17 -28 -28 -28 -67 l1 -47 24 28 25 28 0 -55 0
-56 35 0 35 0 0 58 1 57 24 -29 24 -30 3 40 c2 30 -2 45 -21 67 -25 27 -25 27
-3 27 13 0 22 6 22 15 0 9 -9 15 -25 15 -20 0 -25 5 -25 25 0 22 -4 25 -35 25
-31 0 -35 -3 -35 -25z"/>
<path d="M1640 325 c0 -19 -5 -25 -21 -25 -16 0 -19 4 -14 20 11 36 -31 24
-54 -15 l-20 -35 54 0 c48 0 55 -2 55 -20 0 -18 -7 -20 -55 -20 -48 0 -55 -2
-55 -20 0 -16 7 -20 35 -20 l36 0 -17 -32 c-9 -18 -26 -43 -37 -56 l-20 -22
30 0 c23 0 39 9 57 31 l26 31 0 -31 c0 -29 3 -31 35 -31 34 0 35 1 35 37 l0
38 31 -38 c24 -30 37 -37 65 -37 l34 0 -35 46 c-42 54 -43 64 -10 64 18 0 25
5 25 20 0 18 -7 20 -55 20 -48 0 -55 2 -55 20 0 18 7 20 55 20 41 0 55 4 55
14 0 11 -15 16 -52 18 -46 3 -53 6 -56 26 -3 18 -10 22 -38 22 -30 0 -34 -3
-34 -25z"/>
<path d="M2140 325 l0 -25 -135 0 c-113 0 -135 -2 -135 -15 0 -13 22 -15 134
-15 l133 0 17 -64 c26 -95 48 -126 90 -126 l35 0 -29 62 c-16 35 -32 78 -36
96 -6 31 -6 32 30 32 25 0 36 4 36 15 0 10 -11 15 -35 15 -31 0 -35 3 -35 25
0 22 -4 25 -35 25 -31 0 -35 -3 -35 -25z"/>
<path d="M2230 335 c0 -10 9 -14 25 -13 14 1 25 8 25 15 0 7 -11 13 -25 13
-15 0 -25 -6 -25 -15z"/>
<path d="M2410 330 c-30 -10 -68 -21 -83 -25 -22 -4 -28 -11 -25 -28 2 -15 9
-21 21 -19 9 2 17 -2 17 -8 0 -15 348 -13 383 3 49 22 31 47 -48 69 -99 28
-197 31 -265 8z m204 -26 c25 -14 46 -28 46 -30 0 -2 -62 -4 -137 -4 l-138 0
50 30 c65 38 117 39 179 4z"/>
<path d="M2827 330 c-3 -14 -14 -20 -31 -20 -16 0 -26 -6 -26 -15 0 -12 13
-15 55 -15 30 0 55 -4 55 -9 0 -5 -25 -21 -55 -37 -50 -26 -55 -32 -55 -62 0
-29 2 -32 19 -22 33 17 41 11 41 -30 l0 -40 40 0 40 0 0 45 0 46 30 -16 30
-16 0 36 c0 21 -5 35 -12 35 -7 0 -20 4 -28 10 -12 7 -9 13 13 30 36 28 36 60
1 60 -17 0 -28 6 -31 20 -4 16 -14 20 -43 20 -29 0 -39 -4 -43 -20z"/>
<path d="M3057 330 c-4 -15 -14 -20 -36 -20 -21 0 -31 -5 -31 -15 0 -10 11
-15 35 -15 l35 0 0 -80 0 -80 -45 0 c-38 0 -45 -3 -45 -20 0 -19 7 -20 125
-20 118 0 125 1 125 20 0 17 -7 20 -45 20 l-45 0 0 80 0 80 35 0 c24 0 35 5
35 15 0 10 -11 15 -35 15 -28 0 -35 4 -35 20 0 16 -7 20 -34 20 -25 0 -35 -5
-39 -20z"/>
<path d="M1245 215 c-53 -27 -73 -31 -175 -35 l-115 -5 -3 -49 -3 -49 103 5
c72 4 120 12 160 27 84 32 100 48 96 96 l-3 40 -60 -30z"/>
<path d="M1870 210 c0 -17 7 -20 41 -20 38 0 40 -1 37 -27 -3 -25 -7 -28 -40
-28 -35 0 -38 -2 -38 -29 l0 -29 68 6 c90 9 172 34 172 53 0 11 -9 13 -40 8
-38 -6 -40 -5 -40 19 0 23 5 26 37 29 27 2 39 8 41 21 3 15 -8 17 -117 17
-114 0 -121 -1 -121 -20z"/>
<path d="M580 218 c0 -2 -11 -33 -24 -70 l-23 -68 39 0 c35 0 40 3 54 37 9 20
18 52 21 70 5 32 5 33 -31 33 -20 0 -36 -1 -36 -2z"/>
<path d="M810 206 c0 -8 9 -40 21 -71 20 -53 22 -55 58 -55 l38 0 -23 68 c-22
65 -24 67 -58 70 -27 2 -36 -1 -36 -12z"/>
<path d="M2320 185 c0 -9 9 -15 25 -15 29 0 30 -5 10 -54 l-15 -36 185 0 c102
0 185 2 185 4 0 2 -7 20 -15 39 -19 47 -19 47 10 47 16 0 25 6 25 15 0 13 -29
15 -205 15 -176 0 -205 -2 -205 -15z m280 -41 c6 -14 10 -27 10 -30 0 -2 -38
-4 -84 -4 l-85 0 10 30 c11 29 13 30 75 30 60 0 65 -2 74 -26z"/>
</g>
</svg>`;

  // ── ユーティリティ ──────────────────────────────────────────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';

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
    // 実測値: 1ページに約15-20行入る → 1行あたり約40pt
    const ROW_HEIGHT = 26;        // 1行あたりの高さ（パディング・行間込み）
    const SECTION_HEADER_HEIGHT = 20; // セクションヘッダーの追加高さ
    const FIXED_HEIGHT = 220;     // タイトル、テーブルヘッダー、合計行など
    const estimatedHeight = FIXED_HEIGHT
                          + (totalRows * ROW_HEIGHT)
                          + (sectionCount * SECTION_HEADER_HEIGHT);

    // ③ A4印刷可能領域を計算（pt単位）
    // A4高さ: 297mm ≈ 842pt
    // マージン（上38 + 下18 = 56） → 印刷可能: 約786pt
    // 安全マージン: 実際は少し狭いので750ptを基準にする
    const A4_PRINTABLE_HEIGHT = 750;

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

    return {
      pageSize:    'A4',
      pageMargins: [18 * scaleRatio, 38 * scaleRatio, 18 * scaleRatio, 18 * scaleRatio],

      defaultStyle: {
        font:       font,
        fontSize:   10 * scaleRatio,
        lineHeight: 1.25,
      },

      styles: {
        docTitle:    { fontSize: 22 * scaleRatio, bold: true, characterSpacing: 8 * scaleRatio },
        tableHeader: { bold: true, alignment: 'center', fontSize: 8 * scaleRatio, noWrap: true },
        sectionHdr:  { bold: true, fontSize: 8.5 * scaleRatio },
        amountBig:   { fontSize: 18 * scaleRatio, bold: true },
        subtotalRow: { bold: true, fillColor: '#f8f8f8' },
        totalRow:    { bold: true },
        pageHdr:     { fontSize: 8 * scaleRatio, color: '#000' },
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
          productCodePosition: data.productCodePositionCover || 'right',
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
                ? buildKoujiSummaryDetailPages({ sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, productCodePosition: data.productCodePosition || 'right', discount, discountEnabled: data.discountEnabled !== false, adjustAmount, waribikiAmount, showBikou: data.showBikou !== false })
                : buildKoujiDetailPages({ quoteNoStr, sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, showSubtotalBoth: data.showSubtotalBoth, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, productCodePosition: data.productCodePosition || 'right', discount, discountEnabled: data.discountEnabled !== false, adjustAmount, waribikiAmount, showBikou: data.showBikou !== false }))
            : (data.printMode === 'simple'
                ? buildBuppanSagyoSummaryDetailPages({ sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, productCodePosition: data.productCodePosition || 'right', quoteCategory, useBuppanDeliveryLabel: data.useBuppanDeliveryLabel || false, adjustAmount, showBikou: data.showBikou !== false })
                : buildBuppanSagyoDetailPages({ quoteNoStr, sectionTotals, grandTotal, mainRate: data.mainRate, pdfPriceMode: data.pdfPriceMode, dairiTotal: data.dairiTotal, showSubtotalBoth: data.showSubtotalBoth, roundingEnabled: data.roundingEnabled, showProductCode: data.showProductCode, productCodePosition: data.productCodePosition || 'right', quoteCategory, useBuppanDeliveryLabel: data.useBuppanDeliveryLabel || false, adjustAmount, showBikou: data.showBikou !== false }))
          ),
        ] : []),
      ],
    };
  }

  // ── 1ページ目（表紙）────────────────────────────────────────

  function buildCoverPage({ quoteNoStr, dateStr, branch, data, sectionTotals,
    grandTotal, discount, discountEnabled, quoteCategory, deliveryPrice, materialCost, laborCost, legalWelfare, legalRate, anzenCost, buhanDiscTotal = 0,
    mainRate, pdfPriceMode, dairiTotal, showUchiwake, showProductCode = false, productCodePosition = 'right',
    frpMode, frpItems, frpPriceTotal, frpShikiriTotal,
    frpShowZuban = true, frpShowSpecs = true, frpDiscount = 0,
    roundingEnabled = false, sections = [],
    adjustAmount = 0, waribikiAmount = 0, printDetail = false, showTaxIncluded = false, showBikou = true, showTeikaTotal = true, pdfScaleToFit = false }) {

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
        ? (productCodePosition === 'left'
          ? (useDairi ? [22, 50, '*', 24, 44, 52, 58, 52, 58, 44] : [22, 50, '*', 36, 44, 58, 58, 44])
          : (useDairi ? [22, '*', 50, 24, 44, 52, 58, 52, 58, 44] : [22, '*', 50, 36, 44, 58, 58, 44]))
        : (useDairi ? [22, '*', 24, 44, 52, 58, 52, 58, 44] : [22, '*', 36, 44, 58, 58, 44]));
    const COL_WIDTHS = showBikou ? _cwRaw : _cwRaw.slice(0, -1);
    const COLS = (frpMode ? (isTeika ? 7 : 9) : (useDairi ? (showProductCode ? 10 : 9) : (showProductCode ? 8 : 7))) - (showBikou ? 0 : 1);
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));
    const _pcL = showProductCode && productCodePosition === 'left';
    const _pcR = showProductCode && productCodePosition !== 'left';
    const _pcHdrCell = showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : [];

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
        ...(_pcL ? _pcHdrCell : []),
        { text: '品　　　名', style: 'tableHeader' },
        ...(_pcR ? _pcHdrCell : []),
        { text: '数量', style: 'tableHeader' },
        { text: '単位', style: 'tableHeader' },
        { text: '単　価', style: 'tableHeader' },
        { text: '合　計', style: 'tableHeader' },
        { text: '仕切単価', style: 'tableHeader' },
        { text: '仕切合計', style: 'tableHeader' },
        ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
      ] : isShikiOnly ? [
        { text: 'No.', style: 'tableHeader' },
        ...(_pcL ? _pcHdrCell : []),
        { text: '品　　　名', style: 'tableHeader' },
        ...(_pcR ? _pcHdrCell : []),
        { text: '数量', style: 'tableHeader' },
        { text: '単位', style: 'tableHeader' },
        { text: '仕切単価', style: 'tableHeader' },
        { text: '仕切合計', style: 'tableHeader' },
        ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
      ] : [
        { text: 'No.', style: 'tableHeader' },
        ...(_pcL ? _pcHdrCell : []),
        { text: '品　　　名', style: 'tableHeader' },
        ...(_pcR ? _pcHdrCell : []),
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
            // 型式と同じ値を除外（物販標準項マスタのfield重複防止）
            const _specLines = (item.specLines || []).filter(l => {
              const trimmed = l.trim();
              return trimmed && trimmed !== (item.model || '').trim() && trimmed !== (item.spec || '').trim();
            });
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
    // 20行を超える場合は縮小率を適用して1ページに収める
    let itemFs;
    let scaleRatio = 1.0; // 縮小率（デフォルトは100%）

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

    // 縮小率を適用
    const itemFsBefore = itemFs;
    itemFs = itemFs * scaleRatio;
    console.log('[PDF] フォントサイズ: ' + itemFsBefore + ' → ' + itemFs + ' (縮小率: ' + scaleRatio + ')');

    const cellPad   = (mirrorRowCount <= 5  ? 6   :
                       mirrorRowCount <= 8  ? 5   :
                       mirrorRowCount <= 11 ? 4   :
                       mirrorRowCount <= 14 ? 3   :
                       mirrorRowCount <= 20 ? 2   :
                       mirrorRowCount <= 26 ? 1.5 :
                       mirrorRowCount <= 30 ? 1.2 : 1) * scaleRatio;

    const topMargin = (mirrorRowCount > 18 ? 20 : 14) * scaleRatio;

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
            color: c === 1 ? '#000000' : undefined,
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
            color: c === 1 ? '#000000' : undefined,
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
        const trimmed = (entry.text || '').trim();
        const margin = trimmed.startsWith('〇') ? [0, 0, 0, 0] : [8, 0, 0, 0];
        const text = trimmed.startsWith('〇') ? trimmed.substring(1).trim() : trimmed;
        const row = [
          { text: '', fontSize: specFs },
          { text: text, fontSize: specFs, color: '#000', margin: margin },
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
        const label = (entry.spec.label || '').trim();
        const hasCircle = label.startsWith('〇');
        const displayLabel = hasCircle ? label.substring(1).trim() : label;
        const margin = hasCircle ? [0, 0, 0, 0] : [8, 0, 0, 0];
        const text = entry.spec.value ? `${displayLabel}：${entry.spec.value}` : displayLabel;
        const row = [
          { text: '', fontSize: specFs },
          { text: text, fontSize: specFs, color: '#000', margin: margin },
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
        const _pcCell = showProductCode ? [{ text: item.productCode || '', fontSize: itemFs, noWrap: true }] : [];
        const row = [
          { text: rowNoText, alignment: 'right', fontSize: itemFs },
          ...(_pcL ? _pcCell : []),
          { text: item.name || '', fontSize: itemFs },
          ...(_pcR ? _pcCell : []),
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
    // 合計行（約2-3行）も考慮して、1ページ（約24行）に収まるようにする
    const remarksExtraLines = data.remarks ? Math.max(0, data.remarks.split('\n').length - 1) : 0;
    const totalRowsReserve = 3; // 合計行用に予約する行数
    const maxRowsPerPage = 24; // 1ページに収まる最大行数（ヘッダー含む）
    const emptyTarget = mirrorRowCount <= 5  ? 10 :
                        mirrorRowCount <= 8  ? 13 :
                        mirrorRowCount <= 11 ? 16 :
                        mirrorRowCount <= 18 ? 18 : 0; // 18行超えたら空白行なし
    const emptyRows = 0; // 空白行なし（1ページ収容のため）
//     const emptyRows = Math.max(0, Math.min(emptyTarget - mirrorRowCount - remarksExtraLines, maxRowsPerPage - mirrorRowCount - totalRowsReserve - remarksExtraLines));
//     for (let i = 0; i < emptyRows; i++) {
//       const er = Array.from({ length: COLS }, () => ({ text: ' ', fontSize: itemFs }));
//       tableRows.push(er);
//     }

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

    // 行数に応じたヘッダー部フォントサイズ（縮小率適用）
    const compact = mirrorRowCount > 18;
    const titleFs    = (compact ? 17 : 22) * scaleRatio;
    // 顧客名の文字数に応じてフォントサイズを自動縮小（利用可能幅 ≒ 324pt）
    const _custFullLen = ((data.customerName || '') +
      (data.customerHonorific && data.customerHonorific !== 'ー' ? '　' + data.customerHonorific : '')).length;
    const custFs = (compact ? 12 :
      _custFullLen <= 15 ? 16 :
      _custFullLen <= 19 ? 14 :
      _custFullLen <= 24 ? 12 : 10) * scaleRatio;
    const midFs      = (compact ? 9  : 12) * scaleRatio;
    const amountBigFs= (compact ? 14 : 18) * scaleRatio;
    const hdrLineH   = compact ? 1.3 : 1.6;
    const amountMgn  = (compact ? 3   : 6) * scaleRatio;

    return [
      // ── ロゴ（右上） ──
      {
        svg: NEPON_LOGO_SVG,
        width: 80,
        absolutePosition: { x: 460, y: 28 }
      },
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
        margin: [0, 6 * scaleRatio, 0, 0],
        table: {
          widths:      COL_WIDTHS,
          headerRows:  1,
          body:        tableRows,
          dontBreakRows: true,
          keepWithHeaderRows: 2,
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
          { text: `  ${item.soryoNote}`, fontSize: 7, color: '#000000', colSpan: 7,
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
        // 型式と同じ値を除外（物販標準項マスタのfield重複防止）
        (item.specLines || []).filter(l => {
          const trimmed = (l || '').trim();
          return trimmed && trimmed !== (item.model || '').trim() && trimmed !== (item.spec || '').trim();
        }).forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('〇')) {
            const text = trimmed.substring(1).trim();
            rows.push([
              { text: '' },
              { text: text, fontSize: 7.5, color: '#000', margin: [0, 0, 0, 0] },
              ...emp(COLS - 2),
            ]);
          } else {
            rows.push([
              { text: '' },
              { text: trimmed, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] },
              ...emp(COLS - 2),
            ]);
          }
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
          { text: `  ${item.soryoNote}`, fontSize: 7, color: '#000000', border: [true, false, true, false] },
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
          // 型式と同じ値を除外（物販標準項マスタのfield重複防止）
          const specLines = (item.specLines || []).filter(l => {
            const trimmed = (l || '').trim();
            return trimmed && trimmed !== (item.model || '').trim() && trimmed !== (item.spec || '').trim();
          });
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
            const trimmed = line.trim();
            const margin = trimmed.startsWith('〇') ? [0, 0, 0, 0] : [8, 0, 0, 0];
            const text = trimmed.startsWith('〇') ? trimmed.substring(1).trim() : trimmed;
            rows.push([
              { text: '', border: [true, false, true, isLast] },
              { text: text, fontSize: 7.5, color: '#000', margin: margin, border: [true, false, true, isLast] },
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

  function buildKoujiSummaryDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal, roundingEnabled, showProductCode, productCodePosition = 'right', discount = 0, discountEnabled = true, adjustAmount = 0, waribikiAmount = 0, showBikou = true }) {
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
    const _pcL_ks = showProductCode && productCodePosition === 'left';
    const _pcR_ks = showProductCode && productCodePosition !== 'left';
    const _pcSplice_ks = _pcL_ks ? 1 : 2;
    const _cwRaw = showProductCode
      ? (_pcL_ks
        ? (useDairi ? [20, 58, '*', 22, 44, 52, 58, 52, 58, 44] : [22, 58, '*', 36, 44, 58, 58, 44])
        : (useDairi ? [20, '*', 58, 22, 44, 52, 58, 52, 58, 44] : [22, '*', 58, 36, 44, 58, 58, 44]))
      : (useDairi ? [20, '*', 22, 44, 52, 58, 52, 58, 44] : [22, '*', 36, 44, 58, 58, 44]);
    const COL_WIDTHS = showBikou ? _cwRaw : _cwRaw.slice(0, -1);
    const COLS = (useDairi ? (showProductCode ? 10 : 9) : (showProductCode ? 8 : 7)) - (showBikou ? 0 : 1);
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));
    const result = [];
    const _pcHdr_ks = showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : [];

    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_ks ? _pcHdr_ks : []),
      { text: '項　　　目', style: 'tableHeader' },
      ...(_pcR_ks ? _pcHdr_ks : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '合　計', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : isShikiOnly ? [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_ks ? _pcHdr_ks : []),
      { text: '項　　　目', style: 'tableHeader' },
      ...(_pcR_ks ? _pcHdr_ks : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_ks ? _pcHdr_ks : []),
      { text: '項　　　目', style: 'tableHeader' },
      ...(_pcR_ks ? _pcHdr_ks : []),
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
        const _pcCell_ks = showProductCode ? [{ text: item.productCode || '', noWrap: true }] : [];
        if (useDairi) {
          rows.push([
            noCell,
            ...(_pcL_ks ? _pcCell_ks : []),
            { text: item.name || '' },
            ...(_pcR_ks ? _pcCell_ks : []),
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
            ...(_pcL_ks ? _pcCell_ks : []),
            { text: item.name || '' },
            ...(_pcR_ks ? _pcCell_ks : []),
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: isShikiOnly ? (dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '') : (item.unitPrice ? fmt(item.unitPrice) : ''), alignment: 'right' },
            { text: isShikiOnly ? fmt(dairiItemAmt(item)) : fmt(item.amount), alignment: 'right' },
            ...(showBikou ? [{ text: item.bikou || '' }] : []),
          ]);
        }
        // 型式と同じ値を除外（物販標準項マスタのfield重複防止）
        const _sl = (item.specLines || []).filter(l => {
          const trimmed = (l || '').trim();
          return trimmed && trimmed !== (item.model || '').trim() && trimmed !== (item.spec || '').trim();
        });
        _sl.forEach(line => {
          const trimmed = line.trim();
          const hasCircle = trimmed.startsWith('〇');
          const displayText = hasCircle ? trimmed.substring(1).trim() : trimmed;
          const margin = hasCircle ? [0, 0, 0, 0] : [8, 0, 0, 0];
          rows.push([{ text: '' }, { text: displayText, fontSize: 7.5, color: '#000', margin: margin }, ...emp(COLS - 2)]);
        });
      });

      // カテゴリあり → 集計行
      CALC_CATEGORY_ORDER.forEach(prefix => {
        const amount = (useDairi || isShikiOnly) ? catDairiTotals[prefix] : catTotals[prefix];
        if (!amount) return;
        const noCell = { text: String(itemNo++), alignment: 'right' };
        if (useDairi) {
          rows.push([
            noCell,
            ...(_pcL_ks ? [{ text: '' }] : []),
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            ...(_pcR_ks ? [{ text: '' }] : []),
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
            ...(_pcL_ks ? [{ text: '' }] : []),
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            ...(_pcR_ks ? [{ text: '' }] : []),
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
        if (showProductCode) er.splice(_pcSplice_ks, 0, { text: '', border: [false, false, false, false] });
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
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (useDairi) {
        // 仕切表示モード: 定価合計 → 合計（仕切合計）→ [出精値引き → 貴社お渡し価格]
        const body = [mkTotalRow('希望小売価格合計', fmt(grandTotal), true)];
        body.push(mkTotalRow('合　　計', fmt(totalDairi), false));
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isDiscountStyle) {
        const adjAmt = discountEnabled ? discount : 0;
        const body = [mkTotalRow('合　　計', fmt(grandTotal), true)];
        if (adjAmt > 0) body.push(mkTotalRow('出精値引き', '▲ ' + fmt(adjAmt), false));
        body.push(mkTotalRow('貴社お渡し価格', fmt(Math.max(0, grandTotal - adjAmt)), false));
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isShikiOnly) {
        const shikiBase = dairiTotal != null ? dairiTotal : totalDairi;
        const shikiAdj = discountEnabled ? adjustAmount : 0;
        const body = [mkTotalRow('合　　計', fmt(shikiBase), true)];
        body.push(mkTotalRow('貴社お渡し価格', fmt(Math.max(0, shikiBase - shikiAdj)), false));
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
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

  function buildBuppanSagyoSummaryDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal, roundingEnabled, showProductCode, productCodePosition = 'right', quoteCategory, useBuppanDeliveryLabel = false, adjustAmount = 0, showBikou = true }) {
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
    const _pcL_bs = showProductCode && productCodePosition === 'left';
    const _pcR_bs = showProductCode && productCodePosition !== 'left';
    const _pcSplice_bs = _pcL_bs ? 1 : 2;
    const _cwRaw = showProductCode
      ? (_pcL_bs
        ? (useDairi ? [20, 58, '*', 22, 44, 52, 58, 52, 58, 44] : [22, 58, '*', 36, 44, 58, 58, 44])
        : (useDairi ? [20, '*', 58, 22, 44, 52, 58, 52, 58, 44] : [22, '*', 58, 36, 44, 58, 58, 44]))
      : (useDairi ? [20, '*', 22, 44, 52, 58, 52, 58, 44] : [22, '*', 36, 44, 58, 58, 44]);
    const COL_WIDTHS = showBikou ? _cwRaw : _cwRaw.slice(0, -1);
    const COLS = (useDairi ? (showProductCode ? 10 : 9) : (showProductCode ? 8 : 7)) - (showBikou ? 0 : 1);
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));
    const result = [];
    const _pcHdr_bs = showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : [];

    const nameHeader = (quoteCategory || '').includes('物販') ? '品　　　名' : '項　　　目';
    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_bs ? _pcHdr_bs : []),
      { text: nameHeader, style: 'tableHeader' },
      ...(_pcR_bs ? _pcHdr_bs : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '合　計', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : isShikiOnly ? [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_bs ? _pcHdr_bs : []),
      { text: nameHeader, style: 'tableHeader' },
      ...(_pcR_bs ? _pcHdr_bs : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_bs ? _pcHdr_bs : []),
      { text: nameHeader, style: 'tableHeader' },
      ...(_pcR_bs ? _pcHdr_bs : []),
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
        const _pcCell_bs = showProductCode ? [{ text: item.productCode || '', noWrap: true }] : [];
        if (useDairi) {
          rows.push([
            noCell,
            ...(_pcL_bs ? _pcCell_bs : []),
            { text: item.name || '' },
            ...(_pcR_bs ? _pcCell_bs : []),
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
            ...(_pcL_bs ? _pcCell_bs : []),
            { text: item.name || '' },
            ...(_pcR_bs ? _pcCell_bs : []),
            { text: item.qty != null && item.qty !== '' ? String(item.qty) : '', alignment: 'right' },
            { text: item.unit || '', alignment: 'center' },
            { text: isShikiOnly ? (dairiItemUnit(item) != null ? fmt(dairiItemUnit(item)) : '') : (item.unitPrice ? fmt(item.unitPrice) : ''), alignment: 'right' },
            { text: isShikiOnly ? fmt(dairiItemAmt(item)) : fmt(item.amount), alignment: 'right' },
            ...(showBikou ? [{ text: item.bikou || '' }] : []),
          ]);
        }
        if (!item.machineSpecHidden) {
          // specMasterContentがある場合は型式行を表示しない（仕様内に含まれるため）
          const _koujiModel = (!item.specMasterContent && item.machineSpec && item.machineSpec.model)
            || (item.specMasterContent ? '' : (item.printModel !== false ? (item.model || item.spec || '') : ''));
          if (_koujiModel) {
            rows.push([{ text: '' }, { text: `　型式　${_koujiModel}`, fontSize: 8 }, ...emp(COLS - 2)]);
          }
          if (item.machineSpec) {
            (item.machineSpec.specs || []).forEach(spec => {
              const label = (spec.label || '').trim();
              const hasCircle = label.startsWith('〇');
              const displayLabel = hasCircle ? label.substring(1).trim() : label;
              const margin = hasCircle ? [0, 0, 0, 0] : [8, 0, 0, 0];
              const text = spec.value ? `${displayLabel}：${spec.value}` : displayLabel;
              rows.push([{ text: '' }, { text: text, fontSize: 7.5, color: '#000', margin: margin }, ...emp(COLS - 2)]);
            });
          }
        }
        // 型式と同じ値を除外（物販標準項マスタのfield重複防止）
        const _sl = (item.specLines || []).filter(l => {
          const trimmed = (l || '').trim();
          return trimmed && trimmed !== (item.model || '').trim() && trimmed !== (item.spec || '').trim();
        });
        _sl.forEach(line => {
          const trimmed = line.trim();
          const hasCircle = trimmed.startsWith('〇');
          const displayText = hasCircle ? trimmed.substring(1).trim() : trimmed;
          const margin = hasCircle ? [0, 0, 0, 0] : [8, 0, 0, 0];
          rows.push([{ text: '' }, { text: displayText, fontSize: 7.5, color: '#000', margin: margin }, ...emp(COLS - 2)]);
        });
      });

      // カテゴリあり → 集計行
      CALC_CATEGORY_ORDER.forEach(prefix => {
        const amount = (useDairi || isShikiOnly) ? catDairiTotals[prefix] : catTotals[prefix];
        if (!amount) return;
        if (useDairi) {
          rows.push([
            { text: '' },
            ...(_pcL_bs ? [{ text: '' }] : []),
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            ...(_pcR_bs ? [{ text: '' }] : []),
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
            ...(_pcL_bs ? [{ text: '' }] : []),
            { text: CALC_CATEGORY_LABELS[prefix].slice(1) },
            ...(_pcR_bs ? [{ text: '' }] : []),
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
        if (showProductCode) er.splice(_pcSplice_bs, 0, { text: ' ', border: [false, tb, false, false] });
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
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isBulk) {
        const bulkBase = Math.max(0, (dairiTotal != null ? dairiTotal : totalDairi) - adjustAmount);
        const isBuppanLocal = (quoteCategory || '').includes('物販');
        const buppanLabel = (isBuppanLocal && useBuppanDeliveryLabel) ? '販売価格合計' : '貴社お渡し価格';
        const body = [mkRow('合　　計', fmt(grandTotal), true)];
        body.push(mkRow(buppanLabel, fmt(bulkBase), false));
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
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
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
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

  function buildKoujiDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal, showSubtotalBoth, roundingEnabled, showProductCode, productCodePosition = 'right', discount = 0, discountEnabled = true, adjustAmount = 0, waribikiAmount = 0, showBikou = true }) {
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
    const _pcL_kd = showProductCode && productCodePosition === 'left';
    const _pcR_kd = showProductCode && productCodePosition !== 'left';
    const _pcSplice_kd = _pcL_kd ? 1 : 2;
    const _cwRaw = showProductCode
      ? (_pcL_kd
        ? (useDairi ? [20, 58, '*', 22, 44, 52, 58, 52, 58, 44] : [22, 58, '*', 36, 44, 58, 58, 44])
        : (useDairi ? [20, '*', 58, 22, 44, 52, 58, 52, 58, 44] : [22, '*', 58, 36, 44, 58, 58, 44]))
      : (useDairi ? [20, '*', 22, 44, 52, 58, 52, 58, 44] : [22, '*', 36, 44, 58, 58, 44]);
    const COL_WIDTHS = showBikou ? _cwRaw : _cwRaw.slice(0, -1);
    const COLS = (useDairi ? (showProductCode ? 10 : 9) : (showProductCode ? 8 : 7)) - (showBikou ? 0 : 1);
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));
    const result = [];
    const _pcHdr_kd = showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : [];

    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_kd ? _pcHdr_kd : []),
      { text: '項　　　目', style: 'tableHeader' },
      ...(_pcR_kd ? _pcHdr_kd : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '合　計', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : isShikiOnly ? [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_kd ? _pcHdr_kd : []),
      { text: '項　　　目', style: 'tableHeader' },
      ...(_pcR_kd ? _pcHdr_kd : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_kd ? _pcHdr_kd : []),
      { text: '項　　　目', style: 'tableHeader' },
      ...(_pcR_kd ? _pcHdr_kd : []),
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
        const _pcCell_kd = showProductCode ? [{ text: item.productCode || '', noWrap: true }] : [];
        if (useDairi) {
          rows.push([
            noCell,
            ...(_pcL_kd ? _pcCell_kd : []),
            { text: item.name || '' },
            ...(_pcR_kd ? _pcCell_kd : []),
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
            ...(_pcL_kd ? _pcCell_kd : []),
            { text: item.name || '' },
            ...(_pcR_kd ? _pcCell_kd : []),
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
            const trimmed = line.trim();
            if (trimmed.startsWith('〇')) {
              // 行頭に〇がある → インデントなし、〇は削除
              const text = trimmed.substring(1).trim();
              rows.push([{ text: '' }, { text: text, fontSize: 7.5, color: '#000', margin: [0, 0, 0, 0] }, ...emp(COLS - 2)]);
            } else {
              // 通常の行 → インデント8pt
              rows.push([{ text: '' }, { text: trimmed, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]);
            }
          });
          // 型式と同じ値を除外（物販標準項マスタのfield重複防止）
          (item.specLines || []).filter(l => {
            const trimmed = (l || '').trim();
            return trimmed && trimmed !== (item.model || '').trim() && trimmed !== (item.spec || '').trim();
          }).forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('〇')) {
              const text = trimmed.substring(1).trim();
              rows.push([{ text: '' }, { text: text, fontSize: 7.5, color: '#000', margin: [0, 0, 0, 0] }, ...emp(COLS - 2)]);
            } else {
              rows.push([{ text: '' }, { text: trimmed, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]);
            }
          });
        } else {
          // 型式と同じ値を除外（物販標準項マスタのfield重複防止）
          const _sl1 = (item.specLines || []).filter(l => {
            const trimmed = (l || '').trim();
            return trimmed && trimmed !== (item.model || '').trim() && trimmed !== (item.spec || '').trim();
          });
          _sl1.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('〇')) {
              const text = trimmed.substring(1).trim();
              rows.push([{ text: '' }, { text: text, fontSize: 7.5, color: '#000', margin: [0, 0, 0, 0] }, ...emp(COLS - 2)]);
            } else {
              rows.push([{ text: '' }, { text: trimmed, fontSize: 7.5, color: '#000', margin: [8, 0, 0, 0] }, ...emp(COLS - 2)]);
            }
          });
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
        if (showProductCode) er.splice(_pcSplice_kd, 0, { text: '', border: [false, false, false, false] });
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
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isBulk) {
        // 一括仕切モード: 合計(定価) → 貴社お渡し価格(仕切合計-調整額)
        const bulkBase = dairiTotal != null ? dairiTotal : grandDairi;
        const adjAmt = discountEnabled ? adjustAmount : 0;
        const body = [mkRow('合　　計', fmt(grandTotal), true)];
        body.push(mkRow('貴社お渡し価格', fmt(Math.max(0, bulkBase - adjAmt)), false));
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
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
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
      } else if (isShikiOnly) {
        const shikiBase = dairiTotal != null ? dairiTotal : grandDairi;
        const shikiAdj = discountEnabled ? adjustAmount : 0;
        const body = [mkRow('合　　計', fmt(shikiBase), true)];
        body.push(mkRow('貴社お渡し価格', fmt(Math.max(0, shikiBase - shikiAdj)), false));
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
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

  function buildBuppanSagyoDetailPages({ sectionTotals, grandTotal, mainRate, pdfPriceMode, dairiTotal, showSubtotalBoth, roundingEnabled, showProductCode, productCodePosition = 'right', quoteCategory, useBuppanDeliveryLabel = false, adjustAmount = 0, showBikou = true }) {
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
    const _pcL_bd = showProductCode && productCodePosition === 'left';
    const _pcR_bd = showProductCode && productCodePosition !== 'left';
    const _pcSplice_bd = _pcL_bd ? 1 : 2;
    const _cwRaw = showProductCode
      ? (_pcL_bd
        ? (useDairi ? [20, 58, '*', 22, 44, 52, 58, 52, 58, 44] : [22, 58, '*', 36, 44, 58, 58, 44])
        : (useDairi ? [20, '*', 58, 22, 44, 52, 58, 52, 58, 44] : [22, '*', 58, 36, 44, 58, 58, 44]))
      : (useDairi ? [20, '*', 22, 44, 52, 58, 52, 58, 44] : [22, '*', 36, 44, 58, 58, 44]);
    const COL_WIDTHS = showBikou ? _cwRaw : _cwRaw.slice(0, -1);
    const COLS = (useDairi ? (showProductCode ? 10 : 9) : (showProductCode ? 8 : 7)) - (showBikou ? 0 : 1);
    const emp = (n) => Array.from({ length: n }, () => ({ text: '' }));
    const result = [];
    const _pcHdr_bd = showProductCode ? [{ text: '品目コード', style: 'tableHeader' }] : [];

    const nameHeader = (quoteCategory || '').includes('物販') ? '品　　　名' : '項　　　目';
    const makeHeaderRow = () => useDairi ? [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_bd ? _pcHdr_bd : []),
      { text: nameHeader, style: 'tableHeader' },
      ...(_pcR_bd ? _pcHdr_bd : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '単　価', style: 'tableHeader' },
      { text: '合　計', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : isShikiOnly ? [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_bd ? _pcHdr_bd : []),
      { text: nameHeader, style: 'tableHeader' },
      ...(_pcR_bd ? _pcHdr_bd : []),
      { text: '数量', style: 'tableHeader' },
      { text: '単位', style: 'tableHeader' },
      { text: '仕切単価', style: 'tableHeader' },
      { text: '仕切合計', style: 'tableHeader' },
      ...(showBikou ? [{ text: '備考', style: 'tableHeader' }] : []),
    ] : [
      { text: 'No.', style: 'tableHeader' },
      ...(_pcL_bd ? _pcHdr_bd : []),
      { text: nameHeader, style: 'tableHeader' },
      ...(_pcR_bd ? _pcHdr_bd : []),
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
        const _pcCell_bd = showProductCode ? [{ text: item.productCode || '', noWrap: true }] : [];
        if (useDairi) {
          rows.push([
            noCell,
            ...(_pcL_bd ? _pcCell_bd : []),
            { text: item.name || '' },
            ...(_pcR_bd ? _pcCell_bd : []),
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
            ...(_pcL_bd ? _pcCell_bd : []),
            { text: item.name || '' },
            ...(_pcR_bd ? _pcCell_bd : []),
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
              const label = (spec.label || '').trim();
              const hasCircle = label.startsWith('〇');
              const displayLabel = hasCircle ? label.substring(1).trim() : label;
              const margin = hasCircle ? [0, 0, 0, 0] : [8, 0, 0, 0];
              const text = spec.value ? `${displayLabel}：${spec.value}` : displayLabel;
              rows.push([{ text: '' }, { text: text, fontSize: 7.5, color: '#000', margin: margin }, ...emp(COLS - 2)]);
            });
          }
        }
        // 型式と同じ値を除外（物販標準項マスタのfield重複防止）
        const _sl2 = (item.specLines || []).filter(l => {
          const trimmed = (l || '').trim();
          return trimmed && trimmed !== (item.model || '').trim() && trimmed !== (item.spec || '').trim();
        });
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
        if (showProductCode) er.splice(_pcSplice_bd, 0, { text: ' ', border: [false, tb, false, false] });
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
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body }, layout: totalLayout });
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
        result.push({ unbreakable: true, margin: [0, 0, 0, 0], table: { widths: COL_WIDTHS, body: body2 }, layout: totalLayout });
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
