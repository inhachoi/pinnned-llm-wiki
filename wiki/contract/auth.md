---
status: current
owner: be
sources: [be:docs/authentication.md, be:src/main/kotlin/udumeoli/tripphoto/auth, be:src/main/resources/application.yml, fe:src/shared/api, fe:src/features/auth]
verified: 2026-11-20
---

# 인증 계약

FE가 기대도 되는 로그인·토큰 규칙. 구현은 포인터만 남긴다. 에러 코드 전체는 [errors.md](errors.md).

## 로그인 흐름

1. 브라우저를 BE origin의 `/oauth2/authorization/{provider}?frontendRedirect=<콜백 URL>`로 **직접 이동**시킨다 (프록시 경유 아님).
2. BE는 소셜 인증 후 FE의 `/login/callback?code=<1회용 코드>`로 302 한다.
3. FE는 `POST /api/auth/exchange {code}`를 **정확히 한 번** 호출한다.
4. 응답 `status`가 `AUTHENTICATED`면 `tokens`가, `SIGNUP_REQUIRED`면 `signupToken`만 온다.
5. 가입은 `POST /api/auth/signup {signupToken, nickname, profileImage}` → 토큰 쌍.

약속:

- `frontendRedirect`는 BE 화이트리스트(`auth.allowed-frontend-callback-urls`)와 **문자열이 정확히 같을 때만** 적용된다. 다르면 에러 없이 기본 콜백으로 간다.
- 1회용 코드는 2분, 1회. BE 메모리(단일 인스턴스 캐시)에만 있어 BE 재시작 시 사라진다. 재사용·만료는 `401 INVALID_LOGIN_CODE`.
- 소셜 제공자의 닉네임은 쓰지 않는다. 신규 사용자는 닉네임을 직접 입력한다.
- 토큰은 쿠키가 아니라 **JSON 본문**으로 온다. FE가 직접 보관하고 `Authorization: Bearer <accessToken>`으로 보낸다.
- 웹은 위 리다이렉트 흐름만 쓴다. 소셜 토큰을 직접 넘기는 `POST /api/auth/login/{kakao|google|apple}`도 있으며 응답 형태는 교환과 같다. FE 레포에는 호출부가 없다.
- 가입 전 프로필 사진 업로드는 토큰이 없으므로 REST `POST /api/auth/signup/image-upload-url {signupToken, contentType}`을 쓴다 ([images.md](images.md)).

## 토큰 수명

| 토큰 | 수명 | 비고 |
| --- | --- | --- |
| access | 30분 | 응답의 `accessTokenExpiresIn`은 초 단위 |
| refresh | 14일 | 1회용. 재발급마다 새 값으로 교체 |
| signup | 10분 | 가입 완료·가입 전 이미지 업로드에만 사용 |
| 로그인 교환 코드 | 2분 | 1회용 |

## 재발급 규칙 (rotation)

- `POST /api/auth/refresh {refreshToken}` → access·refresh **둘 다** 새로 온다. 쓴 refresh는 즉시 폐기된다.
- 이미 쓴 토큰·모르는 토큰·만료 토큰은 `401 INVALID_TOKEN`. 사용자가 탈퇴했으면 `401 USER_NOT_FOUND`.
- refresh 토큰은 로그인마다 따로 저장된다. 한 기기의 로그아웃·재발급이 다른 기기 세션을 끊지 않는다.
- `POST /api/auth/logout {refreshToken}` → `204`. 모르는 토큰이어도 204다 (멱등).

## 200과 401의 구분

| 요청 | 응답 | FE 동작 |
| --- | --- | --- |
| `/graphql`, Authorization 헤더 없음 | HTTP 200 + `errors[0].extensions.code = "UNAUTHENTICATED"` | 재발급하지 않는다. 보고하지 않는다 |
| `/graphql`, 무효·만료 Bearer | HTTP 401 + 본문 `{"code":"UNAUTHENTICATED","message":...}` (GraphQL 형식 아님) | 재발급 1회 후 같은 요청 1회 재시도 |
| `/graphql`, 토큰은 유효하나 사용자 행이 없음 | HTTP 200 + `UNAUTHENTICATED` | 재발급하지 않는다 |

이유: `/graphql`은 인트로스펙션을 위해 필터에서 열려 있고 인증은 리졸버가 강제한다. 그래서 "토큰 없음"은 GraphQL 에러(200)로, "토큰이 있는데 틀림"은 보안 필터(401)로 갈린다.

## 강제 로그아웃 조건 (FE)

