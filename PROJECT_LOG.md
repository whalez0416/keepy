# 🏥 Keepy 프로젝트 작업 로그
> **⚠️ 이 프로젝트는 Keepy (병원 스팸 모니터링 SaaS) 입니다.**  
> aeo-sync, NC Jarvis, aeo_article_engine 등 다른 c:\python 프로젝트와 **다릅니다.**  
> 자세한 구분은 `.agent/context.md` 참조.

> 작업할 때마다 여기에 기록해두세요. 현황 파악이 빨라집니다.


---

## 📦 프로젝트 기본 정보

| 항목 | 내용 |
|------|------|
| **서비스명** | Keepy - 병원 스팸 모니터링 SaaS |
| **Render URL** | https://keepy-pqfo.onrender.com |
| **GitHub** | main 브랜치 → Render 자동 배포 |
| **DB** | Neon PostgreSQL (프로덕션) / localhost:5432 (로컬) |
| **Admin 계정** | admin@keepy.com / tempAdmin123! |
| **로컬 실행** | `node --loader ts-node/esm src/index.ts` |

---

## ✅ 완료된 주요 작업 기록

### v1.5.1 (2026-02-09)
- `can_user_delete_spam` 권한 플래그 추가 (Site 모델)
- 스팸 삭제 권한을 Admin 외 허가된 User도 가능하도록 확장
- `deleteSpamPost` API 권한 검증 로직 구현

### Phase 2 - 멀티테넌트 아키텍처 (2026-02-12)
- `SiteMember` 엔티티 생성 (User ↔ Site N:M 관계)
- RBAC 미들웨어 구현 (`requireSiteAccess`, `requireSiteRole`, `requirePermission`)
- `SuperAdmin` 역할 자동 설정 (admin@keepy.com)
- TypeORM 마이그레이션 시스템 도입 (`synchronize: false`)
- Render 배포 완료 → **실제 URL: https://keepy-pqfo.onrender.com**
- 비밀번호 변경 (`password.controller.ts`)
- 지원 티켓 시스템 (`support.controller.ts`)
- 구독 요금 9,900 / 19,800 / 29,800 KRW

### Phase 1 - 스팸 탐지 엔진 (2026-02-05 ~ 2026-02-06)
- `keepy_bridge.php` v1.1.x 완성 (Universal Bridge API)
- `SpamHunterService` 구현 (Windowed Scan, 7일 캡 정책)
- 스팸 판정 알고리즘: 키워드(카지노/도박) + 엔트로피 + 전화번호 패턴
- minhospital.co.kr FTP 자동 업로드 스크립트 (`upload_bridge_ftp.ts`)
- 모니터링 대상: `md_board` 테이블

---

## 🔧 알려진 이슈 및 해결 기록

### 2026-02-25 - 로컬 DB 스키마 불일치
- **증상**: 로컬 서버 실행 시 `Site.db_port 컬럼 없음` 에러 (PostgreSQL code 42703)
- **원인**: Phase 2 이후 추가된 컬럼 9개가 로컬 DB에 없었음
- **해결**: `src/scripts/add_missing_columns.ts` 실행으로 ALTER TABLE 적용 완료
- **누락됐던 컬럼**: `db_port`, `db_type`, `ftp_host`, `ftp_user`, `ftp_port`, `bridge_path`, `onboarding_status`, `discovered_boards`, `linked_boards`

### 2026-02-25 - Render URL 문서 오류
- **증상**: DEPLOYMENT.md에 기록된 URL(`keepy-api.onrender.com`)이 틀림
- **해결**: 실제 URL `keepy-pqfo.onrender.com`으로 수정 완료

### nodemon Windows 실행 문제
- **증상**: `npm run dev` 실행 시 `'node'은(는) 내부 명령이 아닙니다` 에러
- **원인**: nodemon의 exec 옵션이 단일 인용부호(')를 Windows에서 처리 못함
- **임시 해결**: `node --loader ts-node/esm src/index.ts` 직접 실행

---

## 🎯 Phase 3 예정 (미착수)

- [ ] 컨트롤러 마이그레이션: `site.user` → `site.members`
- [ ] `userId` 컬럼 제거 (레거시 정리)
- [ ] 사이트 멤버 관리 UI (초대 시스템)
- [ ] 역할별 대시보드 (owner / staff / viewer)

---

## 📝 작업 로그 작성 방법

새 작업을 완료할 때마다 아래 형식으로 추가하세요:

```
### YYYY-MM-DD - 작업 제목
- 변경 내용 설명
- 영향 받는 파일: `파일명.ts`
- 배포 여부: Render 자동 배포 / 수동 / 로컬만
- 특이사항: 
```
