FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files FIRST (for cache busting)
COPY KitaTolongKita.sln .
COPY src/KitaTolongKita.Core/KitaTolongKita.Core.csproj src/KitaTolongKita.Core/
COPY src/KitaTolongKita.Infrastructure/KitaTolongKita.Infrastructure.csproj src/KitaTolongKita.Infrastructure/
COPY src/KitaTolongKita.Api/KitaTolongKita.Api.csproj src/KitaTolongKita.Api/

# Clear NuGet cache so new packages are downloaded fresh
RUN dotnet nuget locals all --clear

# Restore dependencies
RUN dotnet restore src/KitaTolongKita.Api/KitaTolongKita.Api.csproj --no-cache

# Copy source code
COPY src/ src/

# Build and publish
RUN dotnet publish src/KitaTolongKita.Api/KitaTolongKita.Api.csproj \
    -c Release -o /app/publish --no-restore

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 5000
ENTRYPOINT ["dotnet", "KitaTolongKita.Api.dll"]
