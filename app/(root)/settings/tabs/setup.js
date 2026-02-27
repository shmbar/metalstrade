import React, { useEffect, useState, useContext } from "react";
import List from "../../../../components/list";
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { UserAuth } from "../../../../contexts/useAuthContext";
import { getTtl } from "../../../../utils/languages";

const Setup = () => {
  const { settings, updateSettings, ln } = useContext(SettingsContext);
  const [keyName, setKeyName] = useState("Container Type");
  const [list, setList] = useState(settings[keyName] || []);
  const { uidCollection } = UserAuth();

  let listA = { ...settings };
  delete listA["Supplier"];
  delete listA["Client"];
  delete listA["Bank Account"];
  delete listA["InvTypes"];
  delete listA["ExpPmnt"];
  delete listA["Currency"];
  delete listA["Stocks"];

  useEffect(() => {
    setList(settings[keyName] || []);
  }, [settings, keyName]);

  const showList = (z) => {
    setKeyName(z);
    setList(settings[z]);
  };

  const updateList = (newArrList, updateServer) => {
    const newObj = { ...list, [keyName]: newArrList };
    updateSettings(uidCollection, newObj, keyName, updateServer);
  };

  return (
    <div className=" p-2 flex w-full">
      <div className="flex w-full flex-col md:flex-row  md:p-0">

        {/* LEFT MENU - make wider */}
        <div className="md:px-5 w-full md:w-[30%] flex-shrink-0">
          <ul
            className="
              flex flex-col overflow-auto mt-1
              ring-1 ring-black/5 rounded-lg
              bg-[#e3f3ff]
              py-2
            "
          >
            {Object.keys(listA)
              .sort()
              .map((x, i) => (
                <li
                  key={i}
                  onClick={() => showList(x)}
                  className={`
                    inline-flex items-center gap-x-2
                    py-2 px-5
                    text-xs  text-[#005B9F] 
                    cursor-pointer whitespace-nowrap
                    rounded-full mx-2
                    hover:bg-[var(--selago)]
                    ${x === keyName ? "font-semibold bg-white" : ""}
                  `}
                >
                  {x !== "Hs" ? getTtl(x, ln) : x}
                </li>
              ))}
          </ul>
        </div>

        {/* divider line stays */}

        {/* RIGHT PANEL */}
        <div className="w-full md:w-[70%] md:px-4 pt-4 md:pt-0 rounded-lg bg-[#f7f7f7] ">
          <div className=" p-4 rounded-md mt-5 shadow-md bg-white w-[50%]">
            <List
              list={list}
              ttl={keyName}
              updateList={updateList}
              name={list["name"]}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Setup;