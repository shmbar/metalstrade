import { DiBrackets } from "react-icons/di";
import { TbFileInvoice } from "react-icons/tb";
import { FaFileContract } from "react-icons/fa";
import { TbShip } from "react-icons/tb";
import { RiDashboardLine } from "react-icons/ri";
import { BiBasket } from "react-icons/bi";
import { VscPreview } from "react-icons/vsc";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { IoNewspaperOutline } from "react-icons/io5";
import { HiOutlineDocumentChartBar } from "react-icons/hi2";
import { MdOutlineWarehouse } from "react-icons/md";
import { CgEreader } from "react-icons/cg";
import { TbReportMoney } from "react-icons/tb";
import { GiProfit } from "react-icons/gi";
import { UserAuth } from "@contexts/useAuthContext";
import { TbBrandCashapp } from "react-icons/tb";
import { FaTableList } from "react-icons/fa6";
import { RiFormula } from "react-icons/ri";

export const sideBar = () => {
    const { userTitle, gisAccount } = UserAuth(); // Assuming this is a hook that provides the user role

    const sb = [
        {
            items: [{ item: 'Dashboard', img: <RiDashboardLine />, page: 'dashboard' }]
        },
        {
            ttl: 'Shipments',
            items: [
                { item: 'Contracts', img: <FaFileContract className="scale-[0.8]" />, page: 'contracts' },
                { item: 'Invoices', img: <TbFileInvoice />, page: 'invoices' },
                { item: 'Expenses', img: <DiBrackets />, page: 'expenses' },
                { item: 'Accounting', img: <CgEreader className="scale-[0.8]" />, page: 'accounting' },
            ]
        },
        {
            ttl: 'Review',
            items: [
                { item: 'Contracts Review', img: <VscPreview />, page: 'contractsreview' },
                { item: 'Invoices Review', img: <LiaFileInvoiceDollarSolid />, page: 'invoicesreview' },
                //    { item: 'Inventory Review', img: <BiBasket />, page: 'inventoryreview' }
            ]
        },
        {
            ttl: 'Statements',
            items: [
                { item: 'Contracts Statement', img: <IoNewspaperOutline />, page: 'contractsstatement' },
                { item: 'Invoices Statement', img: <HiOutlineDocumentChartBar />, page: 'invoicesstatement' },
                { item: 'Account Statement', img: <TbReportMoney className="scale-[1]" />, page: 'accstatement' },
                { item: 'Stocks', img: <MdOutlineWarehouse />, page: 'stocks' }
            ]
        },
        {
            ttl: 'Miscellaneous',
            items: [
                { item: 'Misc Invoices', img: <TbFileInvoice />, page: 'specialinvoices' },
                { item: 'Company Expenses', img: <DiBrackets />, page: 'companyexpenses' },
                { item: 'Material Tables', img: <FaTableList className="scale-[0.8] text-slate-500" />, page: 'materialtables' },
            ]
        },
        {
            ttl: 'IMS Summary',
            items: [
                ...(userTitle === 'Admin'
                    ? [{ item: gisAccount ? 'Gis Admin' : 'Sharon Admin', img: <GiProfit className="scale-[0.8]" />, page: 'margins' }]
                    : []),
                { item: 'Cashflow', img: <TbBrandCashapp className="scale-[0.8]" />, page: 'cashflow' },
                ...(userTitle === 'Admin'
                    ? [{ item: 'Formulas Calc', img: <RiFormula className="scale-[0.8]" />, page: 'formulas' }]
                    : []),
            ]
        }
    ];

    return sb;
};



