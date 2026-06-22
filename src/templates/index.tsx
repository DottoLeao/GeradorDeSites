import { UniversalTemplate } from "@/templates/universal";
import { RestaurantTemplate } from "@/templates/restaurant";
import type { RestaurantContent, UniversalContent } from "@/lib/schemas/templates";

interface SiteRendererProps {
  templateId: string;
  content: UniversalContent | RestaurantContent;
}

export function SiteRenderer({ templateId, content }: SiteRendererProps) {
  switch (templateId) {
    case "restaurant":
      return <RestaurantTemplate content={content as RestaurantContent} />;
    case "clinic":
    case "universal":
    default:
      return <UniversalTemplate content={content as UniversalContent} />;
  }
}
