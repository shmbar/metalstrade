'use client'
import { useContext } from 'react'
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { FiEdit } from 'react-icons/fi';
import { MdDelete } from "react-icons/md";
import Spinner from '../../../../components/spinner';
import { UserAuth } from "../../../../contexts/useAuthContext";

const General = () => {
  const { compData } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();

  if (!compData || Object.keys(compData).length === 0) {
    return <Spinner />
  }

const columns =
  "[grid-template-columns:2fr_1fr_2fr_1fr_1fr_1fr_0.75fr_0.75fr]";

  return (
    <div className=" p-2  w-full">
      <div className="border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">

        {/* TABLE GRID */}
      <div className={`grid ${columns}`}>
  {/* HEADER ROW */}
  {["Name","Phone Number","Email","Title","User Created","Last Logged In","Edit","Save"].map((h, i) => (
    <div
      key={`h-${i}`}
      className="
        bg-[#e3f3ff]
        text-[#005B9F]
        text-xs
        font-medium
font-poppins 
        p-3
        text-center
        border-r border-[#E5E7EB]
        last:border-r-0
      "
    >
      {h}
    </div>
  ))}

  {/* DATA ROW */}
  {[
    compData?.name,
    compData?.phone,
    compData?.email,
    compData?.title || "Admin",
    compData?.createdAt || "--",
    compData?.lastLogin || "--"
  ].map((val, idx) => (
    <div
      key={`d-${idx}`}
      className="
        bg-white
        p-3
        border-t border-r border-[#E5E7EB]
        last:border-r-0
        flex justify-center items-center
      "
    >
      <div
        className="
          px-4
          h-8
          flex items-center justify-center
          bg-[#F4F6F8]
          border border-[#E5E7EB]
          rounded-lg
          max-w-full
          truncate
          text-[12px]
          font-normal
          leading-none
          font-['Poppins']
        "
        title={typeof val === "string" ? val : ""}
      >
        {val}
      </div>
    </div>
  ))}

  {/* EDIT */}
  <div className="bg-white p-3 border-t border-r border-[#E5E7EB] flex justify-center items-center">
    <button
      type="button"
      className="min-w-[56px] h-8 flex items-center justify-center bg-[#CDE8D3] rounded-full"
    >
      <FiEdit size={16} className="text-green-600" />
    </button>
  </div>

  {/* SAVE (you called it Save in header, icon is delete previously — keep your icon choice) */}
  <div className="bg-white p-3 border-t flex justify-center items-center">
    <button
      type="button"
      className="min-w-[56px] h-8 flex items-center justify-center bg-[#F5CACA] rounded-full"
    >
      <MdDelete size={16} className="text-red-600" />
    </button>
  </div>
</div>
      </div>
    </div>
  )
}

export default General