export const suppliers = [
    {
        id: '12', supplier: 'Hayashi Incorporated', street: '1-15-29 Obori, Matsubara', city: 'Osaka 580-0006', country: 'Japan', other1: '',
        nname: '', poc: '', email: '', phone: '', mobile: '', fax: '', other2: ''
    },
    {
        id: '23', supplier: 'Nordcape Management Ltd', street: 'Amathous 13 - 14, ', city: 'Limassol Bay ', country: 'Cyprus', other1: 'VAT CY10073945M',
        nname: '', poc: '', email: '', phone: '', mobile: '', fax: '', other2: ''
    },
    {
        id: '34', supplier: 'RosMetIndustria LLC', street: 'House 1, Liter B, office 26', city: 'Pribrezhny, Zvezdnaya St', country: 'Russia', other1: 'ИНН 6321148391',
        nname: '', poc: '', email: '', phone: '', mobile: '', fax: '', other2: ''
    },
    {
        id: '56', supplier: 'Soyuzkhimtrans International Ltd', street: 'Office 14, First Floor, Trinity House,', city: 'Victoria, Mahe, Seychelles', country: '', other1: '',
        nname: '', poc: '', email: '', phone: '', mobile: '', fax: '', other2: ''
    },
    {
        id: '78', supplier: 'OOO "Вулкан"', street: '191036. r. Caнкт-Петербург,', city: 'Лиговский пр., 10/118', country: 'Russia', other1: 'литер А, пом. 10-Н ИHH 7842484669',
        nname: '', poc: '', email: '', phone: '', mobile: '', fax: '', other2: ''
    }
]

export const clients = [{
    id: '12', client: 'CellMark Inc. DBA Sunset Trading', street: '3030 Old Ranch Parkway', city: 'Suite 280, Seal Beach', country: 'CA 90740, USA', other1: 'USA',
    nname: 'Sunset', poc: '', email: '', phone: '', mobile: '', fax: '', other2: ''
},
{
    id: '423', client: 'Oryx Stainless BV', street: 'S Gravendeelsdijk 175', city: '3316 AS Dortrecht', country: 'Netherlands', other1: 'VAT NL8175 19981 B01',
    nname: 'Oryx', poc: '', email: '', phone: '', mobile: '', fax: '', other2: ''
},
{
    id: '164562', client: 'Sequoia Trading BV', street: 'Spinnerijkaai 45 / 203', city: 'B-8500 Kortrijk, Belgium', country: 'Belgium', other1: 'VAT BE 0808.780.654',
    nname: 'Sequoia', poc: '', email: '', phone: '', mobile: '', fax: '', other2: ''
},
{
    id: '6565', client: 'S. H. Bell CompanyÜ', street: '644 Alpha Dr, P.O. Box 11495', city: 'Pittsburgh, PA 15238', country: 'USA', other1: '',
    nname: 'S. H. Bell ', poc: '', email: '', phone: '', mobile: '', fax: '', other2: ''
},];

export const bankAccounts = [{
    id: 'A1234', bankName: 'Citi Bank', bankNname: 'Citi Bank', cur: 'us', swiftCode: 'ZEIBGB2L', iban: 'GB17ZEIB40624700022436', corrBank: 'Citi Bank',
    corrBankSwift: 'CITIUS33', other: ''
},
{
    id: 'A1235', bankName: 'Revolut Bank UAB', bankNname: 'Revolut Bank UAB', cur: 'us', swiftCode: 'REVOLT21', iban: 'LT44 3250 0414 1624 4186', corrBank: 'JPMORGAN CHASE BANK, N.A',
    corrBankSwift: 'CHASGB2L', other: ''
},
{
    id: 'A1236', bankName: 'Zenith Bank (UK) Ltd', bankNname: 'Zenith Bank (UK) Ltd', cur: 'eu', swiftCode: 'ZEIBGB2L', iban: 'GB87ZEIB40624700022437', corrBank: 'KBC BRUSSELS',
    corrBankSwift: 'KREDBEBB', other: ''
}];

export const stocks = [{
    id: 'A1234', stock: '', country: '', address: '', phone: '', other: ''
},
{
    id: 'A1235', stock: '', country: '', address: '', phone: '', other: ''
},
{
    id: 'A1236', stock: '', country: '', address: '', phone: '', other: ''
}];

