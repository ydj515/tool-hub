# 잡 처리 및 SSE 진행 이벤트 설계 메모

이 문서는 `JobService`, `JobOrchestrator`, `ProgressBus` 주변의 비동기 잡 처리와 SSE 구독자 관리 방식에 대한 판단 기준을 정리한다. 구현 세부사항을 `AGENTS.md`에 길게 두지 않고, 추후 유지보수자가 의사결정 배경을 확인할 수 있도록 별도 문서로 둔다.

## 현재 구조

- `JobController`는 ZIP 업로드 요청을 받고 `JobService.submit()`을 호출한다.
- `JobService.submit()`은 업로드 파일을 작업 디렉터리에 저장하고 `JobRecord`를 만든 뒤 즉시 반환한다.
- 실제 분석/렌더링 파이프라인은 `JobOrchestrator.run()`이 백그라운드에서 수행한다.
- 진행 상태는 `ProgressBus`가 `SseEmitter`를 통해 브라우저에 전송한다.
- 현재 프로젝트는 Spring MVC 기반이며, `kotlinx-coroutines` 의존성을 사용하지 않는다.
- JDK 21 toolchain을 사용하므로 virtual thread를 바로 사용할 수 있다.

## Virtual Thread 사용 이유

`JobService`는 현재 아래 executor로 백그라운드 작업을 실행한다.

```kotlin
private val executor = Executors.newVirtualThreadPerTaskExecutor()
```

이 선택은 현재 코드 구조와 잘 맞는다.

- `JobOrchestrator.run()`은 `suspend` 함수가 아니라 동기 함수다.
- 파이프라인은 ZIP 해제, 파일 시스템 접근, 소스 파싱, 다이어그램 렌더링, DOCX/XLSX/MD 생성처럼 블로킹 I/O와 CPU 작업이 섞여 있다.
- virtual thread는 기존 동기 코드를 거의 그대로 유지하면서 요청 스레드 점유를 줄일 수 있다.
- 코루틴 의존성, `CoroutineScope` 생명주기, cancellation, MDC 전파 같은 추가 설계를 도입하지 않아도 된다.
- `@PreDestroy`에서 executor를 닫는 방식으로 Spring bean 생명주기와도 단순하게 맞출 수 있다.

### 코루틴으로 바꿀 수 있는가

코루틴 도입은 가능하지만, 단순히 동기 파이프라인을 `launch`로 감싸는 정도라면 실익이 크지 않다.

```kotlin
scope.launch(Dispatchers.IO) {
    orchestrator.run(record, uploadZip)
}
```

이 방식은 실행 컨테이너만 코루틴으로 바뀔 뿐, `orchestrator.run()` 내부 작업은 여전히 블로킹 동기 작업이다. 코루틴의 장점을 살리려면 `JobOrchestrator`의 주요 단계도 `suspend` 함수로 재설계하고, 취소/타임아웃/구조화된 동시성/진행 상태 전파를 함께 설계해야 한다.

### 복잡도

`submit()` 기준:

- 시간 복잡도: `O(U)`
  - `U`는 업로드 ZIP 파일 크기다.
  - 파일 저장 이후 백그라운드 제출 자체는 `O(1)`이다.
- 공간 복잡도: `O(U)`
  - 업로드 ZIP을 디스크에 저장한다.
  - 메모리 사용량은 `MultipartFile.transferTo()` 구현과 파이프라인 단계별 모델 크기에 영향을 받는다.

전체 잡 실행 기준:

- 시간 복잡도: 대략 `O(U + F + C + R + G)`
  - `U`: ZIP 해제 비용
  - `F`: 소스 파일 수
  - `C`: 클래스/타입 수
  - `R`: 관계 추출 비용
  - `G`: 다이어그램과 문서 생성 비용
- 공간 복잡도: 대략 `O(C + R)` 메모리와 `O(U + output)` 디스크

### 주의사항

