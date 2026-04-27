import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Text } from "@dynatrace/strato-components/typography";
import type { Grade } from "../utils/scoring";
import { gradeColor, scoreBackground } from "../utils/scoring";

export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

export interface ScorecardRow {
  name: string;
  score: number;
  grade: Grade;
  status: HealthStatus;
  metrics: { label: string; value: string }[];
}

interface ScorecardTableProps {
  title: string;
  nameHeader: string;
  metricHeaders: string[];
  rows: ScorecardRow[];
  loading?: boolean;
  error?: string | null;
  description?: string;
}

function statusBadge(status: HealthStatus) {
  const map: Record<HealthStatus, { bg: string; label: string }> = {
    healthy: { bg: "#2bba4e", label: "HEALTHY" },
    warning: { bg: "#ffb700", label: "WARNING" },
    critical: { bg: "#dc3545", label: "CRITICAL" },
    unknown: { bg: "#6c757d", label: "UNKNOWN" },
  };
  const s = map[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "4px",
        backgroundColor: s.bg,
        color: "#fff",
        fontWeight: 700,
        fontSize: "11px",
        letterSpacing: "0.5px",
      }}
    >
      {s.label}
    </span>
  );
}

const cellStyle: React.CSSProperties = { padding: "8px 12px" };
const headerStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 600,
};

export const ScorecardTable: React.FC<ScorecardTableProps> = ({
  title,
  nameHeader,
  metricHeaders,
  rows,
  loading,
  error,
  description,
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
      {description && (
        <Text style={{ fontSize: "12px", color: "var(--dt-colors-text-neutral-subdued)", marginBottom: 4 }}>
          {description}
        </Text>
      )}
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
            <th style={{ ...headerStyle, textAlign: "left" }}>{nameHeader}</th>
            <th style={{ ...headerStyle, textAlign: "center" }}>Score</th>
            <th style={{ ...headerStyle, textAlign: "center" }}>Grade</th>
            {metricHeaders.map((h) => (
              <th key={h} style={{ ...headerStyle, textAlign: "right" }}>{h}</th>
            ))}
            <th style={{ ...headerStyle, textAlign: "center" }}>Status</th>
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
              <td
                style={{
                  ...cellStyle,
                  textAlign: "center",
                  backgroundColor: scoreBackground(row.score),
                  fontWeight: 700,
                }}
              >
                {row.score}
              </td>
              <td
                style={{
                  ...cellStyle,
                  textAlign: "center",
                  color: gradeColor(row.grade),
                  fontWeight: 700,
                  fontSize: "15px",
                }}
              >
                {row.grade}
              </td>
              {row.metrics.map((m, j) => (
                <td key={j} style={{ ...cellStyle, textAlign: "right" }}>{m.value}</td>
              ))}
              <td style={{ ...cellStyle, textAlign: "center" }}>
                {statusBadge(row.status)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Flex>
  );
};
