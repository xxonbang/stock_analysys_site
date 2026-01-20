# GitHub Actions 브랜치 전략 가이드

## ❓ 질문: symbols.json이 모든 브랜치에 공통으로 적용되나요?

**답변: 아니요. 자동으로는 적용되지 않습니다.**

---

## 📋 현재 동작 방식

### 현재 워크플로우 동작

1. **실행 브랜치**: `main` 브랜치에서만 실행 (스케줄 실행)
2. **파일 생성 위치**: `public/data/symbols.json`
3. **커밋 위치**: `main` 브랜치에만 커밋 및 푸시
4. **다른 브랜치**: 자동으로 업데이트되지 않음

### 코드 분석

```yaml
# 현재 워크플로우의 커밋 부분
- name: Commit and push changes
  run: |
    git add public/data/symbols.json
    git commit -m "🤖 자동 업데이트: 종목 리스트 갱신"
    git push origin HEAD:${{ github.ref }}
```

`${{ github.ref }}`는 워크플로우가 실행된 브랜치를 가리킵니다.
- 스케줄 실행: `main` 브랜치
- 수동 실행: 선택한 브랜치

---

## 🔄 브랜치별 상황

### 1. main 브랜치

- ✅ **자동 업데이트**: 매일 스케줄 실행으로 `symbols.json` 업데이트
- ✅ **최신 상태**: 항상 최신 종목 리스트 유지

### 2. critical-error-fixed 브랜치

- ❌ **자동 업데이트 없음**: `main` 브랜치의 변경사항이 자동으로 반영되지 않음
- ⚠️ **수동 업데이트 필요**: `main` 브랜치의 변경사항을 merge하거나 cherry-pick해야 함

### 3. 다른 브랜치들

- ❌ **자동 업데이트 없음**: 마찬가지로 수동 업데이트 필요

---

## 💡 해결 방법

### 방법 1: main 브랜치에서만 사용 (권장)

**장점:**
- 간단하고 명확함
- 자동 업데이트로 항상 최신 상태 유지
- 다른 브랜치에서 작업할 때 필요하면 merge

**단점:**
- 다른 브랜치에서는 수동으로 merge 필요

**적용 방법:**
- 현재 설정 그대로 유지
- 다른 브랜치에서 작업 시 주기적으로 `main` 브랜치를 merge

```bash
# critical-error-fixed 브랜치에서
git checkout critical-error-fixed
git merge main  # main의 최신 symbols.json 가져오기
```

---

### 방법 2: 모든 브랜치에 자동 업데이트

**장점:**
- 모든 브랜치에서 최신 `symbols.json` 사용 가능
- 수동 merge 불필요

**단점:**
- 워크플로우가 복잡해짐
- 모든 브랜치에 커밋이 생성됨

**구현 방법:**

워크플로우를 수정하여 모든 브랜치에 푸시:

```yaml
- name: Commit and push to all branches
  if: steps.check-changes.outputs.has_changes == 'true'
  run: |
    git add public/data/symbols.json
    git commit -m "🤖 자동 업데이트: 종목 리스트 갱신 [$(date +'%Y-%m-%d %H:%M:%S')]"
    
    # 모든 브랜치 목록 가져오기
    BRANCHES=$(git branch -r | grep -v HEAD | sed 's/origin\///' | tr '\n' ' ')
    
    # 각 브랜치에 푸시
    for branch in $BRANCHES; do
      git push origin HEAD:$branch || echo "Failed to push to $branch"
    done
```

⚠️ **주의**: 이 방법은 모든 브랜치에 커밋을 생성하므로 히스토리가 복잡해질 수 있습니다.

---

### 방법 3: 특정 브랜치만 업데이트

**장점:**
- 필요한 브랜치만 선택적으로 업데이트
- 유연한 관리

**구현 방법:**

워크플로우에서 특정 브랜치 목록을 정의:

```yaml
- name: Commit and push to specific branches
  if: steps.check-changes.outputs.has_changes == 'true'
  run: |
    git add public/data/symbols.json
    git commit -m "🤖 자동 업데이트: 종목 리스트 갱신 [$(date +'%Y-%m-%d %H:%M:%S')]"
    
    # 업데이트할 브랜치 목록
    BRANCHES="main critical-error-fixed"
    
    for branch in $BRANCHES; do
      git push origin HEAD:$branch || echo "Failed to push to $branch"
    done
```

---

## 🎯 권장 사항

### 시나리오 1: 개발 중인 브랜치가 있는 경우

**권장: 방법 1 (main만 업데이트)**

- `main` 브랜치에서만 자동 업데이트
- 필요할 때만 다른 브랜치에 merge
- 깔끔한 히스토리 유지

**사용 예시:**
```bash
# critical-error-fixed 브랜치에서 작업 중
git checkout critical-error-fixed

# 주기적으로 main의 최신 symbols.json 가져오기
git merge main

# 또는 symbols.json만 가져오기
git checkout main -- public/data/symbols.json
git commit -m "chore: symbols.json 최신화"
```

---

### 시나리오 2: 여러 브랜치에서 동시에 작업하는 경우

**권장: 방법 3 (특정 브랜치만 업데이트)**

- 필요한 브랜치만 선택적으로 업데이트
- 불필요한 커밋 방지

---

## 📝 현재 설정 확인

현재 워크플로우는 **방법 1** 방식입니다:
- ✅ `main` 브랜치에서만 자동 업데이트
- ✅ 다른 브랜치에서는 수동 merge 필요

이 설정이 적합한지 확인하고, 필요하면 위의 방법 2 또는 3으로 변경할 수 있습니다.

---

## ✅ 요약

| 방법 | 자동 업데이트 | 브랜치 | 복잡도 |
|------|-------------|--------|--------|
| 방법 1 (현재) | main만 | main | ⭐ 낮음 |
| 방법 2 | 모든 브랜치 | 모든 브랜치 | ⭐⭐⭐ 높음 |
| 방법 3 | 선택적 | 지정한 브랜치 | ⭐⭐ 중간 |

**결론**: 현재는 `main` 브랜치에만 자동으로 업데이트됩니다. 다른 브랜치에서 사용하려면 수동으로 merge하거나 워크플로우를 수정해야 합니다.