> - `newVirtualThreadPerTaskExecutor()`는 작업 수 제한을 자동으로 걸어주지 않는다.
> - `app.job.max-concurrent` 설정은 존재하지만 현재 `JobService`의 executor에는 직접 적용되지 않는다.
> - 동시에 큰 잡이 많이 들어오면 virtual thread보다 CPU, 디스크 I/O, 메모리, 문서 렌더링 라이브러리가 병목이 될 수 있다.
> - 잡 취소가 필요해지면 `Future` 저장, 상태 전이, 파이프라인 중단 지점을 별도로 설계해야 한다.
> - CPU-bound 작업이 많아질수록 virtual thread만으로는 처리량 개선을 기대하기 어렵고, 동시 실행 수 제한이 더 중요하다.

### 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| 현재 virtual thread 방식 유지 | 동기 파이프라인 유지, 의존성 최소, 코드 단순 | 동시 실행 제한과 취소 기능은 별도 설계 필요 |
| Spring `TaskExecutor` 또는 `@Async` | Spring 설정/모니터링/테스트와 자연스럽게 통합 | 설정 코드가 늘고, virtual thread executor와 정책을 명확히 정해야 함 |
| 코루틴 도입 | 취소, 타임아웃, 구조화된 동시성에 유리 | 현재 동기 파이프라인을 감싸기만 하면 실익이 작고, 의존성과 설계 복잡도가 증가 |

현재 판단은 virtual thread 유지가 적절하다. 운영 부하를 고려한다면 코루틴 전환보다 먼저 `app.job.max-concurrent`를 실제 동시 실행 제한에 연결하는 것이 우선순위가 높다.

## ProgressBus 구독자 자료구조

현재 `ProgressBus`는 잡별 SSE 연결 목록을 아래 구조로 관리한다.

```kotlin
private val emitters = ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>>()
```

비교 대상은 아래 구조다.

```kotlin
private val emitters = ConcurrentHashMap<UUID, ConcurrentHashMap<String, SseEmitter>>()
```

현재 요구사항은 특정 `jobId`에 연결된 모든 SSE 구독자에게 이벤트를 브로드캐스트하는 것이다. 개별 emitter를 ID로 조회하거나 특정 연결만 제어하는 기능은 없다. 따라서 현재 구조에는 `CopyOnWriteArrayList<SseEmitter>`가 더 단순하고 적합하다.

### 복잡도

특정 job에 연결된 구독자 수를 `n`이라고 할 때:

| 작업 | `CopyOnWriteArrayList<SseEmitter>` | `ConcurrentHashMap<String, SseEmitter>` |
|---|---:|---:|
| 구독 추가 | `O(n)` | 평균 `O(1)` |
| 전체 이벤트 발행 | `O(n)` | `O(n)` |
| emitter 객체 기준 제거 | `O(n)` | `O(n)` |
| connection id 기준 제거 | 해당 없음 | 평균 `O(1)` |
| 잡 완료 처리 | `O(n)` | `O(n)` |
| 공간 복잡도 | `O(n)` | `O(n)` |

브로드캐스트가 핵심인 현재 구조에서는 두 번째 방식으로 바꿔도 `publish()`의 핵심 비용은 여전히 `O(n)`이다. 차이는 구독 추가/삭제와 개별 연결 식별에서 발생한다.

### 디버깅

`ConcurrentHashMap<String, SseEmitter>` 방식은 connection id를 부여할 수 있으므로 디버깅과 메트릭에는 유리하다.

- 특정 연결의 생성/종료 로그 추적
- 실패한 `SseEmitter.send()`의 connection id 기록
- 중복 연결 제거
- 특정 연결 강제 종료

다만 현재 코드가 개별 연결 제어를 하지 않으므로, 이 장점을 얻기 위해 자료구조와 생명주기 관리 복잡도를 늘릴 필요는 크지 않다.

### 운영 비용

`CopyOnWriteArrayList`는 읽기와 순회가 많고 변경이 적은 구조에 적합하다. SSE 이벤트 전송은 일반적으로 구독 추가/삭제보다 이벤트 발행이 더 많으므로 현재 구조와 잘 맞는다. 반대로 한 job에 많은 사용자가 붙거나, 연결/해제가 자주 반복되거나, 연결별 메트릭이 필요하다면 `ConcurrentHashMap` 기반 구조가 더 낫다.

### 주의사항