export const shipmentType = [{ id: '323', shpType: 'Ocean' }, { id: '434', shpType: 'Truck' },
{ id: '565', shpType: 'Container pls' }, { id: '787', shpType: 'Air' }]

export const origin = [{ id: '345223', origin: 'Azerbaijan' },
{ id: '4354354', origin: 'Belgium' },
{ id: '45345634', origin: 'Brazil' },
{ id: '4364564', origin: 'Canada' },
{ id: '4467434', origin: 'China' },
{ id: '423434', origin: 'Colombia' },
{ id: '6456', origin: 'Czeck' },
{ id: '42435234', origin: 'Estonia' },
{ id: '437674', origin: 'Germany' },
{ id: '24332', origin: 'India' },
{ id: '4365464', origin: 'Israel' },
{ id: '443434', origin: 'Japan' },
{ id: '4312334', origin: 'Kazakhstan' },
{ id: '54534', origin: 'Latvia' },
{ id: '4454534', origin: 'Malayzia' },
{ id: '423234', origin: 'Middle East' },
{ id: '465634', origin: 'Netherlands' },
{ id: '8758', origin: 'Poland' },
{ id: '5435', origin: 'Republic of Korea' },
{ id: '878', origin: 'Russia' },
{ id: '43983434984', origin: 'Singapore' },
{ id: '87855', origin: 'South Korea' },
{ id: '8787686', origin: 'Taiwan' },
{ id: '4324324', origin: 'UAE' },
{ id: '43555', origin: 'UK' },
{ id: '434346', origin: 'US' },
]

