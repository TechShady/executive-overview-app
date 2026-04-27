import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { StatusCard } from "../components/StatusCard";
import { ScorecardTable } from "../components/ScorecardTable";
import { useDqlQuery } from "../hooks/useDqlQuery";
import type { HealthStatus } from "../components/StatusCard";
import type { ScorecardRow } from "../components/ScorecardTable";

function getStatus(errorRate: number, duration: number): HealthStatus {
  if (errorRate > 5 || duration > 5000) return "critical";
  if (errorRate > 2 || duration > 3000) return "warning";
  return "healthy";
}

export const WebAppsTab: React.FC = () => {
  const kpis = useDqlQuery(
    `timeseries {
  errors = sum(dt.frontend.error.count),
  actions = sum(dt.frontend.user_action.count)
}
| fieldsAdd availability = (1 - (arraySum(errors) / arraySum(actions))) * 100,
  total_errors = arraySum(errors)`
  );

  const lcp = useDqlQuery(
    `timeseries lcp = avg(dt.frontend.web.page.largest_contentful_paint)
| fieldsAdd avg_lcp = arrayAvg(lcp)`
  );

  const loadTime = useDqlQuery(
    `timeseries load = avg(dt.frontend.web.navigation.load_event_end)
| fieldsAdd avg_load = arrayAvg(load)`
  );

  const users = useDqlQuery(
    `timeseries users = sum(dt.frontend.user.active.estimated_count)
| fieldsAdd current = arrayLast(users)`
  );

  const scorecard = useDqlQuery(
    `timeseries {
  errors = sum(dt.frontend.error.count),
  actions = sum(dt.frontend.user_action.count),
  duration = avg(dt.frontend.user_action.duration)
}, by: {frontend.name}
| fieldsAdd error_rate = arraySum(errors) * 100.0 / arraySum(actions),
  avg_duration_ms = arrayAvg(duration),
  total_actions = arraySum(actions)
| fields frontend.name, error_rate, avg_duration_ms, total_actions
| sort error_rate desc
| limit 50`
  );

  const availability = kpis.records?.[0]?.availability ?? 0;
  const totalErrors = kpis.records?.[0]?.total_errors ?? 0;
  const avgLcp = lcp.records?.[0]?.avg_lcp ?? 0;
  const avgLoad = loadTime.records?.[0]?.avg_load ?? 0;
  const activeUsers = users.records?.[0]?.current ?? 0;

  const rows: ScorecardRow[] = (scorecard.records ?? []).map((r) => ({
    name: r["frontend.name"] ?? "Unknown",
    status: getStatus(r.error_rate ?? 0, r.avg_duration_ms ?? 0),
    metric1: `${(r.error_rate ?? 0).toFixed(1)}%`,
    metric2: `${Math.round(r.avg_duration_ms ?? 0)} ms`,
    metric3: String(Math.round(r.total_actions ?? 0)),
  }));

  return (
    <Flex flexDirection="column" gap={24} style={{ padding: "24px" }}>
      <Flex flexDirection="column" gap={4}>
        <Heading level={1}>Web Applications</Heading>
        <Text>
          Performance and availability for all monitored web applications.
        </Text>
      </Flex>

      <Flex gap={16} flexWrap="wrap">
        <StatusCard
          title="Availability"
          value={kpis.loading ? "..." : `${(availability as number).toFixed(1)}%`}
          status={kpis.loading ? "unknown" : (availability as number) >= 99 ? "healthy" : (availability as number) >= 95 ? "warning" : "critical"}
        />
        <StatusCard
          title="LCP"
          value={lcp.loading ? "..." : `${Math.round(avgLcp as number)} ms`}
          status={lcp.loading ? "unknown" : (avgLcp as number) <= 2500 ? "healthy" : (avgLcp as number) <= 4000 ? "warning" : "critical"}
          subtitle="Largest Contentful Paint"
        />
        <StatusCard
          title="Page Load"
          value={loadTime.loading ? "..." : `${Math.round(avgLoad as number)} ms`}
          status={loadTime.loading ? "unknown" : (avgLoad as number) <= 3000 ? "healthy" : (avgLoad as number) <= 5000 ? "warning" : "critical"}
        />
        <StatusCard
          title="Active Users"
          value={users.loading ? "..." : Math.round(activeUsers as number)}
          status={users.loading ? "unknown" : "healthy"}
        />
        <StatusCard
          title="Errors"
          value={kpis.loading ? "..." : Math.round(totalErrors as number)}
          status={kpis.loading ? "unknown" : (totalErrors as number) === 0 ? "healthy" : (totalErrors as number) < 50 ? "warning" : "critical"}
        />
      </Flex>

      <Heading level={3}>Application Scorecard</Heading>
      <ScorecardTable
        title="Web Apps"
        headers={["Application", "Error Rate", "Avg Duration", "Actions"]}
        rows={rows}
        loading={scorecard.loading}
        error={scorecard.error}
      />
    </Flex>
  );
};