> - `CopyOnWriteArrayList`는 추가/삭제 시 내부 배열 복사가 발생하므로 연결 변경이 매우 잦으면 비효율적이다.
> - `ConcurrentHashMap<String, SseEmitter>`는 connection id 생명주기를 관리해야 하므로 코드가 복잡해진다.
> - 둘 중 어떤 구조를 쓰더라도 전체 브로드캐스트는 `O(n)`이다.
> - 서버를 여러 대로 확장하면 현재 인메모리 `ProgressBus` 자체가 한계가 되며, Redis Pub/Sub 또는 메시지 브로커 기반 구조를 검토해야 한다.
> - 느린 클라이언트와 네트워크 단절은 자료구조보다 더 큰 운영 리스크일 수 있다.

### 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| `CopyOnWriteArrayList<SseEmitter>` 유지 | 브로드캐스트 중심 구조에 단순하고 안전함 | 개별 연결 식별이 어렵고 변경이 잦으면 비효율적 |
| `ConcurrentHashMap<UUID, SseEmitter>` 사용 | connection id 기반 추적/제거/메트릭에 유리 | 현재 요구사항 대비 복잡도가 증가 |
| `CopyOnWriteArrayList<Subscription>` 사용 | 현재 구조를 유지하면서 connection id 로그를 남길 수 있음 | 제거 비용은 여전히 `O(n)` |
| 외부 Pub/Sub 사용 | 다중 서버 확장에 적합 | 인프라 비용과 장애 지점이 증가 |

균형안은 아래처럼 구독 정보를 감싸는 방식이다.

```kotlin
private data class Subscription(
    val id: UUID,
    val emitter: SseEmitter,
)

private val emitters = ConcurrentHashMap<UUID, CopyOnWriteArrayList<Subscription>>()
```

이 방식은 현재 브로드캐스트 중심 설계를 유지하면서도 connection id 기반 로그를 남길 수 있다. 다만 실제 개별 연결 제거가 중요한 요구사항이 생기기 전까지는 현재 구조를 유지해도 충분하다.

## 현재 권장 판단

- `JobService`는 virtual thread 방식을 유지한다.
- 코루틴 도입은 잡 취소, 타임아웃, 단계별 병렬화, 구조화된 동시성이 명확히 필요해질 때 재검토한다.
- `ProgressBus`는 현재 `CopyOnWriteArrayList<SseEmitter>` 방식을 유지한다.
- 연결별 추적이 필요해지면 먼저 `Subscription` 래퍼를 도입한다.
- 운영 부하 대응의 우선순위는 `app.job.max-concurrent`를 실제 동시 실행 제한으로 연결하는 것이다.

## 추가 ADR

아래 항목은 잡 실행, 산출물 저장, 다운로드, 렌더링 운영 비용과 관련된 A/B 판단이다.

### ADR-JOB-001: 다이어그램 렌더링 병렬화

#### 현재 선택

`DiagramRenderer`는 모듈별 diagram spec을 만든 뒤 `Executors.newWorkStealingPool(parallelism)`로 PlantUML PNG 렌더링을 병렬 처리한다. `app.diagrams.parallelism`이 0이면 `Runtime.getRuntime().availableProcessors()`를 사용한다.

#### 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| 순차 렌더링 | 메모리 피크와 디버깅이 단순함 | 클래스 수가 많으면 전체 잡 시간이 길어짐 |
| fixed thread pool | 동시성 상한이 명확하고 예측 가능함 | 작업 크기 편차가 크면 일부 스레드가 놀 수 있음 |
| work-stealing pool | 작은 렌더링 작업이 많을 때 부하 분산이 좋음 | CPU와 메모리 사용량이 순간적으로 커질 수 있음 |
| virtual thread per diagram | 블로킹 작업이 많으면 유리할 수 있음 | PlantUML 렌더링이 CPU-bound라면 이점이 제한적임 |

#### 결정 이유

- PlantUML 렌더링은 diagram spec마다 독립적이어서 병렬화 단위가 명확하다.
- 클래스별 다이어그램 수가 많아질수록 순차 처리 지연이 눈에 띈다.
- `work-stealing pool`은 크기가 다른 렌더링 작업을 여러 CPU에 분산하기 쉽다.
- 현재는 각 job 안에서 다이어그램 렌더링 병렬화만 수행하므로 구현 복잡도가 낮다.

