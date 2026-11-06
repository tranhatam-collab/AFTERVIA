import type { Locale } from './locales.ts';

export type LandingRow = { name: string; text: string };

// Copy for the landing page. Public wording only: no internal ids, and no claim the product cannot keep yet.
export type Landing = {
  statusTitle: string;
  statusBody: string;
  positioning: string;
  startTitle: string;
  modeStatus: string;
  startBody: string;
  pillarsTitle: string;
  pillarsIntro: string;
  pillars: readonly LandingRow[];
  pathTitle: string;
  pathIntro: string;
  path: readonly LandingRow[];
  dontTitle: string;
  dont: readonly string[];
  signupTitle: string;
  signupBody: string;
  footerNotice: string;
};

export type Messages = {
  languageName: string;
  otherLanguageLabel: string;
  skipToContent: string;
  homeHelpLink: string;
  helpTitle: string;
  helpLead: string;
  helpCountriesTitle: string;
  helpNumbers: string;
  helpNumber: string;
  helpService: string;
  helpServiceGeneral: string;
  helpServicePolice: string;
  helpServiceFire: string;
  helpServiceAmbulance: string;
  helpServiceDisaster: string;
  helpServicePoison: string;
  helpAuthorities: string;
  helpRoleDisaster: string;
  helpRoleWeather: string;
  helpRoleRedCross: string;
  helpRoleHealth: string;
  helpRoleOther: string;
  helpSourceLabel: string;
  helpCheckedOn: string;
  helpStateCurrent: string;
  helpStateStale: string;
  helpStateUnknown: string;
  helpStaleNotice: string;
  helpFooter: string;
  helpBackHome: string;
  helpPackChecked: string;
  homeEmergencyLink: string;
  emergencyTitle: string;
  emergencyLead: string;
  emergencyCardsTitle: string;
  emergencyHelpTitle: string;
  emergencyNoRescue: string;
  emergencyUpdated: string;
  emergencyNetChecking: string;
  emergencyNetOnline: string;
  emergencyNetOffline: string;
  emergencyFirstAction: string;
  emergencyAvoid: string;
  emergencySteps: string;
  emergencyLimits: string;
  emergencySources: string;
  emergencyBackEmergency: string;
  emergencyNoVerifiedNumbers: string;
  emergencyOpenDirectory: string;
  emergencyCallNumber: string;
};

const en: Messages = {
  languageName: 'English',
  otherLanguageLabel: 'Tiếng Việt',
  skipToContent: 'Skip to content',
  homeHelpLink: 'Contacts by country, with sources and check dates',
  helpTitle: 'Who can help me',
  helpLead: 'Contacts by country. Each entry shows its source and the date it was last checked.',
  helpCountriesTitle: 'Choose a country',
  helpNumbers: 'Emergency numbers',
  helpNumber: 'Number',
  helpService: 'Service',
  helpServiceGeneral: 'General emergency',
  helpServicePolice: 'Police',
  helpServiceFire: 'Fire and rescue',
  helpServiceAmbulance: 'Ambulance',
  helpServiceDisaster: 'Disaster',
  helpServicePoison: 'Poison information',
  helpAuthorities: 'Contacts',
  helpRoleDisaster: 'Disaster agency',
  helpRoleWeather: 'Weather service',
  helpRoleRedCross: 'Red Cross or Red Crescent',
  helpRoleHealth: 'Health ministry',
  helpRoleOther: 'Government or other',
  helpSourceLabel: 'Source',
  helpCheckedOn: 'Checked on',
  helpStateCurrent: 'Checked',
  helpStateStale: 'Needs re-check',
  helpStateUnknown: 'Check date unknown',
  helpStaleNotice: 'Not checked for more than 92 days. Check the official page before you rely on it.',
  helpFooter:
    'This page only lists contacts. It does not send rescue requests, and it does not say whether any place is safe or has room.',
  helpBackHome: 'Back to home',
  helpPackChecked: 'This country page was last checked on',
  homeEmergencyLink: 'Emergency guidance: what to do first',
  emergencyTitle: 'Emergency guidance',
  emergencyLead: 'Pick your situation. Each guide starts with the first thing to do, then what to avoid.',
  emergencyCardsTitle: 'Situations',
  emergencyHelpTitle: 'Who to contact',
  emergencyNoRescue:
    'Groundstead does not send rescue requests. To ask for help, call your local emergency number from your phone.',
  emergencyUpdated: 'Content last updated',
  emergencyNetChecking: 'Checking your connection…',
  emergencyNetOnline: 'Your browser reports a connection. That does not prove that any service is reachable.',
  emergencyNetOffline: 'Your browser reports no connection. The information here may be out of date.',
  emergencyFirstAction: 'First action',
  emergencyAvoid: 'Avoid',
  emergencySteps: 'Steps',
  emergencyLimits: 'About this guide',
  emergencySources: 'Sources',
  emergencyBackEmergency: 'Back to emergency guidance',
  emergencyNoVerifiedNumbers: 'No emergency number has been checked against an official source yet.',
  emergencyOpenDirectory: 'Open the contact list for this country',
  emergencyCallNumber: 'Call',
};

