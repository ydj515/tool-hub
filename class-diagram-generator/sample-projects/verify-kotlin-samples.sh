#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v mise >/dev/null 2>&1; then
  echo "mise 명령을 찾을 수 없습니다. mise 설치 후 다시 실행하세요."
  exit 127
fi

run_gradle() {
  local project="$1"
  echo "[gradle] verifying $project"
  (cd "$ROOT_DIR/$project" && mise exec gradle@8.14.4 -- gradle clean test --no-daemon)
}

run_maven_single() {
  local project="$1"
  echo "[maven] verifying $project"
  (cd "$ROOT_DIR/$project" && mise exec maven@3.9.9 -- mvn clean test)
}

run_maven_multi() {
  local project="$1"
  echo "[maven-multi] verifying $project"
  (cd "$ROOT_DIR/$project" && mise exec maven@3.9.9 -- mvn -pl api -am clean test)
}

run_gradle "gradle-single-kotlin-jdk17"
run_gradle "gradle-single-kotlin-jdk21"
run_gradle "gradle-multi-kotlin-jdk17"
run_gradle "gradle-multi-kotlin-jdk21"
run_maven_single "maven-single-kotlin-jdk17"
run_maven_single "maven-single-kotlin-jdk21"
run_maven_multi "maven-multi-kotlin-jdk17"
run_maven_multi "maven-multi-kotlin-jdk21"

echo "Kotlin Spring 샘플 검증 완료"