export const deliveryTerms = [{ id: '323', delTerm: 'CFR' },
{ id: '23542', delTerm: 'CIF' },
{ id: '465364534', delTerm: 'CIP' },
{ id: '3432', delTerm: 'CNF' },
{ id: '324', delTerm: 'CPT' },
{ id: '423', delTerm: 'DAP' },
{ id: '4364564', delTerm: 'DDP' },
{ id: '32423', delTerm: 'DDU' },
{ id: '43244536', delTerm: 'DPU' },
{ id: '32432', delTerm: 'EXW' },
{ id: '456', delTerm: 'EXW DWP' },
{ id: '43214', delTerm: 'ExW Estma' },
{ id: '567', delTerm: 'ExW Metaaltransport' },
{ id: '8768', delTerm: 'FAS' },
{ id: '4354354', delTerm: 'FCA' },
{ id: '2345', delTerm: 'FOB' },
{ id: '5345', delTerm: 'IWH' },
{ id: '543667', delTerm: 'IWH Metaaltransport' },
{ id: '6456', delTerm: 'IWH Rotterdam' },
]
export const polList = [
    { id: 'A1', pol: 'Antwerp' },
    { id: 'A2', pol: 'Ashdod' },
    { id: 'A3', pol: 'Baku' },
    { id: 'A4', pol: 'Baltimore' },
    { id: 'A5', pol: 'Busan' },
    { id: 'A6', pol: 'C.Steinweg Rotterdam' },
    { id: 'A7', pol: 'Cartagena' },
    { id: 'A8', pol: 'Charleston' },
    { id: 'A9', pol: 'Chelyabinsk' },
    { id: 'A10', pol: 'Chicago' },
    { id: 'A11', pol: 'Czeck' },
    { id: 'A12', pol: 'DAP Germany - Sagard' },
    { id: 'A13', pol: 'Dordrecht' },
    { id: 'A14', pol: 'Duisburg' },
    { id: 'A15', pol: 'DWP Netherlands' },
    { id: 'A16', pol: 'Exw Estma' },
    { id: 'A17', pol: 'Felixstowe' },
    { id: 'A18', pol: 'Frankfurt' },
    { id: 'A19', pol: 'Gdynia' },
    { id: 'A20', pol: 'Gebze' },
    { id: 'A21', pol: 'Germany' },
    { id: 'A22', pol: 'Goslar' },
    { id: 'A23', pol: 'Grangemouth' },
    { id: 'A24', pol: 'Haifa' },
    { id: 'A25', pol: 'Haiphong' },
    { id: 'A26', pol: 'Hamburg' },
    { id: 'A27', pol: 'Heinenoord' },
    { id: 'A28', pol: 'Houston' },
    { id: 'A29', pol: 'Israel' },
    { id: 'A30', pol: 'Jebel Ali' },
    { id: 'A31', pol: 'Kaohsiung' },
    { id: 'A32', pol: 'Klaipeda' },
    { id: 'A33', pol: 'Klang' },
    { id: 'A34', pol: 'Kłopot' },
    { id: 'A35', pol: 'Kobe' },
    { id: 'A36', pol: 'Liverpool' },
    { id: 'A37', pol: 'Los Angeles' },
    { id: 'A38', pol: 'Louisville' },
    { id: 'A39', pol: 'Maardu' },
    { id: 'A40', pol: 'Metaaltransport, Rotterdam' },
    { id: 'A41', pol: 'Moerdijk' },
    { id: 'A42', pol: 'Moji' },
    { id: 'A43', pol: 'Montreal' },
    { id: 'A44', pol: 'Mundra ICD Ludhiana' },
    { id: 'A45', pol: 'Muuga' },
    { id: 'A46', pol: 'New York' },
    { id: 'A47', pol: 'Nhava Sheva' },
    { id: 'A48', pol: 'Norfolk' },
    { id: 'A49', pol: 'Novorossyisk' },
    { id: 'A50', pol: 'Nur-Sultan' },
    { id: 'A51', pol: 'Oakland' },
    { id: 'A52', pol: 'Osaka' },
    { id: 'A53', pol: 'Pipapav' },
    { id: 'A54', pol: 'Port Mobile, Al' },
    { id: 'A55', pol: 'Poti' },
    { id: 'A56', pol: 'Praha' },
    { id: 'A57', pol: 'Riga' },
    { id: 'A58', pol: 'Rotherham' },
    { id: 'A59', pol: 'Rotterdam' },
    { id: 'A60', pol: 'Russia' },
    { id: 'A61', pol: 'Santos' },
    { id: 'A62', pol: 'Santos, Br' },
    { id: 'A63', pol: 'Savannah' },
    { id: 'A64', pol: 'Shanghai' },
    { id: 'A65', pol: 'Sheffield' },
    { id: 'A66', pol: 'Singapore' },
    { id: 'A67', pol: 'Smolensk' },
    { id: 'A68', pol: 'Southampton' },
    { id: 'A69', pol: 'St. Petersburg' },
    { id: 'A70', pol: 'SYSTRA Logistik GmbH' },
    { id: 'A71', pol: 'Tallinn' },
    { id: 'A72', pol: 'Tallinn/Riga Port' },
    { id: 'A73', pol: 'Tallinn/Riga/Poti' },
    { id: 'A74', pol: 'Teesport' },
    { id: 'A75', pol: 'Tilbury' },
    { id: 'A76', pol: 'Turkheim' },
    { id: 'A77', pol: 'UAE' },
    { id: 'A78', pol: 'US' },
    { id: 'A79', pol: 'Vilnius' },
    { id: 'A80', pol: 'Visakhapatnam' },
    { id: 'A81', pol: 'Xingang' }
]
export const podList = [
    { id: 'A1', pod: 'Amsterdam' },
    { id: 'A2', pod: 'Antwerp' },
    { id: 'A3', pod: 'Ashdod' },
    { id: 'A4', pod: 'Baltimore' },
    { id: 'A5', pod: 'Bedzin' },
    { id: 'A6', pod: 'Botlek' },
    { id: 'A7', pod: 'Busan' },
    { id: 'A8', pod: 'C.Steinweg, Rotterdam' },
    { id: 'A9', pod: 'Charleston' },
    { id: 'A10', pod: 'Chelyabinsk' },
    { id: 'A11', pod: 'Chicago' },
    { id: 'A12', pod: 'Dordrecht' },
    { id: 'A13', pod: 'DWP Netherlands' },
    { id: 'A14', pod: 'Estonia or Rotterdam' },
    { id: 'A15', pod: 'EU Port at IMS option' },
    { id: 'A16', pod: 'Exw Estma' },
    { id: 'A17', pod: 'Felixstowe' },
    { id: 'A18', pod: 'Garhi' },
    { id: 'A19', pod: 'Gdynia' },
    { id: 'A20', pod: 'Germany - Sagard' },
    { id: 'A21', pod: 'Goslar' },
    { id: 'A22', pod: 'Grangemouth' },
    { id: 'A23', pod: 'Haiphong' },
    { id: 'A24', pod: 'Hamburg' },
    { id: 'A25', pod: 'Houston' },
    { id: 'A26', pod: 'Jajpur' },
    { id: 'A27', pod: 'Jawaharlal Nehru' },
    { id: 'A28', pod: 'Jebel Ali' },
    { id: 'A29', pod: 'Kaohsiung' },
    { id: 'A30', pod: 'Klaipeda' },
    { id: 'A31', pod: 'Kłopot' },
    { id: 'A32', pod: 'Kobe' },
    { id: 'A33', pod: 'Krefeld' },
    { id: 'A34', pod: 'Liverpool' },
    { id: 'A35', pod: 'London' },
    { id: 'A36', pod: 'London Gateway Port' },
    { id: 'A37', pod: 'Los Angeles' },
    { id: 'A38', pod: 'Louisville' },
    { id: 'A39', pod: 'Maardu' },
    { id: 'A40', pod: 'Maardu, Estma' },
    { id: 'A41', pod: 'Metaaltransport, NL' },
    { id: 'A42', pod: 'Moerdijk' },
    { id: 'A43', pod: 'Moji' },
    { id: 'A44', pod: 'Montreal' },
    { id: 'A45', pod: 'Mundra' },
    { id: 'A46', pod: 'Mundra ICD Ludhiana' },
    { id: 'A47', pod: 'New York' },
    { id: 'A48', pod: 'Newell W.V.' },
    { id: 'A49', pod: 'Nhava Sheva' },
    { id: 'A50', pod: 'Nieuwerkerk' },
    { id: 'A51', pod: 'Ningbo' },
    { id: 'A52', pod: 'Norfolk' },
    { id: 'A53', pod: 'Novorossyisk' },
    { id: 'A54', pod: 'Oakland' },
    { id: 'A55', pod: 'Osaka' },
    { id: 'A56', pod: 'Pipapav' },
    { id: 'A57', pod: 'Pittsburgh' },
    { id: 'A58', pod: 'Port Mobile, Al' },
    { id: 'A59', pod: 'Riga' },
    { id: 'A60', pod: 'Rockford' },
    { id: 'A61', pod: 'Rotherham' },
    { id: 'A62', pod: 'Rotterdam' },
    { id: 'A63', pod: 'Sanshan' },
    { id: 'A64', pod: 'Santos, Br' },
    { id: 'A65', pod: 'Shanghai' },
    { id: 'A66', pod: 'Sheffield' },
    { id: 'A67', pod: 'Singapore' },
    { id: 'A68', pod: 'Southampton' },
    { id: 'A69', pod: 'St. Petersburg' },
    { id: 'A70', pod: 'SYSTRA Logistik GmbH' },
    { id: 'A71', pod: 'Tallinn' },
    { id: 'A72', pod: 'Teesport' },
    { id: 'A73', pod: 'Tilbury' },
    { id: 'A74', pod: 'Turkheim' },
    { id: 'A75', pod: 'UK' },
    { id: 'A76', pod: 'Varennes' },
    { id: 'A77', pod: 'Visakhapatnam' },
    { id: 'A78', pod: 'WH Rotterdam/ Germany' },
    { id: 'A79', pod: 'Xingang' }
]

