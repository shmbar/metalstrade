# Client messages — features shipped

Five short updates, one per feature. Each has a quick "how to test" so the team can verify.

---

## 1 — Payment Terms (type your own)

You can now write your own Payment Terms on the contract page, just like Remarks. In the Payment Terms box, choose **"..Edit Text"** and a text field opens — type anything you want. It saves with the contract and prints on the PO PDF (✕ switches back to the preset list).

**Test:** Open any contract → Payment Terms → **..Edit Text** → type your terms → Save → reopen (text stays) → download the PO PDF and check it shows.

---

## 2 — Final Settlement Draft button

Final Settlement now has a **Draft** toggle. With Draft **ON**, your final quantities/prices are held aside and **don't affect cashflow or stocks** yet (you'll see an amber "Draft mode" banner). Turn Draft **OFF** and save to make it official.

**Test:** Open a contract → Final Settlement → change a final quantity → tick **Draft** → Save → check Cashflow/Stocks are unchanged → reopen, untick Draft → Save → the numbers now update.

---

## 3 — Incoterms reference page

New **Incoterms** page in the sidebar (under *Miscellaneous*). All 11 terms (EXW, FOB, CIF, DDP…) with who pays the cost, who carries the risk, and where it transfers between seller and buyer. Has a search box and a Sea / Any-mode filter.

**Test:** Open **Incoterms**, search "FOB", and try the Sea / Any-mode filters.

---

## 4 — Misc Invoices categories

Misc Invoices now have a **Category** column — *Personal, Random, Shipments*. Pick one per invoice. The Dashboard's Misc Invoices card then shows totals split by category (untagged ones show as "Uncategorized"). Tags stay even after the related contract is re-saved.

**Test:** Open **Misc Invoices** → set a category on a few rows → open the **Dashboard** and check the split.

---

## 5 — Storage cost per MT

New **Storage Costs** page (sidebar → *Statements*). It shows your real storage spend and stock straight away — **total storage spend** this period, **MT in storage now**, and a **per-warehouse** breakdown — plus the **average storage cost per MT**, switchable **per week / month / year**. Tag each storage invoice to a **warehouse + month** in the list below and the rate fills in; a counter shows how many are still untagged.

**Test:** Open **Storage Costs** → see the spend + MT actuals at the top → tag a couple of storage invoices (warehouse + month) → the per-warehouse rate appears → toggle week / month / year.
