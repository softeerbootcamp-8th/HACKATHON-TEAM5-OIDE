# API 코드 관리

백엔드 OpenAPI 명세가 제공되면 Orval 생성 결과를 `generated` 디렉터리에 배치합니다.

- `generated` 내부 파일은 직접 수정하지 않습니다.
- API 요청 설정이나 Orval mutator처럼 수동으로 작성하는 코드는 `generated` 밖에 둡니다.
- 생성 디렉터리는 Orval 실행 중 정리될 수 있으므로 다른 코드를 함께 두지 않습니다.
