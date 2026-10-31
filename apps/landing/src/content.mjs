// Nội dung công khai của landing AFTERVIA (tiếng Việt và English).
// Nguồn: docs/spec/AFTERVIA_AZ_2026-10-31/brand/01_BRAND_PLATFORM_VI_EN.md,
// strategy/02_BUSINESS_MODEL_PRICING.md, 02_MASTER_PLAN_A_TO_Z.md (mục E và phạm vi MVP).
// Quy tắc cứng: không lời chứng thực, không số liệu tăng trưởng, không chứng nhận, không form, không email.
// Giá là đề xuất USD/tháng, trước thuế, chưa mở bán. Mọi chuỗi công khai phải nằm trong file này.

export const SITE = {
  name: 'AFTERVIA',
  origin: 'https://aftervia.iai.one',
  lastReviewed: '2026-10-31',
  ogImage: { path: '/og-image.png', width: 1200, height: 630 },
};

const vi = {
  lang: 'vi',
  path: '/',
  ogLocale: 'vi_VN',
  ogLocaleAlternate: 'en_US',
  dateLocale: 'vi-VN',
  switch: { text: 'English', lang: 'en', path: '/en/' },
  meta: {
    title: 'AFTERVIA — Quản lý hậu mãi để mọi thứ bền lâu',
    description: 'Nền tảng quản lý hậu mãi có chứng cứ: giữ hồ sơ, ghi rõ trách nhiệm và biết bước tiếp theo. Đang phát triển, chưa mở bán.',
    ogImageAlt: 'AFTERVIA: Quản lý hậu mãi để mọi thứ bền lâu. Đang phát triển, chưa mở bán.',
    skip: 'Chuyển đến nội dung chính',
  },
  header: {
    navLabel: 'Điều hướng chính',
    langLabel: 'Ngôn ngữ',
    nav: { products: 'Sản phẩm', process: 'Quy trình', pricing: 'Giá đề xuất', status: 'Trạng thái' },
  },
  hero: {
    status: 'Đang phát triển · chưa mở bán',
    h1: 'Quản lý hậu mãi để mọi thứ bền lâu.',
    tagline: 'THINGS LIVE LONGER',
    lead: 'Hồ sơ hậu mãi thường nằm rải rác: hóa đơn trong email, bảo hành trong ảnh chụp, lịch sử sửa chữa trong tin nhắn. AFTERVIA giữ các bằng chứng đó ở một nơi, ghi rõ ai xác nhận điều gì và bước tiếp theo là gì.',
    ctaStatus: 'Xem trạng thái hiện tại',
    ctaPricing: 'Xem giá đề xuất',
  },
  problem: {
    h2: 'Vì sao hồ sơ hậu mãi hay thiếu?',
    items: [
      { title: 'Chứng từ phân tán', text: 'Hóa đơn, bảo hành và lịch sử sửa chữa nằm ở nhiều nơi. Khi cần đối chiếu, việc tìm lại mất nhiều thời gian.' },
      { title: 'Trách nhiệm không rõ', text: 'Yêu cầu được gửi đi nhưng không có người phụ trách cụ thể, và hạn phản hồi trôi qua mà không ai được nhắc.' },
      { title: 'Kết quả thiếu bằng chứng', text: 'Yêu cầu được ghi là đã xử lý nhưng không có người xác nhận, thời điểm hay kết quả cụ thể.' },
    ],
  },
  products: {
    h2: 'Một nền tảng, ba không gian sử dụng',
    lead: 'Personal, Desk và Partner là các vai trò trên cùng một nền tảng, không phải ba công ty hay ba tài khoản tách rời.',
    items: [
      { name: 'AFTERVIA Personal', audience: 'Dành cho khách hàng', text: 'Lưu món đồ, hóa đơn, điều khoản do người dùng cung cấp, lịch nhắc và hồ sơ xử lý. Thông tin luôn ghi rõ nguồn.' },
      { name: 'AFTERVIA Desk', audience: 'Dành cho cửa hàng', text: 'Tiếp nhận hồ sơ, kiểm tra chứng từ còn thiếu, giao người phụ trách, theo dõi hạn phản hồi, mời đơn vị dịch vụ và đóng hồ sơ khi có bằng chứng.' },
      { name: 'AFTERVIA Partner', audience: 'Dành cho đơn vị dịch vụ', text: 'Ban đầu chỉ có quyền truy cập giới hạn vào một hồ sơ do cửa hàng mời.' },
    ],
    outOfScope: {
      label: 'Ngoài phạm vi giai đoạn đầu',
      text: 'Chưa mở cho y tế, ô tô, tín dụng, bảo hiểm, tranh chấp pháp lý, thiết bị có nguy cơ gây hại hoặc mua bán đồ cũ.',
    },
  },
  process: {
    h2: 'Từ mua hàng đến khi hồ sơ được đóng',
    lead: 'Đây là quy trình dự kiến. Các bước đang được xây dựng và chưa mở cho khách hàng.',
    steps: [
      { title: 'Ghi nhận', text: 'Thêm món đồ và chứng từ, mỗi thông tin kèm nguồn.' },
      { title: 'Tiếp nhận', text: 'Cửa hàng nhận hồ sơ và kiểm tra chứng từ còn thiếu.' },
      { title: 'Phân công', text: 'Giao người phụ trách và đặt hạn phản hồi cho từng bước.' },
      { title: 'Đóng hồ sơ', text: 'Hồ sơ chỉ đóng khi có người phụ trách, thời gian, kết quả và bằng chứng.' },
    ],
  },
  pricing: {
    h2: 'Giá đề xuất, chưa mở bán',
    lead: 'Các mức dưới đây là đề xuất bằng USD, trước thuế. Đây không phải giá đã bán và chưa được thị trường chấp nhận. Trang này không nhận thanh toán.',
    cards: [
      { name: 'Personal Basic', tag: 'Đề xuất', price: '0', unit: 'USD/tháng', scope: '50 món đồ, 250 MB tài liệu; nhận và theo dõi hồ sơ hậu mãi; xuất và xóa dữ liệu.' },
      { name: 'Family', tag: 'Đề xuất', price: '4,99', unit: 'USD/tháng', scope: '500 món đồ, 2 GB, 5 thành viên; nhắc nâng cao và phân quyền gia đình.' },
      { name: 'Desk Starter', tag: 'Đề xuất', price: '49', unit: 'USD/tháng', scope: '1 địa điểm, 2 nhân viên, 50 hồ sơ mới mỗi tháng, 100 lần trích xuất mỗi tháng.' },
      { name: 'Desk Growth', tag: 'Đề xuất', price: '149', unit: 'USD/tháng', scope: '3 địa điểm, 10 nhân viên, 200 hồ sơ mới mỗi tháng, 600 lần trích xuất mỗi tháng.' },
      { name: 'Desk Scale', tag: 'Đề xuất', price: '399', unit: 'USD/tháng', scope: '10 địa điểm, 30 nhân viên, 800 hồ sơ mới mỗi tháng, 2.000 lần trích xuất mỗi tháng.' },
    ],
    note: 'Không tính phí vượt tự động. Hết hạn mức không làm giới hạn việc xem hoặc xuất hồ sơ đã có. Giới hạn lưu trữ của Desk chưa được chốt.',
  },
  principles: {
    h2: 'Nguyên tắc sản phẩm',
    items: [
      { title: 'Ghi rõ nguồn', text: 'Mỗi thông tin cho biết ai xác nhận: cửa hàng, người dùng nhập, hoặc AI đọc được nhưng chưa được duyệt.' },
      { title: 'Không thay thế quyết định pháp lý', text: 'AFTERVIA không tự quyết định người dùng có đủ quyền bảo hành hay không và không thay thế tư vấn pháp lý.' },
      { title: 'Dữ liệu tách theo tài khoản', text: 'Mỗi tổ chức và tài khoản chỉ thấy dữ liệu được cấp quyền. Điều này được kiểm thử tự động trong bản phát triển; chưa có kiểm định độc lập.' },
      { title: 'Thay đổi có nhật ký', text: 'Các thay đổi quyền truy cập và dữ liệu được ghi vào nhật ký chỉ thêm, không sửa và không xóa.' },
      { title: 'Trang này không thu thập dữ liệu', text: 'Trang giới thiệu không có biểu mẫu, không thu email và không dùng công cụ theo dõi cá nhân.' },
      { title: 'Không có lời chứng thực hay số liệu giả', text: 'Trang này không có lời chứng thực, đánh giá khách hàng hay số liệu tăng trưởng.' },
    ],
  },
  status: {
    h2: 'Trạng thái hiện tại',
    lead: 'Trang này tách rõ những gì đang có trong bản phát triển, những gì đang thử và những gì dự kiến. Không mục nào trong ba nhóm là tính năng đang mở cho khách hàng.',
    groups: {
      has: {
        label: 'Đang có',
        sub: 'Có trong bản phát triển; chưa mở cho khách hàng',
        items: [
          'Tổ chức, thành viên và vai trò (có kiểm thử tự động)',
          'Ghi nhận món đồ, kiểm soát phiên bản để tránh ghi đè',
          'Cách ly dữ liệu giữa các tài khoản (có kiểm thử tự động)',
          'Nhật ký kiểm toán chỉ thêm',
          'Tạo phiếu tải lên cho chứng từ (chưa lưu tệp thật)',
          'Đăng nhập giả lập trong môi trường phát triển (không phải đăng nhập thật)',
        ],
      },
      testing: {
        label: 'Đang thử',
        sub: 'Đang được xây dựng và kiểm thử; chưa mở cho khách hàng',
        items: ['Kiểm tra tệp theo chữ ký nhị phân cho JPEG, PNG và PDF, giới hạn 10 MB'],
      },
      planned: {
        label: 'Dự kiến',
        sub: 'Chưa bắt đầu hoặc chưa có quyết định',
        items: [
          'Lưu trữ tệp chứng từ thật (chưa chọn nhà cung cấp)',
          'Đăng nhập thật qua nhà cung cấp danh tính',
          'Ứng dụng web và di động',
          'Quy trình xử lý hồ sơ cho cửa hàng (AFTERVIA Desk)',
          'Không gian đối tác dịch vụ (AFTERVIA Partner)',
          'Thanh toán và gói dịch vụ (chưa mở, chưa có giao dịch thật)',
          'Xuất và xóa dữ liệu theo yêu cầu',
          'Đọc chứng từ bằng AI (mặc định tắt, cần người duyệt)',
        ],
      },
    },
    closing: 'Chưa có khách hàng sử dụng sản phẩm thật, chưa có thử nghiệm với cửa hàng và chưa có kiểm định bảo mật độc lập.',
  },
  footer: {
    workingName: 'AFTERVIA là tên làm việc của dự án. Tên chưa được đăng ký hoặc kiểm tra nhãn hiệu.',
    contact: 'Địa chỉ liên hệ sẽ được công bố khi đã xác thực. Hiện chưa có kênh liên hệ công khai.',
    legal: 'Chính sách quyền riêng tư và điều khoản đang được soạn thảo, chờ rà soát pháp lý. Chưa công bố.',
    updatedLabel: 'Cập nhật lần cuối:',
    copyright: '© 2026 Dự án AFTERVIA',
  },
  notFound: {
    title: 'Không tìm thấy trang — AFTERVIA',
    h1: 'Không tìm thấy trang.',
    text: 'Trang này không tồn tại hoặc đã được chuyển.',
    back: 'Về trang chủ',
  },
};

