# pinnned-llm-wiki 규칙

독자와 관리자는 AI 에이전트다. 사람 승인 없이 에이전트가 쓰고 검증하고 반영한다. 사람에게 설명하는 글을 쓰지 않는다. 공개 레포다.

목적: 코드만으로 알 수 없는 도메인 맥락(제품 규칙, FE↔BE 계약, 결정, 미확정)을 리뷰·구현 에이전트에게 준다.

## 층

- `raw/`: 원문 사본(Figma 기획, 회의 요약, 노션). 내용 수정 금지(링크·오탈자 제외). 근거로 인용하되 구속력은 없다.
- `wiki/`: 정리본. `index.md`가 유일한 진입점.
- 이 파일: 규칙의 유일한 위치.

## 읽기

1. `wiki/index.md`의 경로·키워드 표에서 해당 쪽을 찾아 1~3쪽만 연다.
2. 결과에 근거 ID를 남긴다: `D-003`, `SPEC-04 §3`, `Q07`.
3. `status: current`만 근거. `draft`는 단서이며 적힌 출처를 직접 확인하고 쓴다.

## 우선순위

- 사실(지금 어떻게 동작하나): 코드·배포본 > `wiki/` > `raw/`
- 의도(어떻게 동작해야 하나): `decisions.md` > `wiki/product/` > `raw/`. 코드는 의도의 근거가 아니다.
- 사실과 의도가 다르면 고르지 않는다. 버그로 보고하거나 `open-questions.md`에 올린다. 올리기 전에 코드와 최신 원문이 같은 답을 내는지 확인하고, 같으면 낡은 문서를 고친다.

## 쓰기

- 기록만 하고 결정하지 않는다. 근거(머지된 PR, 원문, 코드·운영 서버 확인)가 있는 것만 적는다. 근거가 없으면 `open-questions.md`에 올린다.
- `current` 조건: 코드 PR의 `wiki:` 줄, 직접 확인한 사실, 원문에 명시된 규칙. 추정이 섞이면 `draft`.
- 쓰기 전에 같은 주제의 기존 쪽을 grep한다. 모순이면 덮어쓰지 말고 `open-questions.md`에 올린다.
- 코드에서 읽을 수 있는 것은 적지 않는다. 규칙·약속·이유·함정만. 코드 위치는 `fe:경로`, `be:경로`.
- 출처 없는 문장 금지. 모르면 `확인 필요`.
- 삭제 대신 `superseded → D-nnn`.
- 날짜·상태는 머리말과 등록부(`decisions.md`, `open-questions.md`, `log.md`)에만.
- 밀도: 한 줄에 규칙 하나, 문장 끝에 출처. 도입문·요약·맺음말·중복 금지. 표는 열거할 때만.
- 금지(공개 레포): 실명, 연락처, 비밀값·토큰, 계정 정보, 회의 전사 원문·음성, 미공개 사업 정보. 사람은 역할(기획·디자인·FE·BE)로.

## 형식

```yaml
---
status: draft        # current | draft | superseded
owner: product       # product | design | fe | be | ops
sources: [SPEC-04, D-001, be#32, fe#141, meeting:2026-11-19]
verified: 2026-11-20
---
```

- 길이 상한: `product/`·`contract/`·`design/`·`system/` 100줄, `index.md` 150줄.
- `contract/` 쪽은 끝에 `## 확인 방법`(재검증 명령 또는 코드 위치).
- ID 불변: `SPEC-nn` = `raw/figma/` 파일, `Qnn` = 열린 질문, `D-nnn` = 결정. PR은 `fe#n`(mash-up-kr/Pinnned), `be#n`(mash-up-kr/udumeoli-spring).
- 새 쪽은 `index.md` 표에 경로·키워드와 함께 등록한다.

## 수집

- 코드 PR: 본문의 `wiki: <한 줄>`을 가장 먼저 읽는다. 그다음 머지된 PR 본문, 리뷰 댓글, 수정 PR에서 결정·계약 변경·반복된 함정을 뽑는다.
- Figma: [기준 페이지](wiki/design/figma-baseline.md) 안의 노드만. 사본은 `raw/figma/SPEC-nn-이름.md`(노드 ID, 프레임 이름, 원문 표기일, 확인일). 스크린샷·토큰 값·MCP 원출력 저장 금지.
- 회의: 요약을 `raw/meetings/YYYY-MM-DD.md`로. 결정마다 원문 줄 인용. 추정한 담당자·기한은 확정으로 적지 않는다.
- 노션: 정본 쪽만 `raw/notion/`에(쪽 ID, 수정일).
- 결과는 커밋 메시지와 `log.md`에 반영 / 확인 필요 / 버림으로 적는다.

## 검증

반영 전(매번):

1. 다 쓴 뒤 따로 한 번 더 읽으며 문장마다 출처와 대조한다.
2. `contract/`는 확인 방법의 명령을 실제로 실행한다. 실행 못 한 주장은 `draft`.
3. `node scripts/lint.mjs` 통과. 실패하면 반영하지 않는다.

반영 후: 주간 수집 때 그 주에 바뀐 코드와 겹치는 쪽을 재대조한다. 월 1회 `contract/` 전체를 재검증한다.

발견 즉시: 위키가 코드·배포본과 다르면 그 자리에서 고치고 `log.md`에 `fix`로 남긴다. 의도 문제인지 불분명하면 `open-questions.md`에 올린다. 같은 종류의 오류가 두 번 나오면 `scripts/lint.mjs`에 검사를 추가하거나 `wiki/retired-terms.txt`에 용어를 추가한다.

## 로그

`wiki/log.md`에 한 줄씩 추가: `## [2026-11-20] ingest | 제목` (종류: ingest, fix, lint)
