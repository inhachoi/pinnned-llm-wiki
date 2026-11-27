---
status: current
owner: ops
sources: []
verified: 2026-11-27
---

# 목차

바꾸는 코드 경로나 키워드로 해당하는 쪽만 골라 연다. 전체를 읽지 않는다. 규칙은 [AGENTS.md](../AGENTS.md).

## 항상 해당

| 쪽 | 읽을 때 | 내용 |
| --- | --- | --- |
| [decisions.md](decisions.md) | 제품 동작을 바꿀 때 | 확정 결정과 이유 (D-001~). 의도의 최종 근거 |
| [open-questions.md](open-questions.md) | 정책이 불분명할 때 | 미확정·충돌 (Q01~Q26). 열린 것은 확정처럼 구현 금지 |
| [glossary.md](glossary.md) | 용어가 낯설 때 | 팟, 팟장, 초대코드, 티켓, 기록, 키워드, 핀, 슬롯, 리캡 |

## 제품 규칙

| 쪽 | FE 경로 | 키워드 |
| --- | --- | --- |
| [product/auth-onboarding.md](product/auth-onboarding.md) | `pages/landing` `pages/login-callback` `pages/signup` `features/auth` `features/onboarding` | 로그인, 회원가입, 닉네임, 아바타, 권한 팝업, 로딩 |
| [product/pot.md](product/pot.md) | `pages/pot-start` `pages/pot-create` `pages/pot-join` `widgets/pot-dropdown` `entities/travel-pot` `pages/my-page`(팟 편집) | 팟 생성, 초대코드 6자리, 정원 6명, 티켓, 팟 전환, 팟 삭제·나가기, 팟장 |
| [product/map.md](product/map.md) | `pages/map-google` `widgets/travel-map-google` `entities/region` | 줌 단계, 대표 키워드, 동률, 핀, 툴팁, 바텀시트, 첫 진입 가이드 |
| [product/record-upload.md](product/record-upload.md) | `features/travel-record` `entities/photo` | 키워드 선택, 사진 선택, 코멘트, 미리보기, 업로드 완료 |
| [product/album.md](product/album.md) | `pages/travel-album` `pages/travel-album-region` `features/photo-gallery` | 지역 카드, 멤버 자리(슬롯), n/N명, 사진 뷰어, 수정·삭제 |
| [product/recap.md](product/recap.md) | `features/recap` | 리캡 카드, 통계, 멤버 정렬, 저장·공유 |
| [product/my-page.md](product/my-page.md) | `pages/my-page` `entities/user` `entities/feedback` | 프로필, 로그아웃, 계정 삭제, 약관 |

## FE↔BE 계약

BE에서 제품 동작(`tripphoto/trip` `tripphoto/party` `tripphoto/user`)을 바꿀 때는 위 "항상 해당"의 결정·열린 질문과 "제품 규칙" 표를 키워드로 찾는다.

| 쪽 | FE 경로 | BE 경로 | 키워드 |
| --- | --- | --- | --- |
| [contract/auth.md](contract/auth.md) | `shared/api/auth-fetch.ts` `shared/api/token-*.ts` `features/auth` | `tripphoto/auth` `docs/authentication.md` | 토큰 수명, refresh 1회용, 200 vs 401, 강제 로그아웃, 로그인 코드 교환 |
| [contract/errors.md](contract/errors.md) | `shared/api/client.ts` `shared/api/error-reporter` | `common/graphql` `schema.graphqls` | GraphQL 에러 코드, UNAUTHENTICATED, FORBIDDEN, PARTY_FULL, 스키마에만 있는 코드 |
| [contract/regions.md](contract/regions.md) | `entities/region` | `tripphoto/region` `db/migration` | regionCode, 2자리·5자리, 광역시, 세종, REGION_NOT_FOUND |
| [contract/images.md](contract/images.md) | `entities/photo/api` | `tripphoto/image` `StorageProperties.kt` | 업로드 URL, 암호화 헤더, 썸네일, contentType |