export const packingList = [
    { id: 'P1', packing: 'Bags' },
    { id: 'P2', packing: 'Bags/Drums' },
    { id: 'P3', packing: 'Big Bags' },
    { id: 'P4', packing: 'Drums' },
    { id: 'P5', packing: 'Drums/Pallets' },
    { id: 'P6', packing: 'Ingots' },
    { id: 'P7', packing: 'Loose' },
    { id: 'P8', packing: 'Loose&Bags' },
    { id: 'P9', packing: 'Packages' },
    { id: 'P10', packing: 'Pallets' },
    { id: 'P11', packing: 'Pallets/Bags' },
    { id: 'P12', packing: 'Pallets/Pieces' },
    { id: 'P13', packing: 'Pieces' },
    { id: 'P14', packing: 'Skids' }
]

export const contrainerTypeList = [
    { id: '45', contType: '20' },
    { id: 'P3413', contType: '40' },
    { id: '6456', contType: '40/20' }
]

export const sizeList = [
    { id: '4324', size: 'In size' }
]

export const delTimeList = [
    { id: 'P5', deltime: 'Within 30 Days from contract date' },
    { id: 'P6', deltime: 'Week 3, January 2022' },
    { id: 'P7', deltime: 'Prompt' },
    { id: 'P8', deltime: 'March -May 2022' },
    { id: 'P9', deltime: 'April-May 2022' },
    { id: 'P10', deltime: 'May-July 2022' },
    { id: 'P11', deltime: 'See remarks below' },
    { id: 'P12', deltime: 'Up to 17 April 2023' },
    { id: 'P13', deltime: 'April 2023' },
    { id: 'P14', deltime: '14 week, 2023' }
]

