"use client";
import { useContext, useEffect, useState } from "react";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import Toast from "../../../components/toast.js";
import { loadDataSettings, saveDataSettings } from "../../../utils/utils";
import Spinner from "../../../components/spinner";
import { UserAuth } from "../../../contexts/useAuthContext";
import { Tab, TabPanel, TabGroup, TabList, TabPanels } from "@headlessui/react";
import Fenicr from "./tabs/fenicr";
import SupperAlloys from "./tabs/supperalloys";
import Stainless from "./tabs/stainless";
import { Button } from "../../../components/ui/button";
import { getCur } from "../../../components/exchangeApi";
import dateFormat from "dateformat";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const Page = () => {
  const { settings, setToast } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();
  const [value, setValue] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let data = await loadDataSettings(uidCollection, "formulasCalc");

        const timeoutId = setTimeout(() => {
          if (!data?.general) {
            setValue({ general: {} });
            setLoading(false);
          }
        }, 5000);

        try {
          let rate = await getCur(dateFormat(new Date(), "yyyy-mm-dd"));
          if (rate) {
            data.general.euroRate = rate;
          } else {
            data.general.euroRate = data.general?.euroRate || 1.0;
          }
        } catch (error) {
          console.error("Error fetching rate:", error);
          data.general.euroRate = data.general?.euroRate || 1.0;
        }

        setValue(data);
        clearTimeout(timeoutId);
      } catch (error) {
        console.error("Error loading data:", error);
        setValue({ general: {} });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [uidCollection]);

  const handleChange = (e, type) => {
    const { name, value: inputValue } = e.target;
    const clean = (inputValue ?? "").toString().replace(/[^0-9.]/g, "");
    setValue((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [name]: clean,
      },
    }));
  };

  const addComma = (nStr) => {
    if (!nStr && nStr !== 0) return "$0";
    nStr += "";
    let [x1, x2 = ""] = nStr.split(".");
    x2 = x2 ? "." + x2 : "";
    const rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, "$1,");
    }
    return "$" + x1 + x2;
  };

  const tabs = ["FeNiCr", "SuperAlloys", "Stainless"];

  const SetDiv = (x) => {
    if (x === 0) {
      return (
        <Fenicr
          value={value}
          handleChange={handleChange}
          focusedField={focusedField}
          setFocusedField={setFocusedField}
          addComma={addComma}
        />
      );
    } else if (x === 1) {
      return <SupperAlloys value={value} handleChange={handleChange} />;
    } else if (x === 2) {
      return <Stainless value={value} handleChange={handleChange} />;
    }
    return null;
  };

  const saveData = async () => {
    let result = await saveDataSettings(uidCollection, "formulasCalc", value);
    result && setToast({ show: true, text: "Data is saved", clr: "success" });
  };

  return (
    <div className="container mx-auto px-1 pb-2 md:pb-0 md:mt-0">
      {Object.keys(settings).length === 0 ? (
        <Spinner />
      ) : (
        <>
          <Toast />
          {loading && <Spinner />}

          <div className="bg-white rounded-2xl shadow-md p-2 mt-1 border border-slate-100">
            <div className="pb-3 px-5 mt-[8%]">
              <div className="text-[14px] mt-5 mb-3 text-[#11497c] font-poppins responsiveTextTitle border-l-4 border-[#11497c] pl-2">
                Formulas
              </div>

              <div className="w-full">
  <TabGroup>

    <TabList
      className="
        flex
        gap-3
        bg-transparent
        p-0
        pb-0
        ml-2
        overflow-x-auto
      "
    >
      {tabs.map((z) => (
        <Tab
          key={z}
          className={({ selected }) =>
            classNames(
              'px-6 py-1.5 text-xs  font-poppins whitespace-nowrap transition-all w-[140px]',
              'focus:outline-none',
              selected
                ? `
                  rounded-t-xl
                  rounded-b-none
                  shadow-sm
                  text-white
                  bg-[#005b9f]
                `
                : `
                  bg-[#e3f3ff]
                  text-[#0A5DB8]
                  rounded-t-xl
                  rounded-b-none
                  hover:bg-[#E0E0E0]
                `
            )
          }
        >
          {z}
        </Tab>
      ))}
    </TabList>

    {/* Panel Wrapper (Attached to Tabs) */}
    <div
      className="
        relative
        mt-[-1px]
        rounded-xl
        border border-[#E5E7EB]
        bg-white
        shadow-sm
        p-3
      "
    >

      {/* Your Existing Content */}
      {value.general != null && !loading && (
        <div className="flex items-center justify-center mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-10 items-center justify-center">
            {/* Keep all your Ni / Mo / etc boxes here unchanged */}
          </div>
        </div>
      )}

      <TabPanels className="mt-2">
        {tabs.map((tab, idx) => (
          <TabPanel key={idx} className="focus:outline-none">
            {!loading && value.general != null && SetDiv(idx)}
          </TabPanel>
        ))}
      </TabPanels>

    </div>

  </TabGroup>
</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Page;