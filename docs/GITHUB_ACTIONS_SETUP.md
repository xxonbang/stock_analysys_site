# GitHub Actions 설정 가이드

이 문서는 GitHub Actions를 사용하여 매일 자동으로 `symbols.json` 파일을 업데이트하는 방법을 설명합니다.

## 📋 목차

1. [GitHub Actions란?](#github-actions란)
2. [필요한 준비사항](#필요한-준비사항)
3. [단계별 설정 방법](#단계별-설정-방법)
4. [테스트 방법](#테스트-방법)
5. [문제 해결](#문제-해결)

---

## GitHub Actions란?

**GitHub Actions**는 GitHub에서 제공하는 무료 CI/CD(지속적 통합/배포) 서비스입니다. 코드 저장소에서 자동으로 작업을 실행할 수 있게 해줍니다.

- ✅ **무료**: 공개 저장소는 무제한 무료
- ✅ **자동화**: 스케줄에 따라 자동 실행
- ✅ **간편**: YAML 파일만 작성하면 됨

---

## 필요한 준비사항

### 1. GitHub 저장소
- 코드가 GitHub에 푸시되어 있어야 합니다
- 저장소에 대한 쓰기 권한이 있어야 합니다

### 2. FINNHUB_API_KEY
- Finnhub API 키가 필요합니다 (미국 주식 리스트를 가져오기 위해)
- [Finnhub 웹사이트](https://finnhub.io/)에서 무료 API 키 발급 가능

---

## 단계별 설정 방법

### 1단계: GitHub Secrets 설정

GitHub Secrets는 민감한 정보(API 키 등)를 안전하게 저장하는 곳입니다.

#### 1-1. GitHub 저장소 페이지 접속
1. GitHub에서 저장소 페이지로 이동
2. 상단 메뉴에서 **Settings** 클릭

#### 1-2. Secrets 메뉴 찾기
1. 왼쪽 사이드바에서 **Secrets and variables** → **Actions** 클릭
2. 또는 직접 URL로 이동: `https://github.com/[사용자명]/[저장소명]/settings/secrets/actions`

#### 1-3. 새 Secret 추가
1. **New repository secret** 버튼 클릭
2. **Name**에 `FINNHUB_API_KEY` 입력
3. **Secret**에 실제 Finnhub API 키 입력
4. **Add secret** 버튼 클릭

✅ 완료! 이제 GitHub Actions에서 이 API 키를 안전하게 사용할 수 있습니다.

---

### 2단계: 워크플로우 파일 확인

프로젝트에 이미 `.github/workflows/update-symbols.yml` 파일이 생성되어 있습니다.

이 파일의 주요 내용:

```yaml
on:
  schedule:
    - cron: '0 17 * * *'  # 매일 UTC 17:00 (한국시간 다음날 02:00)
  workflow_dispatch:      # 수동 실행 가능
```

**스케줄 설명:**
- `cron: '0 17 * * *'` = 매일 UTC 17:00에 실행
- 한국시간으로는 다음날 오전 2시에 실행됩니다
- 원하는 시간으로 변경 가능합니다 (아래 참고)

**시간 변경 방법:**
- 한국시간 오전 9시로 변경하려면: `cron: '0 0 * * *'` (UTC 00:00)
- 한국시간 오후 3시로 변경하려면: `cron: '0 6 * * *'` (UTC 06:00)
- 한국시간 = UTC + 9시간

---

### 3단계: 파일 커밋 및 푸시

로컬에서 변경사항을 커밋하고 푸시합니다:

```bash
# 변경사항 확인
git status

# 파일 추가
git add .github/workflows/update-symbols.yml

# 커밋
git commit -m "feat: GitHub Actions로 매일 symbols.json 자동 업데이트 설정"

# 푸시
git push
```

---

### 4단계: 워크플로우 활성화 확인

1. GitHub 저장소 페이지로 이동
2. 상단 메뉴에서 **Actions** 탭 클릭
3. 왼쪽 사이드바에서 **Update Stock Symbols** 워크플로우가 보이는지 확인

---

## 테스트 방법

### 방법 1: 수동 실행 (권장)

워크플로우가 제대로 작동하는지 먼저 수동으로 테스트해보세요:

1. GitHub 저장소 → **Actions** 탭
2. 왼쪽에서 **Update Stock Symbols** 클릭
3. 오른쪽 상단의 **Run workflow** 버튼 클릭
4. **Run workflow** 드롭다운에서 브랜치 선택 (보통 `main` 또는 `master`)
5. **Run workflow** 버튼 클릭

**실행 확인:**
- 워크플로우가 실행되면 목록에 나타납니다
- 클릭하면 실행 로그를 볼 수 있습니다
- ✅ 초록색 체크 = 성공
- ❌ 빨간색 X = 실패 (로그 확인 필요)

### 방법 2: 스케줄 실행 대기

수동 실행이 성공하면, 다음 스케줄 시간까지 기다리면 자동으로 실행됩니다.

---

## 문제 해결

### 문제 1: "FINNHUB_API_KEY가 설정되지 않았습니다"

**원인:** GitHub Secrets에 API 키가 설정되지 않았습니다.

**해결:**
1. 저장소 Settings → Secrets and variables → Actions
2. `FINNHUB_API_KEY` Secret이 있는지 확인
3. 없으면 위의 "1단계: GitHub Secrets 설정" 참고

---

### 문제 2: "Permission denied" 또는 커밋 실패

**원인:** GitHub Actions가 저장소에 커밋할 권한이 없습니다.

**해결:**
1. 저장소 Settings → Actions → General
2. **Workflow permissions** 섹션 찾기
3. **Read and write permissions** 선택
4. **Save** 클릭

---

### 문제 3: Python 패키지 설치 실패

**원인:** `requirements.txt`에 필요한 패키지가 누락되었을 수 있습니다.

**해결:**
- 워크플로우 파일에서 자동으로 `requests`와 `beautifulsoup4`를 설치하도록 설정되어 있습니다
- 추가 패키지가 필요하면 워크플로우 파일의 "Install Python dependencies" 단계에 추가

---

### 문제 4: 스케줄이 실행되지 않음

**원인:** 
- 저장소가 비활성 상태일 수 있습니다 (GitHub는 비활성 저장소의 스케줄 워크플로우를 실행하지 않을 수 있음)
- Cron 표현식 오류

**해결:**
- 최근에 푸시가 있었는지 확인
- 수동 실행은 되는지 확인
- Cron 표현식 검증: [crontab.guru](https://crontab.guru/)

---

## 워크플로우 실행 로그 확인

1. GitHub 저장소 → **Actions** 탭
2. 실행 목록에서 원하는 실행 클릭
3. 왼쪽에서 각 단계를 클릭하면 상세 로그 확인 가능

**로그에서 확인할 내용:**
- ✅ "종목 리스트 생성 시작..."
- ✅ "symbols.json 생성 완료"
- ✅ "변경사항 발견" 또는 "변경사항 없음"
- ✅ "symbols.json이 성공적으로 업데이트되었습니다!"

---

## 추가 설정 (선택사항)

### 알림 설정

워크플로우 실행 결과를 이메일로 받으려면:

1. GitHub 프로필 → Settings → Notifications
2. **Actions** 섹션에서 알림 설정

### 다른 스케줄 설정

예시:
- **매주 월요일 오전 9시**: `cron: '0 0 * * 1'`
- **매일 오전 6시**: `cron: '0 21 * * *'` (UTC 21:00 = 한국시간 다음날 06:00)
- **매시간**: `cron: '0 * * * *'` (권장하지 않음 - API 제한 가능)

---

## 요약

✅ **완료해야 할 작업:**
1. GitHub Secrets에 `FINNHUB_API_KEY` 추가
2. 워크플로우 파일 커밋 및 푸시
3. 수동 실행으로 테스트
4. 자동 실행 대기

✅ **결과:**
- 매일 자동으로 `symbols.json` 업데이트
- 변경사항이 있으면 자동으로 커밋 및 푸시
- 최신 종목 리스트 유지

---

## 참고 자료

- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [Cron 표현식 가이드](https://crontab.guru/)
- [Finnhub API 문서](https://finnhub.io/docs/api)
