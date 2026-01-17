# 🚀 GitHub Actions 빠른 시작 가이드

매일 자동으로 종목 리스트를 업데이트하는 설정을 **5분 안에** 완료하세요!

## ✅ 체크리스트

- [ ] 1. GitHub Secrets에 API 키 추가
- [ ] 2. 파일 커밋 및 푸시
- [ ] 3. 수동 실행 테스트
- [ ] 4. 완료! 🎉

---

## 📝 단계별 가이드

### 1단계: GitHub Secrets 설정 (2분)

1. **GitHub 저장소 페이지**로 이동
   - 예: `https://github.com/사용자명/저장소명`

2. **Settings** 클릭 (상단 메뉴)

3. 왼쪽 사이드바에서 **Secrets and variables** → **Actions** 클릭

4. **New repository secret** 버튼 클릭

5. 입력:
   - **Name**: `FINNHUB_API_KEY`
   - **Secret**: 실제 Finnhub API 키 (`.env.local`에 있는 값)
   - **Add secret** 클릭

✅ 완료!

---

### 2단계: 파일 푸시 (1분)

터미널에서 실행:

```bash
# 변경사항 확인
git status

# 파일 추가
git add .github/workflows/update-symbols.yml

# 커밋
git commit -m "feat: GitHub Actions 자동 업데이트 설정"

# 푸시
git push
```

✅ 완료!

---

### 3단계: 테스트 실행 (2분)

1. **GitHub 저장소** → **Actions** 탭 클릭

2. 왼쪽에서 **Update Stock Symbols** 클릭

3. 오른쪽 상단 **Run workflow** 버튼 클릭

4. **Run workflow** 드롭다운에서 브랜치 선택 (보통 `main`)

5. **Run workflow** 버튼 클릭

6. 실행이 시작되면 목록에서 클릭하여 로그 확인

**성공 확인:**
- ✅ 초록색 체크 표시
- 로그에 "symbols.json 생성 완료" 메시지
- "변경사항 발견" 또는 "변경사항 없음" 메시지

✅ 완료!

---

## 🎯 다음 단계

이제 매일 자동으로 실행됩니다:
- **실행 시간**: 매일 한국시간 오전 2시
- **변경사항이 있으면**: 자동으로 커밋 및 푸시
- **변경사항이 없으면**: 아무 작업도 하지 않음

---

## ❓ 문제가 생겼나요?

자세한 설명은 [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)를 참고하세요.

**자주 발생하는 문제:**

1. **"FINNHUB_API_KEY가 설정되지 않았습니다"**
   → 1단계를 다시 확인하세요

2. **"Permission denied"**
   → Settings → Actions → General → Workflow permissions에서 "Read and write permissions" 선택

3. **워크플로우가 보이지 않음**
   → 파일이 제대로 푸시되었는지 확인 (`git push` 실행)

---

## 📅 실행 시간 변경하기

`.github/workflows/update-symbols.yml` 파일을 열어서:

```yaml
schedule:
  - cron: '0 17 * * *'  # 이 부분을 수정
```

**예시:**
- 한국시간 오전 9시: `cron: '0 0 * * *'`
- 한국시간 오후 3시: `cron: '0 6 * * *'`
- 매주 월요일 오전 9시: `cron: '0 0 * * 1'`

**Cron 계산기**: [crontab.guru](https://crontab.guru/)

---

## 🎉 완료!

이제 매일 자동으로 최신 종목 리스트가 업데이트됩니다!
