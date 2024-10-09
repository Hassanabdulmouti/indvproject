import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart } from 'lucide-react';

interface DashboardStatsProps {
  totalBoxes: number;
  latestBoxName: string;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ totalBoxes, latestBoxName }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Total Boxes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalBoxes}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Latest Box</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{latestBoxName || 'No boxes yet'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => {}}>
            <BarChart className="mr-2 h-4 w-4" /> View Analytics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;