#### 재검토 조건

- 다중 사용자 환경에서 CPU 사용률이 장시간 100%에 가깝게 유지된다.
- PlantUML 렌더링 중 OutOfMemory 또는 긴 GC pause가 반복된다.
- `app.job.max-concurrent`와 `app.diagrams.parallelism`의 곱이 운영 환경 CPU 수보다 크게 설정된다.
- 렌더링 실패를 diagram 단위로 더 세밀하게 재시도해야 한다.

#### 복잡도

- 시간 복잡도: 순차 기준 `O(S * R)`, 병렬 기준 이상적으로 `O(ceil(S / P) * R)`
- 공간 복잡도: `O(S + P * M)`
- `S`: diagram spec 수, `R`: diagram 1개 렌더링 비용, `P`: parallelism, `M`: 렌더링 중 diagram 1개가 사용하는 메모리

> - 병렬화는 총 CPU 작업량을 줄이지 않는다. 응답 시간을 줄이는 대신 순간 리소스 사용량을 키운다.
> - job 단위 동시 실행 제한과 diagram 단위 병렬화 제한은 함께 봐야 한다.

### ADR-JOB-002: 잡 상태 저장소

#### 현재 선택

`JobStore`는 `ConcurrentHashMap<UUID, JobRecord>` 기반 인메모리 저장소를 사용한다. `JobRecord`의 artifacts와 warnings는 `CopyOnWriteArrayList`로 보관한다.

#### 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| 인메모리 `ConcurrentHashMap` | 빠르고 단순하며 MVP에 적합함 | 서버 재시작 시 상태가 사라지고 다중 인스턴스 공유가 불가 |
| RDBMS | 재시작 복구, 조회, 감사 이력에 유리함 | 스키마/마이그레이션/트랜잭션 관리가 필요 |
| Redis | TTL, 빠른 조회, 다중 인스턴스 공유에 유리함 | 외부 인프라와 장애 대응 비용이 생김 |
| 파일 기반 상태 저장 | DB 없이 재시작 일부 복구 가능 | 동시성, partial write, 정리 정책이 복잡해짐 |

#### 결정 이유

- 현재 job 결과물은 TTL이 짧은 임시 산출물이다.
- API는 생성 직후 진행 조회와 다운로드에 집중되어 있다.
- 복구 가능한 장기 작업 큐보다 단순한 비동기 실행 모델이 현재 제품 범위에 맞다.
- 인메모리 구조는 테스트와 로컬 개발이 쉽다.

#### 재검토 조건

- 서버 재시작 후에도 job 상태와 결과 링크를 유지해야 한다.
- 애플리케이션을 여러 인스턴스로 수평 확장한다.
- 운영자가 과거 job 이력, 실패 원인, 사용자별 처리량을 조회해야 한다.
- job 취소, 재시도, 재개 기능을 제공해야 한다.

#### 복잡도

- `create`, `get`, `remove` 시간 복잡도: 평균 `O(1)`
- `all` 시간 복잡도: `O(J)`
- 공간 복잡도: `O(J + A + W)`
- `J`: job 수, `A`: artifact record 수, `W`: warning 수

> - 인메모리 저장소는 단일 인스턴스 MVP에는 가볍지만, 운영 지속성 요구가 생기면 가장 먼저 한계가 드러난다.

### ADR-JOB-003: 결과물 저장 방식

#### 현재 선택

업로드 ZIP, 압축 해제 입력, 다이어그램 PNG, 최종 산출물은 `app.workdir/jobs/{jobId}` 아래 로컬 디스크에 저장한다. `ScheduledCleaner`가 TTL 기준으로 오래된 job 디렉터리를 삭제한다.

