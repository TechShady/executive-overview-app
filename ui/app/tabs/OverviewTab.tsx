import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { StatusCard } from "../components/StatusCard";
import { useDqlQuery } from "../hooks/useDqlQuery";
import type { HealthStatus } from "../components/StatusCard";
import {
  computeWebAppScore,
  computeHostScore,
  computeServiceScore,
  computeDatabaseScore,
  computeGrade,
  gradeColor,
} from "../utils/scoring";

function getHealthStatus(
  value: number,
  warnThreshold: number,
  critThreshold: number
): HealthStatus {
  if (value >= critThreshold) return "critical";
  if (value >= warnThreshold) return "warning";
  return "healthy";
}

function getHealthPctStatus(pct: number): HealthStatus {
  if (pct >= 90) return "healthy";
  if (pct >= 70) return "warning";
  return "critical";
}

export const OverviewTab: React.FC<{ timeframeDays: number }> = ({ timeframeDays }) => {
  const tf = `${timeframeDays}d`;

  const webApdex = useDqlQuery(
    `fetch user.events, from:now()-${tf}
| filter characteristics.has_activity == true
| fieldsAdd dur_ms = toDouble(duration) / 1000000.0
| summarize satisfied = countIf(dur_ms <= 3000.0),
  tolerating = countIf(dur_ms > 3000.0 and dur_ms <= 12000.0),
  total = count()
| fieldsAdd apdex = if(total > 0, then: (toDouble(satisfied) + (toDouble(tolerating) / 2.0)) / toDouble(total), else: 0.0)`
  );

  const webSessions = useDqlQuery(
    `timeseries sessions = sum(dt.frontend.session.active.estimated_count), from:now()-${tf}
| fieldsAdd latest = arrayLast(sessions)`
  );

  const webErrors = useDqlQuery(
    `timeseries errors = sum(dt.frontend.error.count), from:now()-${tf}
| fieldsAdd total = arraySum(errors)`
  );

  const hostHealth = useDqlQuery(
    `timeseries cpu = avg(dt.host.cpu.usage), by: {dt.smartscape.host}, from:now()-${tf}
| fieldsAdd avg_cpu = arrayAvg(cpu)
| summarize total = count(), healthy = countIf(avg_cpu <= 80)
| fieldsAdd health_pct = (healthy * 100.0) / total`
  );

  const hostCpuHigh = useDqlQuery(
    `timeseries cpu = avg(dt.host.cpu.usage), by: {dt.smartscape.host}, from:now()-${tf}
| fieldsAdd avg_cpu = arrayAvg(cpu)
| filter avg_cpu > 80
| summarize count()`
  );

  const hostMemHigh = useDqlQuery(
    `timeseries mem = avg(dt.host.memory.usage), by: {dt.smartscape.host}, from:now()-${tf}
| fieldsAdd avg_mem = arrayAvg(mem)
| filter avg_mem > 85
| summarize count()`
  );

  const svcHealth = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, by: {dt.service.name}, from:now()-${tf}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total)
| summarize total_svc = count(), unhealthy = countIf(error_rate > 5)
| fieldsAdd health_pct = ((total_svc - unhealthy) * 100.0) / total_svc`
  );

  const svcErrorRate = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, from:now()-${tf}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total)`
  );

  const svcRt = useDqlQuery(
    `timeseries rt = avg(dt.service.request.response_time), from:now()-${tf}
| fieldsAdd avg_rt_ms = arrayAvg(rt) / 1000`
  );

  const dbHealth = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, by: {dt.service.name}, from:now()-${tf}
