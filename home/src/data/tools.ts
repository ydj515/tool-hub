export type ToolStatus = 'live' | 'coming-soon';

export interface Tool {
  id: string;
  name: string;
  longDescription: string;
  tags: string[];
  url: string | null;
  github: string;
  gradient: string;
  accentColor: string;
  status: ToolStatus;
}

export const tools: Tool[] = [
  {
    id: 'sign-maker',
    name: 'Sign Maker',
    longDescription:
      '마우스 또는 터치로 자유롭게 서명을 그리고, 배경이 투명한 PNG 파일로 즉시 저장합니다. 계약서·문서에 바로 붙여 쓸 수 있습니다.',
    tags: ['Canvas', 'Image', 'Download'],
    url: 'https://tool-hubsign-maker.vercel.app/',
    github: 'https://github.com/ydj515/tool-hub/tree/main/sign-maker',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    accentColor: '#6366f1',
    status: 'live',
  },
  {
    id: 'ddl-seed-generator',
    name: 'DDL Seed Generator',
    longDescription:
      'CREATE TABLE DDL을 붙여 넣으면 외래 키 의존성 순서를 분석해 INSERT seed와 DELETE rollback 구문을 즉시 생성합니다.',
    tags: ['SQL', 'DDL', 'Database'],
    url: 'https://tool-hubddl-seed-generator.vercel.app/',
    github: 'https://github.com/ydj515/tool-hub/tree/main/ddl-seed-generator',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    accentColor: '#10b981',
    status: 'live',
  },
  {
    id: 'dummy-file-generator',
    name: 'Dummy File Generator',
    longDescription:
      '파일 크기를 직접 입력하면 해당 용량의 테스트용 더미 파일을 브라우저 내에서 즉시 생성·다운로드합니다.',
    tags: ['File', 'Testing', 'Utility'],
    url: 'https://tool-hubdummy-file-generator.vercel.app/',
    github: 'https://github.com/ydj515/tool-hub/tree/main/dummy-file-generator',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    accentColor: '#f59e0b',
    status: 'live',
  },
  {
    id: 'config-diff-viewer',
    name: 'Config Diff Viewer',
    longDescription:
      '두 설정 파일을 나란히 비교하고, 누락된 키·위험 설정·민감 정보를 자동으로 감지합니다. YAML, JSON, properties, .env 포맷을 지원합니다.',
    tags: ['Config', 'YAML', 'JSON', 'Security'],
    url: 'https://config-diff-viewer-five.vercel.app/',
    github: 'https://github.com/ydj515/tool-hub/tree/main/config-diff-viewer',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    accentColor: '#ef4444',
    status: 'live',
  },
  {
    id: 'webpage-capture-tool',
    name: 'Webpage Capture',
    longDescription:
      '웹페이지 URL을 입력하면 내장 브라우저 엔진이 전체 페이지를 스크린샷으로 캡처해 저장합니다.',
    tags: ['Screenshot', 'Browser', 'Automation'],
    url: null,
    github: 'https://github.com/ydj515/tool-hub/tree/main/webpage-capture-tool',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    accentColor: '#3b82f6',
    status: 'coming-soon',
  },
];
