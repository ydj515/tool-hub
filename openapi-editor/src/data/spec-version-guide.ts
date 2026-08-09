import type { SpecFamily } from '../domain/document';

export interface SpecVersionGuideItem {
  label: string;
  difference: string;
  selection: string;
  officialUrl: string;
  syntax: {
    nullability: SpecSyntaxGuideNote;
    schemaExamples: SpecSyntaxGuideNote;
    parameterMediaExamples: SpecSyntaxGuideNote;
  };
}

export interface SpecSyntaxGuideNote {
  description: string;
  example: string;
}

export const SPEC_VERSION_GUIDE_ORDER: readonly SpecFamily[] = [
  'swagger-2.0',
  'openapi-3.0',
  'openapi-3.1',
  'openapi-3.2',
];

export const SPEC_VERSION_GUIDE: Record<SpecFamily, SpecVersionGuideItem> = {
  'swagger-2.0': {
    label: 'Swagger 2.0',
    difference: 'host, basePath, schemes, definitions, body parameter를 사용하고 JSON Schema Draft 4 일부를 지원합니다.',
    selection: '연동 대상이 Swagger 2.0 문서를 요구할 때 선택합니다.',
    officialUrl: 'https://spec.openapis.org/oas/v2.0.html',
    syntax: {
      nullability: {
        description: '표준 nullable 키워드 없음. x-nullable은 일부 도구에서 사용하는 확장입니다.',
        example: '표준 문법 없음',
      },
      schemaExamples: {
        description: 'Schema에서는 단일 example 값을 사용합니다.',
        example: 'example: value',
      },
      parameterMediaExamples: {
        description: '요청 파라미터용 표준 예시 필드는 없고 Response의 examples는 MIME 타입별 맵입니다.',
        example: 'examples: {application/json: value}',
      },
    },
  },
  'openapi-3.0': {
    label: 'OpenAPI 3.0.4',
    difference: 'servers, requestBody와 content, components, callbacks를 사용합니다.',
    selection: '연동 대상이 OpenAPI 3.0 계열을 요구할 때 선택합니다.',
    officialUrl: 'https://spec.openapis.org/oas/v3.0.4.html',
    syntax: {
      nullability: {
        description: '같은 Schema Object에 type과 nullable을 함께 사용합니다.',
        example: 'nullable: true',
      },
      schemaExamples: {
        description: 'Schema에서는 단일 example 값을 사용합니다.',
        example: 'example: value',
      },
      parameterMediaExamples: {
        description: 'example 또는 이름 기반 examples 맵 중 하나만 사용합니다.',
        example: 'examples: {named: {value: value}}',
      },
    },
  },
  'openapi-3.1': {
    label: 'OpenAPI 3.1.2',
    difference: 'JSON Schema 2020-12와 정식으로 호환되고 최상위 webhooks를 지원합니다.',
    selection: 'JSON Schema 2020-12 또는 독립 웹훅 표현이 필요할 때 선택합니다.',
    officialUrl: 'https://spec.openapis.org/oas/v3.1.2.html',
    syntax: {
      nullability: {
        description: 'nullable 대신 JSON Schema 타입 배열에 null을 포함합니다.',
        example: 'type: [string, "null"]',
      },
      schemaExamples: {
        description: 'Schema에서는 배열인 examples를 권장하며 example은 deprecated입니다.',
        example: 'examples: [value]',
      },
      parameterMediaExamples: {
        description: 'Parameter/Media에서는 이름 기반 맵인 examples를 사용하며 example과 함께 쓸 수 없습니다.',
        example: 'examples: {named: {value: value}}',
      },
    },
  },
  'openapi-3.2': {
    label: 'OpenAPI 3.2.0',
    difference: 'QUERY, 추가 HTTP 메서드, 스트리밍 미디어, 계층형 태그를 지원합니다.',
    selection: '해당 기능이 필요하고 연동 대상이 OpenAPI 3.2를 지원할 때 선택합니다.',
    officialUrl: 'https://spec.openapis.org/oas/v3.2.0.html',
    syntax: {
      nullability: {
        description: 'OpenAPI 3.1과 동일하게 타입 배열에 null을 포함합니다.',
        example: 'type: [string, "null"]',
      },
      schemaExamples: {
        description: 'Schema에서는 배열인 examples를 권장하며 example은 deprecated입니다.',
        example: 'examples: [value]',
      },
      parameterMediaExamples: {
        description: 'Parameter/Media에서는 이름 기반 맵인 examples를 사용하며 example과 함께 쓸 수 없습니다.',
        example: 'examples: {named: {value: value}}',
      },
    },
  },
};