const vi: Messages = {
  languageName: 'Tiếng Việt',
  otherLanguageLabel: 'English',
  skipToContent: 'Bỏ qua để tới nội dung',
  homeHelpLink: 'Danh bạ theo quốc gia, có nguồn và ngày kiểm',
  helpTitle: 'Ai giúp tôi',
  helpLead: 'Danh bạ theo quốc gia. Mỗi mục ghi nguồn và ngày kiểm gần nhất.',
  helpCountriesTitle: 'Chọn quốc gia',
  helpNumbers: 'Số khẩn cấp',
  helpNumber: 'Số',
  helpService: 'Dịch vụ',
  helpServiceGeneral: 'Khẩn cấp chung',
  helpServicePolice: 'Công an',
  helpServiceFire: 'Cứu hỏa, cứu nạn',
  helpServiceAmbulance: 'Cấp cứu',
  helpServiceDisaster: 'Thiên tai',
  helpServicePoison: 'Tư vấn ngộ độc',
  helpAuthorities: 'Nơi liên hệ',
  helpRoleDisaster: 'Cơ quan phòng chống thiên tai',
  helpRoleWeather: 'Cơ quan khí tượng',
  helpRoleRedCross: 'Hội Chữ thập đỏ hoặc Trăng lưỡi liềm đỏ',
  helpRoleHealth: 'Bộ Y tế',
  helpRoleOther: 'Chính phủ hoặc khác',
  helpSourceLabel: 'Nguồn',
  helpCheckedOn: 'Ngày kiểm',
  helpStateCurrent: 'Đã kiểm',
  helpStateStale: 'Cần kiểm lại',
  helpStateUnknown: 'Chưa rõ ngày kiểm',
  helpStaleNotice: 'Chưa được kiểm lại quá 92 ngày. Hãy kiểm trên trang chính thức trước khi dựa vào thông tin này.',
  helpFooter:
    'Trang này chỉ liệt kê nơi liên hệ. Nó không gửi yêu cầu cứu hộ, và không cho biết nơi nào đang an toàn hay còn chỗ.',
  helpBackHome: 'Về trang chủ',
  helpPackChecked: 'Trang quốc gia này được kiểm gần nhất vào',
  homeEmergencyLink: 'Hướng dẫn khẩn cấp: việc đầu tiên cần làm',
  emergencyTitle: 'Hướng dẫn khẩn cấp',
  emergencyLead: 'Chọn tình huống của bạn. Mỗi hướng dẫn bắt đầu bằng việc đầu tiên cần làm, rồi đến những việc cần tránh.',
  emergencyCardsTitle: 'Tình huống',
  emergencyHelpTitle: 'Liên hệ ai',
  emergencyNoRescue:
    'Groundstead không gửi yêu cầu cứu hộ. Để xin trợ giúp, hãy gọi số khẩn cấp tại nơi bạn ở bằng điện thoại của bạn.',
  emergencyUpdated: 'Nội dung cập nhật lần cuối',
  emergencyNetChecking: 'Đang kiểm tra kết nối…',
  emergencyNetOnline: 'Trình duyệt báo đang có kết nối. Điều này không chứng minh rằng dịch vụ nào đó truy cập được.',
  emergencyNetOffline: 'Trình duyệt báo không có kết nối. Thông tin ở đây có thể đã cũ.',
  emergencyFirstAction: 'Việc đầu tiên cần làm',
  emergencyAvoid: 'Cần tránh',
  emergencySteps: 'Các bước',
  emergencyLimits: 'Về hướng dẫn này',
  emergencySources: 'Nguồn',
  emergencyBackEmergency: 'Về trang hướng dẫn khẩn cấp',
  emergencyNoVerifiedNumbers: 'Chưa có số khẩn cấp nào được đối chiếu với nguồn chính thức.',
  emergencyOpenDirectory: 'Mở danh bạ của quốc gia này',
  emergencyCallNumber: 'Gọi',
};

