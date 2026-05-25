# syntax=docker/dockerfile:1.7

FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /app

COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle.kts settings.gradle.kts detekt.yml ./

RUN chmod +x gradlew

COPY src ./src

RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon -Dkotlin.compiler.execution.strategy=in-process bootJar

FROM eclipse-temurin:21-jre-jammy AS runtime

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      fontconfig \
      fonts-noto-cjk \
      tzdata && \
    fc-cache -f && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd --system app && \
    useradd --system --gid app --create-home --home-dir /app app

WORKDIR /app

ENV DOCX_FONT_FAMILY="Noto Sans CJK KR"

COPY --from=builder /app/build/libs/app.jar /app/app.jar

RUN mkdir -p /tmp/class-diagram-generator && \
    chown -R app:app /app /tmp/class-diagram-generator

USER app

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java ${JAVA_OPTS:-} -jar /app/app.jar"]
