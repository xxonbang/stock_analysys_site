# GitHub Actions 활성화 가이드

## 🔍 현재 상황

"Get started with GitHub Actions" 화면이 보인다면:
- 워크플로우 파일이 아직 인식되지 않았거나
- Actions 기능이 비활성화되어 있을 수 있습니다

---

## ✅ 단계별 해결 방법

### 1단계: GitHub Settings에서 Actions 활성화

1. **GitHub 저장소 페이지**로 이동
   - `https://github.com/xxonbang/stock_analysys_site`

2. 상단 메뉴에서 **Settings** 클릭

3. 왼쪽 사이드바에서 **Actions** → **General** 클릭

4. **Actions permissions** 섹션 확인:
   - ✅ **"Allow all actions and reusable workflows"** 선택
   - 또는 **"Allow local actions and reusable workflows"** 선택

5. **Workflow permissions** 섹션 확인:
   - ✅ **"Read and write permissions"** 선택
   - (자동 커밋을 위해 필요)

6. **Save** 버튼 클릭

---

### 2단계: 워크플로우 파일 확인

#### 2-1. 로컬에서 파일 확인

터미널에서 실행:

```bash
# 파일이 있는지 확인
ls -la .github/workflows/update-symbols.yml

# 파일 내용 확인 (첫 20줄)
head -20 .github/workflows/update-symbols.yml
```

#### 2-2. GitHub 웹사이트에서 확인

1. **Code** 탭 클릭
2. `.github` 폴더 클릭
3. `workflows` 폴더 클릭
4. `update-symbols.yml` 파일이 있는지 확인

**파일이 없다면:**
- 파일이 푸시되지 않았을 수 있습니다
- 아래 3단계를 진행하세요

**파일이 있다면:**
- 파일 내용을 확인하세요
- YAML 문법 오류가 없는지 확인하세요

---

### 3단계: 워크플로우 파일 푸시

파일이 로컬에만 있고 GitHub에 없다면:

```bash
# 현재 상태 확인
git status

# 파일 추가
git add .github/workflows/update-symbols.yml

# 커밋
git commit -m "feat: GitHub Actions 워크플로우 추가"

# 푸시
git push origin critical-error-fixed
```

또는 `main` 브랜치에도 추가:

```bash
# main 브랜치로 전환
git checkout main

# 워크플로우 파일 가져오기
git checkout critical-error-fixed -- .github/workflows/update-symbols.yml

# 커밋 및 푸시
git add .github/workflows/update-symbols.yml
git commit -m "feat: GitHub Actions 워크플로우 추가"
git push origin main

# 원래 브랜치로 돌아가기
git checkout critical-error-fixed
```

---

### 4단계: Actions 탭 새로고침

1. **Actions** 탭으로 이동
2. **브라우저 새로고침** (F5 또는 Cmd+R)
3. 몇 초 기다린 후 다시 확인

**예상 결과:**
- 왼쪽 사이드바에 **"Update Stock Symbols"** 워크플로우가 보여야 합니다
- 또는 **"All workflows"** 섹션에 나타나야 합니다

---

### 5단계: 워크플로우 수동 실행 테스트

워크플로우가 보이면:

1. 왼쪽 사이드바에서 **"Update Stock Symbols"** 클릭
2. 오른쪽 상단 **"Run workflow"** 버튼 클릭
3. 브랜치 선택 (critical-error-fixed 또는 main)
4. **"Run workflow"** 클릭
5. 실행 로그 확인

---

## 🔧 문제 해결

### 문제 1: 파일이 GitHub에 없음

**원인:** 파일이 커밋되지 않았거나 푸시되지 않았을 수 있습니다.

**해결:**
```bash
# 파일이 git에 추가되었는지 확인
git ls-files .github/workflows/update-symbols.yml

# 없다면 추가
git add .github/workflows/update-symbols.yml
git commit -m "feat: GitHub Actions 워크플로우 추가"
git push
```

### 문제 2: YAML 문법 오류

**원인:** 워크플로우 파일에 문법 오류가 있을 수 있습니다.

**확인 방법:**
```bash
# Python으로 YAML 검사 (yaml 패키지 필요)
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/update-symbols.yml'))"
```

**해결:** 파일 내용을 확인하고 문법 오류 수정

### 문제 3: Actions가 여전히 비활성화

**원인:** 저장소 설정에서 Actions가 비활성화되어 있을 수 있습니다.

**해결:**
1. Settings → Actions → General
2. 모든 옵션을 활성화
3. Save 클릭
4. Actions 탭 새로고침

### 문제 4: 브랜치 필터 문제

**원인:** 다른 브랜치의 워크플로우를 보고 있을 수 있습니다.

**해결:**
1. Actions 탭에서 브랜치 필터 확인
2. **"All branches"** 또는 **"critical-error-fixed"** 선택
3. 왼쪽 사이드바에서 워크플로우 확인

---

## 🚀 빠른 해결 (권장)

가장 확실한 방법은 **main 브랜치에 워크플로우를 추가**하는 것입니다:

```bash
# 1. main 브랜치로 전환
git checkout main

# 2. 워크플로우 파일 가져오기
git checkout critical-error-fixed -- .github/workflows/update-symbols.yml

# 3. 커밋 및 푸시
git add .github/workflows/update-symbols.yml
git commit -m "feat: GitHub Actions 워크플로우 추가"
git push origin main

# 4. 원래 브랜치로 돌아가기
git checkout critical-error-fixed
```

이렇게 하면:
- ✅ main 브랜치에서 워크플로우가 인식됩니다
- ✅ 매일 자동 실행됩니다
- ✅ Actions 탭에서 바로 확인 가능합니다

---

## ✅ 확인 체크리스트

- [ ] Settings → Actions → General에서 Actions 활성화 확인
- [ ] `.github/workflows/update-symbols.yml` 파일이 GitHub에 존재하는지 확인
- [ ] 파일이 올바른 브랜치에 푸시되었는지 확인
- [ ] Actions 탭 새로고침 후 워크플로우 확인
- [ ] 수동 실행 테스트

---

## 📝 참고

- GitHub Actions는 파일을 푸시한 후 몇 초에서 몇 분 정도 걸릴 수 있습니다
- 브라우저 캐시 문제일 수 있으니 강력 새로고침 (Ctrl+Shift+R 또는 Cmd+Shift+R) 시도
- 워크플로우 파일은 `.github/workflows/` 디렉토리에 `.yml` 또는 `.yaml` 확장자여야 합니다
