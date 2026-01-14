# 알림 시스템 설정 가이드

## 개요

알림 시스템은 데이터 품질 문제 발생 시 자동으로 알림을 생성하고, 외부 서비스(이메일, Slack, Discord)로 알림을 전송할 수 있습니다.

---

## 1. 알림 임계값 설정

환경 변수를 통해 알림 임계값을 조정할 수 있습니다.

### 환경 변수 설정

`.env.local` 파일에 다음 변수를 추가하세요:

```env
# 오류율 임계값 (%)
# 기본값: 10
ALERT_ERROR_RATE_THRESHOLD=10

# 정합성 검사 실패 시 즉시 알림 (true/false)
# 기본값: true
ALERT_CONSISTENCY_FAILURE=true

# 검증 실패 시 즉시 알림 (true/false)
# 기본값: true
ALERT_VALIDATION_FAILURE=true

# 데이터 소스 다운 알림을 위한 연속 실패 횟수
# 기본값: 5
ALERT_DATA_SOURCE_DOWN_COUNT=5

# 데이터 소스 다운 타임아웃 (밀리초)
# 기본값: 300000 (5분)
ALERT_DATA_SOURCE_DOWN_TIMEOUT=300000
```

### 임계값 설명

- **ALERT_ERROR_RATE_THRESHOLD**: 데이터 소스의 오류율이 이 값을 초과하면 알림 생성
- **ALERT_CONSISTENCY_FAILURE**: 정합성 검사 실패 시 즉시 알림 (false로 설정하면 비활성화)
- **ALERT_VALIDATION_FAILURE**: 데이터 검증 실패 시 즉시 알림 (false로 설정하면 비활성화)
- **ALERT_DATA_SOURCE_DOWN_COUNT**: 연속으로 이 횟수만큼 실패하면 데이터 소스 다운 알림
- **ALERT_DATA_SOURCE_DOWN_TIMEOUT**: 마지막 성공 이후 이 시간(ms) 동안 응답이 없으면 다운으로 간주

---

## 2. 외부 알림 연동

### Slack 알림 설정

1. **Slack Webhook URL 생성**
   - Slack 워크스페이스 설정 → Apps → Incoming Webhooks
   - 새 Webhook URL 생성
   - Webhook URL 복사

2. **환경 변수 설정**
   ```env
   # Slack 알림 활성화
   ALERT_SLACK_ENABLED=true
   
   # Slack Webhook URL
   ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

3. **알림 예시**
   - Critical/High 심각도 알림만 전송하려면:
     ```env
     ALERT_EXTERNAL_ONLY_CRITICAL=true
     ```

---

### Discord 알림 설정

1. **Discord Webhook URL 생성**
   - Discord 서버 설정 → Integrations → Webhooks
   - 새 Webhook 생성
   - Webhook URL 복사

2. **환경 변수 설정**
   ```env
   # Discord 알림 활성화
   ALERT_DISCORD_ENABLED=true
   
   # Discord Webhook URL
   ALERT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
   ```

3. **알림 예시**
   - Critical/High 심각도 알림만 전송하려면:
     ```env
     ALERT_EXTERNAL_ONLY_CRITICAL=true
     ```

---

### 이메일 알림 설정

**⚠️ 현재 이메일 알림 기능은 비활성화되어 있습니다.**

이메일 알림을 사용하려면:

1. **Nodemailer 설치**
   ```bash
   npm install nodemailer
   npm install --save-dev @types/nodemailer
   ```

2. **코드 활성화**
   - `lib/alert-notifiers.ts` 파일의 `sendEmailNotification` 함수에서 주석 처리된 코드를 활성화
   - nodemailer를 사용한 이메일 전송 로직 구현

3. **SMTP 서버 정보 확인**
   - Gmail, Outlook, 또는 기타 SMTP 서버 사용 가능
   - Gmail의 경우: App Password 필요 (2단계 인증 활성화 후)

4. **환경 변수 설정**
   ```env
   # 이메일 알림 활성화
   ALERT_EMAIL_ENABLED=true
   
   # SMTP 서버 설정
   ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
   ALERT_EMAIL_SMTP_PORT=587
   ALERT_EMAIL_SMTP_USER=your-email@gmail.com
   ALERT_EMAIL_SMTP_PASSWORD=your-app-password
   
   # 발신자 이메일
   ALERT_EMAIL_FROM=your-email@gmail.com
   
   # 수신자 이메일 (쉼표로 구분)
   ALERT_EMAIL_TO=recipient1@example.com,recipient2@example.com
   ```

5. **Gmail App Password 생성 방법**
   - Google 계정 → 보안 → 2단계 인증 활성화
   - 앱 비밀번호 생성
   - 생성된 비밀번호를 `ALERT_EMAIL_SMTP_PASSWORD`에 설정

**참고**: 현재는 Slack과 Discord 알림만 사용 가능합니다.

---

## 알림 심각도

알림은 다음 4가지 심각도로 분류됩니다:

- **Critical**: 데이터 소스 다운, 매우 높은 오류율
- **High**: 정합성 검사 다수 실패, 높은 오류율
- **Medium**: 검증 실패, 중간 오류율
- **Low**: 경고 수준

---

## 알림 유형

1. **정합성 검사 실패** (`consistency_failure`)
   - Finnhub + Yahoo Finance 혼합 시 데이터 불일치

2. **오류율 임계값 초과** (`error_rate_threshold`)
   - 데이터 소스 오류율이 임계값 초과

3. **검증 실패** (`validation_failure`)
   - 데이터 검증 실패

4. **데이터 소스 다운** (`data_source_down`)
   - 연속 실패 + 타임아웃 초과

---

## 설정 예시

### 기본 설정 (임계값만 조정)
```env
ALERT_ERROR_RATE_THRESHOLD=15
ALERT_DATA_SOURCE_DOWN_COUNT=3
```

### Slack만 활성화
```env
ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_EXTERNAL_ONLY_CRITICAL=true
```

### Slack + Discord 활성화
```env
# 임계값
ALERT_ERROR_RATE_THRESHOLD=10
ALERT_DATA_SOURCE_DOWN_COUNT=5

# Slack
ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Discord
ALERT_DISCORD_ENABLED=true
ALERT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Critical/High만 전송
ALERT_EXTERNAL_ONLY_CRITICAL=true
```

**참고**: 이메일 알림은 현재 비활성화되어 있습니다. 필요시 nodemailer를 설치하고 코드를 활성화하세요.

---

## 테스트

알림 시스템이 제대로 작동하는지 테스트하려면:

1. `/alerts` 페이지에서 알림 확인
2. 임계값을 낮춰서 테스트 알림 생성
3. 외부 알림 채널에서 알림 수신 확인

---

## 문제 해결

### Slack/Discord 알림이 전송되지 않음
- Webhook URL이 올바른지 확인
- `ALERT_SLACK_ENABLED` 또는 `ALERT_DISCORD_ENABLED`가 `true`인지 확인
- 서버 로그에서 오류 메시지 확인

### 이메일 알림이 전송되지 않음
- Nodemailer가 설치되어 있는지 확인: `npm install nodemailer`
- SMTP 설정이 올바른지 확인
- Gmail 사용 시 App Password 사용 확인
- 서버 로그에서 오류 메시지 확인

### 알림이 너무 많이 발생함
- `ALERT_ERROR_RATE_THRESHOLD` 값을 높이기
- `ALERT_EXTERNAL_ONLY_CRITICAL=true` 설정하여 Critical/High만 전송
- 특정 알림 유형 비활성화 (`ALERT_CONSISTENCY_FAILURE=false` 등)
