import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { HealthIndicator } from '@dynatrace/strato-components/content';
import { Heading, Text } from '@dynatrace/strato-components/typography';

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

interface StatusCardProps {
  title: string;
  value: string | number;
  status: HealthStatus;
  subtitle?: string;
}

function mapStatus(
  status: HealthStatus
): 'ideal' | 'good' | 'warning' | 'critical' | 'neutral' {
  switch (status) {
    case 'healthy':
      return 'ideal';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'critical';
    default:
      return 'neutral';
  }
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  status,
  subtitle,
}) => {
  return (
    <Flex
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={8}
      style={{
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: 'var(--dt-colors-surface-default)',
        border: '1px solid var(--dt-colors-border-neutral-default)',
        minWidth: '180px',
        flex: 1,
      }}
    >
      <Text style={{ fontSize: '12px', color: 'var(--dt-colors-text-neutral-default)' }}>
        {title}
      </Text>
      <Flex alignItems="center" gap={8}>
        <HealthIndicator status={mapStatus(status)} />
        <Heading level={2}>{String(value)}</Heading>
      </Flex>
      {subtitle && (
        <Text style={{ fontSize: '11px', color: 'var(--dt-colors-text-neutral-subdued)' }}>
          {subtitle}
        </Text>
      )}
    </Flex>
  );
};
