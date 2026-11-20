---
status: draft
owner: be
sources: [be:src/main/kotlin/udumeoli/tripphoto/image, be:src/main/kotlin/udumeoli/tripphoto/config/StorageProperties.kt, be:src/main/resources/graphql/schema.graphqls, thumbnail:main.go, fe:src/shared/api/image-upload.ts]
verified: 2026-11-20
---

# 이미지 업로드 계약

원본은 FE가 스토리지에 직접 올리고, BE는 URL 발급과 식별자만 관리한다. 썸네일은 별도 서비스가 비동기로 만든다.

## 업로드 흐름

1. `createImageUploadUrl(input: {contentType})` → `imageId`, `uploadUrl`, `encryptionHeaders[]`.
2. FE가 `uploadUrl`로 원본을 **PUT** 한다.
3. `imageId`를 `createTrip` / `recordTrip`의 `image.imageId`, 또는 `updateProfile`의 `profileImage`로 넘긴다.

가입 전(토큰 없음)에는 1번 대신 REST `POST /api/auth/signup/image-upload-url {signupToken, contentType}`을 쓴다. 응답 형태와 2번은 같다.

## 약속

- 허용 `contentType`은 `image/jpeg`, `image/png`, `image/webp`뿐이다. 그 외는 `VALIDATION_ERROR` (REST 쪽은 400).
- PUT에는 **발급 때 서명된 헤더를 그대로** 실어야 한다: `Content-Type`(발급 요청과 같은 값) + `encryptionHeaders`의 3개 헤더 전부. 하나라도 빠지거나 다르면 서명 불일치로 스토리지가 거부한다.
- `encryptionHeaders`는 이미지마다 다른 암호화 키(SSE-C)다. FE는 값을 해석하지 않고 그대로 전달하며, 저장하거나 로그·에러 리포트에 남기지 않는다.
- `uploadUrl`은 기본 5분 뒤 만료된다 (스키마 주석은 "협의 중"). 발급 직후 올린다.
- `imageId`는 발급 시점에 이미 생긴다. BE는 실제로 PUT이 끝났는지 확인하지 않는다. `IMAGE_NOT_UPLOADED` 코드는 던지는 곳이 없다. 업로드 성공 확인은 FE 책임이다.
- 기록 1건에 사진 1장. 교체되어 연결이 끊긴 사진은 BE가 이미지 행을 지운다 (스토리지 객체까지 지우는지는 확인 필요).
- 썸네일 요청은 기록 저장 트랜잭션이 커밋된 뒤 BE가 썸네일 서비스에 보낸다. 실패해도 기록 저장은 성공이다.

## 이미지 URL

- 응답의 `originalUrl`은 스토리지 주소가 아니라 BE 주소 `{API_BASE_URL}/api/images/{objectKey}`다. `thumbnailUrl`은 거기에 `/thumbnail`이 붙는다.
- 이 주소는 302로 서명된 스트리밍 경로(`/stream/...`)로 넘긴다. 서명은 발급 후 1시간 유효하다. `<img src>`에 그대로 쓰고, 리다이렉트된 주소를 저장하지 않는다.
- `/api/images/**`는 인증 없이 열려 있다. `<img>`가 `Authorization`을 못 보내기 때문이다. 접근 통제는 추측 불가능한 객체 키에 의존한다.
- 암호화 도입 이전 이미지는 저장된 스토리지 URL이 그대로 온다. FE는 두 형태를 구분하지 않고 문자열 그대로 쓴다.

## 썸네일 서비스 연동 (BE ↔ thumbnail)

- BE → `POST {THUMBNAIL_SERVER_URL}/thumbnail` 본문 `{id, image_url}`. 응답은 `202` (큐 적재). 큐가 가득 차면 `503`.
- 썸네일 서비스는 같은 DB의 이미지 행을 읽어 원본을 내려받고, 최대 480x480으로 줄여 올린 뒤 그 행의 썸네일 URL을 갱신한다.
- 놓친 건은 썸네일 서비스가 5분마다 DB에서 찾아 다시 시도한다. BE는 재시도하지 않고 경고 로그만 남긴다.
- `THUMBNAIL_SERVER_URL`이 비어 있으면 BE는 요청 자체를 건너뛴다.

## 함정

- 스키마는 "썸네일 생성 전이면 `thumbnailUrl`이 null"이라고 적지만, 현재 BE 코드는 null 대신 **원본 URL을 채워** 준다. FE의 `thumbnailUrl ?? originalUrl` 대체는 유지하되, null로 "썸네일 준비 여부"를 판단하면 안 된다. 스키마 주석과 코드가 다르다.
- 썸네일 서비스는 EXIF 회전 태그를 따르지 않는다. FE가 업로드 전에 픽셀을 정방향으로 바꿔 올린다 (`fe:src/shared/lib/exif-orientation`).
- 업로드한 **프로필 사진**은 BE가 썸네일을 요청하지 않는다 (BE 코드에 TODO). 썸네일 서비스의 5분 주기 재처리가 "썸네일이 비어 있고 5분 넘은 행"을 모두 집기 때문에 늦게 생긴다. 같은 이유로 PUT을 하지 않은 발급 건도 재처리 대상이 되어 실패 로그를 만든다.
- 썸네일은 원본 형식과 무관하게 항상 JPEG다.
- PUT 대상은 다른 origin이라 실패가 CORS 오류(상태 없는 `TypeError`)로 보일 수 있다. FE는 PUT 실패를 5xx·네트워크 오류일 때만 수집한다.
- 스트리밍 응답의 `Content-Type`은 확장자로만 정한다 (`.png`가 아니면 `image/jpeg`). webp 원본도 `image/jpeg`로 내려온다.
- `/stream/...` 경로가 어느 프로세스로 라우팅되는지는 서버의 nginx 설정에 있고 레포에 없다 — 확인 필요 ([infra.md](../system/infra.md)).
- 스토리지 버킷의 CORS·공개 설정, 운영 `upload-url-ttl` 재정의 여부는 레포에서 확인되지 않는다 — 확인 필요.
- 원본 크기 상한: `application.yml`에 `max-upload-size: 10MB`가 있으나 presigned PUT에 강제되는지는 확인 필요.

## 확인 방법

```bash
# 발급 응답 필드 (운영 스키마)
curl -s -X POST https://pinnnned.duckdns.org/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ __type(name:\"ImageUploadTarget\"){fields{name}} }"}'
# 인증 없이 302가 나는지
curl -s -o /dev/null -D - https://pinnnned.duckdns.org/api/images/original/x.jpg | head -3
```

- 허용 형식·발급: `be:src/main/kotlin/udumeoli/tripphoto/image/service/ImageService.kt`
- 서명 헤더 3종: `be:.../image/dto/SsecHeader.kt`, presign: `be:.../image/storage/S3StorageAdapter.kt`, 만료 기본값: `be:.../config/StorageProperties.kt`
- URL 형태·null 대체: `be:.../image/dto/ImagePayload.kt` / 302 서명: `be:.../image/controller/ImageStreamController.kt`
- 썸네일 요청 시점·본문: `be:.../trip/event/TripImageEventListener.kt`, `be:.../image/thumbnail/HttpThumbnailAdapter.kt`
- 썸네일 큐·재처리·스트리밍: `thumbnail:main.go`, 리사이즈: `thumbnail:internal/image/processor.go`, 재처리 대상 쿼리: `thumbnail:internal/db/database.go` (레포 mash-up-kr/udumeoli-thumbnail)
- FE 업로드: `fe:src/shared/api/image-upload.ts`, 가입 전: `fe:src/features/auth/api/auth.api.ts`