## 시스템·디자인

| 쪽 | 읽을 때 | 내용 |
| --- | --- | --- |
| [system/error-pipeline.md](system/error-pipeline.md) | `shared/api/error-reporter` `shared/server` `.github/weekly-triage` | 에러 수집 → 노션 QA → 주간 트리아지 → 머지 후 정리 |
| [system/analytics.md](system/analytics.md) | `shared/api/analytics*.ts` `shared/api/google-analytics.ts` `shared/api/remote-config.ts` `entities/travel-pot/lib/invite-tracking.ts` `trackEvent` 호출부 | 이벤트 이름·시점, GA4, signup_completed, 초대 공유·열림, app_platform, 초대코드 미전송, Firebase, Remote Config, A/B 테스트 |
| [system/notion-sources.md](system/notion-sources.md) | 노션 문서를 근거로 쓰려 할 때 | 근거로 쓰는 쪽, 이유만 참고하는 쪽, 낡은 API 가이드, `notion:` ID |
| [system/infra.md](system/infra.md) | 배포·호스팅·봇 | FE·BE·썸네일·봇이 도는 곳 |
| [design/figma-baseline.md](design/figma-baseline.md) | Figma URL을 받았을 때 | 최종 페이지 하나만 기준, 영역별 노드, 미수집 패널, 레거시 디자인 시스템 |
| [log.md](log.md) | 위키를 갱신할 때 | 수집·수정 기록 |

## 원문 사본 (`raw/figma`, 구속력 없음)

정리본의 인용을 확인할 때만 연다.

| ID | 파일 |
| --- | --- |
| SPEC-01 | [auth-onboarding](../raw/figma/SPEC-01-auth-onboarding.md) |
| SPEC-02 | [pot-entry](../raw/figma/SPEC-02-pot-entry.md) |
| SPEC-03 | [pot-create](../raw/figma/SPEC-03-pot-create.md) |
| SPEC-04 | [pot-join](../raw/figma/SPEC-04-pot-join.md) |
| SPEC-05 | [map-zoom](../raw/figma/SPEC-05-map-zoom.md) |
| SPEC-06 | [map-common](../raw/figma/SPEC-06-map-common.md) |
| SPEC-07 | [map-first-guide](../raw/figma/SPEC-07-map-first-guide.md) |
| SPEC-08 | [map-record-states](../raw/figma/SPEC-08-map-record-states.md) |
| SPEC-09 | [record-upload-1](../raw/figma/SPEC-09-record-upload-1.md) |
| SPEC-10 | [record-upload-2](../raw/figma/SPEC-10-record-upload-2.md) |
| SPEC-11 | [album-list](../raw/figma/SPEC-11-album-list.md) |
| SPEC-12 | [album-region](../raw/figma/SPEC-12-album-region.md) |
| SPEC-13 | [photo-viewer](../raw/figma/SPEC-13-photo-viewer.md) |
| SPEC-14 | [recap](../raw/figma/SPEC-14-recap.md) |
| SPEC-15 | [recap-card](../raw/figma/SPEC-15-recap-card.md) |
| SPEC-16 | [my-page](../raw/figma/SPEC-16-my-page.md) |
| SPEC-17 | [pot-settings](../raw/figma/SPEC-17-pot-settings.md) |
| SPEC-18 | [loading](../raw/figma/SPEC-18-loading.md) |

## 회의 결정 사본 (`raw/meetings`, 구속력 없음)

`meeting:YYYY-MM-DD`는 `raw/meetings/YYYY-MM-DD.md`다. 노션 회의록에서 세 조건을 통과한 결정, 결정의 이유로 쓰는 배경, 범위가 불분명해 질문으로 남긴 미확정을 구분해 옮긴 것이고 원문은 레포에 없다. 정리본의 인용을 확인할 때만 연다.
