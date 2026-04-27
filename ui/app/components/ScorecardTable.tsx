import React, { useState, useMemo } from "react";
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

type SortKey = "name" | "score" | "grade" | "status" | `metric-${number}`;
type SortDir = "asc" | "desc";

const statusOrder: Record<HealthStatus, number> = {
  critical: 0,
  warning: 1,
  unknown: 2,
  healthy: 3,
};

function parseNumeric(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function sortRows(rows: ScorecardRow[], key: SortKey, dir: SortDir): ScorecardRow[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === "name") {
      cmp = a.name.localeCompare(b.name);
    } else if (key === "score") {
      cmp = a.score - b.score;
    } else if (key === "grade") {
      cmp = a.grade.localeCompare(b.grade);
    } else if (key === "status") {
      cmp = statusOrder[a.status] - statusOrder[b.status];
    } else if (key.startsWith("metric-")) {
      const idx = parseInt(key.split("-")[1], 10);
      const aVal = parseNumeric(a.metrics[idx]?.value ?? "0");
      const bVal = parseNumeric(b.metrics[idx]?.value ?? "0");
      cmp = aVal - bVal;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

function sortIndicator(active: boolean, dir: SortDir): string {
  if (!active) return " ↕";
  return dir === "asc" ? " ↑" : " ↓";
}

function statusBadge(status: HealthStatus) {
  const map: Record<HealthStatus, { bg: string; label: string }> = {
    healthy: { bg: "#00D26A", label: "HEALTHY" },
    warning: { bg: "#FCD53F", label: "WARNING" },
    critical: { bg: "#F8312F", label: "CRITICAL" },
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
        color: status === "warning" ? "#000" : "#fff",
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

const clickableHeader: React.CSSProperties = {
  ...headerStyle,
  cursor: "pointer",
  userSelect: "none",
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
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const sortedRows = useMemo(() => sortRows(rows, sortKey, sortDir), [rows, sortKey, sortDir]);

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
            <th style={{ ...clickableHeader, textAlign: "left" }} onClick={() => handleSort("name")}>
              {nameHeader}{sortIndicator(sortKey === "name", sortDir)}
            </th>
            <th style={{ ...clickableHeader, textAlign: "center" }} onClick={() => handleSort("score")}>
              Score{sortIndicator(sortKey === "score", sortDir)}
            </th>
            <th style={{ ...clickableHeader, textAlign: "center" }} onClick={() => handleSort("grade")}>
              Grade{sortIndicator(sortKey === "grade", sortDir)}
            </th>
            {metricHeaders.map((h, idx) => (
              <th key={h} style={{ ...clickableHeader, textAlign: "right" }} onClick={() => handleSort(`metric-${idx}`)}>
                {h}{sortIndicator(sortKey === `metric-${idx}`, sortDir)}
              </th>
            ))}
            <th style={{ ...clickableHeader, textAlign: "center" }} onClick={() => handleSort("status")}>
              Status{sortIndicator(sortKey === "status", sortDir)}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
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
