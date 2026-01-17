# GitHub Actions 브랜치별 동작 방식

## ❌ 잘못된 정보

**"Actions는 main 브랜치에서만 사용 가능하다"** - 이것은 **거짓**입니다!

## ✅ 올바른 정보

GitHub Actions는 **모든 브랜치**에서 작동합니다. 다만, 브랜치에 따라 동작 방식이 약간 다릅니다.

---

## 📋 브랜치별 동작 방식

### 1. 워크플로우 파일 인식

- ✅ **모든 브랜치**의 `.github/workflows/` 디렉토리에 있는 워크플로우 파일을 인식합니다
- ✅ `critical-error-fixed` 브랜치에 푸시한 워크플로우도 인식됩니다

### 2. 수동 실행 (`workflow_dispatch`)

- ✅ **모든 브랜치**에서 수동 실행 가능
- Actions 탭 → 워크플로우 선택 → "Run workflow" → 브랜치 선택

### 3. 스케줄 실행 (`schedule`)

- ⚠️ **기본 브랜치(보통 main)**에서만 자동 실행됩니다
- 다른 브랜치의 워크플로우는 스케줄 실행이 되지 않습니다
- 이유: GitHub가 기본 브랜치의 워크플로우만 신뢰하기 때문

### 4. Push/PR 트리거

- ✅ **모든 브랜치**에서 작동
- 특정 브랜치에 push하거나 PR을 생성하면 트리거됩니다

---

## 🔍 현재 상황 분석

현재 `critical-error-fixed` 브랜치에 워크플로우를 푸시했다면:

### ✅ 가능한 것

1. **수동 실행**: Actions 탭에서 수동으로 실행 가능
2. **워크플로우 보기**: Actions 탭에서 워크플로우 목록 확인 가능
3. **Push 트리거**: 해당 브랜치에 push하면 트리거 가능

### ❌ 불가능한 것

1. **스케줄 자동 실행**: `schedule` 트리거는 기본 브랜치에서만 작동
   - 매일 자동 실행을 원하면 `main` 브랜치에도 워크플로우가 있어야 합니다

---

## 💡 해결 방법

### 방법 1: 현재 브랜치에서 수동 실행 (테스트용)

1. GitHub 저장소 → **Actions** 탭
2. 왼쪽에서 **Update Stock Symbols** 클릭
3. 오른쪽 상단 **Run workflow** 클릭
4. 브랜치: **critical-error-fixed** 선택
5. **Run workflow** 클릭

✅ 이렇게 하면 `critical-error-fixed` 브랜치에서도 실행됩니다!

### 방법 2: main 브랜치에도 추가 (자동 실행을 원할 경우)

자동 스케줄 실행을 원한다면 `main` 브랜치에도 워크플로우를 추가해야 합니다:

```bash
# main 브랜치로 전환
git checkout main

# 워크플로우 파일 가져오기
git checkout critical-error-fixed -- .github/workflows/update-symbols.yml

# 커밋 및 푸시
git add .github/workflows/update-symbols.yml
git commit -m "feat: GitHub Actions 워크플로우 추가"
git push origin main

# 다시 원래 브랜치로
git checkout critical-error-fixed
```

이렇게 하면:
- ✅ `main` 브랜치에서 매일 자동 실행
- ✅ `critical-error-fixed` 브랜치에서도 수동 실행 가능

---

## 📝 워크플로우 파일 확인

현재 워크플로우 파일에는 두 가지 트리거가 있습니다:

```yaml
on:
  schedule:
    - cron: '0 17 * * *'  # ⚠️ 기본 브랜치에서만 작동
  workflow_dispatch:      # ✅ 모든 브랜치에서 작동
```

- `schedule`: 기본 브랜치에서만 자동 실행
- `workflow_dispatch`: 모든 브랜치에서 수동 실행 가능

---

## 🎯 권장 사항

### 시나리오 1: 테스트만 원하는 경우

- `critical-error-fixed` 브랜치에서 수동 실행으로 충분
- Actions 탭에서 "Run workflow" 버튼으로 테스트

### 시나리오 2: 자동 실행을 원하는 경우

- `main` 브랜치에도 워크플로우 추가
- 매일 자동으로 실행됨
- 다른 브랜치에서도 수동 실행 가능

---

## ✅ 요약

| 기능 | 모든 브랜치 | 기본 브랜치만 |
|------|------------|--------------|
| 워크플로우 인식 | ✅ | ❌ |
| 수동 실행 | ✅ | ❌ |
| 스케줄 자동 실행 | ❌ | ✅ |
| Push 트리거 | ✅ | ❌ |

**결론**: Actions는 모든 브랜치에서 사용 가능하지만, **스케줄 자동 실행만 기본 브랜치에서 작동**합니다.
