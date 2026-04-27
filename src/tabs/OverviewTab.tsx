import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { StatusCard, HealthStatus } from '../components/StatusCard';
import { useDqlQuery } from '../hooks/useDqlQuery';

function getHealthStatus(value: number, warnThreshold: number, critThreshold: number): HealthStatus {
  if (value >= critThreshold) return 'critical';
  if (value >= warnThreshold) return 'warning';
  return 'healthy';
}

function getHealthPctStatus(pct: number): HealthStatus {
  if (pct >= 90) return 'healthy';
  if (pct >= 70) return 'warning';
  return 'critical';
}

export const OverviewTab: React.FC = () => {
  // Web Apps
  const webApps = useDqlQuery(
    `timeseries {
  errors = sum(dt.frontend.error.count),
  actions = sum(dt.frontend.user_action.count)
}, by: {frontend.name}
| fieldsAdd error_rate = arraySum(errors) * 100.0 / arraySum(actions)
| summarize total_apps = count(), unhealthy = countIf(error_rate > 5)
| fieldsAdd health_pct = ((total_apps - unhealthy) * 100.0) / total_apps`
  );

  const webSessions = useDqlQuery(
    `timeseries sessions = sum(dt.frontend.session.active.estimated_count)
| fieldsAdd latest = arrayLast(sessions)`
  );

  const webErrors = useDqlQuery(
    `timeseries errors = sum(dt.frontend.error.count)
| fieldsAdd total = arraySum(errors)`
  );

  // Infrastructure
  const hostHealth = useDqlQuery(
    `timeseries cpu = avg(dt.host.cpu.usage), by: {dt.smartscape.host}
| fieldsAdd avg_cpu = arrayAvg(cpu)
| summarize total = count(), critical = countIf(avg_cpu > 90), warning = countIf(avg_cpu > 80 and avg_cpu <= 90), healthy = countIf(avg_cpu <= 80)
| fieldsAdd health_pct = (healthy * 100.0) / total`
  );

  const hostCpuHigh = useDqlQuery(
    `timeseries cpu = avg(dt.host.cpu.usage), by: {dt.smartscape.host}
| fieldsAdd avg_cpu = arrayAvg(cpu)
| filter avg_cpu > 80
| summarize count()`
  );

  const hostMemHigh = useDqlQuery(
    `timeseries mem = avg(dt.host.memory.usage), by: {dt.smartscape.host}
| fieldsAdd avg_mem = arrayAvg(mem)
| filter avg_mem > 85
| summarize count()`
  );

  // Services
  const svcHealth = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, by: {dt.service.name}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total)
