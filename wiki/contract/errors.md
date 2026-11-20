---
status: draft
owner: be
sources: [be:src/main/kotlin/udumeoli/tripphoto/common/graphql, be:src/main/resources/graphql/schema.graphqls, be:src/main/kotlin/udumeoli/tripphoto/auth/service/AuthException.kt, fe:src/shared/api/error-reporter]
verified: 2026-11-20
---

# 에러 계약

BE가 내는 에러 코드와 HTTP 상태, FE가 각각을 어떻게 다루는지. 인증 쪽 세부는 [auth.md](auth.md), 수집 경로는 [error-pipeline.md](../system/error-pipeline.md).

## 규칙

- GraphQL 도메인 에러는 **항상 HTTP 200**이고 `errors[].extensions.code`에 코드가 온다. FE는 `code`로만 분기한다. `message`(한국어 문장)와 `extensions.classification`은 계약이 아니다.
- HTTP 401은 `/graphql`에서 "보낸 Bearer 토큰이 무효·만료"일 때만 난다. 본문은 GraphQL 형식이 아니라 `{code, message}`다.
- 스키마에 안 맞는 쿼리는 200 + `classification: ValidationError`이고 `code`가 **없다**.
- REST(`/api/auth/**`) 에러는 해당 HTTP 상태 + `{code, message}`. 요청 본문 검증 실패는 `code` 없는 기본 400 본문이다.

## GraphQL 코드

| 코드 | BE가 내는 조건 | FE 처리 |
| --- | --- | --- |
| `UNAUTHENTICATED` | 토큰 없이 요청, 또는 토큰의 사용자가 없음 | 보고 안 함. 업로드 중이면 "로그인이 만료됐어요" 토스트 |
| `FORBIDDEN` | 팟 멤버가 아님 / owner 전용 액션을 owner가 아닌 사람이 호출 | 보고 |
| `PARTY_NOT_FOUND` | 팟 상세·이름 변경·재발급·나가기·삭제·강퇴에서 팟이 없음 | 보고 |
| `MEMBER_NOT_FOUND` | 강퇴 대상이 그 팟 멤버가 아님 | 보고 |
| `TRIP_NOT_FOUND` | `tripId`의 핀이 없음 | 보고 |
| `TRIP_RECORD_NOT_FOUND` | 삭제할 내 기록이 없음 | 보고 |
| `IMAGE_NOT_FOUND` | 넘긴 `imageId`가 없음 | 보고 + 업로드 실패 토스트에 코드 표시 |
| `REGION_NOT_FOUND` | `createTrip`의 `regionCode`가 지역 테이블에 없음 ([regions.md](regions.md)) | 보고 + 업로드 실패 토스트에 코드 표시 |
| `INVALID_INVITE_CODE` | 초대코드 형식(영숫자 6자리)이 틀리거나 없는 코드 | 보고 + 전용 토스트 |
| `ALREADY_JOINED_PARTY` | 이미 멤버인 팟에 참여 | 보고 + 토스트. 초대 링크로 들어왔으면 에러 대신 그 팟으로 통과 |
| `PARTY_FULL` | 정원 6명 초과 | 보고 + 전용 토스트 |
| `RATE_LIMITED` | 초대코드 시도가 사용자당 1분에 10회 초과 | 보고 + "잠시 후 다시 시도" 토스트 |
| `INVITE_CODE_CONFLICT` | 초대코드 발급 충돌 (재시도 대상) | 보고 |
| `CANNOT_REMOVE_OWNER` | owner를 강퇴 대상으로 지정 | 보고 |
| `VALIDATION_ERROR` | 닉네임 규칙 위반, 빈 팟 이름, 허용 안 된 이미지 `contentType`, 피드백 별점·길이 위반 | 보고 |
| `IMAGE_NOT_UPLOADED` | 스키마·enum에 있으나 던지는 코드가 없다 | — |
| `OWNER_CANNOT_LEAVE` | 스키마·enum에 있으나 던지는 코드가 없다 (owner가 나가면 위임된다) | 팟 나가기 실패 시 전용 토스트 분기가 있으나 도달하지 않는다 |

"보고"는 운영 에러 수집기로 보낸다는 뜻이다. FE는 응답의 **첫 번째 에러**의 코드만 본다.

## REST 인증 코드 (`/api/auth/**`)

