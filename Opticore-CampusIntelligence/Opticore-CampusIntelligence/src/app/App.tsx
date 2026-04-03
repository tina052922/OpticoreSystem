import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inbox } from './components/Inbox';
import { FacultyProfile } from './components/FacultyProfile';
import { SubjectCodes } from './components/SubjectCodes';
import { CentralHubEvaluator } from './components/CentralHubEvaluator';
import { INSForm } from './components/INSForm';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'inbox':
        return <Inbox />;
      case 'faculty':
        return <FacultyProfile />;
      case 'subjects':
        return <SubjectCodes />;
      case 'evaluator':
        return <CentralHubEvaluator />;
      case 'schedule':
        return <INSForm />;
      default:
        return (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Coming Soon</h2>
              <p className="text-gray-600">This section is under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeItem={activeView} onNavigate={setActiveView} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}