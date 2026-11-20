# pinnned-llm-wiki

[Pinnned](https://www.pinnned.co.kr/) 팀의 도메인 맥락(제품 규칙, FE↔BE 계약, 결정, 미확정)을 AI 에이전트가 읽도록 정리한 위키. AI가 쓰고 검증하고 반영한다.

- 진입점: [wiki/index.md](wiki/index.md)
- 규칙: [AGENTS.md](AGENTS.md)
- 점검: `node scripts/lint.mjs`
- 구조: `raw/`(원문 사본) → `wiki/`(정리본). [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 패턴
- 코드: [FE](https://github.com/mash-up-kr/Pinnned) · [BE](https://github.com/mash-up-kr/udumeoli-spring)