export const MESSAGES: Record<Locale, Messages> = { en, vi };

const landingEn: Landing = {
  statusTitle: 'Preview, not a finished product',
  statusBody:
    'The guidance here is drafted by AI and has not been reviewed by people yet. In an emergency, follow your local authorities and call your local emergency number.',
  positioning:
    'Groundstead is building a way for city residents to get ready for emergencies and, if they choose, a step-by-step path to self-reliant, sustainable living on good land. Each guide shows its sources and its review status.',
  startTitle: 'Start here: 72-Hour City Mode',
  modeStatus: 'Being built',
  startBody:
    'This is the first mode we are building for city households. What is here now: emergency guidance for two situations, flood and heat, each with its sources and review label. Both guides are summaries of US National Weather Service guidance and may include details that apply only in the United States. Contact lists cover Vietnam and the United States. No Vietnamese emergency number has been checked yet, and the United States list has only 911 so far. Not here yet: use without a network connection, the family plan, the supply cabinet, and local alerts.',
  pillarsTitle: 'Seven pillars to track',
  pillarsIntro:
    'Planned: each pillar will be followed through one or more numbers that you track yourself. The tracker is not built yet. Targets are goals, not guarantees.',
  pillars: [
    { name: 'Water', text: 'Days of clean water if the supply stops. Goal: 30 days; at least 3 days for 72-hour mode.' },
    { name: 'Energy', text: 'Hours of backup power when the grid fails, and the share of your electricity you make yourself.' },
    { name: 'Food', text: 'Days of food kept at home (goal: 14 days), and the share of calories you grow yourself.' },
    { name: 'Shelter and sanitation', text: 'How well your home holds up to storms, flooding and heat, and how you handle waste.' },
    { name: 'Health', text: 'Whether you have learned first aid, how far you live from medical care, and your plan for the medicines you take.' },
    { name: 'Money', text: 'Months of emergency spending you can cover, and how many sources of income you have.' },
    { name: 'Community', text: 'How many people are in your support circle, and whether you know your local emergency contacts.' },
  ],
  pathTitle: 'The path from city to good land',
  pathIntro:
    'Eight steps after the readiness check. Each step will come with a guide, a checklist and a calculator. None of them is finished yet.',
  path: [
    { name: 'Readiness check', text: '12 questions on money, health, family, skills and motives, with a score on the seven pillars.' },
    { name: 'Decide and fund', text: 'A 12-month fund, the real costs of the first year, and the common reasons plans fail: health, isolation and money.' },
    { name: 'Choose land', text: 'Climate, water, soil, flood and landslide risk, distance to medical care, and questions about land rights.' },
    { name: 'Water', text: 'Rainwater, wells, filtering, storage and wastewater, sized for your household.' },
    { name: 'Power', text: 'Load, solar and battery sizing, backup power and electrical safety.' },
    { name: 'Food', text: 'Growing by climate zone, small livestock, food storage and a 12-month calorie plan.' },
    { name: 'Shelter', text: 'Making homes more resilient to storms, flooding and heat, with sanitation and waste handling.' },
    { name: 'Health and safety', text: 'First aid from recognised sources only, a family health plan, and no dosing advice.' },
    { name: 'Community', text: 'Neighbours, skill exchange and a support circle of 10 households.' },
  ],
  dontTitle: 'What we will not do',
  dont: [
    'We will not promise absolute safety, say that rural life is always safer, or claim that AI can predict earthquakes.',
    'We will not lock life-saving information behind a paywall or a shop screen.',
    'We will not publish medical advice beyond standard first aid, weapons content, or ways around the law.',
    'We will not label anything "reviewed", "verified" or "72-hour ready" without the evidence for that label.',
    'We will not keep a warehouse. When supplier links come, every page will name the supplier and disclose any commission.',
    'We will not promise services delivered by people before there are people ready to deliver them.',
  ],
  signupTitle: 'Early sign-up',
  signupBody:
    'Early sign-up is closed. It opens only after the privacy policy is signed off and published. This page has no sign-up form.',
  footerNotice:
    'This site is not a medical, legal or emergency service. It does not tell you whether a place is safe or has room. In danger, call your local emergency number.',
};