| lookup [fetch dt.entity.service | filter serviceType == "DATABASE_SERVICE" | fields entity.name], sourceField: dt.service.name, lookupField: entity.name
| filter isNotNull(lookup.entity.name)
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total)
| summarize total_dbs = count(), unhealthy = countIf(error_rate > 5)
| fieldsAdd health_pct = ((total_dbs - unhealthy) * 100.0) / total_dbs`
  );

  const dbRt = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count),
  response_time = avg(dt.service.request.response_time)
}, by: {dt.service.name}, from:now()-${tf}
| lookup [fetch dt.entity.service | filter serviceType == "DATABASE_SERVICE" | fields entity.name], sourceField: dt.service.name, lookupField: entity.name
| filter isNotNull(lookup.entity.name)
| fieldsAdd avg_rt_ms = arrayAvg(response_time) / 1000,
  error_rate = arraySum(failures) * 100.0 / arraySum(total)
| summarize avg_rt = avg(avg_rt_ms), avg_error = avg(error_rate)`
  );

  // Scoring queries: compute average scores across each domain
  const webScoreData = useDqlQuery(
    `timeseries {
  errors = sum(dt.frontend.error.count),
  actions = sum(dt.frontend.user_action.count),
  duration = avg(dt.frontend.user_action.duration)
}, by: {frontend.name}, from:now()-${tf}
| fieldsAdd error_rate = arraySum(errors) * 100.0 / arraySum(actions),
  avg_duration_ms = arrayAvg(duration)
| fields error_rate, avg_duration_ms`
  );

  const infraScoreData = useDqlQuery(
    `timeseries {
  cpu = avg(dt.host.cpu.usage),
  memory = avg(dt.host.memory.usage),
  disk = avg(dt.host.disk.used.percent)
}, by: {dt.smartscape.host}, from:now()-${tf}
| fieldsAdd avg_cpu = arrayAvg(cpu), avg_memory = arrayAvg(memory), avg_disk = arrayAvg(disk)
| fields avg_cpu, avg_memory, avg_disk`
  );

  const svcScoreData = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count),
  response_time = avg(dt.service.request.response_time)
}, by: {dt.service.name}, from:now()-${tf}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total),
  avg_rt_ms = arrayAvg(response_time) / 1000