const en = {
  lang: 'en',
  path: '/en/',
  ogLocale: 'en_US',
  ogLocaleAlternate: 'vi_VN',
  dateLocale: 'en-US',
  switch: { text: 'Tiếng Việt', lang: 'vi', path: '/' },
  meta: {
    title: 'AFTERVIA — Manage aftercare. Make things last longer.',
    description: 'Evidence-led aftercare for products and the people who buy them: keep records, show who is responsible and know the next step. In development, not yet on sale.',
    ogImageAlt: 'AFTERVIA: Manage aftercare. Make things last longer. In development, not yet on sale.',
    skip: 'Skip to main content',
  },
  header: {
    navLabel: 'Main navigation',
    langLabel: 'Language',
    nav: { products: 'Products', process: 'Process', pricing: 'Proposed prices', status: 'Status' },
  },
  hero: {
    status: 'In development · not yet on sale',
    h1: 'Manage aftercare. Make things last longer.',
    tagline: 'THINGS LIVE LONGER',
    lead: 'After-sales records are scattered: an invoice in an email, a warranty in a photo, a repair history in a chat. AFTERVIA keeps that evidence in one place, shows who confirmed what and what happens next.',
    ctaStatus: 'See current status',
    ctaPricing: 'See proposed prices',
  },
  problem: {
    h2: 'Why are after-sales records so often incomplete?',
    items: [
      { title: 'Records are scattered', text: 'Invoices, warranties and repair history sit in different places. Finding them again takes time when they are needed.' },
      { title: 'Responsibility is unclear', text: 'A request is sent, but no one is clearly assigned, and the response deadline passes without a reminder.' },
      { title: 'Outcomes lack evidence', text: 'A request is marked as handled, but there is no named person, date or result to confirm it.' },
    ],
  },
  products: {
    h2: 'One platform, three workspaces',
    lead: 'Personal, Desk and Partner are roles on one platform, not three companies or three separate accounts.',
    items: [
      { name: 'AFTERVIA Personal', audience: 'For customers', text: 'Keep items, invoices, terms provided by the user, reminders and case records. Every piece of information shows its source.' },
      { name: 'AFTERVIA Desk', audience: 'For retailers', text: 'Receive cases, check for missing documents, assign an owner, track response deadlines, invite service partners and close cases with evidence.' },
      { name: 'AFTERVIA Partner', audience: 'For service partners', text: 'Initially a limited view of one case that a retailer has shared.' },
    ],
    outOfScope: {
      label: 'Outside the first phase',
      text: 'Not offered for medical, automotive, credit, insurance, legal disputes, hazardous equipment or second-hand resale.',
    },
  },
  process: {
    h2: 'From purchase to a closed case',
    lead: 'This is the intended process. The steps are being built and are not yet open to customers.',
    steps: [
      { title: 'Record', text: 'Add an item and its documents. Each piece of information keeps its source.' },
      { title: 'Receive', text: 'The retailer receives the case and checks for missing documents.' },
      { title: 'Assign', text: 'An owner is named and a response deadline is set for each step.' },
      { title: 'Close', text: 'A case closes only with a named owner, a date, a result and evidence.' },
    ],
  },
  pricing: {
    h2: 'Proposed prices, not on sale',
    lead: 'The amounts below are proposals in USD, before tax. They are not current prices, are not yet accepted by the market, and this page takes no payments.',
    cards: [
      { name: 'Personal Basic', tag: 'Proposal', price: '0', unit: 'USD/month', scope: '50 items, 250 MB of documents; receive and track after-sales records; export and delete data.' },
      { name: 'Family', tag: 'Proposal', price: '4.99', unit: 'USD/month', scope: '500 items, 2 GB, 5 members; advanced reminders and family roles.' },
      { name: 'Desk Starter', tag: 'Proposal', price: '49', unit: 'USD/month', scope: '1 location, 2 staff, 50 new cases per month, 100 exports per month.' },
      { name: 'Desk Growth', tag: 'Proposal', price: '149', unit: 'USD/month', scope: '3 locations, 10 staff, 200 new cases per month, 600 exports per month.' },
      { name: 'Desk Scale', tag: 'Proposal', price: '399', unit: 'USD/month', scope: '10 locations, 30 staff, 800 new cases per month, 2,000 exports per month.' },
    ],
    note: 'No automatic overage charges. Reaching a quota does not limit viewing or exporting existing cases. The Desk storage limit is not yet set.',
  },
  principles: {
    h2: 'Product principles',
    items: [
      { title: 'Every source is shown', text: 'Each piece of information states who confirmed it: the retailer, the user who entered it, or AI that read it but has not been reviewed.' },
      { title: 'Not a legal decision', text: 'AFTERVIA does not decide whether a user is entitled to a warranty and does not replace legal advice.' },
      { title: 'Data is separated by account', text: 'Each organization and account sees only the data it has been granted. This is tested automatically in the development build; there is no independent audit yet.' },
      { title: 'Changes are logged', text: 'Access changes and data changes are written to an append-only log that cannot be edited or deleted.' },
      { title: 'This page collects no data', text: 'The page has no forms, takes no email address and uses no personal tracking tools.' },
      { title: 'No fake testimonials or figures', text: 'The page has no testimonials, customer reviews or growth figures.' },
    ],
  },
  status: {
    h2: 'Current status',
    lead: 'This page separates what is in the development build, what is being tested and what is planned. None of the items in these three groups is open to customers.',
    groups: {
      has: {
        label: 'In place',
        sub: 'Present in the development build; not open to customers',
        items: [
          'Organizations, members and roles (automatically tested)',
          'Item records with version control to prevent overwrites',
          'Data isolation between accounts (automatically tested)',
          'Append-only audit log',
          'Upload tickets for documents (no real files stored yet)',
          'Simulated sign-in in the development environment (not real sign-in)',
        ],
      },
      testing: {
        label: 'Being tested',
        sub: 'Being built and tested; not open to customers',
        items: ['File checks by binary signature for JPEG, PNG and PDF, with a 10 MB limit'],
      },
      planned: {
        label: 'Planned',
        sub: 'Not started, or no decision yet',
        items: [
          'Storage for real document files (no provider chosen yet)',
          'Real sign-in through an identity provider',
          'Web and mobile apps',
          'Case workflow for retailers (AFTERVIA Desk)',
          'Workspace for service partners (AFTERVIA Partner)',
          'Payments and subscription plans (not open; no real transactions)',
          'Export and deletion of data on request',
          'Reading documents with AI (off by default; needs human review)',
        ],
      },
    },
    closing: 'No real customers use the product yet. There has been no pilot with a retailer, and there is no independent security audit.',
  },
  footer: {
    workingName: 'AFTERVIA is the working name of this project. The name is not yet registered or checked as a trademark.',
    contact: 'A contact address will be published once it is verified. There is no public contact channel yet.',
    legal: 'The privacy notice and terms are being drafted and are awaiting legal review. They are not published.',
    updatedLabel: 'Last updated:',
    copyright: '© 2026 AFTERVIA project',
  },
  notFound: {
    title: 'Page not found — AFTERVIA',
    h1: 'Page not found.',
    text: 'This page does not exist or has moved.',
    back: 'Back to home',
  },
};

export const CONTENT = { vi, en };
