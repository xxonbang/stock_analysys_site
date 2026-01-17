# GitHub Actions 활성화 문제 해결 가이드

## 🔍 Actions가 보이지 않는 경우

### 1. 브랜치 확인

현재 `critical-error-fixed` 브랜치에 푸시했을 수 있습니다.

**해결 방법:**
- GitHub 저장소 → **Actions** 탭
- 왼쪽 사이드바에서 **All workflows** 또는 **Update Stock Symbols** 클릭
- 상단의 브랜치 필터에서 **critical-error-fixed** 선택

또는 `main` 브랜치에도 워크플로우 파일이 있는지 확인:

```bash
# main 브랜치로 전환
git checkout main

# critical-error-fixed 브랜치의 워크플로우 파일 가져오기
git checkout critical-error-fixed -- .github/workflows/update-symbols.yml

# 커밋 및 푸시
git add .github/workflows/update-symbols.yml
git commit -m "feat: GitHub Actions 워크플로우 추가"
git push origin main
```

### 2. GitHub Actions 기능 활성화 확인

**확인 방법:**
1. GitHub 저장소 → **Settings**
2. 왼쪽 사이드바에서 **Actions** → **General**
3. **Allow all actions and reusable workflows** 선택되어 있는지 확인
4. **Save** 클릭

### 3. 워크플로우 파일 위치 확인

파일이 올바른 위치에 있는지 확인:

```
.github/
  └── workflows/
      └── update-symbols.yml
```

**확인 명령어:**
```bash
ls -la .github/workflows/update-symbols.yml
```

### 4. 파일이 실제로 푸시되었는지 확인

GitHub 웹사이트에서 확인:
1. 저장소 페이지 → **Code** 탭
2. `.github/workflows/update-symbols.yml` 파일이 있는지 확인
3. 파일을 클릭하여 내용 확인

### 5. Actions 탭이 보이지 않는 경우

**원인:**
- 저장소가 비공개이고 Actions가 비활성화되어 있을 수 있습니다
- 저장소 소유자가 Actions를 비활성화했을 수 있습니다

**해결:**
1. 저장소 Settings → Actions → General
2. **Allow all actions and reusable workflows** 선택
3. **Save** 클릭

### 6. 워크플로우가 목록에 나타나지 않는 경우

**원인:**
- YAML 파일에 문법 오류가 있을 수 있습니다
- 파일이 올바른 형식이 아닐 수 있습니다

**확인 방법:**
1. GitHub 저장소 → **Actions** 탭
2. 왼쪽 사이드바에서 워크플로우 목록 확인
3. "Update Stock Symbols"가 보이지 않으면:
   - 파일 내용 확인
   - YAML 문법 검사

**YAML 문법 검사:**
```bash
# Python으로 간단한 검사
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/update-symbols.yml'))"
```

### 7. 수동 실행 테스트

워크플로우가 보이면 수동으로 실행해보세요:

1. **Actions** 탭 → **Update Stock Symbols** 클릭
2. 오른쪽 상단 **Run workflow** 버튼 클릭
3. 브랜치 선택 (critical-error-fixed 또는 main)
4. **Run workflow** 클릭

### 8. 브랜치별 워크플로우 확인

GitHub Actions는 기본적으로 모든 브랜치의 워크플로우를 보여줍니다.

**확인 방법:**
1. **Actions** 탭
2. 왼쪽 사이드바에서 **All workflows** 클릭
3. 모든 브랜치의 워크플로우가 표시됩니다

---

## ✅ 체크리스트

- [ ] `.github/workflows/update-symbols.yml` 파일이 저장소에 존재하는가?
- [ ] GitHub 저장소 → Settings → Actions → General에서 Actions가 활성화되어 있는가?
- [ ] Actions 탭에서 워크플로우가 보이는가?
- [ ] 올바른 브랜치를 확인했는가? (critical-error-fixed 또는 main)
- [ ] 워크플로우 파일에 문법 오류가 없는가?

---

## 🚀 빠른 해결 방법

가장 빠른 해결 방법은 `main` 브랜치에도 워크플로우를 추가하는 것입니다:

```bash
# 현재 브랜치 확인
git branch

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

이제 GitHub 저장소 → Actions 탭에서 워크플로우를 확인할 수 있습니다.
