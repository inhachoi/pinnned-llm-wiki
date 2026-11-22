---
status: current
owner: fe
sources: [fe#175, fe:src/shared/api/analytics.ts, fe:src/shared/api/google-analytics.ts, fe:src/entities/travel-pot/lib/invite-tracking.ts]
verified: 2026-11-22
---

# 행동 분석 이벤트

- `trackEvent`는 자체 분석 API와 GA4에 한 번씩 보낸다. `page_view`·`session_started`는 GA4 자동 수집에 맡겨 GA4로는 보내지 않는다. [fe#175]
- 이벤트 이름은 분석 서버(pinnned-analytics)가 GA4에서 같은 이름으로 조회한다. 이름을 바꾸면 집계가 끊기므로 바꾸지 않는다. [fe#175, fe:src/shared/api/google-analytics.ts]
- 두 경로 모두 운영 빌드에서만 전송한다. 로컬 개발 기록이 운영 지표에 섞이지 않게 하는 약속이다. [fe#175, fe:src/shared/api/google-analytics.ts]
- 초대코드 값은 어떤 이벤트에도 넣지 않는다. [fe#175, fe:src/entities/travel-pot/lib/invite-tracking.ts]
- 로그인 콜백(`/login/callback`)에서는 코드가 든 URL이 수집되지 않도록 GA 로드를 미룬다. 그 화면에서 난 이벤트는 GA가 켜진 뒤 전송된다. [fe#175, fe:src/shared/api/google-analytics.ts]
- 앱·웹 구분은 WebView User-Agent의 `PinnnedApp`으로 판정해 GA4 사용자 속성 `app_platform`(app/web)에 넣는다. [fe#175]

| 이벤트 | 시점 | 파라미터 |
| --- | --- | --- |
| `signup_completed` | 실제 가입 성공 | 없음 |
| `pot_invite_shared` | 초대 공유(공유 시트·링크 복사·코드 복사). 팟 생성 완료·마이팟 편집 화면 | `method`, `screen` |
| `invite_link_opened` | 초대 링크·QR로 팟 시작 진입 | 없음 |
| `travel_record_started` | 여행 기록 플로우 진입 (기록 완료율의 분모) | `region` |

## 함정

- `invite_link_opened`는 URL `?inviteCode=` 진입에서만 센다. 로그인·가입 후 저장된 코드로 돌아온 진입까지 세면 링크 열림이 두 번 집계된다. 의도된 동작이다. [fe#175 리뷰]
- 같은 탭·같은 코드는 1회만 센다. 세션 저장소를 못 쓰는 환경(Safari 프라이빗 등)에서는 유실보다 드문 중복을 택한다. [fe#175 리뷰]
- Firebase Analytics와 수동 gtag 로더를 함께 켜면 `page_view`가 두 번 찍힌다. 운영은 Firebase 경로이고 수동 로더는 Firebase 환경변수가 없을 때의 대체다. [fe:src/shared/api/google-analytics.ts]
- GA4 쪽 설정(사용자 범위 맞춤 측정기준 `app_platform`, 웹 스트림의 `inviteCode` 쿼리 매개변수 등록)은 코드 밖이다. 새 속성·매개변수를 쓰면 GA4에서도 등록해야 한다. [fe#175]
