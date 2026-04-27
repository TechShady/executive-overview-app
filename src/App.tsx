import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Tab, Tabs } from '@dynatrace/strato-components/navigation';
import { OverviewTab } from './tabs/OverviewTab';
import { WebAppsTab } from './tabs/WebAppsTab';
import { InfraTab } from './tabs/InfraTab';
import { ServicesTab } from './tabs/ServicesTab';
import { DatabasesTab } from './tabs/DatabasesTab';

export const App: React.FC = () => {
  return (
    <Flex flexDirection="column" style={{ height: '100%' }}>
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
    </Flex>
  );
};
