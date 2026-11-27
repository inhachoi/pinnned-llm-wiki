---
status: draft
owner: ops
sources: [fe:.github/workflows/deploy.yml, fe:vite.config.ts, be:.github/workflows/deploy.yml, be:docker-compose.yml, be:infra/terraform/README.md, be:src/main/resources/application-dev.yml, thumbnail:.github/workflows/deploy.yml, notion:be-infra-guide]
verified: 2026-11-22
---

# 인프라 배치

각 조각이 어디서 도는지. 레포에 적힌 것만 쓴다. 레포에 없는 것은 `확인 필요`다. 주소·키·계정 값은 여기에 적지 않는다.

## 한눈에

| 조각 | 어디서 | 배포 방식 | 근거 |
| --- | --- | --- | --- |
| 웹 앱 (SSR 포함) | Vercel | FE 레포 `main` push → GitHub Actions가 빌드 후 운영 배포 | `fe:.github/workflows/deploy.yml` |
| Storybook | GitHub Pages | `storybook` 라벨이 붙은 PR마다 | `fe:.github/workflows/storybook-deploy.yml` |
| API 서버 | OCI 컴퓨트 VM 1대, Docker 컨테이너 | BE 레포 `main` push → 이미지를 빌드해 SSH로 전송·재기동 | `be:.github/workflows/deploy.yml`, `be:docker-compose.yml` |
| DB | Oracle Autonomous Database | Flyway 마이그레이션이 앱 기동 시 적용 | `be:src/main/resources/application-dev.yml`, `be:src/main/resources/db/migration/` |
| 이미지 저장소 | OCI Object Storage (S3 호환 API로 접근) | — | `be:src/main/kotlin/udumeoli/tripphoto/config/StorageProperties.kt` |
| 썸네일 서비스 | OCI 컴퓨트 VM (API 서버와 다른 VM), systemd 서비스 | thumbnail 레포 `main` push → Go 바이너리를 SSH로 전송·재시작 | `thumbnail:.github/workflows/deploy.yml`, `be:infra/terraform/README.md` |
| 에러 기록 | 노션 QA 데이터베이스 | — | [error-pipeline.md](error-pipeline.md) |

## 요청 경로

- 브라우저 → 웹 앱 도메인(`www.pinnned.co.kr`). `/graphql`과 `/api/**`는 웹 앱 서버가 API 서버로 **프록시**한다. 브라우저가 API 서버를 직접 부르는 경우는 소셜 로그인 시작(페이지 이동)과 이미지 `<img>` 요청뿐이다. 이미지 업로드 PUT은 API 서버가 아니라 발급받은 오브젝트 스토리지 URL로 직접 간다.
- 그래서 `/api/` 아래 경로는 FE가 자체 서버 라우트로 쓸 수 없다. 에러 수신이 `/report-error`인 이유다.
- API 서버는 VM의 nginx 뒤에 있고 컨테이너 포트는 로컬 인터페이스에만 열린다. 외부에서는 nginx를 거쳐야 닿는다.
- API 서버 → 썸네일 서비스는 HTTP 호출, 썸네일 서비스 → DB·저장소는 직접 접근이다 ([images.md](../contract/images.md)).

## 약속과 함정

