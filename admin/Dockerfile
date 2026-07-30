FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY src/KitaTolongKita.Admin.Api/KitaTolongKita.Admin.Api.csproj ./KitaTolongKita.Admin.Api/
RUN dotnet restore ./KitaTolongKita.Admin.Api/KitaTolongKita.Admin.Api.csproj

COPY src/KitaTolongKita.Admin.Api/. ./KitaTolongKita.Admin.Api/
WORKDIR /src/KitaTolongKita.Admin.Api
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 5001
ENTRYPOINT ["dotnet", "KitaTolongKita.Admin.Api.dll"]
