import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { StatusCard } from "../components/StatusCard";
import { ScorecardTable } from "../components/ScorecardTable";
import { useDqlQuery } from "../hooks/useDqlQuery";
import type { HealthStatus } from "../components/StatusCard";
import type { ScorecardRow } from "../components/ScorecardTable";
import { computeDatabaseScore, computeGrade } from "../utils/scoring";

function getDbStatus(errorRate: number, rtMs: number): HealthStatus {
  if (errorRate > 5 || rtMs > 500) return "critical";
  if (errorRate > 2 || rtMs > 200) return "warning";
  return "healthy";
}

export const DatabasesTab: React.FC<{ timeframeDays: number }> = ({ timeframeDays }) => {
  const tf = `${timeframeDays}d`;

  const totalDbs = useDqlQuery(
    `fetch dt.entity.service
| filter serviceType == "DATABASE_SERVICE"
| summarize count()`
  );

  const overallMetrics = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count),
  response_time = avg(dt.service.request.response_time)
}, by: {dt.service.name}, from:now()-${tf}
| lookup [fetch dt.entity.service | filter serviceType == "DATABASE_SERVICE" | fields entity.name], sourceField: dt.service.name, lookupField: entity.name
| filter isNotNull(lookup.entity.name)
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total),
  avg_rt_ms = arrayAvg(response_time) / 1000,
  total_queries = arraySum(total)
| summarize
  overall_error_rate = avg(error_rate),
  overall_rt = avg(avg_rt_ms),
  overall_throughput = sum(total_queries),
  unhealthy = countIf(error_rate > 2)`
  );

  const scorecard = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count),
  response_time = avg(dt.service.request.response_time)
}, by: {dt.service.name}, from:now()-${tf}
| lookup [fetch dt.entity.service | filter serviceType == "DATABASE_SERVICE" | fields entity.name], sourceField: dt.service.name, lookupField: entity.name
| filter isNotNull(lookup.entity.name)
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total),
  avg_rt_ms = arrayAvg(response_time) / 1000,
  total_queries = arraySum(total)
| fields dt.service.name, error_rate, avg_rt_ms, total_queries
| sort error_rate desc
| limit 50`
  );

  const dbCount = totalDbs.records?.[0]?.["count()"] ?? 0;
  const errRate = overallMetrics.records?.[0]?.overall_error_rate ?? 0;
  const rt = overallMetrics.records?.[0]?.overall_rt ?? 0;
  const totalReqs = overallMetrics.records?.[0]?.overall_throughput ?? 0;
  const badDbs = overallMetrics.records?.[0]?.unhealthy ?? 0;

  const rows: ScorecardRow[] = (scorecard.records ?? []).map((r) => {
    const er = r.error_rate ?? 0;
    const rtMs = r.avg_rt_ms ?? 0;
    const score = computeDatabaseScore(er, rtMs);
    return {
      name: r["dt.service.name"] ?? "Unknown",
      score,
      grade: computeGrade(score),
      status: getDbStatus(er, rtMs),
      metrics: [
        { label: "Error Rate", value: `${er.toFixed(2)}%` },
        { label: "Avg Response", value: `${Math.round(rtMs)} ms` },
        { label: "Total Queries", value: String(Math.round(r.total_queries ?? 0)) },
      ],
    };
  });

  return (
    <Flex flexDirection="column" gap={24} style={{ padding: "24px" }}>
      <Flex flexDirection="column" gap={4}>
        <Heading level={1}>Databases</Heading>
        <Text>
          Database service health covering query performance, error rates, and
          throughput.
        </Text>
      </Flex>

      <Flex gap={16} flexWrap="wrap">
        <StatusCard
          title="Total Databases"
          value={totalDbs.loading ? "..." : dbCount}
          status={totalDbs.loading ? "unknown" : "healthy"}
        />
        <StatusCard
          title="Error Rate"
          value={overallMetrics.loading ? "..." : `${(errRate as number).toFixed(2)}%`}
          status={overallMetrics.loading ? "unknown" : (errRate as number) <= 2 ? "healthy" : (errRate as number) <= 5 ? "warning" : "critical"}
        />
        <StatusCard
          title="Avg Response Time"
          value={overallMetrics.loading ? "..." : `${Math.round(rt as number)} ms`}
          status={overallMetrics.loading ? "unknown" : (rt as number) <= 100 ? "healthy" : (rt as number) <= 500 ? "warning" : "critical"}
        />
        <StatusCard
          title="Total Queries"
          value={overallMetrics.loading ? "..." : Math.round(totalReqs as number).toLocaleString()}
          status={overallMetrics.loading ? "unknown" : "healthy"}
        />
        <StatusCard
          title="Unhealthy Databases"
          value={overallMetrics.loading ? "..." : badDbs}
          status={overallMetrics.loading ? "unknown" : badDbs === 0 ? "healthy" : (badDbs as number) <= 2 ? "warning" : "critical"}
          subtitle="> 2% error rate"
        />
      </Flex>

      <Heading level={3}>Database Health Scorecards</Heading>
      <ScorecardTable
        title="Databases"
        nameHeader="Database"
        metricHeaders={["Error Rate", "Avg Response", "Total Queries"]}
        description="Composite score (0-100): Error Rate (50%) + Response Time (50%)"
        rows={rows}
        loading={scorecard.loading}
        error={scorecard.error}
      />
    </Flex>
  );
};
