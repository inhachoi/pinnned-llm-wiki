---
status: current
owner: fe
sources: [fe#154, fe#166, fe#175, fe:src/shared/api/analytics.ts, fe:src/shared/api/google-analytics.ts, fe:src/shared/api/analytics-runtime.tsx, fe:src/shared/api/remote-config.ts, fe:src/shared/api/firebase.ts, fe:src/entities/travel-pot/lib/invite-tracking.ts, notion:privacy-policy, notion:remote-config-server, be:src/main/kotlin/udumeoli/tripphoto/config/remote/RemoteConfigClient.kt]
verified: 2026-11-22
---

# 애널리틱스 이벤트

행동 이벤트는 `trackEvent` 한 곳을 거쳐 **자체 분석 API와 GA4 두 곳**으로 나간다 (fe#175).

## 이벤트 목록

| 이벤트 | 보내는 시점 | 파라미터 | 코드 |
| --- | --- | --- | --- |
| `page_view` | 첫 진입과 pathname이 바뀔 때. 같은 pathname 연속은 1회 | — | `fe:src/shared/api/analytics-runtime.tsx` |
| `session_started` | 탭 세션의 첫 `trackEvent` 직전에 자동 | — | `fe:src/shared/api/analytics.ts` |
| `login_completed` | 로그인 콜백에서 토큰 교환과 내 정보 조회가 성공한 뒤 | — | `fe:src/pages/login-callback` |
| `signup_completed` | 가입 API 성공 직후 | — | `fe:src/pages/signup` |
| `pot_created` / `pot_joined` | 팟 생성·참여 뮤테이션 성공 | — | `fe:src/entities/travel-pot/api/queries.ts` |
| `pot_invite_shared` | 공유 시트는 공유가 끝난 뒤, 복사는 복사 시도 직후 | `method`(`share_sheet`·`copy_link`·`copy_code`), `screen`(`pot_created`·`my_pot`) | `fe:src/entities/travel-pot/lib/invite-tracking.ts` |
| `invite_link_opened` | 초대 링크·QR로 팟 시작 화면에 들어온 순간 | — | 위와 같음 |
| `map_viewed` | 지도에서 **지역 상세가 열릴 때** | `region` | `fe:src/pages/map-google` |
| `travel_record_started` | 기록 플로우 마운트 (지역마다 새로 마운트) | `region` | `fe:src/features/travel-record` |
| `travel_record_created` | 사진 등록 뮤테이션 성공 | `region` | `fe:src/entities/photo/api/queries.ts` |
| `travel_album_viewed` | 여행 앨범 화면 마운트 | — | `fe:src/pages/travel-album` |

## 약속

- **이벤트 이름을 바꾸지 않는다.** 분석 서버가 GA4에서 같은 이름으로 조회한다. 이름을 바꾸면 분석 서버의 집계·대시보드가 그 이벤트를 찾지 못한다 (fe#175).
- `travel_record_started`는 기록 완료율(`travel_record_created` ÷ `travel_record_started`)의 분모다. 발생 시점을 옮기면 지표 정의가 바뀐다 (fe#175).
- 초대 루프는 `pot_invite_shared` → `invite_link_opened` → `pot_joined` 순서로 본다 (`fe:src/entities/travel-pot/lib/invite-tracking.ts`).
- **초대코드 값은 어떤 이벤트에도 넣지 않는다.** 중복 판정에만 쓰고 보내지 않는다 (fe#175).
- 자체 API로는 경로를 pathname만 보내고 쿼리는 뺀다. UTM 3종(`utm_source`·`utm_medium`·`utm_campaign`)만 따로 뽑아 보낸다. referrer는 origin만 보낸다 (fe#154, `fe:src/shared/api/analytics.ts`).
- referrer를 origin으로 자르는 이유는 인증 쿼리를 빼기 위해서다 (`fe:src/shared/api/google-analytics.ts`).
- 사용자 계정 ID는 보내지 않는다. 식별자는 브라우저 익명 ID와 탭 세션 ID뿐이다 (`fe:src/shared/api/analytics.ts`).
- 분석 이벤트에 이메일, 이름, 원본 userId, access·refresh 토큰, 원본 응답 객체, 이미지 URL을 넣지 않는다. 분석 식별자를 계정 userId와 결합하지 않는다 (notion:privacy-policy 2조)
- 자체 분석 이벤트의 보관 기간은 발생일로부터 90일로 약속돼 있다. 분석 서버의 보관 기간을 늘리려면 방침부터 바꾼다 (notion:privacy-policy 2조. 분석 서버 설정은 확인하지 않았다)
- 새 이벤트나 데이터를 보내는 외부 서비스를 추가하면 개인정보처리방침의 수집 이벤트 목록(2조)과 외부 서비스 표(5조)도 갱신 대상이다. 현재 방침은 코드보다 뒤처져 있다 ([Q22](../open-questions.md#q22))
- 전송은 fire-and-forget이다. 실패·타임아웃·저장소 차단이 서비스 동작에 영향을 주면 안 된다 (fe#154).
- 두 경로 모두 **운영 빌드에서만** 보낸다. 로컬 기록이 운영 지표에 섞이지 않게 한 것이다 (fe#175).

## 두 경로의 차이

- `page_view`와 `session_started`는 자체 API에만 보낸다. GA4는 자동 수집하므로 같이 보내면 두 번 찍힌다 (fe#175).
- 로그인 콜백 경로에서는 GA를 켜지 않는다. 인증 코드가 든 URL이 수집되지 않게 하기 위해서다. 그 화면에서 난 이벤트는 모아 두었다가 GA가 켜질 때 보낸다 (`fe:src/shared/api/google-analytics.ts`).
- GA4 사용자 속성 `app_platform`은 `app` 또는 `web`이다. 앱 WebView가 User-Agent에 붙이는 표시로 판정한다. 앱 쪽 표시 문자열이 바뀌면 전부 `web`으로 집계된다 (fe#175).
- GA4 속성에는 `app_platform` 맞춤 측정기준과 `inviteCode` 쿼리 매개변수 수정이 등록돼 있다. GA4 콘솔 설정이라 레포에는 없다 (fe#175).
- 자체 API 주소 환경변수가 비면 자체 API 전송만 꺼진다. GA4 전송은 그대로다 (`fe:src/shared/api/analytics.ts`).

## Firebase와 A/B 테스트

- Firebase 환경변수(API 키·프로젝트 ID·앱 ID) 중 하나라도 없으면 Firebase를 쓰지 않고 수동 gtag 로더로 동작한다. 측정 ID는 선택이다 (`fe:src/shared/api/firebase.ts`).
- Firebase Analytics와 수동 gtag 로더를 함께 쓰지 않는다. 함께 쓰면 `page_view`가 두 번 찍힌다 (`fe:src/shared/api/google-analytics.ts`).
- Analytics 초기화는 한 번만 한다. 경로 변경마다 다시 부르면 SDK가 예외를 던진다 (`fe:src/shared/api/google-analytics.ts`).
- **초기화 순서는 Analytics → Remote Config로 고정이다.** 순서가 바뀌면 실험 배정이 Analytics 사용자 속성에 기록되지 않는다 (fe#166).
- BE는 Remote Config의 서버 템플릿을 읽는다. 웹이 쓰는 클라이언트 템플릿과 별개라, 서버가 읽을 키는 서버 템플릿에 따로 만들어야 한다 (`be:src/main/kotlin/udumeoli/tripphoto/config/remote/RemoteConfigClient.kt`)
- 서버는 userId로 실험 그룹을 나눈다. 웹과 기준이 달라 같은 사용자가 웹과 서버에서 다른 그룹일 수 있다 (notion:remote-config-server, 서버 쪽은 `RemoteConfigClient.kt`)
- Remote Config 값은 SSR과 하이드레이션에서 기본값이고, 활성화 뒤 원격 값으로 다시 렌더된다 (fe#166).
- 미설정·조회 전·키 없음은 기본값이다. 조회가 실패하면 직전에 활성화된 값이 있으면 그 값, 없으면 기본값이다 (`fe:src/shared/api/remote-config.ts`).
- Remote Config 조회 간격은 1시간이다. 실험 값 변경은 그 안에 반영되지 않을 수 있다 (`fe:src/shared/api/remote-config.ts`).
- 개발 환경에서는 Analytics 없이 Remote Config만 연다. 값 확인용이며 실험 배정은 기록되지 않는다 (`fe:src/shared/api/analytics-runtime.tsx`).

## 함정

- `map_viewed`는 이름과 달리 지도 화면 진입이 아니다. 지역 상세가 열릴 때다. 상세가 열려 있는 동안 같은 지역 콜백이 반복돼도 1회이고, 닫았다가 같은 지역을 다시 열면 다시 센다.
- `invite_link_opened`는 URL `?inviteCode=` 진입에서만 센다. 로그인·가입 후 저장된 코드로 돌아온 진입까지 세면 링크 열림이 두 번 집계된다. 의도된 동작이다 (fe#175 리뷰).
- `invite_link_opened`는 같은 탭에서 직전에 연 코드와 같으면 다시 세지 않는다. 마지막 코드 하나만 기억한다. 세션 저장소를 못 쓰는 환경에서는 유실보다 드문 중복을 택해 중복 방지 없이 기록한다 (fe#175 리뷰).
- 새 사용자 속성이나 가려야 할 쿼리 매개변수를 쓰면 GA4 콘솔에도 등록해야 한다. 코드만 바꾸면 반영되지 않는다 (fe#175).
- `session_started`의 기준은 sessionStorage다. 새 탭은 새 세션이고(탭 복제는 예외) GA4의 세션 정의와 다르다.
- `pot_invite_shared`의 `screen` 값 `pot_created`는 이벤트 `pot_created`와 이름이 같다. 화면 구분 값이지 이벤트가 아니다.
- 공유 시트를 사용자가 닫으면 `pot_invite_shared`는 나가지 않는다. 복사 경로는 자동 복사가 실패해 수동 복사 안내가 떠도 나간다. `copy_link`는 공유 시트를 못 쓰는 환경의 대체 경로다.
- 수동 gtag 로더는 Firebase 설정이 운영에 들어간 뒤 지울 대상으로 표시돼 있다. 운영은 Firebase Analytics로 수집 중이다 (fe#175).
- 새 이벤트는 `trackEvent`로 보낸다. GA 함수를 직접 부르면 자체 API 쪽 기록이 빠진다 (`fe:src/shared/api/analytics.ts`).
