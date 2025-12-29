// 한글 금액 ↔ 숫자 변환 유틸리티

// 한글 숫자 매핑
const koreanNumbers: Record<string, number> = {
  '영': 0, '일': 1, '이': 2, '삼': 3, '사': 4,
  '오': 5, '육': 6, '칠': 7, '팔': 8, '구': 9,
  '십': 10, '백': 100, '천': 1000,
  '만': 10000, '억': 100000000, '조': 1000000000000
}

// 숫자를 한글 금액으로 변환
export function numberToKorean(num: number): string {
  if (num === 0) return '영원'

  const units = ['', '만', '억', '조']
  const smallUnits = ['', '십', '백', '천']
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']

  let result = ''
  let unitIndex = 0

  while (num > 0) {
    const chunk = num % 10000
    if (chunk > 0) {
      let chunkStr = ''
      let chunkNum = chunk
      let smallUnitIndex = 0

      while (chunkNum > 0) {
        const digit = chunkNum % 10
        if (digit > 0) {
          if (smallUnitIndex === 0) {
            chunkStr = digits[digit] + chunkStr
          } else {
            // 1인 경우 '일'을 생략 (십, 백, 천 앞에서)
            const digitStr = digit === 1 ? '' : digits[digit]
            chunkStr = digitStr + smallUnits[smallUnitIndex] + chunkStr
          }
        }
        chunkNum = Math.floor(chunkNum / 10)
        smallUnitIndex++
      }

      result = chunkStr + units[unitIndex] + result
    }

    num = Math.floor(num / 10000)
    unitIndex++
  }

  return result + '원'
}

// 한글 금액을 숫자로 변환
export function koreanToNumber(korean: string): number {
  // 원, 정 등 단위 제거
  korean = korean.replace(/[원정]/g, '').trim()

  let result = 0
  let current = 0
  let temp = 0

  for (const char of korean) {
    const value = koreanNumbers[char]

    if (value === undefined) continue

    if (value >= 10000) {
      // 만, 억, 조
      if (temp === 0) temp = 1
      current += temp
      result += current * value
      current = 0
      temp = 0
    } else if (value >= 10) {
      // 십, 백, 천
      if (temp === 0) temp = 1
      temp *= value
    } else {
      // 일~구
      temp = value
    }
  }

  // 남은 값 더하기
  if (temp > 0) current += temp
  result += current

  return result
}

// 금액 문자열에서 숫자 추출
export function extractNumberFromAmount(amountStr: string): number | null {
  // 괄호 안의 숫자 추출 시도
  const numberMatch = amountStr.match(/[\d,]+/)
  if (numberMatch) {
    return parseInt(numberMatch[0].replace(/,/g, ''), 10)
  }
  return null
}

// 금액 문자열에서 한글 금액 추출
export function extractKoreanFromAmount(amountStr: string): string | null {
  // 한글 금액 패턴 매칭 (예: 육십억원, 오천만원)
  const koreanMatch = amountStr.match(/[일이삼사오육칠팔구십백천만억조]+\s*원?정?/)
  if (koreanMatch) {
    return koreanMatch[0]
  }
  return null
}

// 금액 검증 및 교정
export function validateAndCorrectAmount(amountStr: string): string {
  if (!amountStr || amountStr === 'null' || amountStr === '명시되지 않음') {
    return amountStr
  }

  const koreanPart = extractKoreanFromAmount(amountStr)
  const numberPart = extractNumberFromAmount(amountStr)

  // VAT 정보 추출
  const vatMatch = amountStr.match(/VAT\s*(별도|포함)/)
  const vatInfo = vatMatch ? `, VAT ${vatMatch[1]}` : ''

  if (koreanPart) {
    // 한글이 있으면 한글 기준으로 숫자 계산
    const calculatedNumber = koreanToNumber(koreanPart)

    if (calculatedNumber > 0) {
      // 한글 기준으로 숫자를 재계산하여 반환
      const formattedNumber = calculatedNumber.toLocaleString('ko-KR')
      const koreanWithUnit = koreanPart.includes('원') ? koreanPart : koreanPart + '원'
      return `${koreanWithUnit}(${formattedNumber}원${vatInfo})`
    }
  }

  if (numberPart) {
    // 숫자만 있으면 숫자 기준으로 한글 생성
    const koreanAmount = numberToKorean(numberPart)
    const formattedNumber = numberPart.toLocaleString('ko-KR')
    return `${koreanAmount}(${formattedNumber}원${vatInfo})`
  }

  return amountStr
}

// 금액 필드들을 검증하고 교정
export function validateAmountFields(
  fields: Record<string, string | number | null>
): Record<string, string | number | null> {
  const amountFieldNames = [
    'contractAmount', 'totalAmount', 'supplyValue', 'taxAmount',
    'amount', 'debit', 'credit', 'deposit', 'withdrawal', 'balance',
    'unitPrice', 'totalPayment', 'incomeTax', 'localIncomeTax'
  ]

  const correctedFields = { ...fields }

  for (const fieldName of amountFieldNames) {
    if (correctedFields[fieldName] && typeof correctedFields[fieldName] === 'string') {
      correctedFields[fieldName] = validateAndCorrectAmount(correctedFields[fieldName] as string)
    }
  }

  return correctedFields
}
