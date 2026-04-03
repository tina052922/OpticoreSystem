import { createBrowserRouter } from "react-router";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import InboxMail from "./pages/InboxMail";
import InboxSent from "./pages/InboxSent";
import FacultyProfile from "./pages/FacultyProfile";
import SubjectCodes from "./pages/SubjectCodes";
import EvaluatorTimetabling from "./pages/EvaluatorTimetabling";
import EvaluatorHrsUnits from "./pages/EvaluatorHrsUnits";
import ChairmanProfile from "./pages/ChairmanProfile";
import INSFormFaculty from "./pages/INSFormFaculty";
import INSFormSection from "./pages/INSFormSection";
import INSFormRoom from "./pages/INSFormRoom";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "inbox", Component: InboxMail },
      { path: "inbox/sent", Component: InboxSent },
      { path: "faculty-profile", Component: FacultyProfile },
      { path: "subject-codes", Component: SubjectCodes },
      { path: "evaluator", Component: EvaluatorTimetabling },
      { path: "evaluator/hrs-units", Component: EvaluatorHrsUnits },
      { path: "chairman-profile", Component: ChairmanProfile },
      { path: "ins-form/faculty", Component: INSFormFaculty },
      { path: "ins-form/section", Component: INSFormSection },
      { path: "ins-form/room", Component: INSFormRoom },
    ],
  },
]);
