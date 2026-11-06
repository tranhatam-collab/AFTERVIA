import type { Locale } from '../i18n/locales.ts';
import type { Interest, Pillar, Theme } from './model.ts';

// Copy for the readiness check. Follows content/specs/spec-readiness.md: a planning aid, not an assessment,
// scores per pillar only (never one grade), no "ready" or "unprepared" verdict, and no claim that a place is safe.
export type ReadinessText = {
  title: string;
  intro: string;
  scoreNote: string;
  planningAid: string;
  themes: Record<Theme, string>;
  questions: Record<string, { prompt: string; options: Record<string, string> }>;
  pillars: Record<Pillar, { name: string; sentence: string; low: string; step: string; module: string }>;
  interest: Record<Interest, string>;
  interestHeading: string;
  interestNote: string;
  interestSystem: string; // contains {label}
  scoresHeading: string;
  scoreLabel: string; // contains {n}
  nextHeading: string;
  noLowNote: string;
  cityHeading: string;
  cityText: string;
  cityLink: string;
  risksTitle: string;
  risks: string[];
  submit: string;
  save: string;
  clear: string;
  incomplete: string; // contains {n}
  saved: string;
  cleared: string;
  noStorage: string;
};

const EN: ReadinessText = {
  title: 'Readiness check',
  intro:
    'This check takes about five minutes and runs on your device. It asks twelve questions about money, health, family, skills and your reasons. Nothing is sent anywhere unless you choose to save.',
  scoreNote: 'You get a score for each of the seven pillars. There is no single pass or fail grade.',
  planningAid:
    'This is a planning aid, not a medical, legal or financial assessment. If someone in your household has a health condition, plan access to care first.',
  themes: { money: 'Money', health: 'Health', family: 'Family', skills: 'Skills', reason: 'Your reasons' },
  questions: {
    q01: {
      prompt: 'If your income stopped, how long could your household cover essential costs?',
      options: { under1: 'Less than one month', m1to3: 'One to three months', m3to6: 'Three to six months', over6: 'More than six months' },
    },
    q02: {
      prompt: 'How many separate sources of income does your household have?',
      options: { none: 'None', one: 'One', two: 'Two', three: 'Three or more' },
    },
    q03: {
      prompt: 'Has anyone in your household learned first aid?',
      options: { no: 'No', heard: 'Heard about it', course: 'Took a course', practice: 'Took a course and practise it' },
    },
    q04: {
      prompt: 'How close is a medical facility to your home?',
      options: { far: 'Far away, or not sure', outside: 'Outside the city', inside: 'Inside the city', walk: 'Within walking distance' },
    },
    q05: {
      prompt: 'Does anyone in your household need extra support in an emergency?',
      options: { none: 'No', kids_elderly: 'Yes: young children or older people', disability_pets: 'Yes: people with disabilities or pets', several: 'Yes: more than one of these' },
    },
    q06: {
      prompt: 'How many people outside your home could you ask for help in an emergency?',
      options: { none: 'No one', one: 'One person', few: 'A few people', many: 'Many people' },
    },
    q07: {
      prompt: 'Do you know your local emergency contacts?',
      options: { no: 'No', some: 'A few places', saved: 'I have saved the numbers', checked: 'Saved, and checked on an official page' },
    },
    q08: {
      prompt: 'Do you have stored water for when the supply stops?',
      options: { no: 'No', little: 'A little', days: 'Enough for a few days', sized: 'Stored and sized for everyone at home' },
    },
    q09: {
      prompt: 'Do you have a backup power source at home?',
      options: { no: 'No', batteries: 'Torches or batteries', charged: 'Charged batteries or a small generator', system: 'A backup system sized for our needs' },
    },
    q10: {
      prompt: 'How much food do you keep at home that needs no shop?',
      options: { no: 'None', few: 'A few items', days: 'Enough for a few days', list: 'A list sized for everyone at home' },
    },
    q11: {
      prompt: 'Have you checked whether your home holds up to storms, flooding and heat?',
      options: { not_yet: 'Not yet', partly: 'Partly', some: 'I have checked some items', full: 'Checked storms, flooding and heat, and planned a backup toilet' },
    },
    q12: {
      prompt: 'What worries you most right now?',
      options: { none: 'No particular worry', power: 'Power cuts', flood: 'Flooding', heat: 'Heat', income: 'Losing income', health: 'Health', other: 'Something else' },
    },
  },
  pillars: {
    water: {
      name: 'Water',
      sentence: 'Clean water you can store and use when the supply stops.',
      low: 'A low score means the household could run short of water within a few days of a supply cut.',
      step: 'Start storing water for the number of days you choose.',
      module: 'The Water module is not built yet.',
    },
    energy: {
      name: 'Energy',
      sentence: 'Power for light, phones, medicine fridges, heating or cooling.',
      low: 'A low score means a power cut would leave the household without light or a way to charge phones.',
      step: 'List what needs power, and find a backup source.',
      module: 'The Power module is not built yet.',
    },
    food: {
      name: 'Food',
      sentence: 'Food you keep at home that needs no shop.',
      low: 'A low score means there would be little to eat at home without going out to buy food.',
      step: 'Start a list of food to keep at home.',
      module: 'The Food module is not built yet.',
    },
    shelter: {
      name: 'Shelter and sanitation',
      sentence: 'How well your home holds up to storms, flooding and heat, and how you handle waste.',
      low: 'A low score means you have not yet checked how your home would hold up, or how you would manage toilets if water stopped.',
      step: 'Check your home against storms, flooding and heat.',
      module: 'The Shelter module is not built yet.',
    },
    health: {
      name: 'Health',
      sentence: 'First aid, the distance to care, and medicines taken regularly.',
      low: 'A low score means help may be far away and nobody at home has practised first aid.',
      step: 'Learn first aid from a recognised source.',
      module: 'The Health and safety module is not built yet.',
    },
    money: {
      name: 'Money',
      sentence: 'How long the household could cover essential costs if income stopped.',
      low: 'A low score means money could run out early in a crisis.',
      step: 'Work out what a year of essential costs really is.',
      module: 'The Decide and fund module is not built yet.',
    },
    community: {
      name: 'Community',
      sentence: 'People outside your home you could ask for help, and the emergency contacts you know.',
      low: 'A low score means you may be on your own in the first days.',
      step: 'Write down who you could ask for help, and save your local emergency numbers.',
      module: 'The Community module is not built yet.',
    },
  },
  interest: { unconcerned: 'Not concerned yet', concerned: 'Concerned', high: 'Especially concerned' },
  interestHeading: 'Your interest label',
  interestNote: 'This label is for your own tracking. It is not used for marketing, and you can change it at any time.',
  interestSystem: 'The check suggested: {label}.',
  scoresHeading: 'Your score for each pillar',
  scoreLabel: 'Score {n} out of 100',
  nextHeading: 'Your next steps',
  noLowNote: 'No pillar is low enough to need a next step right now. You can still read each pillar above.',
  cityHeading: 'You can stay in the city first',
  cityText:
    'Emergency guidance for flooding and heat is already available. Start there while the other modules are being built.',
  cityLink: 'Open emergency guidance',
  risksTitle: 'What usually goes wrong',
  risks: [
    'Money running out in the first year.',
    'Health care being far away.',
    'Isolation, and skills that take time to learn.',
    'Living in the countryside is not automatically safer than living in the city.',
  ],
  submit: 'See my scores',
  save: 'Save on this device',
  clear: 'Delete saved answers',
  incomplete: 'Please answer all twelve questions. {n} still missing.',
  saved: 'Saved on this device. Nothing was sent anywhere.',
  cleared: 'Saved answers were deleted from this device.',
  noStorage: 'This browser cannot save on the device. Your answers stay on this page only.',
};

