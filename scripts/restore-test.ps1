<#
.SYNOPSIS
    Restore-tests the latest backup from S3 in a throwaway Mongo container
    (never against production) and counts documents to prove the backup is restorable.

.DESCRIPTION
    A backup that is never tested is not a backup.
    This script:
      1. Finds the most recent backup-*.gz in s3://<Bucket>/<Prefix>/
      2. Downloads it locally
      3. Spins up a temporary MongoDB Docker container
      4. Runs mongorestore --gzip --archive inside it
      5. Prints the document count per collection
      6. Cleans up (removes container + file) unless -Keep is passed

.PARAMETER Keep
    Leaves the container running (port 27018) so you can open it in Compass: mongodb://localhost:27018

.REQUIREMENTS
    Docker + AWS CLI (configured with credentials that have s3:GetObject/ListBucket on the bucket)

.EXAMPLE
    .\scripts\restore-test.ps1
    .\scripts\restore-test.ps1 -Keep
#>

[CmdletBinding()]
param(
    [switch]$Keep
)

$ErrorActionPreference = 'Stop'

# ===== configurable settings =====
$Bucket        = 'atoz-mongo-backups'   # same bucket as the workflow
$Prefix        = 'mongo'                # same S3_PREFIX
$Region        = 'ap-northeast-1'       # same BACKUP_REGION
$DbName        = 'atozaccessoryTwo'     # database that was dumped (production)
$ContainerName = 'mongo-restore-test'
$HostPort      = 27018                  # different from 27017 to avoid clashing with a local Mongo
$MongoImage    = 'mongo:7'
# =================================

function Require-Cmd($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "'$name' is not installed or not on PATH. Install it and try again."
    }
}

Require-Cmd aws
Require-Cmd docker

$WorkDir = Join-Path $env:TEMP "restore-test-$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

try {
    Write-Host "==> Finding latest backup in s3://$Bucket/$Prefix/ ..." -ForegroundColor Cyan

    # Names contain a timestamp, so alphabetical order == chronological order
    $latestKey = aws s3api list-objects-v2 `
        --bucket $Bucket `
        --prefix "$Prefix/" `
        --region $Region `
        --query 'sort_by(Contents,&LastModified)[-1].Key' `
        --output text

    if ([string]::IsNullOrWhiteSpace($latestKey) -or $latestKey -eq 'None') {
        throw "No backup found in s3://$Bucket/$Prefix/ — make sure the workflow has run at least once."
    }

    $fileName    = Split-Path $latestKey -Leaf
    $localArchive = Join-Path $WorkDir $fileName
    Write-Host "==> Latest backup: $latestKey" -ForegroundColor Green
    Write-Host "==> Downloading to $localArchive ..." -ForegroundColor Cyan
    aws s3 cp "s3://$Bucket/$latestKey" "$localArchive" --region $Region | Out-Null

    Write-Host "==> Starting temporary Mongo container ($ContainerName) on port $HostPort ..." -ForegroundColor Cyan
    # Remove any old container with the same name
    docker rm -f $ContainerName 2>$null | Out-Null
    docker run -d --name $ContainerName -p "${HostPort}:27017" $MongoImage | Out-Null

    Write-Host "==> Waiting for Mongo to be ready ..." -ForegroundColor Cyan
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        docker exec $ContainerName mongosh --quiet --eval 'db.runCommand({ ping: 1 })' 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) { throw "Mongo did not become ready in time." }

    Write-Host "==> Copying the archive into the container ..." -ForegroundColor Cyan
    docker cp "$localArchive" "${ContainerName}:/tmp/backup.gz" | Out-Null

    Write-Host "==> Running mongorestore ..." -ForegroundColor Cyan
    docker exec $ContainerName mongorestore --gzip --archive=/tmp/backup.gz --quiet
    if ($LASTEXITCODE -ne 0) { throw "mongorestore failed." }

    Write-Host ""
    Write-Host "==> Document count per collection in '$DbName':" -ForegroundColor Yellow
    $countScript = @"
const d = db.getSiblingDB('$DbName');
d.getCollectionNames().sort().forEach(function(c) {
  print(c.padEnd(35) + ' : ' + d.getCollection(c).countDocuments());
});
"@
    docker exec $ContainerName mongosh --quiet --eval $countScript

    Write-Host ""
    Write-Host "Backup is restorable." -ForegroundColor Green

    if ($Keep) {
        Write-Host ""
        Write-Host "Container left running. Open it in Compass at:" -ForegroundColor Magenta
        Write-Host "    mongodb://localhost:$HostPort" -ForegroundColor Magenta
        Write-Host "When done: docker rm -f $ContainerName" -ForegroundColor Magenta
    }
}
finally {
    if (-not $Keep) {
        Write-Host "==> Cleaning up ..." -ForegroundColor Cyan
        docker rm -f $ContainerName 2>$null | Out-Null
        Remove-Item -Recurse -Force $WorkDir -ErrorAction SilentlyContinue
    }
}