const landingVi: Landing = {
  statusTitle: 'Bản xem trước, chưa phải sản phẩm hoàn chỉnh',
  statusBody:
    'Hướng dẫn ở đây do AI soạn nháp và chưa có người duyệt. Khi khẩn cấp, hãy làm theo chính quyền địa phương và gọi số khẩn cấp tại nơi bạn ở.',
  positioning:
    'Groundstead đang xây dựng cách để cư dân đô thị chuẩn bị cho khẩn cấp và, nếu muốn, một lộ trình từng bước để sống tự chủ, bền vững trên đất lành. Mỗi hướng dẫn ghi rõ nguồn và trạng thái duyệt.',
  startTitle: 'Bắt đầu từ đây: Chế độ 72 giờ đô thị',
  modeStatus: 'Đang xây dựng',
  startBody:
    'Đây là chế độ đầu tiên chúng tôi xây cho hộ gia đình đô thị. Hiện có: hướng dẫn khẩn cấp cho hai tình huống, lũ lụt và nắng nóng, mỗi mục có nguồn và nhãn duyệt. Cả hai hướng dẫn là bản tóm tắt từ hướng dẫn của Dịch vụ Thời tiết Quốc gia Hoa Kỳ (NWS) và có thể có chi tiết chỉ áp dụng ở Hoa Kỳ. Danh bạ liên hệ cho Việt Nam và Hoa Kỳ. Chưa có số khẩn cấp nào của Việt Nam được đối chiếu với nguồn chính thức; danh bạ Hoa Kỳ hiện chỉ có số 911. Chưa có: dùng khi không có mạng, kế hoạch gia đình, tủ vật dụng và cảnh báo địa phương.',
  pillarsTitle: 'Bảy trụ cột để tự theo dõi',
  pillarsIntro:
    'Dự kiến: mỗi trụ cột sẽ gồm một hoặc nhiều chỉ số bạn tự theo dõi. Công cụ theo dõi chưa được xây dựng. Các mục tiêu là đích đặt ra, không phải lời đảm bảo.',
  pillars: [
    { name: 'Nước', text: 'Số ngày có nước sạch khi mất nguồn cấp. Mục tiêu: 30 ngày; tối thiểu 3 ngày cho Chế độ 72 giờ.' },
    { name: 'Năng lượng', text: 'Số giờ dự phòng khi mất lưới điện, và tỷ lệ điện bạn tự sản xuất.' },
    { name: 'Lương thực', text: 'Số ngày dự trữ lương thực tại nhà (mục tiêu 14 ngày), và tỷ lệ calo bạn tự trồng.' },
    { name: 'Nhà ở và vệ sinh', text: 'Nhà bạn chịu được bão, ngập và nóng đến mức nào, và cách xử lý chất thải.' },
    { name: 'Sức khỏe', text: 'Đã học sơ cứu chưa, cơ sở y tế cách bạn bao xa, và kế hoạch cho thuốc đang dùng.' },
    { name: 'Tài chính', text: 'Số tháng chi tiêu dự phòng bạn có thể chi trả, và số nguồn thu nhập.' },
    { name: 'Cộng đồng', text: 'Số người trong vòng hỗ trợ của bạn, và bạn có biết đầu mối liên hệ khẩn cấp ở địa phương không.' },
  ],
  pathTitle: 'Lộ trình từ phố về đất lành',
  pathIntro:
    'Tám bước sau bước đo độ sẵn sàng. Mỗi bước sẽ có hướng dẫn, danh mục kiểm tra và công cụ tính riêng. Chưa bước nào hoàn thành.',
  path: [
    { name: 'Đo độ sẵn sàng', text: 'Gồm 12 câu về tiền bạc, sức khỏe, gia đình, kỹ năng và lý do, kèm điểm trên bảy trụ cột.' },
    { name: 'Vốn Lành', text: 'Quỹ 12 tháng, chi phí thật của năm đầu, và các lý do kế hoạch thường thất bại: sức khỏe, cô lập và thiếu tiền.' },
    { name: 'Chọn vùng và đất', text: 'Khí hậu, nước, đất, nguy cơ ngập và sạt lở, khoảng cách tới cơ sở y tế, và câu hỏi về quyền sử dụng đất.' },
    { name: 'Nước Lành', text: 'Nước mưa, giếng, lọc, trữ và nước thải, tính theo số người trong hộ.' },
    { name: 'Điện Lành', text: 'Tính tải, cỡ pin và tấm pin, nguồn dự phòng và an toàn điện.' },
    { name: 'Vườn Lành', text: 'Trồng theo vùng khí hậu, chăn nuôi nhỏ, bảo quản thực phẩm và kế hoạch calo 12 tháng.' },
    { name: 'Nhà Lành', text: 'Làm nhà bền hơn trước bão, ngập và nóng, kèm vệ sinh và xử lý chất thải.' },
    { name: 'Thân Lành', text: 'Sơ cứu chỉ từ nguồn được công nhận, kế hoạch y tế cho gia đình, và không đưa ra liều thuốc.' },
    { name: 'Làng Lành', text: 'Hàng xóm, trao đổi kỹ năng và vòng hỗ trợ 10 hộ.' },
  ],
  dontTitle: 'Điều chúng tôi không làm',
  dont: [
    'Chúng tôi không hứa an toàn tuyệt đối, không nói nông thôn luôn an toàn hơn, và không quảng cáo AI dự đoán động đất.',
    'Chúng tôi không khóa thông tin cứu sinh sau tường phí hoặc màn hình mua hàng.',
    'Chúng tôi không xuất bản nội dung y tế vượt sơ cứu chuẩn, nội dung vũ khí, hay cách lách luật.',
    'Chúng tôi không gắn nhãn "đã duyệt", "đã kiểm chứng" hay "đủ 72 giờ" khi chưa có bằng chứng cho nhãn đó.',
    'Chúng tôi không có kho hàng. Khi có liên kết nhà cung cấp, mọi trang sẽ ghi rõ nhà cung cấp và hoa hồng nếu có.',
    'Chúng tôi không hứa dịch vụ có người trực tiếp thực hiện khi chưa có người sẵn sàng làm việc đó.',
  ],
  signupTitle: 'Đăng ký sớm',
  signupBody:
    'Đăng ký sớm hiện đóng. Chỉ mở sau khi chính sách riêng tư được duyệt và công bố. Trang này không có biểu mẫu đăng ký.',
  footerNotice:
    'Trang này không phải dịch vụ y tế, pháp lý hay dịch vụ khẩn cấp. Trang không cho biết nơi nào an toàn hay còn chỗ. Khi gặp nguy hiểm, hãy gọi số khẩn cấp tại nơi bạn ở.',
};

export const LANDING: Record<Locale, Landing> = { en: landingEn, vi: landingVi };
