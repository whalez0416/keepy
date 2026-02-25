---
description: Keepy 프로젝트 컨텍스트 - 다른 프로젝트와 구분
---

# 🏥 Keepy - 병원 스팸 모니터링 SaaS

이 프로젝트는 **Keepy**입니다. c:\python 아래에 있는 다른 프로젝트(aeo-sync, NC Jarvis, aeo_article_engine 등)와 **완전히 다른 프로젝트**입니다.

## 이 프로젝트가 하는 일
병원 웹사이트의 게시판에 올라오는 스팸 게시물을 자동 탐지·삭제하는 **SaaS 백엔드** 서비스입니다.

## 다른 프로젝트와의 차이

| 프로젝트 | 위치 | 목적 |
|---------|------|------|
| **Keepy** ← 현재 | `c:\python\Keepy` | 병원 스팸 모니터링 SaaS (Node.js + TypeScript) |
| aeo-sync | `c:\python\aeo-sync` | 병원 위키 콘텐츠 자동 등록 (Python, WordPress) |
| aeo_article_engine | `c:\python\aeo_article_engine` | 의료 SEO 아티클 자동 생성 (Python) |
| NC Jarvis | `c:\python\NC Jarvis` | 광고/마케팅 자동화 도구 |
| aeo-monitor-mvp | `c:\python\aeo-monitor-mvp` | AEO 성과 모니터링 |

## 핵심 기술 스택
- **백엔드**: Node.js v24 + TypeScript + Express
- **DB**: PostgreSQL (로컬: localhost:5432 / 프로덕션: Neon)
- **ORM**: TypeORM (synchronize: false, 마이그레이션 방식)
- **배포**: Render (https://keepy-pqfo.onrender.com)
- **인증**: JWT

## 현재 고객 (모니터링 중인 사이트)
- `minhospital.co.kr` (민병원) — `md_board` 테이블 모니터링 중

## 주요 진행 단계
- Phase 1 ✅: 스팸 탐지 엔진 + Bridge API
- Phase 2 ✅: 멀티테넌트(RBAC) + Render 배포
- Phase 3 🔲: 사이트 멤버 관리 UI + 초대 시스템

## 중요한 파일들
- `PROJECT_LOG.md` — 전체 작업 이력
- `src/index.ts` — 서버 진입점 + 전체 라우팅
- `src/services/spam-hunter.service.ts` — 스팸 탐지 핵심 로직
- `keepy_bridge.php` — 고객 서버에 설치되는 Bridge 파일
- `src/controllers/site.controller.simple.ts` — 사이트/스팸로그 API
