export default function ChairmanProfile() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="font-['SF_Pro',sans-serif] font-semibold text-[40px] text-black mb-2">
          Chairman Profile
        </h2>
        <p className="font-['SF_Pro',sans-serif] font-normal text-[16px] text-black">
          Administrative profile and account information.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-8">
          {/* Profile Picture */}
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-[#780301] to-[#de0602] rounded-full flex items-center justify-center">
              <span className="font-['SF_Pro',sans-serif] font-bold text-[48px] text-white">
                MS
              </span>
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[12px] text-gray-500 mb-1">
                  Full Name
                </label>
                <p className="font-['SF_Pro',sans-serif] text-[16px] text-black font-semibold">
                  Dr. Maria Santos
                </p>
              </div>
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[12px] text-gray-500 mb-1">
                  Employee ID
                </label>
                <p className="font-['SF_Pro',sans-serif] text-[16px] text-black font-semibold">
                  CTU-2020-00123
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[12px] text-gray-500 mb-1">
                  Role
                </label>
                <p className="font-['SF_Pro',sans-serif] text-[16px] text-black font-semibold">
                  Chairman Admin
                </p>
              </div>
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[12px] text-gray-500 mb-1">
                  College/Department
                </label>
                <p className="font-['SF_Pro',sans-serif] text-[16px] text-black font-semibold">
                  College of Computer Studies
                </p>
              </div>
            </div>

            <div>
              <label className="block font-['SF_Pro',sans-serif] text-[12px] text-gray-500 mb-1">
                Email
              </label>
              <p className="font-['SF_Pro',sans-serif] text-[16px] text-black font-semibold">
                maria.santos@ctu.edu.ph
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[12px] text-gray-500 mb-1">
                  Account Status
                </label>
                <span className="inline-block px-3 py-1 bg-green-500 text-white rounded font-['SF_Pro',sans-serif] text-[12px] font-semibold">
                  Active
                </span>
              </div>
              <div>
                <label className="block font-['SF_Pro',sans-serif] text-[12px] text-gray-500 mb-1">
                  Date Created
                </label>
                <p className="font-['SF_Pro',sans-serif] text-[16px] text-black font-semibold">
                  January 15, 2020
                </p>
              </div>
            </div>

            <div>
              <label className="block font-['SF_Pro',sans-serif] text-[12px] text-gray-500 mb-1">
                Last Login
              </label>
              <p className="font-['SF_Pro',sans-serif] text-[16px] text-black font-semibold">
                April 2, 2026 at 8:30 AM
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button className="flex-1 bg-[#ff990a] text-white px-6 py-3 rounded-lg font-['SF_Pro',sans-serif] font-semibold text-[16px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] hover:bg-[#e68909] transition-colors">
              Edit Profile
            </button>
            <button className="flex-1 bg-gray-200 text-black px-6 py-3 rounded-lg font-['SF_Pro',sans-serif] font-semibold text-[16px] hover:bg-gray-300 transition-colors">
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
