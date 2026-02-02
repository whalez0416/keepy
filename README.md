# 🛡️ Keepy - 병원 웹사이트 모니터링 시스템

실시간 웹사이트 모니터링, 스팸 자동 제거, 셀프 힐링 기능을 제공하는 SaaS 플랫폼

## 📋 주요 기능

### ✅ 현재 구현된 기능
- **실시간 헬스 체크**: 1분/5분/10분 주기로 웹사이트 상태 모니터링
- **스팸 헌터**: GnuBoard 게시판 스팸 자동 탐지 및 삭제
- **자동 모니터링**: 백그라운드에서 자동으로 사이트 검사
- **실시간 대시보드**: 웹 기반 관리 인터페이스
- **모니터링 로그**: 실시간 로그 스트림 및 히스토리
- **요금 계산**: 모니터링 주기별 자동 요금 산정

### 🚧 개발 예정
- PostgreSQL 데이터 영속성
- 사용자 인증 및 권한 관리
- 이메일/SMS 알림
- 셀프 힐링 (SSH 서버 재시작)
- PortOne 결제 연동

## 🚀 시작하기

### 필수 요구사항
- Node.js 18+ 
- PostgreSQL 14+
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 데이터베이스 정보 입력

# TypeScript 빌드
npm run build

# 개발 모드 실행
npm run dev

# 프로덕션 모드 실행
npm start
```

### 환경 변수 설정

`.env` 파일에 다음 정보를 설정하세요:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=keepy
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 📱 사용 방법

### 1. 백엔드 서버 실행
```bash
npm run dev
```
서버가 `http://localhost:3000`에서 실행됩니다.

### 2. 대시보드 접속
브라우저에서 다음 파일을 열어주세요:
- **실시간 대시보드**: `live-dashboard.html`
- **모니터링 로그**: `monitoring-logs.html`
- **시뮬레이터**: `simulation.html` (데모용)

### 3. 사이트 등록
대시보드에서 "민병원 DB 등록하기" 버튼을 클릭하거나, API를 직접 호출:

```bash
curl -X POST http://localhost:3000/sites/register-db \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "user": "your_db_user",
    "pass": "your_db_password",
    "name": "your_db_name",
    "domain": "example.com"
  }'
```

## 🏗️ 프로젝트 구조

```
Keepy/
├── src/
│   ├── index.ts                      # 메인 서버
│   ├── config/
│   │   └── database.ts               # TypeORM 설정
│   ├── controllers/
│   │   ├── site.controller.simple.ts # 사이트 관리 API
│   │   └── monitoring.scheduler.ts   # 모니터링 스케줄러
│   ├── services/
│   │   ├── monitor.service.ts        # 헬스 체크
│   │   ├── spam-hunter.service.ts    # 스팸 탐지/삭제
│   │   └── billing.service.ts        # 요금 계산
│   └── models/                       # TypeORM 엔티티 (예정)
├── simulation.html                   # 데모 시뮬레이터
├── live-dashboard.html               # 실시간 대시보드
├── monitoring-logs.html              # 로그 뷰어
├── package.json
└── README.md
```

## 🔌 API 엔드포인트

### Health Check
```
GET /health
```

### 사이트 관리
```
POST /sites                    # 사이트 등록
POST /sites/register-db        # DB 정보와 함께 사이트 등록
GET /sites                     # 등록된 사이트 목록
```

### 모니터링
```
GET /monitoring/logs           # 모니터링 로그 조회
POST /monitoring/scan          # 즉시 검사 실행
```

### 요금 계산
```
GET /billing/estimate?interval=5   # 요금 견적
```

## 💰 요금제

| 모니터링 주기 | 월 요금 |
|--------------|---------|
| 1분          | 50,000원 |
| 5분          | 30,000원 |
| 10분         | 10,000원 |

## 🛠️ 기술 스택

- **Backend**: Node.js, TypeScript, Express
- **Database**: PostgreSQL, MySQL2 (GnuBoard 연동)
- **ORM**: TypeORM
- **Queue**: BullMQ (예정)
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Payment**: PortOne (예정)

## 📝 개발 로드맵

### Phase 1: 핵심 기능 완성
- [ ] PostgreSQL 데이터 영속성
- [ ] 스팸 삭제 기능 활성화
- [ ] 백업 및 롤백 기능

### Phase 2: 보안 및 안정성
- [ ] 사용자 인증 (JWT)
- [ ] 이메일/SMS 알림
- [ ] 셀프 힐링 (SSH)

### Phase 3: 사용자 경험
- [ ] 통계 차트
- [ ] 모바일 대응
- [ ] 다국어 지원

### Phase 4: 비즈니스
- [ ] PortOne 결제 연동
- [ ] 정기 결제
- [ ] 요금제별 기능 제한

## 🤝 기여하기

이슈와 PR을 환영합니다!

## 📄 라이선스

ISC

## 👤 작성자

Keepy Development Team
