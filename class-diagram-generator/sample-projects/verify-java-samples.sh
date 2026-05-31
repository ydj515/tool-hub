#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
GRADLEW="${REPO_ROOT}/class-diagram-generator/gradlew"

if [[ ! -x "${GRADLEW}" ]]; then
  echo "Gradle wrapper를 찾을 수 없습니다: ${GRADLEW}" >&2
  exit 1
fi

if ! command -v javac >/dev/null 2>&1; then
  echo "javac가 필요합니다." >&2
  exit 1
fi

if ! command -v xmllint >/dev/null 2>&1; then
  echo "xmllint가 필요합니다." >&2
  exit 1
fi

verify_gradle_sample() {
  local sample_dir="$1"

  echo "[verify] Gradle sample: ${sample_dir}"
  "${GRADLEW}" -p "${SCRIPT_DIR}/${sample_dir}" clean build
}

compile_java_dir() {
  local release="$1"
  local output_dir="$2"
  local classpath="$3"
  local source_dir="$4"
  local source_list

  if [[ ! -d "${source_dir}" ]]; then
    return 0
  fi

  source_list="$(find "${source_dir}" -type f -name '*.java' | sort)"
  if [[ -z "${source_list}" ]]; then
    return 0
  fi

  mkdir -p "${output_dir}"
  if [[ -n "${classpath}" ]]; then
    # shellcheck disable=SC2086
    javac --release "${release}" -cp "${classpath}" -d "${output_dir}" ${source_list}
  else
    # shellcheck disable=SC2086
    javac --release "${release}" -d "${output_dir}" ${source_list}
  fi
}

verify_maven_sample() {
  local sample_dir="$1"
  local release="$2"
  local work_dir
  local support_out
  local service_out
  local api_out

  echo "[verify] Maven sample: ${sample_dir}"
  xmllint --noout "${SCRIPT_DIR}/${sample_dir}/pom.xml"
  xmllint --noout "${SCRIPT_DIR}/${sample_dir}/support/pom.xml"
  xmllint --noout "${SCRIPT_DIR}/${sample_dir}/service/pom.xml"
  xmllint --noout "${SCRIPT_DIR}/${sample_dir}/api/pom.xml"

  work_dir="$(mktemp -d)"
  trap 'rm -rf "${work_dir}"' RETURN

  support_out="${work_dir}/support"
  service_out="${work_dir}/service"
  api_out="${work_dir}/api"

  compile_java_dir "${release}" "${support_out}" "" "${SCRIPT_DIR}/${sample_dir}/support/src/main/java"
  compile_java_dir "${release}" "${service_out}" "${support_out}" "${SCRIPT_DIR}/${sample_dir}/service/src/main/java"
  compile_java_dir "${release}" "${api_out}" "${service_out}:${support_out}" "${SCRIPT_DIR}/${sample_dir}/api/src/main/java"

  rm -rf "${work_dir}"
  trap - RETURN
}

verify_gradle_sample "gradle-multi-jdk17"
verify_gradle_sample "gradle-multi-jdk21"
verify_maven_sample "maven-multi-jdk17" "17"
verify_maven_sample "maven-multi-jdk21" "21"

echo "[verify] 모든 멀티모듈 Java 샘플 검증이 완료되었습니다."