export const termsOfPayment = [
    { id: 'P5', termPmnt: '100% CAD within 5 banking days against emailed copy of the following documents: CMR, Invoice & Packing list, Loading photos.' },
    { id: 'P6', termPmnt: '100% CAD within 5 banking days against emailed copy of the following documents: Conditional Release, Invoice & Packing list, Loading photos. ' },
    { id: 'P7', termPmnt: '100% CAD within 5 banking days against emailed copy of the following documents: Non-Negotiable BL, Invoice & Packing list, Loading photos.' },
    { id: 'P8', termPmnt: '100% CAD within 5 banking days against emailed copy of the following documents: Unconditional Release, Invoice & Packing list, Loading photos. ' },
    { id: 'P9', termPmnt: '80% CAD within 5 banking days against emailed copy of the following documents: Non-Negotiable BL, Invoice & Packing list, Loading photos.' },
    { id: 'P10', termPmnt: '90% CAD within 5 banking days against emailed copy of the following documents: Conditional Release, Invoice & Packing list, Loading photos. Balance within 30 days after arrival and verification.' },
    { id: 'P11', termPmnt: '90% CAD within 5 banking days against emailed copy of the following documents: Non-Negotiable BL, Invoice & Packing list, Loading photos. Balance within 30 days after arrival and verification.' },
    { id: 'P12', termPmnt: '90% CAD within 5 banking days against emailed copy of the following documents: Unconditional Release, Invoice & Packing list, Loading photos. Balance within 30 days after arrival and verification.' },
    { id: 'P13', termPmnt: '95% CAD within 5 banking days against emailed copy of the following documents: Conditional Release, Invoice & Packing list, Loading photos. Balance within 30 days after arrival and verification.' },
    { id: '6456', termPmnt: '95% CAD within 5 banking days against emailed copy of the following documents: Non-Negotiable BL, Invoice & Packing list, Loading photos. Balance within 30 days after arrival and verification.' },
    { id: '1434', termPmnt: '95% CAD within 5 banking days against emailed copy of the following documents: Unconditional Release, Invoice & Packing list, Loading photos. Balance within 30 days after arrival and verification.' },
    { id: '6464', termPmnt: 'As agreed with Estma Ltd.' }
]

