import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { StatusCard } from "../components/StatusCard";
import { ScorecardTable } from "../components/ScorecardTable";
import { useDqlQuery } from "../hooks/useDqlQuery";
import type { HealthStatus } from "../components/StatusCard";
import type { ScorecardRow } from "../components/ScorecardTable";
import { computeServiceScore, computeGrade } from "../utils/scoring";

function getSvcStatus(errorRate: number, rtMs: number): HealthStatus {
  if (errorRate > 5 || rtMs > 3000) return "critical";
  if (errorRate > 2 || rtMs > 1000) return "warning";
  return "healthy";
}

export const ServicesTab: React.FC = () => {
  const totalSvc = useDqlQuery(
    `timeseries total = sum(dt.service.request.count), by: {dt.service.name}
| summarize count()`
  );

  const errorRate = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total)`
  );

  const avgRt = useDqlQuery(
    `timeseries rt = avg(dt.service.request.response_time)
| fieldsAdd avg_rt_ms = arrayAvg(rt) / 1000`
  );

  const throughput = useDqlQuery(
    `timeseries total = sum(dt.service.request.count)
| fieldsAdd throughput = arraySum(total)`
  );

  const unhealthySvc = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, by: {dt.service.name}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total)
| filter error_rate > 2
| summarize count()`
  );

  const scorecard = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count),
  response_time = avg(dt.service.request.response_time)
}, by: {dt.service.name}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total),
  avg_rt_ms = arrayAvg(response_time) / 1000,
  throughput = arraySum(total)
| fields dt.service.name, error_rate, avg_rt_ms, throughput
| sort error_rate desc
| limit 50`
  );

  const svcCount = totalSvc.records?.[0]?.["count()"] ?? 0;
  const errRate = errorRate.records?.[0]?.error_rate ?? 0;
  const rt = avgRt.records?.[0]?.avg_rt_ms ?? 0;
  const totalReqs = throughput.records?.[0]?.throughput ?? 0;
  const badSvcs = unhealthySvc.records?.[0]?.["count()"] ?? 0;

  const rows: ScorecardRow[] = (scorecard.records ?? []).map((r) => {
    const er = r.error_rate ?? 0;
    const rt = r.avg_rt_ms ?? 0;
    const score = computeServiceScore(er, rt);
    return {
      name: r["dt.service.name"] ?? "Unknown",
      score,
      grade: computeGrade(score),
      status: getSvcStatus(er, rt),
      metrics: [
        { label: "Error Rate", value: `${er.toFixed(2)}%` },
        { label: "Avg Response", value: `${Math.round(rt)} ms` },
        { label: "Throughput", value: String(Math.round(r.throughput ?? 0)) },
      ],
    };
  });

  return (
    <Flex flexDirection="column" gap={24} style={{ padding: "24px" }}>
      <Flex flexDirection="column" gap={4}>
        <Heading level={1}>Services</Heading>
        <Text>
          Application service health using Rate, Errors, and Duration (RED)
          metrics.
        </Text>
      </Flex>

      <Flex gap={16} flexWrap="wrap">
        <StatusCard
          title="Total Services"
          value={totalSvc.loading ? "..." : svcCount}
          status={totalSvc.loading ? "unknown" : "healthy"}
        />
        <StatusCard
          title="Overall Error Rate"
          value={errorRate.loading ? "..." : `${(errRate as number).toFixed(2)}%`}
          status={errorRate.loading ? "unknown" : (errRate as number) <= 2 ? "healthy" : (errRate as number) <= 5 ? "warning" : "critical"}
        />
        <StatusCard
          title="Avg Response Time"
          value={avgRt.loading ? "..." : `${Math.round(rt as number)} ms`}
          status={avgRt.loading ? "unknown" : (rt as number) <= 500 ? "healthy" : (rt as number) <= 2000 ? "warning" : "critical"}
        />
        <StatusCard
          title="Total Requests"
          value={throughput.loading ? "..." : Math.round(totalReqs as number).toLocaleString()}
          status={throughput.loading ? "unknown" : "healthy"}
        />
        <StatusCard
          title="Unhealthy Services"
          value={unhealthySvc.loading ? "..." : badSvcs}
          status={unhealthySvc.loading ? "unknown" : badSvcs === 0 ? "healthy" : (badSvcs as number) <= 3 ? "warning" : "critical"}
          subtitle="> 2% error rate"
        />
      </Flex>

      <Heading level={3}>Service Health Scorecards</Heading>
      <ScorecardTable
        title="Services"
        nameHeader="Service"
        metricHeaders={["Error Rate", "Avg Response", "Throughput"]}
        description="Composite score (0-100): Error Rate (50%) + Response Time (50%)"
        rows={rows}
        loading={scorecard.loading}
        error={scorecard.error}
      />
    </Flex>
  );
};
