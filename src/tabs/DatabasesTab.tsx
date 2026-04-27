import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { StatusCard, HealthStatus } from '../components/StatusCard';
import { ScorecardTable, ScorecardRow } from '../components/ScorecardTable';
import { useDqlQuery } from '../hooks/useDqlQuery';

function getDbStatus(errorRate: number, rtMs: number): HealthStatus {
  if (errorRate > 5 || rtMs > 500) return 'critical';
  if (errorRate > 2 || rtMs > 200) return 'warning';
  return 'healthy';
}

export const DatabasesTab: React.FC = () => {
  const totalDbs = useDqlQuery(
    `timeseries total = sum(dt.service.request.count), by: {dt.service.name}, filter: {dt.entity.service_type == "DATABASE_SERVICE"}
| summarize count()`
  );

  const errorRate = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, filter: {dt.entity.service_type == "DATABASE_SERVICE"}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total)`
  );

  const avgRt = useDqlQuery(
    `timeseries rt = avg(dt.service.request.response_time), filter: {dt.entity.service_type == "DATABASE_SERVICE"}
| fieldsAdd avg_rt_ms = arrayAvg(rt) / 1000`
  );

  const throughput = useDqlQuery(
    `timeseries total = sum(dt.service.request.count), filter: {dt.entity.service_type == "DATABASE_SERVICE"}
| fieldsAdd throughput = arraySum(total)`
  );

  const unhealthyDbs = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, by: {dt.service.name}, filter: {dt.entity.service_type == "DATABASE_SERVICE"}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total)
| filter error_rate > 2
| summarize count()`
  );

  const scorecard = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count),
  response_time = avg(dt.service.request.response_time)
}, by: {dt.service.name}, filter: {dt.entity.service_type == "DATABASE_SERVICE"}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total),
  avg_rt_ms = arrayAvg(response_time) / 1000,
  total_queries = arraySum(total)
| fields dt.service.name, error_rate, avg_rt_ms, total_queries
| sort error_rate desc
| limit 50`
  );

  const dbCount = totalDbs.records?.[0]?.['count()'] ?? 0;
  const errRate = errorRate.records?.[0]?.error_rate ?? 0;
  const rt = avgRt.records?.[0]?.avg_rt_ms ?? 0;
  const totalReqs = throughput.records?.[0]?.throughput ?? 0;
  const badDbs = unhealthyDbs.records?.[0]?.['count()'] ?? 0;

  const rows: ScorecardRow[] = (scorecard.records ?? []).map((r) => {
    const er = r.error_rate ?? 0;
    const rtMs = r.avg_rt_ms ?? 0;
    return {
      name: r['dt.service.name'] ?? 'Unknown',
      status: getDbStatus(er, rtMs),
      metric1: `${er.toFixed(2)}%`,
      metric2: `${Math.round(rtMs)} ms`,
      metric3: String(Math.round(r.total_queries ?? 0)),
    };
  });

  return (
    <Flex flexDirection="column" gap={24} style={{ padding: '24px' }}>
      <Flex flexDirection="column" gap={4}>
        <Heading level={1}>Databases</Heading>
        <Text>Database service health covering query performance, error rates, and throughput.</Text>
      </Flex>

      <Flex gap={16} flexWrap="wrap">
        <StatusCard
          title="Total Databases"
          value={totalDbs.loading ? '...' : dbCount}
          status={totalDbs.loading ? 'unknown' : 'healthy'}
        />
        <StatusCard
          title="Error Rate"
          value={errorRate.loading ? '...' : `${(errRate as number).toFixed(2)}%`}
          status={errorRate.loading ? 'unknown' : (errRate as number) <= 2 ? 'healthy' : (errRate as number) <= 5 ? 'warning' : 'critical'}
        />
        <StatusCard
          title="Avg Response Time"
          value={avgRt.loading ? '...' : `${Math.round(rt as number)} ms`}
          status={avgRt.loading ? 'unknown' : (rt as number) <= 100 ? 'healthy' : (rt as number) <= 500 ? 'warning' : 'critical'}
        />
        <StatusCard
          title="Total Queries"
          value={throughput.loading ? '...' : Math.round(totalReqs as number).toLocaleString()}
          status={throughput.loading ? 'unknown' : 'healthy'}
        />
        <StatusCard
          title="Unhealthy Databases"
          value={unhealthyDbs.loading ? '...' : badDbs}
          status={unhealthyDbs.loading ? 'unknown' : badDbs === 0 ? 'healthy' : badDbs <= 2 ? 'warning' : 'critical'}
          subtitle="> 2% error rate"
        />
      </Flex>

      <Heading level={3}>Database Scorecard</Heading>
      <ScorecardTable
        title="Databases"
        headers={['Database', 'Error Rate', 'Avg Response', 'Total Queries']}
        rows={rows}
        loading={scorecard.loading}
        error={scorecard.error}
      />
    </Flex>
  );
};
