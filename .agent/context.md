# Keepy 프로젝트 컨텍스트

> ⚠️ **이 프로젝트는 Keepy입니다.** `c:\python` 폴더에 있는 다른 프로젝트(aeo-sync, NC Jarvis 등)와 혼동하지 마세요.

---

## 프로젝트 정체성

| 항목 | 내용 |
|------|------|
| **서비스명** | Keepy — 병원 웹사이트 스팸 모니터링 SaaS |
| **역할** | 고객(병원) 사이트의 게시판을 주기적으로 스캔하여 스팸을 감지/삭제 |
| **기술 스택** | Node.js + TypeScript + TypeORM + PostgreSQL + Express |
| **배포** | Render (자동 배포) — https://keepy-pqfo.onrender.com |
| **DB (프로덕션)** | Neon PostgreSQL (`DATABASE_URL` 환경변수) |
| **DB (로컬)** | localhost:5432 / DB명: `keepy` / 유저: `postgres` |
| **로컬 실행** | `node --loader ts-node/esm src/index.ts` |

---

## 주요 파일 구조

```
c:\python\Keepy\
├── keepy_bridge.php          ← 고객 서버에 FTP 배포하는 PHP 브리지 (v2.0)
├── src/
│   ├── index.ts              ← Express 앱 진입점
│   ├── models/               ← TypeORM 엔티티 (Site, User, MonitoringLog 등)
│   ├── services/
│   │   └── spam-hunter.service.ts  ← 스팸 탐지 핵심 로직
│   ├── utils/
│   │   └── bridgeAuth.ts     ← HMAC-SHA256 서명 헤더 생성 유틸리티 (신규)
│   ├── controllers/          ← API 컨트롤러
│   └── scripts/              ← 1회성 실행 스크립트들
│       ├── add_missing_columns.ts   ← DB 스키마 동기화
│       ├── upload_bridge_ftp.ts     ← Bridge FTP 배포
│       ├── set_ftp_credentials.ts   ← FTP 자격증명 DB 저장
│       ├── set_db_credentials.ts    ← MySQL 접속정보 DB 저장
│       └── test_bridge_security.ts  ← 보안 테스트 (4케이스)
└── PROJECT_LOG.md            ← 작업 기록 (항상 여기서 현재 상태 파악)
```

---

## Bridge 아키텍처 (v2.0 — 2026-02-25 이후)

```
[Keepy 서버 (Render)]
    ↓ POST /keepy_bridge.php
    헤더: X-API-KEY, X-TIMESTAMP, X-SIGNATURE (HMAC-SHA256)
    바디: { action, db_host, db_user, db_pass, db_name, db_port, ...params }
    ↓
[keepy_bridge.php (고객 서버에 FTP 배포됨)]
    - HMAC 서명 검증 (±5분 타임스탬프)
    - body에서 DB 정보 수신 (파일 자체엔 DB 정보 없음)
    - MySQL PDO 연결 후 action 수행
```

**보안 포인트:**
- Bridge 파일에 DB 비밀번호 없음 ✅
- 사이트별 고유 API 키 (UUID, `sites.bridge_api_key` 컬럼) ✅
- HMAC-SHA256 서명 + 타임스탬프 검증 ✅
- CORS: Render 서버만 허용 ✅

---

## 현재 미해결 이슈 (다음 세션에서 처리)

### 1. minhospital MySQL 접속 실패
- **오류**: `Access denied for user 'minhospital2008'@'localhost' (using password: NO)`
- **추정 원인**: Cafe24 DB 호스트가 `localhost`가 아닌 별도 서버 주소일 가능성
- **확인 방법**: Cafe24 호스팅 관리자 → MySQL 관리 → 호스트 정보 확인
- **해결 스크립트**: `src/scripts/set_db_credentials.ts` 수정 후 재실행

### 2. 스팸 탐지 시 자동 삭제 연동
- `SpamHunterService`에서 스팸 탐지 후 `delete_post` 액션 자동 호출

### 3. 모니터링 로그 DB 저장
- 현재 인메모리 → 서버 재시작 시 로그 유실

---

## 다른 프로젝트와의 비교

| 항목 | Keepy | aeo-sync | NC Jarvis |
|------|-------|----------|-----------|
| **위치** | `c:\python\Keepy` | `c:\python\aeo-sync` | 별도 |
| **언어** | TypeScript / PHP | Python | Python |
| **역할** | 스팸 모니터링 SaaS | SEO/AEO 콘텐츠 생성 | — |
| **DB** | PostgreSQL | — | — |
| **배포** | Render | — | — |
