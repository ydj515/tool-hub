# syntax=docker/dockerfile:1.7

FROM gradle:8.14.5-jdk21-corretto AS builder

WORKDIR /home/gradle/project

COPY --chown=gradle:gradle gradle ./gradle
COPY --chown=gradle:gradle build.gradle.kts settings.gradle.kts detekt.yml ./
COPY --chown=gradle:gradle src ./src

RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle --no-daemon -Dkotlin.compiler.execution.strategy=in-process bootJar

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

COPY --from=builder /home/gradle/project/build/libs/app.jar /app/app.jar

RUN mkdir -p /tmp/class-diagram-generator && \
    chown -R app:app /app /tmp/class-diagram-generator

USER app

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java ${JAVA_OPTS:-} -jar /app/app.jar"]
