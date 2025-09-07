import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Lightbulb } from "lucide-react"

interface AiInsightsProps {
  insights: string;
}

export function AiInsights({ insights }: AiInsightsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
            <CardTitle>AI Insights</CardTitle>
            <CardDescription>Actionable conclusions from your CRM data.</CardDescription>
        </div>
        <Lightbulb className="h-6 w-6 text-primary ml-auto" />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {insights}
        </p>
      </CardContent>
    </Card>
  )
}
