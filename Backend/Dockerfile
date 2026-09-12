# 1. Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["Backend.csproj", "./"]
RUN dotnet restore "Backend.csproj"

# Copy the rest of the source code and build
COPY . .
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 2. Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
WORKDIR /app

# Copy published artifacts from build stage
COPY --from=build /app/publish .

# Expose standard container port
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Backend.dll"]
