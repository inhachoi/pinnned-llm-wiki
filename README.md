# pinnned-llm-wiki

[Pinnned](https://www.pinnned.co.kr/) 팀의 도메인 맥락(제품 규칙, FE↔BE 계약, 결정, 미확정)을 AI 에이전트가 읽도록 정리한 위키. AI가 쓰고 검증하고 반영한다.

- 진입점: [wiki/index.md](wiki/index.md)
- 규칙: [AGENTS.md](AGENTS.md)
- 점검: `node scripts/lint.mjs`
- 코드: [FE](https://github.com/mash-up-kr/Pinnned) · [BE](https://github.com/mash-up-kr/udumeoli-spring)

## 구조

[Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 패턴: 원문 → 정리본 → 규칙.

```
raw/                원문 사본. 고치지 않음, 구속력 없음
  figma/            Figma 기획 패널 (SPEC-nn)
  meetings/         회의에서 걸러낸 결정
  notion/           노션 글 사본
wiki/               정리본
  index.md          목차. 유일한 진입점 (코드 경로·키워드 → 쪽)
  decisions.md      확정 결정 (D-nnn)
  open-questions.md 미확정 (Qnn)
  glossary.md       용어
  product/          기능별 제품 규칙
  contract/         FE↔BE 계약
  design/           Figma 기준
  system/           시스템 구성
  log.md            수집·수정 기록
AGENTS.md           규칙
scripts/lint.mjs    점검 스크립트
.github/ingest/     주간 수집 절차
```
