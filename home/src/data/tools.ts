/**
 * Tool Hub 홈 화면에 노출할 도구 메타데이터 목록을 정의한다.
 */
export type ToolStatus = 'live' | 'coming-soon';

export interface Tool {
  id: string;
  name: string;
  longDescription: string;
  tags: string[];
  url: string | null;
  github: string;
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
    status: 'live',
  },
  {
    id: 'shortcut-cheatsheet',
    name: 'Shortcut Cheatsheet',
    longDescription:
      '자주 쓰는 키보드 단축키를 빠르게 찾아볼 수 있는 치트시트입니다. 브라우저에서 필요한 조합을 바로 확인할 수 있습니다.',
    tags: ['Shortcut', 'Keyboard', 'Reference'],
    url: 'https://shortcut-cheatsheet.vercel.app/',
    github: 'https://github.com/ydj515/shortcut-cheatsheet',
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
    status: 'coming-soon',
  },
  {
    id: 'json-yaml-converter',
    name: 'JSON YAML Converter',
    longDescription:
      'JSON과 YAML을 양방향으로 변환하고, 두 형식을 보기 좋게 정리하며 문법 오류의 정확한 위치를 알려줍니다.',
    tags: ['JSON', 'YAML', 'Converter', 'Formatter'],
    url: null,
    github: 'https://github.com/ydj515/tool-hub/tree/main/json-yaml-converter',
    status: 'coming-soon',
  },
    {
    id: 'class-diagram-generator',
    name: 'Class Diagram Generator',
    longDescription:
      '클래스 다이어그램을 쉽게 생성할 수 있는 도구입니다. UML 표준을 따르며, 다양한 프로그래밍 언어를 지원합니다.',
    tags: ['UML', 'Design', 'Documentation'],
    url: 'https://class-diagram-generator.onrender.com/?lang=ko',
    github: 'https://github.com/ydj515/tool-hub/tree/main/class-diagram-generator',
    status: 'live',
  },
];
