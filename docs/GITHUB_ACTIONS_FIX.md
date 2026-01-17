# GitHub Actions 활성화 문제 해결

## 🔍 문제 진단

현재 `critical-error-fixed` 브랜치에 푸시했는데 Actions가 보이지 않는 경우:

### 1단계: GitHub 웹사이트에서 확인

1. **GitHub 저장소 페이지**로 이동
   - `https://github.com/xxonbang/stock_analysys_site`

2. **Actions** 탭 클릭

3. **왼쪽 사이드바**에서 확인:
   - "Update Stock Symbols" 워크플로우가 보이는지 확인
   - 보이지 않으면 아래 단계 진행

### 2단계: 파일 존재 확인

1. **Code** 탭 클릭
2. `.github/workflows/update-symbols.yml` 파일이 있는지 확인
3. 파일을 클릭하여 내용 확인

### 3단계: Actions 기능 활성화

1. **Settings** 탭 클릭
2. 왼쪽 사이드바 → **Actions** → **General**
3. **Workflow permissions** 섹션에서:
   - ✅ **Read and write permissions** 선택
4. **Actions permissions** 섹션에서:
   - ✅ **Allow all actions and reusable workflows** 선택
5. **Save** 클릭

### 4단계: 브랜치 필터 확인

Actions 탭에서:
1. 상단의 **브랜치 필터** 확인
2. **critical-error-fixed** 브랜치 선택
3. 또는 **All branches** 선택

### 5단계: 수동 실행 테스트

1. **Actions** 탭
2. 왼쪽에서 **Update Stock Symbols** 클릭
3. 오른쪽 상단 **Run workflow** 버튼 클릭
4. 브랜치: **critical-error-fixed** 선택
5. **Run workflow** 클릭

---

## 🚀 빠른 해결: main 브랜치에도 추가

가장 확실한 방법은 `main` 브랜치에도 워크플로우를 추가하는 것입니다:

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

---

## ✅ 확인 체크리스트

- [ ] GitHub 저장소 → Settings → Actions → General에서 Actions 활성화 확인
- [ ] Actions 탭에서 워크플로우 목록 확인
- [ ] 브랜치 필터에서 critical-error-fixed 선택
- [ ] .github/workflows/update-symbols.yml 파일이 저장소에 존재하는지 확인
- [ ] 수동 실행 테스트

---

## 💡 참고

- GitHub Actions는 모든 브랜치의 워크플로우를 인식합니다
- 파일이 올바른 위치에 있으면 자동으로 인식됩니다
- 첫 푸시 후 몇 분 정도 걸릴 수 있습니다
