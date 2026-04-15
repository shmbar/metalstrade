import React, { useMemo, useState, useContext, useEffect } from "react";
import List from "../../../../components/list";
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { getTtl } from "../../../../utils/languages";
import { UserAuth } from "../../../../contexts/useAuthContext";

const Setup = () => {
  const { settings, updateSettings, ln } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();
  const [keyName, setKeyName] = useState("Container Type");

  const excludedKeys = useMemo(
    () => new Set(["Supplier", "Client", "Bank Account", "InvTypes", "ExpPmnt", "Currency", "Stocks"]),
    []
  );

  const listA = useMemo(() => {
    return Object.keys(settings || {})
      .filter((key) => !excludedKeys.has(key))
      .filter((key) => {
        const node = settings?.[key];
        return node && typeof node === "object" && !Array.isArray(node) && Array.isArray(node?.[key]);
      })
      .sort();
  }, [settings, excludedKeys]);

  useEffect(() => {
    if (!listA.length) return;
    if (!listA.includes(keyName)) {
      setKeyName(listA[0]);
    }
  }, [listA, keyName]);

  const list = settings?.[keyName]?.[keyName] || [];

  const fieldByKey = {
    "Container Type": "contType",
    "Delivery Terms": "delTerm",
    "Delivery Time": "delTime",
    Expenses: "expType",
    Hs: "hs",
    Origin: "origin",
    POD: "pod",
    POL: "pol",
    Packing: "packing",
    "Payment Terms": "payTerm",
    Quantity: "qty",
    Remarks: "remarks",
    Shipment: "shipment",
    Size: "size",
  };

  const itemName =
    Object.keys(list?.[0] || {}).find((key) => key !== "id" && key !== "deleted") || fieldByKey[keyName] || "value";

  const showList = (z) => {
    setKeyName(z);
  };

  const updateList = (newArrList, save) => {
    const sectionObj = { ...(settings?.[keyName] || {}), [keyName]: newArrList };
    if (save) {
      updateSettings(uidCollection, sectionObj, keyName, true);
    } else {
      updateSettings({ ...settings, [keyName]: sectionObj });
    }
  };

  return (
    <div className=" p-2 flex w-full">
      <div className="flex w-full flex-col md:flex-row  md:p-0">

        {/* LEFT MENU - make wider */}
        <div className="md:px-5 w-full md:w-[30%] flex-shrink-0">
          <ul
            className="
              flex flex-col overflow-auto mt-1
              ring-1 ring-black/5 rounded-2xl
              bg-[#e3f3ff]
              py-2
            "
          >
            {listA.map((x, i) => (
                <li
                  key={i}
                  onClick={() => showList(x)}
                  className={`
                    inline-flex items-center gap-x-2
                    py-2 px-5
                    responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem] 
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
        <div className="w-full md:w-[70%] md:px-4 pt-4 md:pt-0 rounded-2xl bg-[#f7f7f7] ">
          <div className=" p-4 rounded-2xl mt-5 shadow-md bg-white w-full md:w-[50%]">
            <List
              list={list}
              ttl={keyName}
              updateList={updateList}
              name={itemName}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Setup;