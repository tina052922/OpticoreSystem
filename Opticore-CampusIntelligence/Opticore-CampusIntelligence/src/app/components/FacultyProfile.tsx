import { useState } from 'react';
import { Plus, MoreVertical } from 'lucide-react';

interface FacultyEntry {
  facultyName: string;
  aka: string;
  status: string;
  bachelors: string;
  major1: string;
  minor1: string;
  masters: string;
  major2: string;
  minor2: string;
  doctoral: string;
  major3: string;
  minor3: string;
  research: string;
  production: string;
  specialTraining: string;
  adminDesignation: string;
}

export function FacultyProfile() {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'designation' | 'advisory'>('profile');
  const [facultyData, setFacultyData] = useState<FacultyEntry[]>([
    {
      facultyName: 'Dr. Juan P. Dela Cruz',
      aka: 'JP',
      status: 'PERMANENT',
      bachelors: 'BS Computer Science',
      major1: 'Software Engineering',
      minor1: 'Mathematics',
      masters: 'MS Information Technology',
      major2: 'Data Science',
      minor2: 'Statistics',
      doctoral: 'PhD Computer Science',
      major3: 'Artificial Intelligence',
      minor3: 'Machine Learning',
      research: 'AI Research',
      production: 'Software Development',
      specialTraining: 'Agile Methodology',
      adminDesignation: 'Program Head'
    },
    {
      facultyName: 'Prof. Maria L. Santos',
      aka: 'Mia',
      status: 'PERMANENT',
      bachelors: 'BS Information Technology',
      major1: 'Web Development',
      minor1: 'Networking',
      masters: 'MS Computer Science',
      major2: 'Database Systems',
      minor2: 'Security',
      doctoral: '',
      major3: '',
      minor3: '',
      research: 'Web Technologies',
      production: 'System Analysis',
      specialTraining: 'Scrum Master',
      adminDesignation: 'No Administrative Designation'
    },
    {
      facultyName: 'Dr. Pedro S. Reyes',
      aka: 'Pete',
      status: 'COS',
      bachelors: 'BS Computer Engineering',
      major1: 'Embedded Systems',
      minor1: 'Electronics',
      masters: 'MS Engineering',
      major2: 'Robotics',
      minor2: 'Automation',
      doctoral: 'PhD Engineering',
      major3: 'IoT Systems',
      minor3: 'Sensor Networks',
      research: 'IoT Research',
      production: 'Hardware Development',
      specialTraining: 'Industry 4.0',
      adminDesignation: 'Executive Chair'
    }
  ]);
  
  // Form state
  const [formData, setFormData] = useState({
    facultyName: '',
    aka: '',
    status: '',
    bachelors: '',
    major1: '',
    minor1: '',
    masters: '',
    major2: '',
    minor2: '',
    doctoral: '',
    major3: '',
    minor3: '',
    research: '',
    production: '',
    specialTraining: '',
    adminDesignation: ''
  });

  const handleAddFaculty = () => {
    if (!formData.facultyName.trim()) {
      alert('Please enter faculty name');
      return;
    }

    const newFaculty: FacultyEntry = {
      facultyName: formData.facultyName,
      aka: formData.aka,
      status: formData.status,
      bachelors: formData.bachelors,
      major1: formData.major1,
      minor1: formData.minor1,
      masters: formData.masters,
      major2: formData.major2,
      minor2: formData.minor2,
      doctoral: formData.doctoral,
      major3: formData.major3,
      minor3: formData.minor3,
      research: formData.research,
      production: formData.production,
      specialTraining: formData.specialTraining,
      adminDesignation: formData.adminDesignation
    };

    setFacultyData([...facultyData, newFaculty]);
    
    // Reset form
    setFormData({
      facultyName: '',
      aka: '',
      status: '',
      bachelors: '',
      major1: '',
      minor1: '',
      masters: '',
      major2: '',
      minor2: '',
      doctoral: '',
      major3: '',
      minor3: '',
      research: '',
      production: '',
      specialTraining: '',
      adminDesignation: ''
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const designationData = [
    { name: 'Atienza, N.', status: 'Organic', designation: 'Executive Chair', number: '1', rate: '1' },
    { name: 'Atienza, P.', status: 'Organic', designation: 'No Administrative Designation', number: '1', rate: '1' },
    { name: 'Belondo, T.', status: 'Organic', designation: 'No Administrative Designation', number: '1', rate: '1' },
    { name: 'Cabahug, E.', status: 'Organic', designation: 'No Administrative Designation', number: '1', rate: '1' },
    { name: 'Diez, R.', status: 'Organic', designation: 'No Administrative Designation', number: '1', rate: '1' },
    { name: 'Garcia, J.', status: 'Organic', designation: 'Program Head', number: '1', rate: '1' },
  ];

  const adminDesignationSummary = [
    { designation: 'No Administrative Designation', count: 12 },
    { designation: 'Function Chair', count: 2 },
    { designation: 'Academic Chair', count: 1 },
    { designation: 'Director', count: 1 },
    { designation: 'Assistant Campus Director', count: 1 },
    { designation: 'Campus Director', count: 4 },
    { designation: 'Vice President', count: 6 },
    { designation: 'President', count: 1 },
  ];

  const advisoryData = [
    { advisory: 'BEEd 1A', faculty: 'Dr. Viviana C. Cenabe' },
    { advisory: 'BEEd 1B', faculty: 'Dr. Virginia S. Albaracin' },
    { advisory: 'BTLEd 1A', faculty: 'Prof. Mildred G. Martinez' },
    { advisory: 'BTLEd 1B', faculty: 'Dr. Jima S. Bolagan' },
    { advisory: 'BSEd - Math 1', faculty: 'Dr. Crystall Therese B. Dayanghon' },
    { advisory: 'BEEd 2A', faculty: 'Ms. Angelica E. Carillo' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Faculty Profile</h2>
        <p className="text-gray-600 text-sm">View and edit faculty profiles, designations, and advisory information.</p>
      </div>

      {/* Sub-tabs */}
      <div className="px-6 flex gap-2 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeSubTab === 'profile'
              ? 'bg-[#FF990A] text-white rounded-t-lg'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Faculty Profile
        </button>
        <button
          onClick={() => setActiveSubTab('designation')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeSubTab === 'designation'
              ? 'bg-[#FF990A] text-white rounded-t-lg'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Designation
        </button>
        <button
          onClick={() => setActiveSubTab('advisory')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeSubTab === 'advisory'
              ? 'bg-[#FF990A] text-white rounded-t-lg'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Advisory
        </button>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto scroll-smooth p-6 pt-4">
        {/* Faculty Profile Form */}
        {activeSubTab === 'profile' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </div>
            <button 
              onClick={handleAddFaculty}
              className="px-6 py-2 bg-[#FF990A] text-white rounded-lg font-medium hover:bg-[#e88909] transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Faculty
            </button>
          </div>

          {/* Form Fields - Exact Sequence as Required */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Name</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.facultyName}
                onChange={(e) => handleInputChange('facultyName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">A.K.A.</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.aka}
                onChange={(e) => handleInputChange('aka', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              >
                <option>Select Status</option>
                <option>Permanent</option>
                <option>COS</option>
                <option>Part-Time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bachelor's Degree</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.bachelors}
                onChange={(e) => handleInputChange('bachelors', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Major 1</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.major1}
                onChange={(e) => handleInputChange('major1', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minor 1</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.minor1}
                onChange={(e) => handleInputChange('minor1', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Master's Degree</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.masters}
                onChange={(e) => handleInputChange('masters', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Major 2</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.major2}
                onChange={(e) => handleInputChange('major2', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minor 2</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.minor2}
                onChange={(e) => handleInputChange('minor2', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctoral Degree</label>
              <input
                type="text"
                placeholder="Doctorate"
                value={formData.doctoral}
                onChange={(e) => handleInputChange('doctoral', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Major 3</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.major3}
                onChange={(e) => handleInputChange('major3', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minor 3</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.minor3}
                onChange={(e) => handleInputChange('minor3', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Research Extension</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.research}
                onChange={(e) => handleInputChange('research', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Production</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.production}
                onChange={(e) => handleInputChange('production', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Training</label>
              <input
                type="text"
                placeholder="Input"
                value={formData.specialTraining}
                onChange={(e) => handleInputChange('specialTraining', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              />
            </div>
          </div>

          {/* Administrative Designation Section */}
          <div className="mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Administrative Designation</label>
              <select 
                value={formData.adminDesignation}
                onChange={(e) => handleInputChange('adminDesignation', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF990A] focus:border-transparent"
              >
                <option>Select Designation</option>
                <option>No Administrative Designation</option>
                <option>Function Chair</option>
                <option>Academic Chair</option>
                <option>Director</option>
                <option>Assistant Campus Director</option>
                <option>Campus Director</option>
                <option>Vice President</option>
                <option>President</option>
              </select>
            </div>
          </div>

          {/* Faculty Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FF990A] text-white">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Faculty Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">A.K.A.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Bachelor's Degree</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Major 1</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Minor 1</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Master's Degree</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Major 2</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Minor 2</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Doctoral Degree</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Major 3</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Minor 3</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Research Extension</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Production</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Special Training</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Administrative Designation</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facultyData.map((faculty, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.facultyName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.aka}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.bachelors}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.major1}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.minor1}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.masters}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.major2}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.minor2}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.doctoral}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.major3}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.minor3}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.research}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.production}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.specialTraining}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faculty.adminDesignation}</td>
                    <td className="px-4 py-3 text-sm">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Designation Tab */}
        {activeSubTab === 'designation' && (
          <div className="flex gap-6">
            {/* Main Designation Table */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FF990A] text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Faculty Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Designation</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Number</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Rate per Hour</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {designationData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.status}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.designation}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.number}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.rate}</td>
                      </tr>
                    ))}
                    {/* Empty rows for spacing */}
                    {[...Array(8)].map((_, i) => (
                      <tr key={`empty-${i}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">&nbsp;</td>
                        <td className="px-4 py-3 text-sm text-gray-700">&nbsp;</td>
                        <td className="px-4 py-3 text-sm text-gray-700">&nbsp;</td>
                        <td className="px-4 py-3 text-sm text-gray-700">&nbsp;</td>
                        <td className="px-4 py-3 text-sm text-gray-700">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Administrative Designation Summary */}
            <div className="w-80 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Administrative Designation</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#FF990A] text-white">
                        <th className="px-4 py-2 text-left text-sm font-semibold">Designation</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Count</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {adminDesignationSummary.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-700">{item.designation}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Dean</h3>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">NAME:</span>
                    <div className="mt-1 text-gray-800">___________________</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">RATE:</span>
                    <div className="mt-1 text-gray-800">___________________</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advisory Tab */}
        {activeSubTab === 'advisory' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#FF990A] text-white">
                    <th className="px-4 py-3 text-left text-sm font-semibold">ADVISORY</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">FACULTY</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {advisoryData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{item.advisory}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.faculty}</td>
                    </tr>
                  ))}
                  {/* Empty rows for spacing */}
                  {[...Array(10)].map((_, i) => (
                    <tr key={`empty-${i}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">&nbsp;</td>
                      <td className="px-4 py-3 text-sm text-gray-700">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}