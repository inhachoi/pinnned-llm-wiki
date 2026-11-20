---
status: current
owner: be
sources: [be:src/main/resources/db/migration/V1__init.sql, be:src/main/resources/db/migration/V7__flatten_trip_to_region_pin.sql, be:src/main/resources/graphql/schema.graphqls, be:src/main/kotlin/udumeoli/tripphoto/trip/service, fe:src/shared/api/region-codes.ts]
verified: 2026-11-20
---

# 지역 코드 계약

`regionCode`는 FE 지도(GeoJSON `properties.code`)와 BE 지역 테이블이 **같은 문자열**로 맞춰져 있다는 약속이다. 지역 테이블은 마이그레이션이 시딩하는 정적 데이터이고 앱은 읽기만 한다.

## 형식 규칙

- `regionCode`는 **문자열**이다. 숫자로 바꾸지 않는다. 자릿수가 레벨마다 달라(2자리·5자리) 숫자 비교·정렬·패딩이 모두 어긋난다.
- 길이는 2 또는 5뿐이다. 컬럼은 최대 5자, 공백 패딩 없음.
- 기준은 kostat 2018 경계다. 행정안전부 행정코드(예: 5자리 `11110`)는 테이블에 없다.
- 전체 168건: 2자리 8건, 5자리 160건.

| 레벨 | 자릿수 | 건수 | 규칙 | 예 |
| --- | --- | --- | --- | --- |
| `metro` | 2 | 8 | 특별시·광역시·세종. 시도 코드 그대로 | `11` 서울, `21` 부산, `29` 세종 |
| `city` | 5 | 78 | 시. 자치구가 있는 시 11곳은 시 단위로 합쳐 끝자리가 `0`인 코드 하나만 있다 | `32030` 강릉시, `37010` 포항시 |
| `county` | 5 | 82 | 군. 광역시에 속한 군도 5자리로 따로 있다 | `21310` 기장군, `26310` 울주군 |

- **도(道)는 코드가 없다.** 경기·강원 등 9개 도는 2자리로 기록할 수 없고 소속 시·군의 5자리로만 기록한다.
- **특별시·광역시의 자치구는 코드가 없다.** 서울 종로구는 `11`로만 기록한다.
- 합쳐진 시 11곳: 수원·성남·안양·안산·고양·용인·청주·천안·전주·포항·창원. 구 단위 코드(`37011` 등)는 없다.
- 5자리 코드는 모두 `0`으로 끝난다.

## 약속

- `createTrip`은 테이블에 없는 `regionCode`를 `REGION_NOT_FOUND`로 거부한다. 형식이 그럴듯해도 테이블에 없으면 거부다.
- 핀(Trip)은 `(팟, regionCode)`마다 하나다. 같은 지역에 다시 올리면 새 핀이 아니라 그 핀의 내 기록이 교체된다. 동시에 올려도 핀은 하나로 모인다.
- BE는 기록된 `regionCode`를 **그대로** 돌려준다. `partyMapOverview.municipalities`에는 광역시 여행이 2자리(`"11"`)로 섞여 온다. FE는 자릿수로 폴리곤 출처를 고른다 — 2자리는 시·도 GeoJSON, 5자리는 시·군·구 GeoJSON.
- `partyMapOverview.country.regionCode`는 `"KR"` 고정, `provinces`는 2자리다.
- `partyTripInRegion`은 없는 `regionCode`에도 에러 없이 `null`을 준다 (검증하지 않는다).

## 함정

- 세종은 코드가 둘이다: `29`(metro, 세종특별자치시)와 `29010`(city, 세종시). 둘은 서로 다른 핀이 된다. FE 매핑 표는 이름으로 둘을 구분한다.
- 고성군은 강원 `32400`과 경남 `38340` 두 곳이다. FE 지도가 지역을 이름으로만 식별하는 동안은 강원으로 고정된다 (`fe:src/shared/api/region-codes.ts` 주석).
- 광역시 소속 군(기장·달성·강화·옹진·울주)은 5자리가 따로 있어, 같은 광역시 안에서 `21`(부산)과 `21310`(기장군)이 별개 핀으로 공존할 수 있다.
- `provinces` 칸은 기록된 코드의 **앞 2자리**로 묶는다 (`32030` → `32`). 그래서 지역 테이블에 없는 도 코드(`31`~`39`)가 이 응답에만 나온다. 코드가 접두사 계층이라는 전제에 기대므로, 접두사가 시·도와 다른 코드를 시딩하면 집계가 깨진다.
- FE 매핑 표(`REGION_CODE_BY_NAME`)는 자동 생성 데이터다. 손으로 고치지 않는다. 지역 테이블이 바뀌면 BE 마이그레이션과 FE 표를 같이 바꿔야 한다.
- 스키마 주석은 "광역시·도 2자리"라고 적지만 테이블에 도 코드는 없다. `createTrip`에 `"32"`를 보내면 `REGION_NOT_FOUND`다.

## 확인 방법

```bash
# 시딩된 코드 전체와 레벨별 건수
gh api repos/mash-up-kr/udumeoli-spring/contents/src/main/resources/db/migration/V1__init.sql --jq .content \
  | base64 -d | grep "INSERT INTO region" \
  | sed -E "s/.*VALUES \('([0-9]+)', '([^']+)', '[^']+', '([a-z]+)'.*/\1 \2 \3/" \
  | awk '{print length($1), $3}' | sort | uniq -c
# 스키마의 regionCode 설명
gh api repos/mash-up-kr/udumeoli-spring/contents/src/main/resources/graphql/schema.graphqls --jq .content | base64 -d | grep -n -i regionCode
```

- 시딩·컬럼 타입·출처 주석: `be:src/main/resources/db/migration/V1__init.sql` (`region` 테이블, "region 시딩 (168건)")
- `(팟, 지역)` 유일키: `be:src/main/resources/db/migration/V7__flatten_trip_to_region_pin.sql`
- 존재 검증: `be:src/main/kotlin/udumeoli/tripphoto/trip/service/TripCommandService.kt` (`REGION_NOT_FOUND`), 읽기 전용 저장소: `be:.../region/repository/RegionRepository.kt`
- `null` 반환: `be:.../trip/service/TripQueryService.kt` (`partyTripInRegion`) / 앞 2자리 묶음: `be:.../trip/service/MapCellAggregation.kt`
- FE 대응표: `fe:src/shared/api/region-codes.ts`
- 운영 DB가 이 시딩과 같은지는 로그인 토큰으로 `createTrip`을 보내야 확인된다 (쓰기 요청). 읽기만으로는 `partyMapOverview` 응답의 코드 자릿수로 간접 확인한다.
