type DayKey = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

const timeSlots = [
  "7:00-8:00",
  "8:00-9:00",
  "9:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-1:00",
  "1:00-2:00",
  "2:00-3:00",
  "3:00-4:00",
  "4:00-5:00",
  "5:00-6:00",
  "6:00-7:00",
];

export function INSWeekGridPreview() {
  return (
    <div className="bg-white border border-black/15 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-black/10 text-[12px] font-semibold">
        Schedule Preview (INS Form View)
      </div>
      <div className="overflow-auto max-h-[520px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black/15 px-2 py-1 text-left text-[10px] bg-[#ff990a] text-white">
                TIME
              </th>
              {(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as DayKey[]).map((d) => (
                <th key={d} className="border border-black/15 px-2 py-1 text-center text-[10px] bg-[#ff990a] text-white">
                  {d.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot) => (
              <tr key={slot}>
                <td className="border border-black/15 px-2 py-2 text-[9px] whitespace-nowrap">{slot}</td>
                {(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as DayKey[]).map(
                  (d) => (
                    <td key={d} className="border border-black/15 px-1 py-1 text-[8px] text-center align-middle h-[34px]">
                      {d === "Monday" && slot === "7:00-8:00" ? (
                        <div className="leading-tight">
                          <div>Course code</div>
                          <div>Yr. &amp; Sec.</div>
                          <div>Room</div>
                        </div>
                      ) : null}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