- 재발급이 `401`을 받으면 저장된 토큰을 모두 지운다. 이 지점은 4xx여도 에러 수집기에 보고한다.
- 재발급의 네트워크 오류·5xx는 토큰을 지우지 않는다 (토큰이 무효라는 증거가 아니다).
- 보호 화면은 `me` 조회가 실패하고 (로컬 세션이 없거나 refresh 토큰이 없으면) 세션을 비우고 `/`로 보낸다. 토큰이 남아 있는 단순 실패는 저장된 세션으로 버틴다.

## 함정

- 동시 401에 대한 재발급 중복 방지는 **한 JS 컨텍스트 안에서만** 된다. 탭 두 개가 같은 refresh 토큰으로 동시에 재발급하면 늦은 쪽이 `INVALID_TOKEN`을 받아 그 탭이 토큰을 지운다 (저장소는 탭 간 공유).
- 교환 코드를 두 번 보내면 (이중 마운트, 새로고침) 두 번째는 401이다.
- 재발급은 401일 때만, refresh 토큰이 있을 때만 탄다. 200 + `UNAUTHENTICATED`를 받고 재발급을 기대하면 안 된다.
- 다른 기기에서 탈퇴한 계정은 access 토큰이 만료될 때까지 200 + `UNAUTHENTICATED`를 받고, 만료 후 재발급에서 `USER_NOT_FOUND`로 끝난다.
- `/api/auth/**` 에러 본문은 `{code, message}`지만, 요청 본문 검증 실패(빈 `code` 등)는 `code` 없는 기본 400 본문이다. FE는 `code` 없음을 견뎌야 한다.
- 가입 요청의 `nickname`은 6자 이하, `profileImage`는 필수다. `be:docs/authentication.md`의 가입 예시에는 `profileImage`가 빠져 있다 (문서가 낡음, 코드가 기준).
- BE CORS는 허용 origin 2개와 헤더 `Authorization`·`Content-Type`만 연다. FE는 운영에서 `/graphql`·`/api/**`를 같은 origin 프록시로 보내 CORS를 피한다. 커스텀 헤더를 직접 호출에 붙이면 막힌다.
- SSR에는 토큰이 없다. 인증이 필요한 호출은 브라우저에서만 한다.

## 확인 방법

```bash
U=https://pinnnned.duckdns.org
# 헤더 없음 → 200 + UNAUTHENTICATED
curl -s -w '\n%{http_code}\n' -X POST $U/graphql -H 'Content-Type: application/json' -d '{"query":"{ me { id } }"}'
# 무효 토큰 → 401 + {"code":"UNAUTHENTICATED"}
curl -s -w '\n%{http_code}\n' -X POST $U/graphql -H 'Content-Type: application/json' -H 'Authorization: Bearer x.y.z' -d '{"query":"{ me { id } }"}'
# 무효 refresh → 401 INVALID_TOKEN / 무효 교환 코드 → 401 INVALID_LOGIN_CODE
curl -s -w '\n%{http_code}\n' -X POST $U/api/auth/refresh -H 'Content-Type: application/json' -d '{"refreshToken":"x"}'
curl -s -w '\n%{http_code}\n' -X POST $U/api/auth/exchange -H 'Content-Type: application/json' -d '{"code":"x"}'
```

- 수명·화이트리스트·CORS origin: `be:src/main/resources/application.yml`의 `auth.*`
- rotation·재사용 401: `be:src/main/kotlin/udumeoli/tripphoto/auth/service/AuthService.kt` (`refresh`, `logout`)
- 200/401 분기: `be:.../auth/config/SecurityConfig.kt`, `be:.../auth/service/CurrentUserProvider.kt`, `be:.../user/service/UserService.kt`
- 교환 코드 저장소: `be:.../auth/service/OAuthLoginCodeStore.kt` / 콜백 화이트리스트: `be:.../auth/web/FrontendCallbackOverrideFilter.kt`
- FE 재발급·토큰 폐기: `fe:src/shared/api/auth-fetch.ts`, `fe:src/shared/api/token-refresh.ts`, `fe:src/shared/api/token-storage.ts`
- FE 강제 로그아웃 판정: `fe:src/features/auth/lib/guards.tsx` / 프록시: `fe:vite.config.ts`의 `routeRules`

재사용된 refresh 토큰의 401은 쓰기 요청이라 운영에서 다시 쏘지 않았다. 코드와 `be:src/test/kotlin/udumeoli/tripphoto/auth/AuthFlowIntegrationTest.kt`로 확인한다.