| summarize total_svc = count(), unhealthy = countIf(error_rate > 5)
| fieldsAdd health_pct = ((total_svc - unhealthy) * 100.0) / total_svc`
  );

  const svcErrorRate = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total)`
  );

  const svcRt = useDqlQuery(
    `timeseries rt = avg(dt.service.request.response_time)
| fieldsAdd avg_rt_ms = arrayAvg(rt) / 1000`
  );

  // Databases
  const dbHealth = useDqlQuery(
    `timeseries {
  total = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, by: {dt.service.name}, filter: {dt.entity.service_type == "DATABASE_SERVICE"}
| fieldsAdd error_rate = arraySum(failures) * 100.0 / arraySum(total)
| summarize total_dbs = count(), unhealthy = countIf(error_rate > 5)
| fieldsAdd health_pct = ((total_dbs - unhealthy) * 100.0) / total_dbs`
  );

  const dbRt = useDqlQuery(
    `timeseries rt = avg(dt.service.request.response_time), filter: {dt.entity.service_type == "DATABASE_SERVICE"}
| fieldsAdd avg_rt_ms = arrayAvg(rt) / 1000`
  );

  // Active problems
  const problems = useDqlQuery(
    `fetch dt.davis.problems
| filter event.status == "ACTIVE"
| filter not(dt.davis.is_duplicate)
| summarize count()`
  );

  // Extract values
  const webHealthPct = webApps.records?.[0]?.health_pct ?? null;
  const sessionCount = webSessions.records?.[0]?.latest ?? 0;
  const errorCount = webErrors.records?.[0]?.total ?? 0;

  const infraHealthPct = hostHealth.records?.[0]?.health_pct ?? null;
  const cpuHighCount = hostCpuHigh.records?.[0]?.['count()'] ?? 0;
  const memHighCount = hostMemHigh.records?.[0]?.['count()'] ?? 0;

  const svcHealthPct = svcHealth.records?.[0]?.health_pct ?? null;
  const overallErrorRate = svcErrorRate.records?.[0]?.error_rate ?? 0;
  const avgRtMs = svcRt.records?.[0]?.avg_rt_ms ?? 0;

  const dbHealthPct = dbHealth.records?.[0]?.health_pct ?? null;
  const dbAvgRtMs = dbRt.records?.[0]?.avg_rt_ms ?? 0;

  const problemCount = problems.records?.[0]?.['count()'] ?? 0;

  const anyLoading =
    webApps.loading || hostHealth.loading || svcHealth.loading || dbHealth.loading || problems.loading;

  return (
    <Flex flexDirection="column" gap={24} style={{ padding: '24px' }}>
      <Flex flexDirection="column" gap={4}>
        <Heading level={1}>Executive Overview</Heading>
        <Text>
          High-level health status across all domains. Quick glance view for executives.
        </Text>
      </Flex>

      {/* Active Problems Banner */}
      <Flex justifyContent="center">
        <StatusCard
          title="Active Problems"
          value={anyLoading ? '...' : problemCount}
          status={
            anyLoading
              ? 'unknown'
              : problemCount === 0
              ? 'healthy'
              : problemCount <= 3
              ? 'warning'
              : 'critical'
          }
          subtitle={problemCount === 0 ? 'No active problems' : `${problemCount} problem(s) detected`}
        />
      </Flex>

      {/* Web Applications Section */}
      <Flex flexDirection="column" gap={8}>
        <Heading level={3}>Web Applications</Heading>
        <Flex gap={16} flexWrap="wrap">
          <StatusCard
            title="Health"
            value={webApps.loading ? '...' : `${Math.round(webHealthPct ?? 0)}%`}
            status={webApps.loading ? 'unknown' : getHealthPctStatus(webHealthPct ?? 0)}
          />
          <StatusCard
            title="Active Sessions"
            value={webSessions.loading ? '...' : Math.round(sessionCount)}
            status={webSessions.loading ? 'unknown' : 'healthy'}
          />
          <StatusCard
            title="Errors"
            value={webErrors.loading ? '...' : Math.round(errorCount)}
            status={
              webErrors.loading
                ? 'unknown'
                : getHealthStatus(errorCount, 100, 500)
            }
          />
        </Flex>
      </Flex>

      {/* Infrastructure Section */}
      <Flex flexDirection="column" gap={8}>
        <Heading level={3}>Infrastructure</Heading>
        <Flex gap={16} flexWrap="wrap">
          <StatusCard
            title="Host Health"
            value={hostHealth.loading ? '...' : `${Math.round(infraHealthPct ?? 0)}%`}
            status={hostHealth.loading ? 'unknown' : getHealthPctStatus(infraHealthPct ?? 0)}
          />
          <StatusCard
            title="High CPU Hosts"
            value={hostCpuHigh.loading ? '...' : cpuHighCount}
            status={
              hostCpuHigh.loading
                ? 'unknown'
                : getHealthStatus(cpuHighCount, 3, 10)
            }
            subtitle="> 80% CPU"
          />
          <StatusCard
            title="High Memory Hosts"
            value={hostMemHigh.loading ? '...' : memHighCount}
            status={
              hostMemHigh.loading
                ? 'unknown'
                : getHealthStatus(memHighCount, 3, 10)
            }
            subtitle="> 85% Memory"
          />
        </Flex>
      </Flex>

      {/* Services Section */}
      <Flex flexDirection="column" gap={8}>
        <Heading level={3}>Services</Heading>
        <Flex gap={16} flexWrap="wrap">
          <StatusCard
            title="Service Health"
            value={svcHealth.loading ? '...' : `${Math.round(svcHealthPct ?? 0)}%`}
            status={svcHealth.loading ? 'unknown' : getHealthPctStatus(svcHealthPct ?? 0)}
          />
          <StatusCard
            title="Error Rate"
            value={svcErrorRate.loading ? '...' : `${(overallErrorRate as number).toFixed(1)}%`}
            status={
              svcErrorRate.loading
                ? 'unknown'
                : getHealthStatus(overallErrorRate as number, 2, 5)
            }
          />
          <StatusCard
            title="Avg Response Time"
            value={svcRt.loading ? '...' : `${Math.round(avgRtMs as number)} ms`}
            status={
              svcRt.loading
                ? 'unknown'
                : getHealthStatus(avgRtMs as number, 500, 2000)
            }
          />
        </Flex>
      </Flex>

      {/* Databases Section */}
      <Flex flexDirection="column" gap={8}>
        <Heading level={3}>Databases</Heading>
        <Flex gap={16} flexWrap="wrap">
          <StatusCard
            title="Database Health"
            value={dbHealth.loading ? '...' : `${Math.round(dbHealthPct ?? 0)}%`}
            status={dbHealth.loading ? 'unknown' : getHealthPctStatus(dbHealthPct ?? 0)}
          />
          <StatusCard
            title="Avg DB Response Time"
            value={dbRt.loading ? '...' : `${Math.round(dbAvgRtMs as number)} ms`}
            status={
              dbRt.loading
                ? 'unknown'
                : getHealthStatus(dbAvgRtMs as number, 100, 500)
            }
          />
        </Flex>
      </Flex>
    </Flex>
  );
};
