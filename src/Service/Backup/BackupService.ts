import { ListObjectsV2Command, S3Client, _Object } from "@aws-sdk/client-s3";

const BACKUP_BUCKET = process.env.BACKUP_BUCKET ?? "atoz-mongo-backups";
const BACKUP_REGION = process.env.BACKUP_REGION ?? "ap-northeast-1";
const BACKUP_PREFIX = process.env.BACKUP_PREFIX ?? "mongo";

// Read-only credentials for the backups bucket. Falls back to the app's AWS
// keys when dedicated backup-read keys are not configured.
const accessKeyId =
  process.env.BACKUP_READ_AWS_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID!;
const secretAccessKey =
  process.env.BACKUP_READ_AWS_SECRET_ACCESS_KEY ??
  process.env.AWS_SECRET_ACCESS_KEY!;

const backupClient = new S3Client({
  region: BACKUP_REGION,
  credentials: { accessKeyId, secretAccessKey },
});

// Daily backup + a few hours of slack before we consider it stale.
const HEALTHY_MAX_HOURS = 26;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
};

export interface BackupItem {
  fileName: string;
  key: string;
  createdAt: Date;
  sizeBytes: number;
  size: string;
}

export interface BackupSummary {
  bucket: string;
  region: string;
  total: number;
  latestAt: Date | null;
  latestSize: string | null;
  hoursSinceLatest: number | null;
  healthy: boolean;
}

export const listBackups = async (): Promise<{
  summary: BackupSummary;
  backups: BackupItem[];
}> => {
  const objects: _Object[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await backupClient.send(
      new ListObjectsV2Command({
        Bucket: BACKUP_BUCKET,
        Prefix: `${BACKUP_PREFIX}/`,
        ContinuationToken: continuationToken,
      })
    );
    if (response.Contents) objects.push(...response.Contents);
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  const backups: BackupItem[] = objects
    .filter((o) => o.Key && o.Key !== `${BACKUP_PREFIX}/`)
    .map((o) => ({
      fileName: o.Key!.split("/").pop()!,
      key: o.Key!,
      createdAt: o.LastModified!,
      sizeBytes: o.Size ?? 0,
      size: formatBytes(o.Size ?? 0),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const latest = backups[0] ?? null;
  const hoursSinceLatest = latest
    ? (Date.now() - latest.createdAt.getTime()) / (1000 * 60 * 60)
    : null;

  const summary: BackupSummary = {
    bucket: BACKUP_BUCKET,
    region: BACKUP_REGION,
    total: backups.length,
    latestAt: latest?.createdAt ?? null,
    latestSize: latest?.size ?? null,
    hoursSinceLatest:
      hoursSinceLatest !== null ? Number(hoursSinceLatest.toFixed(1)) : null,
    healthy: hoursSinceLatest !== null && hoursSinceLatest < HEALTHY_MAX_HOURS,
  };

  return { summary, backups };
};
