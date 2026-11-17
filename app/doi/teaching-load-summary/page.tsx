import { CollegeTeachingLoadSummaryClient } from "@/components/college/CollegeTeachingLoadSummaryClient";

/** DOI: Summary of Teaching Load for every college, filtered by college and department. */
export default function DoiTeachingLoadSummaryPage() {
  return <CollegeTeachingLoadSummaryClient campusWide />;
}
