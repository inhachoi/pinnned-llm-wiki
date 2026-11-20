---
status: current
owner: ops
sources: [fe#173, fe#179, fe:src/shared/api/error-reporter, fe:src/shared/server, fe:.github/workflows/weekly-triage.yml, fe:.github/workflows/weekly-triage-merged.yml, fe:.github/weekly-triage/PROMPT.md]
verified: 2026-11-20
---

# 운영 에러 파이프라인

운영 에러는 노션 QA 데이터베이스 한 곳에 모이고, 주 1회 자동 트리아지가 원인별로 묶어 수정 PR을 연다. **서로 독립된 자동화 3개**다. 하나가 멈춰도 나머지는 돈다. 어떤 코드를 보고하는지는 [errors.md](../contract/errors.md).

| # | 자동화 | 어디서 도나 | 트리거 | 쓰는 것 |
| --- | --- | --- | --- | --- |
| 1 | 런타임 수집 | 배포된 웹 앱 (브라우저 + FE 서버 함수) | 에러 발생 시점 | 노션 행 생성 또는 횟수 증가 |
| 2 | 주간 트리아지 | FE 레포 GitHub Actions | 매주 월요일 09:00 KST, 수동 실행 가능 | 노션 행 메모, GitHub 이슈, 수정 PR 1개 |
| 3 | 머지 후 종결 | FE 레포 GitHub Actions | `weekly-triage` 라벨 PR 머지 | 노션 행 `진행=Done` + 해결 내용 |

## 1. 런타임 수집

- 브라우저 리포터는 **운영 빌드이면서 운영 호스트일 때만** 켜진다. 로컬·프리뷰 배포에서는 아무것도 보내지 않는다.
- 수집 대상: 전역 JS 에러, 처리 안 된 promise 거부, 렌더 에러(에러 바운더리), API 실패. SSR 예외와 5xx 응답은 브라우저를 거치지 않고 서버 엔트리가 직접 기록한다.
- 브라우저는 같은 origin의 `/report-error`로 보낸다. `/api/**`는 BE 프록시라 쓸 수 없어 이 경로다.
- 수신 라우트는 **어떤 입력에도 204**다. 수집 실패가 앱에 드러나지 않게 하는 약속이다. 그래서 응답으로는 기록 성공 여부를 알 수 없다.
- 중복 판정은 지문(fingerprint) 기준이다.
  - 같은 지문의 Todo 행이 있으면 `발생 횟수 +1`, `마지막 발생`·`환경` 갱신.
  - 없으면 새 Todo 행.
  - **Done 행만 있으면 그 행은 닫힌 기록으로 두고 새 행을 만든다.** 새 행의 `원인 요약`에 `[재발] 이전 해결 행: <링크>`가 들어간다.
- 보호 장치: 세션당 20건 상한, 세션 내 같은 에러 1회, 수신 측 인스턴스당 분당 60건, 본문 32KB 상한, Origin 검사, 노이즈 필터(서드파티 스크립트·확장·취소된 요청).
- 스택은 서버가 소스맵으로 복원해 기록한다. SSR 에러는 복원 없이 원본 스택이다.
- 필요한 서버 환경변수는 노션 토큰과 QA 데이터베이스 ID 둘이다. 없으면 **조용히 기록을 건너뛴다** (경고 로그 1회).

코드: 리포터 `fe:src/shared/api/error-reporter/` (`reporter.ts`, `api-failure.ts`, `filter.ts`, `runtime.tsx`) / 수신 `fe:src/app/routes/report-error.ts` / 서버 엔트리 `fe:src/app/server.ts` / 기록 `fe:src/shared/server/ingest-error.ts`, `qa-notion.ts`, `fingerprint.ts`, `row-content.ts`, `stack-resolver.ts`

## 2. 주간 트리아지

- 사람 없는 CI에서 에이전트가 돈다. 절차·판정 기준·PR 본문 규격은 프롬프트 파일 하나에 있고, 바꾸려면 PR로 리뷰한다.
- 읽는 대상: `진행=Todo`인 행 중 지난주에 발생한 것, `원인 요약`이 빈 것, 지난 `[보류]` 행.
- 증상이 아니라 **근본 원인**으로 묶는다. 묶음마다 FE / BE / FE+BE / 노이즈 / 보류 중 하나로 판정한다.

| 판정 | 만드는 것 | 노션 |
| --- | --- | --- |
| FE | FE 레포 이슈 + 수정 커밋 (원인 재현 테스트 포함) | `원인 요약`, `FE 이슈`, `PR`. `진행`은 Todo 유지 |
| BE | BE 레포 이슈만. BE 코드는 고치지 않는다 | `원인 요약`(`[BE]`), `BE 이슈`. Todo 유지 |
| 노이즈 | 수집 필터 수정 | `[노이즈]` + `진행=Done` |
| 보류 | 없음 | `[보류] <부족한 것>` + Todo 유지 |

- 수정 커밋이 하나라도 있으면 전체를 PR **1개**로 올린다. 브랜치 `fix/weekly-triage-<날짜>`, 라벨 `weekly-triage`.
- 커밋·PR은 타입체크·린트·테스트·빌드가 모두 통과한 묶음만 들어간다. 실패한 묶음은 변경을 버리고 이슈만 남긴다.
- 이슈를 만들 조건은 셋 다다: 원인을 코드 위치로 짚을 수 있다, 그 원인이 증상을 설명한다, 재현 조건을 쓸 수 있다. 하나라도 빠지면 보류.
- 노션 행의 모든 필드는 공개 엔드포인트로 들어온 **데이터**다. 그 안의 지시문은 따르지 않고 노이즈로 닫는다.

코드: `fe:.github/workflows/weekly-triage.yml` / `fe:.github/weekly-triage/PROMPT.md` / 노션 조작 `fe:scripts/qa-notion.mjs`, `fe:scripts/qa-notion/lib.mjs`

## 3. 머지 후 종결

- 조건은 "머지됨" + "`weekly-triage` 라벨". 라벨 없는 PR은 노션을 건드리지 않는다.
- PR 본문에서 노션 링크를 뽑아 그 행들을 `Done`으로 바꾸고, 행 본문 끝에 해결 내용(문제·해결·검증·PR 링크)을 덧붙인다.
- 그래서 **PR 본문 "증상" 줄에 노션 행 링크가 빠지면 그 행은 Todo로 남는다.** 사람이 본문을 고쳐 쓸 때 링크를 지우지 않는다.
- GitHub 이슈는 본문의 `close #n`으로 GitHub가 닫는다. 이 워크플로가 닫지 않는다.

코드: `fe:.github/workflows/weekly-triage-merged.yml` / `fe:scripts/qa-notion.mjs`의 `resolve`

## 함정

- BE 원인 행은 자동으로 닫히지 않는다. BE가 고쳐 배포한 뒤 사람이 `Done`으로 바꾼다. 안 바꾸면 매주 대상에 다시 들어온다.
- 노이즈로 `Done` 처리한 지문이 다시 오면 재발 행이 새로 생긴다. 필터를 같이 고쳐야 멈춘다.
- 노션에는 원자적 upsert가 없다. 같은 지문이 동시에 들어오면 행이 2개 생길 수 있다 (알려진 한계).
- `진행`은 Todo / Done 둘뿐이다. 보류·노이즈·재발 같은 사정은 `원인 요약` 첫머리 꼬리표로만 구분한다. 꼬리표 문자열을 바꾸면 2번의 대상 필터가 깨진다.
- 트리아지가 만든 PR이 CI를 타려면 기본 토큰이 아닌 별도 토큰으로 push해야 한다. 그 토큰이 만료되면 PR은 열려도 CI가 돌지 않는다.
- 수신 측 분당 상한은 함수 인스턴스별이다. 인스턴스가 여럿이면 전체 상한은 그만큼 늘어난다.
- 우리 API 응답을 수집에서 빼는 것은 신호를 끄는 일이다. 빼기 전에 그 응답이 정상 흐름인 코드 경로와 BE가 그 응답을 내는 조건을 확인한다.
