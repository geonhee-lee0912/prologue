# 보관 문서

여기 있는 문서는 **더 이상 현재 기준이 아니다.** 코드를 쓸 때 근거로 삼지 않는다.

## 왜 보관하는가

지워도 git history 에 남지만(`git tag v0-old-concept`), 다음 이유로 파일을 남긴다.

- 왜 그런 결정을 했는지의 맥락이 담겨 있다. 특히 `prologue_decision_log_v0.3.md`
- 같은 길을 다시 걷지 않으려면 무엇을 검토했는지 알아야 한다
- 일부 표현·용어·정책 초안은 새 컨셉에서 다시 쓸 수 있다

## 2026-05-이전-컨셉/

**폐기 시점:** 2026-09-02
**폐기 이유:** 윌유(willu)가 2025-06-20 리브랜딩으로 프롤로그의 차별점(인증 기반 신뢰, 큐레이션 추천 + 추천 이유, 이야기형 프로필)을 전부 선점했다. 포지셔닝 문장 자체가 경쟁사와 같아져 백지에서 다시 잡았다.

**무엇이 무효가 됐나**

| 문서 | 무엇이 폐기됐나 |
|---|---|
| `prologue_service_concept_v1.1.md` | "인증 기반 진지한 소개팅 앱" 포지셔닝 전체 |
| `prologue_02_brand_identity_v0.2.md` | 옛 브랜드 초안. 현재는 2026-10의 "서고와 편지"·갈피 설계를 따른다 |
| `08_화면목록_ia_v_0_1.md`, `2026-06-29-사용자앱-IA-v0.2-…` | 4탭 구조. 하드룰 1(진열 금지)과 충돌 |
| `08_추천_알고리즘_기준서_v_0_1.md` | 점수 6개 컴포넌트, 가중치 25/20/20/15/10/10 |
| `08_기능요구사항서_v_0_1.md`, `08_mvp_기능범위_정의서_v_0_1.md` | FR 목록 대부분 |
| `08_데이터항목_정의서_v_0_1.md` | 스키마 재설계로 무효 |
| `prologue_05_*` (BM·가격·추천수 과금) | 재화 모델, 정기 배급, 하루 N장 |
| `prologue_03_*` (여정·대화·온보딩·프로필) | 추천 카드 중심 흐름 |
| `prologue_01_*` (타깃·문제 정의) | 옛 타깃·문제 정의. 이후 컨셉 재설정과 2026-10-11의 첫 지역·직군을 나누지 않는 결정을 따른다 |
| `prologue_00_terms_expression_guide`, `prologue_02_service_glossary` | 옛 용어 매핑. 현재는 AGENTS 9장과 갈피 브랜드 설계를 따른다 |

**무엇이 살아남아 `docs/` 에 남았나**

- `prologue_04_privacy_visibility_policy_v0.1.md` — 개인정보·공개 범위
- `prologue_04_report_block_sanction_policy_v0.1.md` — 신고·차단·제재
- `prologue_04_safety_ux_guide_v0.1.md` — 안전 UX
- `prologue_04_verification_policy_v0.1.md` — 인증 정책
- `prologue_02_copy_tone_guide_v0.1.md` — 카피 금지 표현 목록

## 2026-07 HOME v1 — 기록 보존, 작업 종료

운영자 결정으로 현재 제품에 반영하지 않고 종료했다. 옛 코드와 설계를 현재 작업 트리에 합치지 않고 원격 태그로 보존한다.

- 코드·미적용 마이그레이션: `archive/home-v1-code-2026-07` (`b4b2bd3`)
- 설계와 당시 기획 이력: `archive/home-v1-docs-2026-07` (`fea6e57`)
- 종료한 브랜치: `claude/home-v1-wip-2026-07`, `claude/docs-2026-07-unpushed`
- [종료 결정과 기록 열람 링크](../decisions/2026-10-31-HOME-v1-종료.md)

보관된 HANDOFF의 재개 안내는 당시 기록이다. 현재 작업 지시로 따르거나 옛 마이그레이션을 적용하지 않는다.

## 현재 기준 문서

- `docs/superpowers/specs/2026-09-02-컨셉-재설정-design.md` — 컨셉·BM·법적 검토
- `docs/superpowers/specs/2026-09-11-화면-흐름-설계.md` — 화면과 내비게이션
- `AGENTS.md` — 공통 작업 지침·하드룰 8가지 (`CLAUDE.md`는 참조만)
- `docs/superpowers/specs/2026-10-09-브랜드-세계관-갈피-design.md` — 현행 세계관·캐릭터
- `docs/superpowers/specs/2026-10-10-서비스-구성-위계-design.md` — 현행 4탭 IA v2. 폐기된 옛 4탭과 구분한다
- `docs/superpowers/specs/2026-10-15-멀티서비스-플랫폼-design.md` — 호스팅·공통 플랫폼. 현황 조사·현황표 작성 계획만 폐기

## 폐기된 코드를 꺼내려면

```bash
git checkout v0-old-concept -- <경로>
```
