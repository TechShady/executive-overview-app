import React, { useState } from "react";
import { Page } from "@dynatrace/strato-components-preview/layouts";
import { Tabs, Tab } from "@dynatrace/strato-components/navigation";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Strong } from "@dynatrace/strato-components/typography";
import { Select } from "@dynatrace/strato-components-preview/forms";
import { OverviewTab } from "./tabs/OverviewTab";
import { WebAppsTab } from "./tabs/WebAppsTab";
import { InfraTab } from "./tabs/InfraTab";
import { ServicesTab } from "./tabs/ServicesTab";
import { DatabasesTab } from "./tabs/DatabasesTab";

const TIMEFRAME_OPTIONS = [
  { label: "Last 2 hours", value: 0.083 },
  { label: "Last 6 hours", value: 0.25 },
  { label: "Last 24 hours", value: 1 },
  { label: "Last 2 days", value: 2 },
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
];

export const App = () => {
  const [timeframeDays, setTimeframeDays] = useState<number>(1);

  return (
    <Page>
      <Page.Main>
        <Flex justifyContent="flex-end" style={{ padding: "16px 24px 0 24px" }}>
          <Flex flexDirection="column" gap={4} style={{ minWidth: 160 }}>
            <Strong>Timeframe</Strong>
            <Select
              value={timeframeDays}
              onChange={(val) => {
                if (val != null) setTimeframeDays(val as number);
              }}
            >
              <Select.Content>
                {TIMEFRAME_OPTIONS.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select.Content>
            </Select>
          </Flex>
        </Flex>
        <Tabs>
          <Tab title="Overview">
            <OverviewTab timeframeDays={timeframeDays} />
          </Tab>
          <Tab title="Web Apps">
            <WebAppsTab timeframeDays={timeframeDays} />
          </Tab>
          <Tab title="Infrastructure">
            <InfraTab timeframeDays={timeframeDays} />
          </Tab>
          <Tab title="Services">
            <ServicesTab timeframeDays={timeframeDays} />
          </Tab>
          <Tab title="Databases">
            <DatabasesTab timeframeDays={timeframeDays} />
          </Tab>
        </Tabs>
      </Page.Main>
    </Page>
  );
};
