import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { HealthIndicator } from "@dynatrace/strato-components/content";
import { Heading, Text } from "@dynatrace/strato-components/typography";

export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

interface StatusCardProps {
  title: string;
  value: string | number;
  status: HealthStatus;
  subtitle?: string;
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

function getCardColors(status: HealthStatus): {
  bg: string;
  border: string;
} {
  switch (status) {
    case "healthy":
      return { bg: "rgba(43, 186, 78, 0.15)", border: "rgba(43, 186, 78, 0.6)" };
    case "warning":
      return { bg: "rgba(255, 183, 0, 0.18)", border: "rgba(255, 183, 0, 0.7)" };
    case "critical":
      return { bg: "rgba(220, 53, 69, 0.18)", border: "rgba(220, 53, 69, 0.7)" };
    default:
      return {
        bg: "var(--dt-colors-surface-default)",
        border: "var(--dt-colors-border-neutral-default)",
      };
  }
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  status,
  subtitle,
}) => {
  const colors = getCardColors(status);
  return (
    <Flex
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={8}
      style={{
        padding: "20px",
        borderRadius: "8px",
        backgroundColor: colors.bg,
        border: `2px solid ${colors.border}`,
        minWidth: "180px",
        flex: 1,
      }}
    >
      <Text
        style={{
          fontSize: "12px",
          color: "var(--dt-colors-text-neutral-default)",
        }}
      >
        {title}
      </Text>
      <Flex alignItems="center" gap={8}>
        <HealthIndicator status={mapStatus(status)} />
        <Heading level={2}>{String(value)}</Heading>
      </Flex>
      {subtitle && (
        <Text
          style={{
            fontSize: "11px",
            color: "var(--dt-colors-text-neutral-subdued)",
          }}
        >
          {subtitle}
        </Text>
      )}
    </Flex>
  );
};