export const currency = [
    { id: 'us', cur: 'USD', symbol: '$' },
    { id: 'eu', cur: 'EUR', symbol: '€' },
]

export const quantityTable = [
    { id: 'fdsfds', qTypeTable: 'MT' },
    { id: 'vfsgd6', qTypeTable: 'KGS' },
    { id: 'cdaff', qTypeTable: 'LB' }
]
export const invTypes = [
    { invType: 'Invoice', id: '1111', },
    { invType: 'Credit Note', id: '2222' },
    { invType: 'Final Note', id: '3333' },
]




export const expenses = [
    { id: "ABCDE", expType: "BL" },
    { id: "FGHIJ", expType: "commission" },
    { id: "KLMNO", expType: "demurrage" },
    { id: "PQRST", expType: "documents" },
    { id: "UVWXY", expType: "freight" },
    { id: "Z1234", expType: "freightReloadCourier" },
    { id: "56789", expType: "freightStorageStuffing" },
    { id: "0ABCDE", expType: "inspection" },
    { id: "FGHIJ1", expType: "insurance" },
    { id: "KLMNO2", expType: "penalties" },
    { id: "PQRST3", expType: "release" },
    { id: "UVWXY4", expType: "reloading" },
    { id: "Z12345", expType: "sampling" },
    { id: "67890A", expType: "storage" },
    { id: "BCDEFG", expType: "storageStuffing" },
    { id: "HIJKLM", expType: "stuffing" },
    { id: "NOPQRS", expType: "terminalCharges" },
    { id: "TUVWXY", expType: "truck" },
    { id: "ZABCDE", expType: "warehouse" }
];

export const hs = [
    { hs: 720299, id: 'abcde' },
    { hs: 720421, id: 'fghij' },
    { hs: 750300, id: 'klmno' },
    { hs: 72029980, id: 'pqrst' },
    { hs: 72042100, id: 'uvwxy' },
    { hs: 72042110, id: 'z1234' },
    { hs: 72042190, id: 'wqrewfd' },
    { hs: 72042900, id: '01234' },
    { hs: 81019700, id: '56789' },
    { hs: 81029700, id: 'abcd1' },
    { hs: 81123900, id: 'efgh2' },
    { hs: 81129900, id: 'ijkl3' },
    { hs: 760200006, id: 'mnop4' },
    { hs: 7202930000, id: 'qrst5' },
    { hs: 720260000, id: 'uvwx6' },
    { hs: 72042110900, id: 'yz789' },
    { hs: 72042900, id: 'fdgrjt' }
];

export const remarks = [
    { rmrk: 'Material as per photos & specs provided', id: 'abcde' },
    { rmrk: 'Free of any other harmful attachments, contaminations, impurities and hollows', id: 'fghij' },

];

export const OutTurn = [{ id: '1234', rcvd: 'Received' }, { id: '5678', rcvd: 'Unreceived' }]
export const Finalizing = [{ id: '4568', fnlzing: 'Yes' }, { id: '2587', fnlzing: 'No' }]
export const relStts = [{ id: 'sdfhg', status: 'Released' },
{ id: '255435387', status: 'Unreleased' },
{ id: 'fsfsd5', status: 'OBL Sent' },
{ id: '45rts', status: 'Conditional release' },
{ id: 'tyj67', status: 'Unconditional release' }]

export const Titles = [
    { id: 'ew4j5hfs', title: 'Admin' },
    { id: '4354354', title: 'User' },
    { id: '45345634', title: 'Accounting' },
]