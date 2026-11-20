---
status: current
owner: ops
sources: []
verified: 2026-11-20
---

# 목차

관련된 1~3쪽만 연다. 규칙은 [AGENTS.md](../AGENTS.md).

## 등록부

- [확정 결정](decisions.md) — 날짜순 결정과 이유 (D-001~). 의도의 근거는 여기다
- [열린 질문](open-questions.md) — 아직 정해지지 않은 정책과 문서 간 충돌 (Q01~Q18)
- [용어집](glossary.md) — 팟, 팟장, 초대코드, 티켓, 기록, 키워드, 핀, 슬롯, 리캡 등
- [로그](log.md) — 수집·점검 기록

## 제품 규칙 (기능별)

- [인증·온보딩](product/auth-onboarding.md) — 로그인, 닉네임·아바타, 권한 팝업, 로딩 화면
- [여행팟](product/pot.md) — 진입, 생성, 초대코드 참여(6자리·정원 6명), 전환, 설정·삭제·나가기
- [지도](product/map.md) — 줌 단계, 대표 키워드와 동률 규칙, 핀·툴팁·바텀시트, 첫 진입 가이드
- [기록 업로드](product/record-upload.md) — 키워드 → 사진 → 코멘트, 미리보기, 완료 처리
- [앨범·사진 뷰어](product/album.md) — 지역 카드와 멤버 자리, 지역 앨범, 사진 수정·삭제
- [리캡](product/recap.md) — 리캡 카드 구성, 통계, 멤버 정렬, 저장·공유
- [마이페이지](product/my-page.md) — 프로필, 로그아웃, 계정 삭제, 약관

## FE↔BE 계약

- [인증](contract/auth.md) — 로그인 교환, 토큰 수명, refresh 1회용 규칙, 200과 401의 차이, 강제 로그아웃 조건
- [에러 코드](contract/errors.md) — BE가 내는 GraphQL 코드와 HTTP 상태, FE의 처리. 스키마에만 있고 안 쓰이는 코드
- [지역코드](contract/regions.md) — 2자리·5자리 코드 규칙과 예외(광역시, 세종)
- [이미지 업로드](contract/images.md) — 업로드 URL 발급, 헤더, 썸네일 서비스 연동

## 시스템

- [에러 수집 파이프라인](system/error-pipeline.md) — 수집 → 노션 QA → 주간 트리아지 → 머지 후 정리, 세 자동화의 위치
- [인프라](system/infra.md) — FE·BE·썸네일·봇이 도는 곳

## 디자인

- [Figma 기준 페이지](design/figma-baseline.md) — 최종 페이지 하나만 기준. 영역별 노드와 기획 사본 대응, 미수집 패널

## 원문 사본 (구속력 없음)

Figma 기획 패널을 옮긴 것. 원문 표기일 2026.09.02, 확인일 2026-10-20.

- [SPEC-01 로그인/회원가입](../raw/figma/SPEC-01-auth-onboarding.md)
- [SPEC-02 여행팟 생성/참여 진입점](../raw/figma/SPEC-02-pot-entry.md)
- [SPEC-03 새 팟 만들기](../raw/figma/SPEC-03-pot-create.md)
- [SPEC-04 초대코드로 참여하기](../raw/figma/SPEC-04-pot-join.md)
- [SPEC-05 줌인 기준 정리](../raw/figma/SPEC-05-map-zoom.md)
- [SPEC-06 지도 내 공통 디자인](../raw/figma/SPEC-06-map-common.md)
- [SPEC-07 지도 줌인 가이드](../raw/figma/SPEC-07-map-first-guide.md)
- [SPEC-08 등록 순서별 노출 UI](../raw/figma/SPEC-08-map-record-states.md)
- [SPEC-09 여행 기록 업로드 (1)](../raw/figma/SPEC-09-record-upload-1.md)
- [SPEC-10 여행 기록 업로드 (2)](../raw/figma/SPEC-10-record-upload-2.md)
- [SPEC-11 여행 이미지 상세 보기](../raw/figma/SPEC-11-album-list.md)
- [SPEC-12 여행 이미지 상세 보기](../raw/figma/SPEC-12-album-region.md)
- [SPEC-13 여행 이미지 상세 보기](../raw/figma/SPEC-13-photo-viewer.md)
- [SPEC-14 리캡](../raw/figma/SPEC-14-recap.md)
- [SPEC-15 리캡 내부 디자인](../raw/figma/SPEC-15-recap-card.md)
- [SPEC-16 마이페이지](../raw/figma/SPEC-16-my-page.md)
- [SPEC-17 마이페이지 - 팟 편집](../raw/figma/SPEC-17-pot-settings.md)
- [SPEC-18 로딩 화면](../raw/figma/SPEC-18-loading.md)
