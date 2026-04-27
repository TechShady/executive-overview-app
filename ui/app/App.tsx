import React from "react";
import { Page } from "@dynatrace/strato-components-preview/layouts";
import { Tabs, Tab } from "@dynatrace/strato-components/navigation";
import { OverviewTab } from "./tabs/OverviewTab";
import { WebAppsTab } from "./tabs/WebAppsTab";
import { InfraTab } from "./tabs/InfraTab";
import { ServicesTab } from "./tabs/ServicesTab";
import { DatabasesTab } from "./tabs/DatabasesTab";

export const App = () => {
  return (
    <Page>
      <Page.Main>
        <Tabs>
          <Tab title="Overview">
            <OverviewTab />
          </Tab>
          <Tab title="Web Apps">
            <WebAppsTab />
          </Tab>
          <Tab title="Infrastructure">
            <InfraTab />
          </Tab>
          <Tab title="Services">
            <ServicesTab />
          </Tab>
          <Tab title="Databases">
            <DatabasesTab />
          </Tab>
        </Tabs>
      </Page.Main>
    </Page>
  );
};
