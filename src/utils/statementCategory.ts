/**
 * Gợi ý danh mục cho dòng sao kê ngân hàng. Chỉ so khớp theo từ/cụm từ trọn vẹn (không khớp chuỗi con),
 * và chỉ dùng cụm đủ rõ nghĩa khi bỏ dấu. Không khớp gì thì là "khac".
 */

/** Cụm không dấu. Thứ tự danh mục quyết định khi hai cụm ngang điểm. */
const PHRASES: Record<string, string> = {
  an_uong:
    'an sang|an trua|an toi|an dem|an vat|an uong|an com|an pho|com|com tam|com trua|com toi|com ga|com van phong|quan com|' +
    'pho bo|pho ga|to pho|bun bo|bun cha|bun rieu|bun dau|banh mi|banh|tra sua|tra da|ca phe|cafe|coffee|highlands|' +
    'starbucks|phuc long|nha hang|quan an|do an|an lau|lau nuong|buffet|kfc|lotteria|jollibee|mcdonald|pizza|' +
    'grabfood|grab food|shopeefood|shopee food|befood|be food|baemin|sieu thi|winmart|coopmart|co op mart|' +
    'bach hoa xanh|circle k|gs25|rau sach',
  di_chuyen:
    'do xang|tien xang|xang|xang xe|xang dau|petrolimex|grab|gojek|be bike|be car|taxi|xanh sm|vinasun|mai linh|' +
    'gui xe|giu xe|bai xe|rua xe|sua xe|thay nhot|ve xe|xe buyt|ve may bay|may bay|vietjet|vietnam airlines|' +
    'bamboo airways|ve tau|vetc|epass|phi cau duong|phi duong bo|banh xe|lop xe|bao hiem xe|di chuyen',
  mua_sam:
    'shopee|lazada|tiki|tiktok shop|sendo|quan ao|ao thun|ao khoac|ao so mi|mua ao|mua quan|giay dep|mua giay|' +
    'my pham|son moi|tui xach|dong ho|tai nghe|ban phim|mua dien thoai|laptop|may tinh|noi that|do gia dung|' +
    'dien may xanh|the gioi di dong|uniqlo|zara|mua sam|do choi|qua tang',
  hoa_don:
    'tien dien|dien luc|hoa don dien|tt dien|thanh toan dien|evn|evnhcm|evnhcmc|evnspc|evnhanoi|evnhn|evnnpc|evncpc|' +
    'tien nuoc|hoa don nuoc|cap nuoc|sawaco|internet|wifi|tien mang|cuoc mang|cuoc dien thoai|cuoc di dong|' +
    'nap dien thoai|nap tien dien thoai|fpt telecom|viettel telecom|cuoc viettel|vnpt|mobifone|vinaphone|' +
    'truyen hinh cap|tien nha|thue nha|thue phong|tien tro|tien phong tro|phi chung cu|phi quan ly|tien rac|' +
    'netflix|spotify|youtube premium|icloud|google one|tra gop|phi thuong nien|phi sms|bao hiem',
  suc_khoe:
    'nha thuoc|hieu thuoc|mua thuoc|tien thuoc|long chau|pharmacity|kham benh|kham rang|kham suc khoe|benh vien|' +
    'phong kham|nha khoa|vien phi|gym|yoga|vitamin|bao hiem y te|bhyt',
  giai_tri:
    'xem phim|ve xem phim|ve phim|phim|cgv|lotte cinema|galaxy cinema|bhd star|karaoke|game|nap game|steam|' +
    'du lich|bida|billiards|concert',
  giao_duc:
    'hoc phi|khoa hoc|hoc them|tien hoc|mua sach|nha sach|fahasa|giao trinh|van phong pham|ielts|toeic|' +
    'tieng anh|anh ngu',
};

/** Từ đơn dễ nhầm khi bỏ dấu (vd "phở"/"phố"): chỉ khớp khi ghi chú viết đúng dấu */
const ACCENTED: Record<string, string> = {
  an_uong: 'ăn|uống|cơm|phở|bún|bánh|nhậu|lẩu',
  di_chuyen: 'xăng',
  mua_sam: 'áo|quần|giày|dép',
  hoa_don: 'điện',
  suc_khoe: 'thuốc|khám',
  giai_tri: '',
  giao_duc: 'sách|học',
};

/** Cụm quá chung: chỉ dùng khi không còn dấu hiệu nào cụ thể hơn (vd "hoa don tiki" là mua sắm) */
const GENERIC: Record<string, string> = { hoa_don: 'hoa don' };

/** Cụm chỉ cách trả tiền, không nói lên nội dung chi */
const TRANSFER_PHRASES = /(?<= )(chuyen tien|chuyen khoan|ck|ngan hang)(?= )/g;

const toWords = (text: string) => ` ${text.replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;

export function suggestStatementCategory(note: string): string {
  const lower = note
    .normalize('NFC')
    .toLowerCase()
    // "Hóa đơn điện tử" là chứng từ, không phải tiền điện
    .replace(/(hóa đơn|hoá đơn|hoa don) (điện tử|dien tu)/g, '$1')
    // "shopee.com" không phải "cơm"
    .replace(/\.(com|vn|net)\b/g, ' ')
    // Mã giao dịch hay dính liền sau chữ, vd "EVN0123456"
    .replace(/(\p{L})(\d{4,})/gu, '$1 $2');
  const accented = toWords(lower);
  const plain = toWords(lower.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd')).replace(
    TRANSFER_PHRASES,
    '|'
  );

  let best = 'khac';
  let bestScore = 0;
  const consider = (categoryId: string, list: string, haystack: string) => {
    for (const phrase of list.split('|')) {
      if (!phrase || !haystack.includes(` ${phrase} `)) continue;
      // Cụm nhiều từ rõ nghĩa hơn; cùng số từ thì cụm dài hơn
      const score = phrase.split(' ').length * 100 + phrase.length;
      if (score > bestScore) {
        best = categoryId;
        bestScore = score;
      }
    }
  };

  for (const [categoryId, list] of Object.entries(PHRASES)) consider(categoryId, list, plain);
  for (const [categoryId, list] of Object.entries(ACCENTED)) consider(categoryId, list, accented);
  if (bestScore === 0) {
    for (const [categoryId, list] of Object.entries(GENERIC)) consider(categoryId, list, plain);
  }
  return best;
}
