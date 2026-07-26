import type { SpecVersion } from '../domain/contract';

const sample31 = `openapi: 3.1.1
info:
  title: User API
  version: 1.0.0
servers:
  - url: https://api.example.com
paths:
  /users:
    post:
      summary: 사용자 생성
      tags: [Users]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, role]
              properties:
                email:
                  type: string
                  format: email
                  minLength: 5
                  maxLength: 120
                role:
                  type: string
                  enum: [member, admin]
                age:
                  type: integer
                  minimum: 1
                  maximum: 120
      responses:
        '201':
          description: 생성됨
        '400':
          description: 잘못된 요청
        '401':
          description: 인증 필요
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
`;

const sample30 = sample31
  .replace('openapi: 3.1.1', 'openapi: 3.0.4')
  .replace('              type: object', '              type: object\n              nullable: false');

export function sampleDocumentFor(version: SpecVersion): string {
  return version === 'openapi-3.0' ? sample30 : sample31;
}