| fields error_rate, avg_rt_ms`
  );

  const dbScoreData = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count),
  response_time = avg(dt.service.request.response_time)
}, by: {dt.service.name}, from:now()-${tf}
| lookup [fetch dt.entity.service | filter serviceType == "DATABASE_SERVICE" | fields entity.name], sourceField: dt.service.name, lookupField: entity.name
| filter isNotNull(lookup.entity.name)
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total),
  avg_rt_ms = arrayAvg(response_time) / 1000
| fields error_rate, avg_rt_ms`
  );

  const problems = useDqlQuery(
    `fetch dt.davis.problems
| filter event.status == "ACTIVE"
| filter not(dt.davis.is_duplicate)
| summarize count()`
  );

  const webApdexScore = (webApdex.records?.[0]?.apdex as number) ?? 0;
  const sessionCount = webSessions.records?.[0]?.latest ?? 0;
  const errorCount = webErrors.records?.[0]?.total ?? 0;
  const infraHealthPct = hostHealth.records?.[0]?.health_pct ?? null;
  const cpuHighCount = hostCpuHigh.records?.[0]?.["count()"] ?? 0;
  const memHighCount = hostMemHigh.records?.[0]?.["count()"] ?? 0;
  const svcHealthPct = svcHealth.records?.[0]?.health_pct ?? null;
  const overallErrorRate = svcErrorRate.records?.[0]?.error_rate ?? 0;
  const avgRtMs = svcRt.records?.[0]?.avg_rt_ms ?? 0;
  const dbHealthPct = dbHealth.records?.[0]?.health_pct ?? null;
  const dbAvgRtMs = dbRt.records?.[0]?.avg_rt ?? 0;
  const dbAvgError = dbRt.records?.[0]?.avg_error ?? 0;
  const problemCount = problems.records?.[0]?.["count()"] ?? 0;

  // Compute average scores per domain
  const webAvgScore = (() => {
    const recs = webScoreData.records ?? [];
    if (recs.length === 0) return null;
    const total = recs.reduce((sum, r) => sum + computeWebAppScore(r.error_rate ?? 0, r.avg_duration_ms ?? 0), 0);
    return Math.round(total / recs.length);
  })();

  const infraAvgScore = (() => {
    const recs = infraScoreData.records ?? [];
    if (recs.length === 0) return null;
    const total = recs.reduce((sum, r) => sum + computeHostScore(r.avg_cpu ?? 0, r.avg_memory ?? 0, r.avg_disk ?? 0), 0);
    return Math.round(total / recs.length);
  })();

  const svcAvgScore = (() => {
    const recs = svcScoreData.records ?? [];
    if (recs.length === 0) return null;
    const total = recs.reduce((sum, r) => sum + computeServiceScore(r.error_rate ?? 0, r.avg_rt_ms ?? 0), 0);
    return Math.round(total / recs.length);
  })();

  const dbAvgScore = (() => {
    const recs = dbScoreData.records ?? [];
    if (recs.length === 0) return null;
    const total = recs.reduce((sum, r) => sum + computeDatabaseScore(r.error_rate ?? 0, r.avg_rt_ms ?? 0), 0);
    return Math.round(total / recs.length);
  })();

  const anyLoading =
    webApdex.loading ||
    hostHealth.loading ||
    svcHealth.loading ||
    dbHealth.loading ||
    problems.loading;

  return (
    <Flex flexDirection="column" gap={24} style={{ padding: "24px" }}>
      <Flex flexDirection="column" gap={4}>
        <Heading level={1}>Executive Overview</Heading>
        <Text>
          High-level health status across all domains. Quick glance view for
          executives.
        </Text>
      </Flex>

      <Flex justifyContent="center">
        <StatusCard
          title="Active Problems"
          value={anyLoading ? "..." : problemCount}
          status={
            anyLoading
              ? "unknown"
              : problemCount === 0
              ? "healthy"
              : problemCount <= 3
              ? "warning"
              : "critical"
          }
          subtitle={
            problemCount === 0
              ? "No active problems"
              : `${problemCount} problem(s) detected`
          }
        />
      </Flex>

      <Flex flexDirection="column" gap={8}>
        <Heading level={3}>Web Applications</Heading>
        <Flex gap={16} flexWrap="wrap">
          <StatusCard
            title="Score"
            value={
              webScoreData.loading
                ? "..."
                : webAvgScore !== null
                ? `${webAvgScore} (${computeGrade(webAvgScore)})`
                : "N/A"
            }
            status={
              webScoreData.loading
                ? "unknown"
                : webAvgScore === null
                ? "unknown"
                : webAvgScore >= 80
                ? "healthy"
                : webAvgScore >= 60
                ? "warning"
                : "critical"
            }
          />
          <StatusCard
            title="Apdex"
            value={
              webApdex.loading
                ? "..."
                : (webApdexScore as number).toFixed(2)
            }
            status={
              webApdex.loading
                ? "unknown"
                : (webApdexScore as number) >= 0.85
                ? "healthy"
                : (webApdexScore as number) >= 0.7
                ? "warning"
                : "critical"
            }
            subtitle="Application Performance Index"
          />
          <StatusCard
            title="Active Sessions"
            value={
              webSessions.loading ? "..." : Math.round(sessionCount as number)
            }
            status={webSessions.loading ? "unknown" : "healthy"}
          />
          <StatusCard
            title="Errors"
            value={
              webErrors.loading ? "..." : Math.round(errorCount as number)
            }
            status={
              webErrors.loading
                ? "unknown"
                : getHealthStatus(errorCount as number, 100, 500)
            }
          />
        </Flex>
      </Flex>

      <Flex flexDirection="column" gap={8}>
        <Heading level={3}>Infrastructure</Heading>
        <Flex gap={16} flexWrap="wrap">
          <StatusCard
            title="Score"
            value={
              infraScoreData.loading
                ? "..."
                : infraAvgScore !== null
                ? `${infraAvgScore} (${computeGrade(infraAvgScore)})`
                : "N/A"
            }
            status={
              infraScoreData.loading
                ? "unknown"
                : infraAvgScore === null
                ? "unknown"
                : infraAvgScore >= 80
                ? "healthy"
                : infraAvgScore >= 60
                ? "warning"
                : "critical"
            }
          />
          <StatusCard
            title="Host Health"
            value={
              hostHealth.loading
                ? "..."
                : `${Math.round(infraHealthPct ?? 0)}%`
            }
            status={
              hostHealth.loading
                ? "unknown"
                : getHealthPctStatus(infraHealthPct ?? 0)
            }
          />
          <StatusCard
            title="High CPU Hosts"
            value={hostCpuHigh.loading ? "..." : cpuHighCount}
            status={
              hostCpuHigh.loading
                ? "unknown"
                : getHealthStatus(cpuHighCount as number, 3, 10)
            }
            subtitle="> 80% CPU"
          />
          <StatusCard
            title="High Memory Hosts"
            value={hostMemHigh.loading ? "..." : memHighCount}
            status={
              hostMemHigh.loading
                ? "unknown"
                : getHealthStatus(memHighCount as number, 3, 10)
            }
            subtitle="> 85% Memory"
          />
        </Flex>
      </Flex>

      <Flex flexDirection="column" gap={8}>
        <Heading level={3}>Services</Heading>
        <Flex gap={16} flexWrap="wrap">
          <StatusCard
            title="Score"
            value={
              svcScoreData.loading
                ? "..."
                : svcAvgScore !== null
                ? `${svcAvgScore} (${computeGrade(svcAvgScore)})`
                : "N/A"
            }
            status={
              svcScoreData.loading
                ? "unknown"
                : svcAvgScore === null
                ? "unknown"
                : svcAvgScore >= 80
                ? "healthy"
                : svcAvgScore >= 60
                ? "warning"
                : "critical"
            }
          />
          <StatusCard
            title="Service Health"
            value={
              svcHealth.loading
                ? "..."
                : `${Math.round(svcHealthPct ?? 0)}%`
            }
            status={
              svcHealth.loading
                ? "unknown"
                : getHealthPctStatus(svcHealthPct ?? 0)
            }
          />
          <StatusCard
            title="Error Rate"
            value={
              svcErrorRate.loading
                ? "..."
                : `${(overallErrorRate as number).toFixed(1)}%`
            }
            status={
              svcErrorRate.loading
                ? "unknown"
                : getHealthStatus(overallErrorRate as number, 2, 5)
            }
          />
          <StatusCard
            title="Avg Response Time"
            value={
              svcRt.loading
                ? "..."
                : `${Math.round(avgRtMs as number)} ms`
            }
            status={
              svcRt.loading
                ? "unknown"
                : getHealthStatus(avgRtMs as number, 500, 2000)
            }
          />
        </Flex>
      </Flex>

      <Flex flexDirection="column" gap={8}>
        <Heading level={3}>Databases</Heading>
        <Flex gap={16} flexWrap="wrap">
          <StatusCard
            title="Score"
            value={
              dbScoreData.loading
                ? "..."
                : dbAvgScore !== null
                ? `${dbAvgScore} (${computeGrade(dbAvgScore)})`
                : "N/A"
            }
            status={
              dbScoreData.loading
                ? "unknown"
                : dbAvgScore === null
                ? "unknown"
                : dbAvgScore >= 80
                ? "healthy"
                : dbAvgScore >= 60
                ? "warning"
                : "critical"
            }
          />
          <StatusCard
            title="Database Health"
            value={
              dbHealth.loading
                ? "..."
                : `${Math.round(dbHealthPct ?? 0)}%`
            }
            status={
              dbHealth.loading
                ? "unknown"
                : getHealthPctStatus(dbHealthPct ?? 0)
            }
          />
          <StatusCard
            title="Avg DB Response Time"
            value={
              dbRt.loading
                ? "..."
                : `${Math.round(dbAvgRtMs as number)} ms`
            }
            status={
              dbRt.loading
                ? "unknown"
                : getHealthStatus(dbAvgRtMs as number, 100, 500)
            }
          />
        </Flex>
      </Flex>
    </Flex>
  );
};
