FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY backend/pom.xml ./pom.xml
RUN mvn -B dependency:go-offline
COPY backend/src ./src
COPY openapi.yaml /openapi.yaml
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 joinly
COPY --from=build /workspace/target/joinly-backend-*.jar app.jar
USER joinly
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
