import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { StatusCard } from "../components/StatusCard";
import { ScorecardTable } from "../components/ScorecardTable";
import { useDqlQuery } from "../hooks/useDqlQuery";
import type { HealthStatus } from "../components/StatusCard";
import type { ScorecardRow } from "../components/ScorecardTable";

function getHostStatus(cpu: number, mem: number, disk: number): HealthStatus {
  if (cpu > 90 || mem > 90 || disk > 90) return "critical";
  if (cpu > 80 || mem > 80 || disk > 80) return "warning";
  return "healthy";
}

export const InfraTab: React.FC = () => {
  const avgCpu = useDqlQuery(
    `timeseries cpu = avg(dt.host.cpu.usage)
| fieldsAdd avg_cpu = arrayAvg(cpu)`
  );

  const avgMem = useDqlQuery(
    `timeseries mem = avg(dt.host.memory.usage)
| fieldsAdd avg_mem = arrayAvg(mem)`
  );

  const avgDisk = useDqlQuery(
    `timeseries disk = avg(dt.host.disk.used.percent)
| fieldsAdd avg_disk = arrayAvg(disk)`
  );

  const hostCount = useDqlQuery(
    `timeseries cpu = avg(dt.host.cpu.usage), by: {dt.smartscape.host}
| summarize count()`
  );

  const criticalCount = useDqlQuery(
    `timeseries cpu = avg(dt.host.cpu.usage), by: {dt.smartscape.host}
| fieldsAdd avg_cpu = arrayAvg(cpu)
| filter avg_cpu > 90
| summarize count()`
  );

  const scorecard = useDqlQuery(
    `timeseries {
  cpu = avg(dt.host.cpu.usage),
  memory = avg(dt.host.memory.usage),
  disk = avg(dt.host.disk.used.percent)
}, by: {dt.smartscape.host}
| fieldsAdd host_name = getNodeName(dt.smartscape.host),
  avg_cpu = arrayAvg(cpu),
  avg_memory = arrayAvg(memory),
  avg_disk = arrayAvg(disk)
| fields host_name, avg_cpu, avg_memory, avg_disk
| sort avg_cpu desc
| limit 50`
  );

  const cpuVal = avgCpu.records?.[0]?.avg_cpu ?? 0;
  const memVal = avgMem.records?.[0]?.avg_mem ?? 0;
  const diskVal = avgDisk.records?.[0]?.avg_disk ?? 0;
  const totalHosts = hostCount.records?.[0]?.["count()"] ?? 0;
  const critHosts = criticalCount.records?.[0]?.["count()"] ?? 0;

  const rows: ScorecardRow[] = (scorecard.records ?? []).map((r) => ({
    name: r.host_name ?? "Unknown",
    status: getHostStatus(r.avg_cpu ?? 0, r.avg_memory ?? 0, r.avg_disk ?? 0),
    metric1: `${(r.avg_cpu ?? 0).toFixed(1)}%`,
    metric2: `${(r.avg_memory ?? 0).toFixed(1)}%`,
    metric3: `${(r.avg_disk ?? 0).toFixed(1)}%`,
  }));

  return (
    <Flex flexDirection="column" gap={24} style={{ padding: "24px" }}>
      <Flex flexDirection="column" gap={4}>
        <Heading level={1}>Infrastructure</Heading>
        <Text>Host resource health across all monitored infrastructure.</Text>
      </Flex>

      <Flex gap={16} flexWrap="wrap">
        <StatusCard
          title="Total Hosts"
          value={hostCount.loading ? "..." : totalHosts}
          status={hostCount.loading ? "unknown" : "healthy"}
        />
        <StatusCard
          title="Avg CPU"
          value={avgCpu.loading ? "..." : `${(cpuVal as number).toFixed(1)}%`}
          status={avgCpu.loading ? "unknown" : (cpuVal as number) <= 70 ? "healthy" : (cpuVal as number) <= 85 ? "warning" : "critical"}
        />
        <StatusCard
          title="Avg Memory"
          value={avgMem.loading ? "..." : `${(memVal as number).toFixed(1)}%`}
          status={avgMem.loading ? "unknown" : (memVal as number) <= 75 ? "healthy" : (memVal as number) <= 90 ? "warning" : "critical"}
        />
        <StatusCard
          title="Avg Disk"
          value={avgDisk.loading ? "..." : `${(diskVal as number).toFixed(1)}%`}
          status={avgDisk.loading ? "unknown" : (diskVal as number) <= 75 ? "healthy" : (diskVal as number) <= 90 ? "warning" : "critical"}
        />
        <StatusCard
          title="Critical Hosts"
          value={criticalCount.loading ? "..." : critHosts}
          status={criticalCount.loading ? "unknown" : critHosts === 0 ? "healthy" : (critHosts as number) <= 3 ? "warning" : "critical"}
          subtitle="> 90% CPU"
        />
      </Flex>

      <Heading level={3}>Host Scorecard</Heading>
      <ScorecardTable
        title="Infrastructure"
        headers={["Host", "CPU %", "Memory %", "Disk %"]}
        rows={rows}
        loading={scorecard.loading}
        error={scorecard.error}
      />
    </Flex>
  );
};
