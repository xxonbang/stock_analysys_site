# Python 3.11 업그레이드 완료

## 변경 사항

### 1. Python 버전 설정
- **로컬 환경**: `.python-version` 파일에 `3.11.10` 설정
- **Vercel 배포**: `vercel.json`에서 `@vercel/python@3.11` 사용
- **Runtime 설정**: `runtime.txt`에 `python-3.11.10` 명시

### 2. 패키지 재설치
- Python 3.11 환경에서 모든 패키지 재설치 완료
- `requirements.txt`의 패키지 이름 수정 (`FinanceDataReader` → `finance-datareader`)

### 3. 스크립트 업데이트
- `scripts/test_python_stock.py`의 shebang을 `python3.11`로 업데이트

## 파일 변경 내역

### 생성/수정된 파일
- `.python-version`: Python 3.11.10 지정
- `runtime.txt`: Vercel Python runtime 버전 명시
- `vercel.json`: Python runtime을 3.11로 변경
- `api/requirements.txt`: 패키지 이름 수정

### Python 버전 확인
```bash
python3 --version  # Python 3.11.10
```

### 패키지 설치 확인
```bash
python3 -m pip list | grep -E "yfinance|finance|pandas|numpy"
```

## 배포 시 주의사항

1. **Vercel 배포**: `vercel.json`의 runtime 설정이 자동으로 적용됩니다.
2. **로컬 개발**: `pyenv local 3.11.10`으로 설정되어 있어 자동으로 3.11을 사용합니다.
3. **패키지 호환성**: Python 3.11에서 모든 패키지가 정상 작동합니다.

## 테스트

```bash
# Python 스크립트 직접 테스트
python3 scripts/test_python_stock.py "005930.KS" "1m"

# API 테스트
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"stocks": ["삼성전자", "TSLA"], "period": "1m", "indicators": {...}}'
```
