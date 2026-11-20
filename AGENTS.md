# pinnned-llm-wiki 운영 규칙

Pinnned(우두머리) 팀의 제품 결정, FE↔BE 계약, 열린 질문을 모은 위키다. 사람과 에이전트가 같이 읽는다. **공개 레포다.**

구조는 Andrej Karpathy의 [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 패턴(원문 `raw/` → 정리본 `wiki/` → 규칙 파일, 작업은 ingest·query·lint)을 따른다. 팀용으로 바꾼 점은 둘이다. 정리본은 PR로 사람이 승인하고, 공개 레포라 원문은 요약·사본만 둔다.

## 층

| 위치 | 내용 | 규칙 |
| --- | --- | --- |
| `raw/` | 원문 사본 (Figma 기획, 회의 요약, 노션 글) | 내용을 고치지 않는다 (링크·오탈자 제외). 구속력 없음 |
| `wiki/` | 정리본 | 에이전트가 쓰고 사람이 PR로 승인한다 |
| `AGENTS.md` | 이 파일 | 규칙은 여기 한 곳에만 둔다 |

## 읽기 (query)

1. `wiki/index.md`를 읽고 관련된 1~3쪽만 연다. 전체를 읽지 않는다.
2. 계획과 결과에 근거 ID를 남긴다. 예: `D-003`, `SPEC-04 §3`, `Q07`.
3. `status: current`인 쪽만 근거로 쓴다. `draft`는 단서다. 적힌 출처를 직접 확인한 뒤에 쓴다.

## 무엇이 이기는가

| 질문 | 우선순위 |
| --- | --- |
| 지금 어떻게 동작하나 (사실) | 코드·배포본 > `wiki/` > `raw/` |
| 어떻게 동작해야 하나 (의도) | `wiki/decisions.md`의 확정 결정 > `raw/`. 코드는 의도의 근거가 아니다 |

사실과 의도가 다르면 고르지 않는다. 버그로 보고하거나 `wiki/open-questions.md`에 올린다. 올리기 전에 코드와 가장 최신 원문이 이미 같은 답을 내는지 확인하고, 같으면 질문이 아니라 낡은 문서 수정으로 처리한다.

## 쓰기

- `main`에 직접 push하지 않는다. 브랜치 → PR → 사람 머지.
- 쓰기 전에 같은 주제의 기존 쪽을 grep한다. 모순이면 덮어쓰지 말고 `open-questions.md`에 올린다.
- 코드에서 읽을 수 있는 것은 적지 않는다. 이유, 약속, 결정, 함정만 적고 코드 위치는 `레포:경로` 포인터로 남긴다.
- 출처 없는 문장을 쓰지 않는다. 모르면 `확인 필요`라고 쓴다. 추측으로 채우지 않는다.
- 지우지 않고 닫는다. 뒤집힌 결정은 `superseded → D-nnn`으로 표시하고 남긴다.
- 날짜와 상태는 머리말과 등록부(`decisions.md`, `open-questions.md`, `log.md`)에만 적는다. 본문에는 ID만 쓴다.
- **공개 레포 금지 항목**: 실명, 연락처, 비밀값·토큰, 계정 정보, 회의 전사 원문과 음성, 미공개 사업 정보. 사람은 역할(기획·디자인·FE·BE)로 적는다.

## 페이지 형식

`wiki/`의 모든 쪽은 머리말로 시작한다.

```yaml
---
status: draft        # current | draft | superseded
owner: product       # product | design | fe | be | ops
sources: [SPEC-04, D-001, be#32, fe#141, meeting:2026-11-19]
verified: 2026-11-20
---
```

- 길이: `product/`·`contract/`·`design/`·`system/` 쪽은 100줄, `index.md`는 150줄 이하. 넘으면 쪼갠다.
- `contract/` 쪽은 사실을 다시 확인할 수 있는 명령이나 코드 위치를 "확인 방법"에 적는다.
- ID는 바꾸지 않는다. `SPEC-nn`은 `raw/figma/` 파일, `Qnn`은 열린 질문, `D-nnn`은 확정 결정이다.
- PR 참조는 `fe#번호`(mash-up-kr/Pinnned), `be#번호`(mash-up-kr/udumeoli-spring)로 쓴다.
- 새 쪽을 만들면 `index.md`에 한 줄 요약과 함께 등록한다.

## 수집 (ingest)

| 경로 | 방식 |
| --- | --- |
| 코드 PR | PR 본문에 `wiki: <확정된 규칙이나 계약 변경 한 줄>`. 주간 수집이 가장 먼저 읽는다 |
| Figma | [기준 페이지](wiki/design/figma-baseline.md) 안의 노드만 받는다. 사본을 `raw/figma/SPEC-nn-이름.md`로. 노드 ID, 프레임 이름, 원문 표기일, 확인일을 적는다. 스크린샷·토큰 값·MCP 원출력은 저장하지 않는다 |
| 회의 | 요약을 `raw/meetings/YYYY-MM-DD.md`로. 역할 표기, 전사 원문 금지 |
| 노션 | 정본인 쪽만 `raw/notion/`에. 쪽 ID와 수정일을 적는다 |

수집 결과는 PR 본문에 세 바구니로 적는다.

- **반영**: 대상이 특정되고 결정 신호가 분명한 것
- **확인 필요**: 원문 인용과 함께 질문으로
- **버림**: 잡담, 아이디어, 근거 없는 것

회의 요약에서 뽑은 결정에는 원문 줄을 인용한다. 추정한 담당자나 기한은 확정으로 적지 않는다.

## 점검 (lint)

PR 전에 `node scripts/lint.mjs`를 통과시킨다. CI에서도 돈다. 폐기된 용어는 `wiki/retired-terms.txt`에 추가한다.

## 로그

수집과 점검은 `wiki/log.md`에 한 줄씩 추가한다. 형식: `## [2026-11-20] ingest | 제목`