- 운영 API 서버의 Spring 프로파일 이름은 `dev`다. "dev"라는 이름이 개발 환경을 뜻하지 않는다. 별도 스테이징 서버는 레포에 없다.
- API 서버 배포는 컨테이너를 내렸다 올리는 방식이라 배포 중 짧은 중단이 있다. 로그인 교환 코드와 초대코드 시도 횟수는 메모리에만 있어 이때 초기화된다 ([auth.md](../contract/auth.md)).
- API 서버가 1대라는 전제에 기대는 코드가 있다 (메모리 캐시 기반 교환 코드·시도 제한). 서버를 늘리려면 이 둘부터 옮겨야 한다.
- FE 빌드는 CI에서 Vercel 프리셋을 명시해야 한다. 빠지면 SSR 함수가 만들어지지 않아 404가 난다.
- 프록시 대상 API 주소는 FE 빌드 설정에 박혀 있다. API 도메인이 바뀌면 FE를 다시 배포해야 한다.
- API 서버는 네이티브 이미지로 배포한다. 인프라 가이드는 VM 메모리가 작아 메모리 부족이 흔하다고 적지만 네이티브를 고른 이유를 명시하지 않는다 — 확인 필요 (notion:be-infra-guide)
- JVM에서는 되는데 네이티브 이미지에서만 클래스 조회·리플렉션 에러가 나면 네이티브 힌트 등록이 빠진 것이다. 로컬 테스트 통과가 배포 성공을 보장하지 않는다 (`be:src/main/kotlin/udumeoli/tripphoto/config/ApplicationNativeHints.kt`)
- 비밀값은 API 서버 VM의 환경 파일과 각 레포의 GitHub Actions 시크릿, Vercel 환경변수에만 있다. 레포에는 이름만 있다.
- API 서버 배포 후 헬스체크는 `/actuator/health`다.

## 자동화·봇

| 무엇 | 어디서 | 근거 |
| --- | --- | --- |
| 주간 에러 트리아지, 머지 후 종결 | FE 레포 GitHub Actions | [error-pipeline.md](error-pipeline.md) |
| PR 자동 코드 리뷰 | FE 레포 GitHub Actions (PR 열릴 때) | `fe:.github/workflows/gemini-code-review.yml` |
| API 서버 로그 알림 | API 서버 프로세스 → Discord 웹훅 | `be:src/main/kotlin/udumeoli/tripphoto/config/logging/DiscordWebhookAppender.kt` |
| KPI 이벤트 기록·Discord 알림·일일 리포트 | API 서버 (be#42로 추가) | `be:src/main/kotlin/udumeoli/tripphoto/kpi/`, `V9__create_kpi_event.sql` |
| PR 자동 라벨·담당자 지정 | BE 레포 GitHub Actions | `be:.github/workflows/auto-label.yml`, `auto-assign.yml` |
| 원격 설정 | Firebase Remote Config (FE·BE 모두 선택적으로 읽음) | `fe:src/shared/api/remote-config.ts`, `be:src/main/kotlin/udumeoli/tripphoto/config/remote/` |

## 확인 필요

- nginx 설정(라우팅, TLS 인증서 발급·갱신 방식)은 레포에 없다. 특히 이미지 스트리밍 경로 `/stream/**`가 썸네일 서비스로 가는지, 어느 호스트의 nginx가 처리하는지.
- `be:infra/terraform/`은 "새 테넌시로 옮기기 위한 재현 코드"다. 지금 운영이 옮기기 전 환경인지 옮긴 뒤 환경인지, 문서의 VM 사양(각 1 OCPU / 1GB)이 현재 값인지.
- 이미지 버킷의 공개 범위와 CORS 설정. Terraform 문서는 버킷을 공개로 적지만 이미지는 이미지별 키로 암호화되어 올라간다.
- DB 접근 제한 범위. Terraform 문서는 기존 설정이 사실상 전체 허용이었다고 적는다 — 현재 값 미확인.
- 웹 앱의 Vercel 프리뷰 배포 유무와 프리뷰가 어느 API 서버를 보는지. 워크플로는 운영 배포만 한다.
- API 도메인의 DNS 제공 방식과 만료 관리 주체.
- Discord 웹훅 알림이 운영에서 켜져 있는지 (환경변수가 비면 꺼진다).
- KPI 알림이 보내는 이벤트 종류·채널 구성과 운영 활성 여부. be#42 본문이 비어 있어 코드 확인 필요.
- 회의·알림용 팀 봇이 따로 있는지. 읽은 세 레포(FE·BE·thumbnail)에는 없다.
- BE·thumbnail 레포의 모니터링·백업 구성. 레포에 없다.