const VI: ReadinessText = {
  title: 'Đo độ sẵn sàng',
  intro:
    'Bài đo này mất khoảng năm phút và chạy trên thiết bị của bạn. Có 12 câu về tiền bạc, sức khỏe, gia đình, kỹ năng và lý do của bạn. Không có gì được gửi đi đâu, trừ khi bạn chọn lưu.',
  scoreNote: 'Bạn nhận điểm cho từng trụ cột trong số bảy trụ cột. Không có điểm tổng đạt hay không đạt.',
  planningAid:
    'Đây là công cụ lập kế hoạch, không phải đánh giá y tế, pháp lý hay tài chính. Nếu có người trong nhà có bệnh nền, hãy lập kế hoạch tiếp cận cơ sở y tế trước.',
  themes: { money: 'Tài chính', health: 'Sức khỏe', family: 'Gia đình', skills: 'Kỹ năng', reason: 'Lý do của bạn' },
  questions: {
    q01: {
      prompt: 'Nếu thu nhập dừng lại, gia đình bạn có thể trang trải chi tiêu thiết yếu trong bao lâu?',
      options: { under1: 'Dưới một tháng', m1to3: 'Một đến ba tháng', m3to6: 'Ba đến sáu tháng', over6: 'Trên sáu tháng' },
    },
    q02: {
      prompt: 'Gia đình bạn có bao nhiêu nguồn thu nhập riêng biệt?',
      options: { none: 'Không có', one: 'Một', two: 'Hai', three: 'Ba trở lên' },
    },
    q03: {
      prompt: 'Có ai trong nhà đã học sơ cứu chưa?',
      options: { no: 'Chưa', heard: 'Đã nghe qua', course: 'Đã học một khóa', practice: 'Đã học và thường xuyên thực hành' },
    },
    q04: {
      prompt: 'Cơ sở y tế gần nhà bạn đến mức nào?',
      options: { far: 'Xa, hoặc chưa rõ', outside: 'Ngoài thành phố', inside: 'Trong thành phố', walk: 'Đi bộ được' },
    },
    q05: {
      prompt: 'Có ai trong nhà cần hỗ trợ thêm khi khẩn cấp không?',
      options: { none: 'Không', kids_elderly: 'Có: trẻ nhỏ hoặc người cao tuổi', disability_pets: 'Có: người khuyết tật hoặc thú cưng', several: 'Có: nhiều hơn một nhóm trên' },
    },
    q06: {
      prompt: 'Có bao nhiêu người ngoài nhà bạn có thể nhờ giúp khi khẩn cấp?',
      options: { none: 'Không ai', one: 'Một người', few: 'Vài người', many: 'Nhiều người' },
    },
    q07: {
      prompt: 'Bạn có biết số khẩn cấp ở địa phương không?',
      options: { no: 'Chưa biết', some: 'Biết vài nơi', saved: 'Đã lưu số', checked: 'Đã lưu và kiểm tra trên trang chính thức' },
    },
    q08: {
      prompt: 'Nhà bạn có nước dự trữ để dùng khi nguồn cấp dừng không?',
      options: { no: 'Chưa có', little: 'Có ít', days: 'Đủ dùng vài ngày', sized: 'Có và đã tính theo số người trong nhà' },
    },
    q09: {
      prompt: 'Nhà bạn có nguồn điện dự phòng không?',
      options: { no: 'Không có', batteries: 'Đèn hoặc pin', charged: 'Pin sạc hoặc máy phát nhỏ', system: 'Hệ dự phòng đã tính theo nhu cầu nhà' },
    },
    q10: {
      prompt: 'Nhà bạn để sẵn bao nhiêu thực phẩm không cần ra cửa hàng?',
      options: { no: 'Không có', few: 'Vài món', days: 'Đủ vài ngày', list: 'Có danh mục tính theo số người trong nhà' },
    },
    q11: {
      prompt: 'Bạn đã kiểm tra nhà chịu được bão, ngập và nóng đến đâu chưa?',
      options: { not_yet: 'Chưa kiểm tra', partly: 'Biết một phần', some: 'Đã kiểm tra một số hạng mục', full: 'Đã kiểm tra bão, ngập, nóng và có phương án nhà vệ sinh dự phòng' },
    },
    q12: {
      prompt: 'Hiện giờ điều gì khiến bạn lo nhất?',
      options: { none: 'Chưa lo điều gì cụ thể', power: 'Mất điện', flood: 'Ngập lụt', heat: 'Nắng nóng', income: 'Mất thu nhập', health: 'Sức khỏe', other: 'Điều khác' },
    },
  },
  pillars: {
    water: {
      name: 'Nước',
      sentence: 'Nước sạch bạn có thể trữ và dùng khi nguồn cấp dừng.',
      low: 'Điểm thấp nghĩa là gia đình có thể thiếu nước chỉ sau vài ngày khi nguồn cấp bị cắt.',
      step: 'Bắt đầu trữ nước cho số ngày bạn chọn.',
      module: 'Module Nước Lành chưa được xây dựng.',
    },
    energy: {
      name: 'Năng lượng',
      sentence: 'Điện cho đèn, điện thoại, tủ lạnh thuốc, sưởi hoặc làm mát.',
      low: 'Điểm thấp nghĩa là khi mất điện, nhà sẽ không có đèn hoặc cách sạc điện thoại.',
      step: 'Liệt kê những thứ cần điện và tìm nguồn dự phòng.',
      module: 'Module Điện Lành chưa được xây dựng.',
    },
    food: {
      name: 'Lương thực',
      sentence: 'Thực phẩm bạn để sẵn ở nhà, không cần ra cửa hàng.',
      low: 'Điểm thấp nghĩa là ở nhà sẽ có ít thức ăn nếu không ra ngoài mua.',
      step: 'Bắt đầu danh sách thực phẩm để sẵn ở nhà.',
      module: 'Module Vườn Lành chưa được xây dựng.',
    },
    shelter: {
      name: 'Nhà ở và vệ sinh',
      sentence: 'Nhà bạn chịu được bão, ngập và nóng đến mức nào, và bạn xử lý chất thải ra sao.',
      low: 'Điểm thấp nghĩa là bạn chưa kiểm tra nhà sẽ chịu được gì, hoặc chưa có cách dùng nhà vệ sinh khi thiếu nước.',
      step: 'Kiểm tra nhà với bão, ngập và nóng.',
      module: 'Module Nhà Lành chưa được xây dựng.',
    },
    health: {
      name: 'Sức khỏe',
      sentence: 'Sơ cứu, khoảng cách tới cơ sở y tế và thuốc dùng thường xuyên.',
      low: 'Điểm thấp nghĩa là trợ giúp có thể ở xa và trong nhà chưa ai thực hành sơ cứu.',
      step: 'Học sơ cứu từ nguồn được công nhận.',
      module: 'Module Thân Lành chưa được xây dựng.',
    },
    money: {
      name: 'Tài chính',
      sentence: 'Gia đình có thể trang trải chi tiêu thiết yếu trong bao lâu nếu mất thu nhập.',
      low: 'Điểm thấp nghĩa là tiền có thể cạn sớm khi có khủng hoảng.',
      step: 'Tính chi phí thiết yếu thật trong một năm.',
      module: 'Module Vốn Lành chưa được xây dựng.',
    },
    community: {
      name: 'Cộng đồng',
      sentence: 'Những người ngoài nhà bạn có thể nhờ giúp, và số khẩn cấp bạn biết.',
      low: 'Điểm thấp nghĩa là trong những ngày đầu bạn có thể phải tự xoay xở.',
      step: 'Ghi những người bạn có thể nhờ giúp và lưu số khẩn cấp ở địa phương.',
      module: 'Module Làng Lành chưa được xây dựng.',
    },
  },
  interest: { unconcerned: 'Chưa quan tâm', concerned: 'Quan tâm', high: 'Đặc biệt quan tâm' },
  interestHeading: 'Nhãn quan tâm của bạn',
  interestNote: 'Nhãn này để bạn tự theo dõi. Không dùng cho quảng cáo, và bạn có thể đổi bất cứ lúc nào.',
  interestSystem: 'Bài đo gợi ý: {label}.',
  scoresHeading: 'Điểm theo từng trụ cột',
  scoreLabel: 'Điểm {n} trên 100',
  nextHeading: 'Bước tiếp theo của bạn',
  noLowNote: 'Hiện không có trụ cột nào thấp đến mức cần một bước tiếp theo. Bạn vẫn có thể xem từng trụ cột ở trên.',
  cityHeading: 'Bạn có thể ở lại thành phố trước',
  cityText:
    'Hướng dẫn khẩn cấp cho lũ lụt và nắng nóng đã có sẵn. Bắt đầu từ đó trong khi các module khác đang được xây dựng.',
  cityLink: 'Mở hướng dẫn khẩn cấp',
  risksTitle: 'Điều thường xảy ra sai',
  risks: [
    'Tiền cạn trong năm đầu.',
    'Cơ sở y tế ở xa.',
    'Cô lập, và kỹ năng cần thời gian để học.',
    'Sống ở nông thôn không tự động an toàn hơn sống trong thành phố.',
  ],
  submit: 'Xem điểm của tôi',
  save: 'Lưu trên thiết bị này',
  clear: 'Xóa câu trả lời đã lưu',
  incomplete: 'Hãy trả lời đủ 12 câu. Còn thiếu {n} câu.',
  saved: 'Đã lưu trên thiết bị này. Không có gì được gửi đi.',
  cleared: 'Đã xóa câu trả lời đã lưu trên thiết bị này.',
  noStorage: 'Trình duyệt này không lưu được trên thiết bị. Câu trả lời chỉ nằm trên trang này.',
};

export const READINESS: Record<Locale, ReadinessText> = { en: EN, vi: VI };
