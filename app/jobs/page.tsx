import { OpportunityList } from "@/components/OpportunityList";

export default function JobsPage() {
  return (
    <OpportunityList
      kind="job"
      title="Jobs & Internships"
      subtitle="AI-related roles scored to your profile by domain fit, skills, location, and level."
    />
  );
}