| 코드 | 상태 | 조건 |
| --- | --- | --- |
| `INVALID_LOGIN_CODE` | 401 | 교환 코드가 없거나 만료·재사용 |
| `INVALID_TOKEN` | 401 | refresh 토큰이 폐기·재사용·만료, `signupToken` 무효·만료, 소셜 제공자 토큰 검증 실패 |
| `USER_NOT_FOUND` | 401 | refresh의 사용자가 없음. 탈퇴는 refresh 토큰을 먼저 지우므로 탈퇴 계정은 `INVALID_TOKEN`이 된다 |
| `SIGNUP_ALREADY_COMPLETED` | 409 | 이미 가입된 소셜 계정으로 가입 시도 |
| `VALIDATION_ERROR` | 400 | 닉네임 규칙 위반, 없는 프로필 이미지, 허용 안 된 이미지 형식 |
| `EXTERNAL_API_ERROR` | 503 | 카카오 사용자 정보 조회, 애플 공개키 조회 실패. 카카오 토큰 검증 단계의 통신 실패는 503이 아니라 401 `INVALID_TOKEN`이다 (`/api/auth/login/{provider}` 경로) |

FE는 REST 4xx를 보고하지 않는다. 예외는 재발급 401 하나다 (강제 로그아웃 지점). 5xx와 네트워크 실패는 보고한다.

## FE 수집 필터 요약

- 보고 제외: `/graphql`의 HTTP 401 (재발급이 처리하는 정상 흐름), 코드 `UNAUTHENTICATED` (토큰 없이 나간 요청).
- 그 외 GraphQL 에러·5xx·네트워크 실패는 전부 보고한다. 우리 API 응답을 수집에서 더 빼려면 그 응답이 정상 흐름이라는 근거가 필요하다 (`fe:.github/weekly-triage/PROMPT.md` 판정 기준).

## 함정

- 팟 범위 조회(`partyTrips`, `partyTripInRegion`, `partyVisitedRegions` 등)는 멤버 여부만 본다. **없는 `partyId`도 `PARTY_NOT_FOUND`가 아니라 `FORBIDDEN`**이다. FE가 "팟이 삭제됨"을 구분하려면 `partyDetail`·`myParties`로 판단해야 한다.
- `partyTripInRegion`에 없는 `regionCode`를 넘기면 에러가 아니라 `null`이다. `REGION_NOT_FOUND`는 `createTrip`에서만 난다.
- FE `fe:src/pages/my-page/ui/MyPotEditPage.tsx`는 팟 삭제 실패에서 `PARTY_HAS_MEMBERS`를 분기하지만 BE에 그 코드는 없다 (멤버가 남아도 삭제된다). 죽은 분기다.
- 한 요청에 `__type`을 여러 번 넣은 인트로스펙션은 200 + `classification: BadFaithIntrospection`으로 거부된다. 타입마다 따로 조회한다.
- 처리되지 않은 서버 예외(5xx 성격)가 GraphQL 응답에서 어떤 상태·형태로 오는지는 확인 필요. 도메인 예외 변환기는 `GraphQlDomainException`만 다룬다.

## 확인 방법

```bash
U=https://pinnnned.duckdns.org
# 200 + code
curl -s -w '\n%{http_code}\n' -X POST $U/graphql -H 'Content-Type: application/json' -d '{"query":"{ partyTrips(partyId: \"1\") { id } }"}'
# 스키마 위반 → 200, code 없음
curl -s -w '\n%{http_code}\n' -X POST $U/graphql -H 'Content-Type: application/json' -d '{"query":"{ nope }"}'
# 코드별 던지는 위치
gh api "search/code?q=PARTY_FULL+repo:mash-up-kr/udumeoli-spring" --jq '.items[].path'
```

- 코드 목록·분류 변환: `be:src/main/kotlin/udumeoli/tripphoto/common/graphql/GraphQlDomainException.kt`, `GraphQlDomainExceptionResolver.kt`
- 멤버·owner 검사: `be:.../party/service/PartyQueryService.kt` (`requireMember`), `PartyCommandService.kt` (`requireOwner`)
- 참여 제한: `be:.../party/service/PartyJoinService.kt`, `JoinPartyRateLimiter.kt`
- REST 코드: `be:.../auth/service/AuthException.kt`, `AuthService.kt`, `JwtTokenService.kt`, `KakaoTokenValidator.kt`, `be:.../auth/web/AuthController.kt`
- FE 보고 여부: `fe:src/shared/api/error-reporter/api-failure.ts` / 코드 분기: `fe:src/pages/pot-join/ui/PotJoinPage.tsx`, `fe:src/entities/photo/api/photo.api.ts`
- 비멤버 `FORBIDDEN`은 로그인 토큰이 있어야 재현된다. 운영에서는 다른 팟의 `partyId`로 `partyTrips`를 조회해 확인한다.
