// Bảng route theo hợp đồng HTTP (WO09-03): 13 thao tác của engineering/03_API_CONTRACT.openapi.yaml.
// Mỗi thao tác có một operationId duy nhất, một method và một đường dẫn mẫu.
// implementedBy:
//  - 'legacy': phục vụ bởi handler sẵn có của WO04/WO07 (giữ nguyên hình dạng phản hồi cũ; sai khác được ghi trong evidence).
//  - 'contract': handler mới đi đúng hình dạng lỗi của hợp đồng { code, message, request_id }.
//  - 'not_implemented': chưa có nền tảng dữ liệu; trả 501 và không tiết lộ gì về đối tượng.
// File này thuần túy: không đọc cơ sở dữ liệu, không đọc môi trường.

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type Implementation = 'legacy' | 'contract' | 'not_implemented';

export interface ContractRoute {
  operationId: string;
  method: HttpMethod;
  path: string;
  implementedBy: Implementation;
}

export const CONTRACT_ROUTES: readonly ContractRoute[] = [
  { operationId: 'createItem', method: 'POST', path: '/v1/items', implementedBy: 'legacy' },
  { operationId: 'getItem', method: 'GET', path: '/v1/items/{item_id}', implementedBy: 'legacy' },
  { operationId: 'createUploadTicket', method: 'POST', path: '/v1/documents/upload-ticket', implementedBy: 'legacy' },
  { operationId: 'extractDocument', method: 'POST', path: '/v1/documents/{document_id}/extract', implementedBy: 'not_implemented' },
  { operationId: 'reviewExtraction', method: 'POST', path: '/v1/extractions/{extraction_id}/review', implementedBy: 'not_implemented' },
  { operationId: 'createCase', method: 'POST', path: '/v1/cases', implementedBy: 'contract' },
  { operationId: 'getCase', method: 'GET', path: '/v1/cases/{case_id}', implementedBy: 'contract' },
  { operationId: 'transitionCase', method: 'POST', path: '/v1/cases/{case_id}/transitions', implementedBy: 'contract' },
  { operationId: 'grantDocument', method: 'POST', path: '/v1/cases/{case_id}/grants', implementedBy: 'contract' },
  { operationId: 'revokeGrant', method: 'DELETE', path: '/v1/cases/{case_id}/grants/{grant_id}', implementedBy: 'contract' },
  { operationId: 'createExport', method: 'POST', path: '/v1/exports', implementedBy: 'contract' },
  { operationId: 'requestDeletion', method: 'POST', path: '/v1/account/deletion', implementedBy: 'contract' },
  { operationId: 'getJob', method: 'GET', path: '/v1/jobs/{job_id}', implementedBy: 'contract' },
];

export interface ContractMatch {
  route: ContractRoute;
  params: Record<string, string>;
}

// Khớp method và đường dẫn với bảng hợp đồng. Trả về null nếu không thuộc hợp đồng.
export function matchContract(method: string, pathname: string): ContractMatch | null {
  for (const route of CONTRACT_ROUTES) {
    if (route.method !== method) continue;
    const names: string[] = [];
    const source = route.path.replace(/\{([a-z_]+)\}/g, (_match: string, name: string) => {
      names.push(name);
      return '([^/]+)';
    });
    const found = new RegExp(`^${source}$`).exec(pathname);
    if (!found) continue;
    const params: Record<string, string> = {};
    // Một escape phần trăm sai làm decodeURIComponent ném lỗi. Trước đây lỗi đó thoát ra ngoài và thành
    // 500; một đường dẫn không giải mã được thì đơn giản là không khớp route nào, nên trả 404 (D-08).
    try {
      names.forEach((name, index) => {
        params[name] = decodeURIComponent(found[index + 1] ?? '');
      });
    } catch {
      return null;
    }
    return { route, params };
  }
  return null;
}
