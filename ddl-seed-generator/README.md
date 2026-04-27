## DDL Seed Generator

DDL을 입력하면 테이블 관계와 FK 순서를 분석해 DB별 seed SQL을 생성하는 웹 도구입니다.

### 기능

- PostgreSQL / MySQL / H2 출력 선택
- FK 의존 순서 기반 `INSERT` 생성
- 순환 FK 감지 및 DB별 FK 완화 구문 생성
- 컬럼명 기반 realistic fake data 생성
- 타입별 경계값 일부 포함
- `insert.sql`, `rollback.sql`, `seed.zip` 다운로드

### 실행

```bash
npm install
npm run dev
```

### 검증

```bash
npm run typecheck
npm run build
```
