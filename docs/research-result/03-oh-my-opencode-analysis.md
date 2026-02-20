# oh-my-opencode / oh-my-claudecode 분석

## 프로젝트 개요

### oh-my-claudecode
- **저장소**: [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)
- **설명**: Claude Code를 위한 Teams-first Multi-agent 오케스트레이션
- **특징**: 5가지 실행 모드, 31+ 스킬, 32개 전문 에이전트

### oh-my-opencode
- **NPM**: [oh-my-opencode](https://www.npmjs.com/package/oh-my-opencode)
- **설명**: OpenCode용 멀티 에이전트 오케스트레이션
- **주의**: ohmyopencode.com은 공식 사이트가 아님 (사칭 주의)

## 아키텍처 분석

### 1. 실행 모드 (5가지)

| 모드 | 설명 | 키워드 |
|------|------|--------|
| **Autopilot** | 완전 자율 실행 | "autopilot", "build me", "I want a" |
| **Ultrapilot** | 병렬 자율 (3-5x 빠름) | "ultrapilot", "parallel build" |
| **Swarm** | N개 조율 에이전트 | "swarm N agents" |
| **Pipeline** | 순차 에이전트 체인 | "pipeline", "chain agents" |
| **Ecomode** | 토큰 효율 병렬 | "eco", "ecomode", "budget" |

### 2. 에이전트 구성 (32개)

#### 도메인별 분류

| 도메인 | LOW (Haiku) | MEDIUM (Sonnet) | HIGH (Opus) |
|--------|-------------|-----------------|-------------|
| **분석** | architect-low | architect-medium | architect |
| **실행** | executor-low | executor | executor-high |
| **탐색** | explore | explore-medium | explore-high |
| **연구** | researcher-low | researcher | - |
| **프론트엔드** | designer-low | designer | designer-high |
| **문서** | writer | - | - |
| **시각** | - | vision | - |
| **계획** | - | - | planner |
| **비평** | - | - | critic |
| **분석가** | - | - | analyst |
| **테스트** | - | qa-tester | qa-tester-high |
| **보안** | security-reviewer-low | - | security-reviewer |
| **빌드** | build-fixer-low | build-fixer | - |
| **TDD** | tdd-guide-low | tdd-guide | - |
| **코드리뷰** | code-reviewer-low | - | code-reviewer |
| **데이터** | scientist-low | scientist | scientist-high |

### 3. 스킬 시스템 (31+개)

#### 코어 스킬
- `orchestrate` - 기본 오케스트레이션
- `ralph` - 지속성 모드
- `ultrawork` - 최대 병렬 실행
- `plan` - 계획 인터뷰
- `analyze` - 심층 분석
- `deepsearch` - 철저한 검색

#### 특화 스킬
- `frontend-ui-ux` - 디자인 감성
- `git-master` - Git 전문가
- `ultraqa` - QA 사이클링
- `tdd` - 테스트 주도 개발
- `mcp-setup` - MCP 서버 구성

### 4. 위임 패턴 (Delegation Pattern)

```typescript
// 올바른 위임 예시
task(
  category="visual-engineering",
  load_skills=["frontend-ui-ux", "react-design-system"],
  prompt="..."
)

// 잘못된 예시 (빈 스킬)
task(category="...", load_skills=[], prompt="...")  // ❌
```

### 5. 상태 관리

#### 상태 파일 위치
```
.omc/state/
├── ralph-state.json
├── autopilot-state.json
├── ultrapilot-state.json
├── ultrawork-state.json
├── ecomode-state.json
├── ultraqa-state.json
├── pipeline-state.json
├── swarm-summary.json
└── swarm-active.marker
```

### 6. MCP 도구 매트릭스

| 에이전트 | LSP Diagnostics | LSP Symbols | AST Search | AST Replace | Python REPL |
|---------|:---:|:---:|:---:|:---:|:---:|
| explore | - | doc+workspace | ✓ | - | - |
| explore-high | - | doc+workspace | ✓ | - | - |
| architect | ✓ | ✓ | ✓ | - | - |
| executor | ✓ | ✓ | - | - | - |
| executor-high | ✓ | ✓ | ✓ | ✓ | - |
| scientist | - | - | - | - | ✓ |

## 핵심 설계 원칙

### 1. 위임 우선 철학
```
RULE 1: 항상 전문 에이전트에게 실질적 작업 위임
RULE 2: 인식된 패턴에 적절한 스킬 호출
RULE 3: 직접 코드 변경 금지 - executor에게 위임
RULE 4: Architect 검증 없이 완료 금지
```

### 2. 문서 우선 개발
- SDK/API 사용 전 공식 문서 확인
- Context7 MCP 도구 활용
- 가정 금지, 실제 스키마 검증

### 3. 모델 라우팅
| 복잡도 | 모델 | 예시 |
|--------|------|------|
| 단순 조회 | haiku | "X가 무엇을 반환하는가?" |
| 일반 작업 | sonnet | "에러 처리 추가" |
| 복잡 추론 | opus | "레이스 컨디션 디버그" |

## 파이프라인 프리셋

| 프리셋 | 단계 |
|--------|------|
| `review` | explore → architect → critic → executor |
| `implement` | planner → executor → tdd-guide |
| `debug` | explore → architect → build-fixer |
| `research` | parallel(researcher, explore) → architect → writer |
| `refactor` | explore → architect-medium → executor-high → qa-tester |
| `security` | explore → security-reviewer → executor → security-reviewer-low |

## 사용자 경험

### 제로 러닝 커브
- 명령어 학습 불필요
- 의도 자동 감지
- 자동 동작 활성화

### 매직 키워드
| 키워드 | 효과 |
|--------|------|
| `autopilot` | 완전 자율 실행 |
| `ralph` | 지속성 모드 |
| `ulw` | 최대 병렬 |
| `plan` | 계획 인터뷰 |
| `eco` | 토큰 효율 |

## 참고 자료

- [oh-my-claudecode GitHub](https://github.com/Yeachan-Heo/oh-my-claudecode)
- [oh-my-opencode NPM](https://www.npmjs.com/package/oh-my-opencode)
- [Claude Code Agent Teams Guide](https://serenitiesai.com/articles/claude-code-agent-teams-guide)
- [Multi-Agent Architecture Guide](https://www.blog.langchain.com/choosing-the-right-multi-agent-architecture/)