#### 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| 로컬 임시 디스크 | 구현이 단순하고 파일 기반 라이브러리와 잘 맞음 | ephemeral filesystem, 다중 인스턴스, 디스크 용량에 취약 |
| Object Storage | 다중 인스턴스와 장기 보관에 유리함 | 업로드/다운로드 인증, 비용, 네트워크 지연이 추가됨 |
| DB BLOB | 상태와 산출물을 한 저장소에서 관리 가능 | 대용량 파일 처리와 백업 비용이 커질 수 있음 |
| 즉시 스트리밍 후 미보관 | 디스크 사용량이 작음 | 결과 재다운로드, 번들 다운로드, 실패 복구가 어려움 |

#### 결정 이유

- Apache POI, PlantUML, ZIP 처리 모두 파일 기반 흐름과 잘 맞는다.
- 결과물은 장기 보관 대상이 아니라 TTL이 있는 임시 파일이다.
- 다운로드 API가 산출물을 여러 번 참조해야 하므로 job 완료 후 파일을 보관하는 편이 단순하다.
- 현재 배포 범위에서는 별도 스토리지 인프라를 요구하지 않는 것이 운영 비용이 낮다.

#### 재검토 조건

- Render 같은 ephemeral filesystem에서 재시작/재배포 후 다운로드 보장이 필요하다.
- 여러 서버 인스턴스가 같은 job 결과물에 접근해야 한다.
- 산출물 보관 기간이 길어지거나 사용자별 접근 제어가 필요하다.
- 디스크 사용량 경보 또는 cleanup 실패가 반복된다.

#### 복잡도

- 파일 저장/읽기 시간 복잡도: `O(B)`
- cleanup 시간 복잡도: `O(J + F)`
- 공간 복잡도: 디스크 기준 `O(B)`
- `B`: 파일 byte 수, `J`: job 디렉터리 수, `F`: 삭제 대상 파일 수

> - TTL 삭제는 보관 기간을 대략적으로 제한할 뿐, 디스크 사용량 상한을 강제하지 않는다.
> - 대용량 업로드와 다이어그램 병렬 렌더링이 겹치면 디스크 사용량 피크가 커질 수 있다.

### ADR-JOB-004: 다운로드 스트리밍 방식

#### 현재 선택

단일 산출물은 `FileSystemResource`로 반환하고, format별 다중 다운로드와 전체 bundle은 `StreamingResponseBody`에서 요청 시점에 ZIP을 생성해 스트리밍한다.

#### 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| 요청 시 ZIP 스트리밍 | 메모리 사용량이 작고 사전 bundle 파일이 필요 없음 | 느린 클라이언트가 서버 리소스를 오래 점유할 수 있음 |
| 메모리에 ZIP 생성 후 반환 | 구현과 테스트가 단순할 수 있음 | 대용량 결과에서 메모리 사용량이 `O(B)`로 커짐 |
| job 완료 시 bundle 파일 사전 생성 | 다운로드가 빠르고 실패 지점이 job 처리 단계로 이동함 | 디스크 사용량이 늘고 format별 조합이 많아질 수 있음 |
| Object Storage presigned URL | 애플리케이션 서버 부하를 줄임 | 외부 스토리지와 권한 관리가 필요 |

#### 결정 이유

- 산출물 크기가 커져도 애플리케이션 메모리에 전체 ZIP을 올리지 않는다.
- bundle 다운로드는 항상 필요한 것이 아니므로 사전 생성보다 요청 시 생성이 낫다.
- 현재 결과물은 로컬 디스크에 이미 존재하므로 `Files.copy` 기반 스트리밍이 단순하다.

#### 재검토 조건

- 같은 bundle 다운로드 요청이 자주 반복된다.
- 느린 다운로드 클라이언트 때문에 요청 스레드 또는 커넥션 점유가 문제가 된다.
- bundle 생성 실패를 job 완료 전에 검증하고 싶다.
- CDN 또는 Object Storage 기반 다운로드로 전환한다.

#### 복잡도

- 시간 복잡도: `O(B)`
- 공간 복잡도: 스트리밍 기준 `O(1)`, 메모리 ZIP 기준 `O(B)`, 사전 ZIP 기준 디스크 `O(B)` 추가
- `B`: 다운로드 대상 파일의 총 byte 수

> - `StreamingResponseBody`는 메모리 사용량을 낮추지만, 네트워크가 느린 사용자를 완전히 공짜로 처리해주지는 않는다.
