import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { HealthIndicator } from "@dynatrace/strato-components/content";
import { Text } from "@dynatrace/strato-components/typography";

export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

export interface ScorecardRow {
  name: string;
  status: HealthStatus;
  metric1?: string;
  metric2?: string;
  metric3?: string;
}

interface ScorecardTableProps {
  title: string;
  headers: [string, string, string, string];
  rows: ScorecardRow[];
  loading?: boolean;
  error?: string | null;
}

function mapStatus(
  status: HealthStatus
): "ideal" | "good" | "warning" | "critical" | "neutral" {
  switch (status) {
    case "healthy":
      return "ideal";
    case "warning":
      return "warning";
    case "critical":
      return "critical";
    default:
      return "neutral";
  }
}

function statusLabel(status: HealthStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
    default:
      return "Unknown";
  }
}

const cellStyle: React.CSSProperties = { padding: "8px 12px" };
const headerStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 600,
};

export const ScorecardTable: React.FC<ScorecardTableProps> = ({
  title,
  headers,
  rows,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <Flex flexDirection="column" padding={16}>
        <Text>Loading {title}...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex flexDirection="column" padding={16}>
        <Text style={{ color: "var(--dt-colors-text-critical-default)" }}>
          Error loading {title}: {error}
        </Text>
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" gap={4} style={{ width: "100%" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom:
                "2px solid var(--dt-colors-border-neutral-default)",
            }}
          >
            <th style={{ ...headerStyle, textAlign: "left" }}>{headers[0]}</th>
            <th style={{ ...headerStyle, textAlign: "center" }}>Status</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>{headers[1]}</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>{headers[2]}</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>{headers[3]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.name + i}
              style={{
                borderBottom:
                  "1px solid var(--dt-colors-border-neutral-default)",
              }}
            >
              <td style={cellStyle}>{row.name}</td>
              <td style={{ ...cellStyle, textAlign: "center" }}>
                <Flex alignItems="center" justifyContent="center" gap={6}>
                  <HealthIndicator status={mapStatus(row.status)} />
                  <Text>{statusLabel(row.status)}</Text>
                </Flex>
              </td>
              <td style={{ ...cellStyle, textAlign: "right" }}>
                {row.metric1 ?? "-"}
              </td>
              <td style={{ ...cellStyle, textAlign: "right" }}>
                {row.metric2 ?? "-"}
              </td>
              <td style={{ ...cellStyle, textAlign: "right" }}>
                {row.metric3 ?? "-"}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "16px", textAlign: "center" }}>
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Flex>
  );
};
