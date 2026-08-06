// Weight Analysis — contracted assay/weight vs returned ("Back") assay/weight, per
// PO material line. Ported from the LAST WORKING web revision (git 065057f,
// app/(root)/analysis/page.js:46-238).
//
// NOTE: web's /analysis is BROKEN at HEAD — commit 75eaf3f deleted this whole
// transformation pipeline (replaced with `// ...data transformation logic here...`)
// and now calls getInvoices with a contract object instead of the {yr, arrInv}[] it
// expects, so every cell but PO# renders blank. This port is therefore against
// 065057f, which is the last revision where the report actually produced numbers.
// When web is fixed, re-diff this file against it.

export interface WeightRow {
  order: string;
  date: string;
  cert: string;
  invoice: any;
  invType: string;
  descriptionText?: string;
  ToNi?: any; ToCr?: any; ToMo?: any; Toqnty?: any;
  BackNi?: any; BackCr?: any; BackMo?: any; Backqnty?: any;
  diffNi?: any; diffCr?: any; diffMo?: any; diffqnty?: any;
  /** true on the synthetic per-PO Average row */
  isAverage?: boolean;
}

const isNum = (v: any) => typeof v === 'number' && Number.isFinite(v);

// Ni/Cr/Mo percentages parsed out of the line's description text. The ORIGINAL
// invoice ('1111') fills To*, anything else fills Back*.
export function extractData(x: string, type: string): Record<string, number> {
  const elements: Record<string, number> = {};
  const regex = /(\d+(\.\d+)?)(Ni|Cr|Mo)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(String(x ?? ''))) !== null) {
    const [, value, , element] = match;
    if (type === '1111') elements['To' + element] = parseFloat(value);
    else elements['Back' + element] = parseFloat(value);
  }
  return elements;
}

// 2dp string; '' when NaN; literal 0 when zero (web's exact formatting contract).
export function calc(z: any): any {
  return isNaN(z) ? '' : isNum(z) && z !== 0 ? z.toFixed(2) : isNum(z) && z === 0 ? 0 : '';
}

// Pair each original ('1111') with the corresponding Final Note ('3333') by position.
export function mergeObj(data: any[]): any[] {
  const merged: any[] = [];
  let i = 0;
  let j = 0;
  const inv1111 = data.filter((item) => item.invType === '1111');
  const inv3333 = data.filter((item) => item.invType === '3333');

  while (i < inv1111.length && j < inv3333.length) {
    merged.push({
      ...inv1111[i],
      ...inv3333[j],
      invType: inv1111[i].invType + '/' + inv3333[j].invType,
      Toqnty: inv1111[i].qnty,
      Backqnty: inv3333[j].qnty,
      cert: inv1111[i].cert,
    });
    i++;
    j++;
  }
  return merged;
}

// Group by invoice number — port of utils.js groupedArrayInvoice.
function groupedArrayInvoice(arr: any[]): any[][] {
  return [...arr]
    .sort((a, b) => (a.invoice ?? 0) - (b.invoice ?? 0))
    .reduce<any[][]>((result, obj) => {
      const group = result.find((g) => g[0]?.invoice === obj.invoice);
      if (group) group.push(obj);
      else result.push([obj]);
      return result;
    }, []);
}

// Per-PO "Average" row: assay columns averaged, weights SUMMED. Only added when the
// PO has more than one line (web parity).
export function calcAverage(arr: any[]): any[] {
  const grouped = [...arr]
    .sort((a, b) => (a.order as any) - (b.order as any))
    .reduce<any[][]>((result, obj) => {
      const group = result.find((g) => g[0]?.order === obj.order);
      if (group) group.push(obj);
      else result.push([obj]);
      return result;
    }, []);

  const avg = (nums: any[]) =>
    nums.length ? calc(nums.reduce((acc, n) => acc + (n as any) * 1, 0) / nums.length) : 0;
  const sum = (nums: any[]) =>
    nums.length ? calc(nums.reduce((acc, n) => acc + (n as any) * 1, 0)) : 0;

  const pick = (group: any[], key: string) =>
    group.map((x) => x[key]).filter((item) => item !== null && item !== undefined);

  return grouped
    .map((group) =>
      group.length > 1
        ? [
            ...group,
            {
              cert: 'Average',
              isAverage: true,
              order: group[0].order,
              ToNi: avg(pick(group, 'ToNi')),
              ToCr: avg(pick(group, 'ToCr')),
              ToMo: avg(pick(group, 'ToMo')),
              BackNi: avg(pick(group, 'BackNi')),
              BackCr: avg(pick(group, 'BackCr')),
              BackMo: avg(pick(group, 'BackMo')),
              Toqnty: sum(pick(group, 'Toqnty')),
              Backqnty: sum(pick(group, 'Backqnty')),
              date: group[0].date,
              invoice: '',
              supplier: group[0].supplier,
              diffCr: '',
              diffMo: '',
              diffNi: '',
              diffqnty: '',
            },
          ]
        : group
    )
    .flat();
}

// Build the report rows from contracts already enriched with `invoicesData`.
export function createWeightRows(contracts: any[]): WeightRow[] {
  const newArr: any[] = [];

  contracts.forEach((obj: any) => {
    const order = obj.order;
    const date = obj.date;

    (obj.invoicesData || []).forEach((z: any) => {
      let tempObj: any = { invoice: z.invoice, invType: z.invType, order, date };
      (z.productsDataInvoice || []).forEach((q: any) => {
        const desc =
          q.descriptionText === ''
            ? (obj.productsData || []).find((x: any) => x.id === q.descriptionId)?.description
            : q.descriptionText;
        tempObj = {
          ...tempObj,
          ...extractData(desc, z.invType),
          descriptionText: desc,
          qnty: q.qnty,
          cert: q.cert ?? '',
        };
        newArr.push(tempObj);
      });
    });
  });

  const merged: any[] = [];
  groupedArrayInvoice(newArr).forEach((z) => merged.push(mergeObj(z)));

  const flat = merged.flat().map((z: any) => ({
    ...z,
    diffNi: calc(z.BackNi - z.ToNi),
    diffCr: calc(z.BackCr - z.ToCr),
    diffMo: calc(z.BackMo - z.ToMo),
    diffqnty: calc(z.Backqnty - z.Toqnty),
  }));

  return calcAverage(flat).sort((a: any, b: any) =>
    String(a.date ?? '').localeCompare(String(b.date ?? ''))
  ) as WeightRow[];
}
