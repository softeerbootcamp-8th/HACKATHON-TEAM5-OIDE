# OIDE Frontend

React, TypeScript, Vite 기반의 OIDE 프론트엔드입니다.

## 요구 사항

- Node.js 20.19 이상 또는 22.12 이상
- pnpm 10.21.0

## 실행

```bash
pnpm install --frozen-lockfile
pnpm dev
```

## 검증

```bash
pnpm lint
pnpm build
```

## API 코드 생성

백엔드 OpenAPI 명세가 준비되면 Orval을 도입합니다. 생성 코드는 `src/api/generated`에만 배치하고 직접 수정하지 않습니다. 수동으로 작성하는 API 코드는 생성 디렉터리 밖에 둡니다.
