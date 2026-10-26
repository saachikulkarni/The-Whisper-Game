# Build Stage
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY backend-springboot/pom.xml backend-springboot/mvnw ./
COPY backend-springboot/.mvn .mvn
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -B
COPY backend-springboot/src src
RUN ./mvnw clean package -DskipTests

# Runtime Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/the-whisper-game-1.0.0.jar app.jar
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
